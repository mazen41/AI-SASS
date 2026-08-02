'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  apiGetStory, apiGetStoryStatus, apiGenerateStory, apiDeleteStory,
  apiUploadStoryPdf, Story, StoryAsset, StoryOutput, StoryOutputs, StoryStatus,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import StorybookViewer from '@/components/StorybookViewer';

const EXPECTED_SCENE_COUNT = 6;
type StoryTab = 'story' | 'storybook' | 'coloring' | 'audio' | 'video';

// ─── Convert image URL → base64 data-URL via server-side proxy (no CORS) ─────
async function toDataUrl(url: string): Promise<string | null> {
  try {
    // Proxy through Next.js API route so the fetch is server-side (no CORS)
    const proxied = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxied);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Pre-fetch a list of URLs → keyed base64 map ─────────────────────────────
async function fetchBase64Map(urls: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    urls.map(async url => [url, await toDataUrl(url)] as [string, string | null])
  );
  // Only keep entries where fetch succeeded
  return Object.fromEntries(entries.filter((e): e is [string, string] => e[1] !== null));
}

// ─── Wrap text into lines that fit maxWidth (jsPDF unit = mm) ─────────────────
function wrapText(pdf: any, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(text, maxWidth);
}

// ─── Draw a rounded rectangle border ─────────────────────────────────────────
function drawBorder(
  pdf: any,
  x: number, y: number, w: number, h: number,
  color: [number,number,number], lineWidth: number
) {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(lineWidth);
  pdf.rect(x, y, w, h, 'S');
}

// ─── Draw a horizontal rule ───────────────────────────────────────────────────
function drawHR(
  pdf: any, cx: number, y: number, halfW: number,
  color: [number,number,number], lw = 0.5
) {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(lw);
  pdf.line(cx - halfW, y, cx + halfW, y);
}

// ─── Page dimensions (A4 in mm) ───────────────────────────────────────────────
const PW = 210;  // page width
const PH = 297;  // page height
const M  = 16;   // margin

// ─── Build story book PDF with jsPDF directly (no html2canvas) ───────────────
async function buildStoryBookPdf(
  story: Story,
  imageAssets: StoryAsset[],
  isRtl: boolean
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  // Pre-fetch all scene images as base64
  const b64: Record<number, string> = {};
  await Promise.all(imageAssets.map(async a => {
    const d = await toDataUrl(a.url);
    if (d) b64[a.scene_number] = d;
  }));

  const scenes = story.scenes ?? [];
  const gold:   [number,number,number] = [200, 169, 110];
  const purple: [number,number,number] = [61,  31,  110];
  const grey:   [number,number,number] = [100, 100, 100];
  const cx = PW / 2;

  // ── COVER ──────────────────────────────────────────────────────────────────
  pdf.setFillColor(255, 248, 231);          // parchment
  pdf.rect(0, 0, PW, PH, 'F');
  drawBorder(pdf, M, M, PW - 2*M, PH - 2*M, gold, 2.5);
  drawBorder(pdf, M+4, M+4, PW - 2*M - 8, PH - 2*M - 8, gold, 0.5);

  // Stars row
  pdf.setTextColor(...gold);
  pdf.setFontSize(14);
  pdf.text('✦  ✦  ✦  ✦  ✦  ✦  ✦', cx, 38, { align: 'center' });

  // Subtitle
  pdf.setTextColor(...grey);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(isRtl ? 'قصة مصورة' : 'STORY HERO', cx, 48, { align: 'center' });

  // Title
  pdf.setTextColor(...purple);
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  const titleLines = wrapText(pdf, story.title, PW - 2*M - 16);
  pdf.text(titleLines, cx, 62, { align: 'center' });
  const titleBottom = 62 + (titleLines.length - 1) * 10;

  // Gold rule
  drawHR(pdf, cx, titleBottom + 6, 30, gold, 0.8);

  // Cover image
  const coverB64 = b64[imageAssets[0]?.scene_number ?? 1] ?? b64[imageAssets[0]?.scene_number];
  const imgY = titleBottom + 14;
  const imgH = 90;
  const imgW = 130;
  if (coverB64) {
    // Gold border frame then image on top
    pdf.setDrawColor(...gold);
    pdf.setLineWidth(1.5);
    pdf.rect(cx - imgW/2 - 1, imgY - 1, imgW + 2, imgH + 2, 'S');
    pdf.addImage(coverB64, 'JPEG', cx - imgW/2, imgY, imgW, imgH);
    pdf.setDrawColor(...gold);
    pdf.setLineWidth(1.2);
    pdf.rect(cx - imgW/2, imgY, imgW, imgH, 'S');
  }

  // Child name
  const nameY = imgY + imgH + 16;
  if (story.child_name) {
    pdf.setTextColor(...grey);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'italic');
    pdf.text(isRtl ? 'بطولة' : 'Starring', cx, nameY, { align: 'center' });
    pdf.setTextColor(...purple);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(story.child_name, cx, nameY + 10, { align: 'center' });
    // Underline
    const nw = pdf.getTextWidth(story.child_name);
    pdf.setDrawColor(...gold);
    pdf.setLineWidth(0.6);
    pdf.line(cx - nw/2, nameY + 12, cx + nw/2, nameY + 12);
  }

  // Bottom stars
  pdf.setTextColor(...gold);
  pdf.setFontSize(14);
  pdf.text('✦  ✦  ✦  ✦  ✦  ✦  ✦', cx, PH - M - 6, { align: 'center' });

  // ── SCENE PAGES ────────────────────────────────────────────────────────────
  for (let i = 0; i < scenes.length; i++) {
    const scene  = scenes[i];
    const title  = (scene as any).title ?? (isRtl ? `الصفحة ${i+1}` : `Page ${i+1}`);
    const text   = scene.description ?? (scene as any).text ?? '';
    const imgB64 = b64[scene.scene_number];

    pdf.addPage();
    pdf.setFillColor(255, 248, 231);
    pdf.rect(0, 0, PW, PH, 'F');
    drawBorder(pdf, M, M, PW - 2*M, PH - 2*M, gold, 2);
    drawBorder(pdf, M+3, M+3, PW - 2*M - 6, PH - 2*M - 6, gold, 0.3);

    // Page title
    pdf.setTextColor(...purple);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, cx, 36, { align: 'center' });
    drawHR(pdf, cx, 42, 25, gold, 0.6);

    // Scene image
    const sImgY = 48;
    const sImgH = 100;
    const sImgW = 150;
    if (imgB64) {
      pdf.addImage(imgB64, 'JPEG', cx - sImgW/2, sImgY, sImgW, sImgH);
      pdf.setDrawColor(...gold);
      pdf.setLineWidth(1);
      pdf.rect(cx - sImgW/2, sImgY, sImgW, sImgH, 'S');
    }

    // Story text
    const textY = sImgY + sImgH + 12;
    pdf.setTextColor(50, 50, 50);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'normal');
    const textLines = wrapText(pdf, text, PW - 2*M - 20);
    const align = isRtl ? 'right' : 'center';
    const textX = isRtl ? PW - M - 10 : cx;
    pdf.text(textLines, textX, textY, { align, maxWidth: PW - 2*M - 20 });

    // Page number
    pdf.setTextColor(...grey);
    pdf.setFontSize(9);
    pdf.text(`— ${i+1} —`, cx, PH - M - 6, { align: 'center' });
  }

  // ── END PAGE ───────────────────────────────────────────────────────────────
  pdf.addPage();
  pdf.setFillColor(255, 248, 231);
  pdf.rect(0, 0, PW, PH, 'F');
  drawBorder(pdf, M, M, PW - 2*M, PH - 2*M, gold, 2.5);
  drawBorder(pdf, M+4, M+4, PW - 2*M - 8, PH - 2*M - 8, gold, 0.5);

  pdf.setTextColor(...gold);
  pdf.setFontSize(20);
  pdf.text('✦  ✦  ✦', cx, PH/2 - 28, { align: 'center' });

  pdf.setTextColor(...purple);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text(isRtl ? 'النهاية' : 'The End', cx, PH/2 - 8, { align: 'center' });

  drawHR(pdf, cx, PH/2, 30, gold, 0.8);

  pdf.setTextColor(...grey);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'italic');
  pdf.text(
    isRtl ? 'شكراً لقراءة هذه القصة الرائعة!' : 'Thank you for reading this amazing story!',
    cx, PH/2 + 14, { align: 'center' }
  );

  pdf.setTextColor(...gold);
  pdf.setFontSize(20);
  pdf.text('✦  ✦  ✦', cx, PH/2 + 28, { align: 'center' });

  return pdf.output('blob');
}

// ─── Build coloring book PDF ──────────────────────────────────────────────────
async function buildColoringBookPdf(
  story: Story,
  coloringAssets: StoryAsset[],
  isRtl: boolean
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const b64: Record<number, string> = {};
  await Promise.all(coloringAssets.map(async a => {
    const d = await toDataUrl(a.url);
    if (d) b64[a.scene_number] = d;
  }));

  const scenes = story.scenes ?? [];
  const black: [number,number,number] = [30, 30, 30];
  const grey:  [number,number,number] = [120, 120, 120];
  const cx = PW / 2;

  // ── COVER ──────────────────────────────────────────────────────────────────
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PW, PH, 'F');
  drawBorder(pdf, M, M, PW - 2*M, PH - 2*M, black, 2);
  drawBorder(pdf, M+5, M+5, PW - 2*M - 10, PH - 2*M - 10, grey, 0.4);

  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('🖍️  🖍️  🖍️  🖍️  🖍️', cx, 38, { align: 'center' });

  pdf.setFontSize(30);
  pdf.setFont('helvetica', 'bold');
  pdf.text(isRtl ? 'كتاب التلوين' : 'My Coloring Book', cx, 60, { align: 'center' });

  drawHR(pdf, cx, 68, 35, black, 0.8);

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...grey);
  const titleLines = wrapText(pdf, story.title, PW - 2*M - 20);
  pdf.text(titleLines, cx, 78, { align: 'center' });

  if (story.child_name) {
    const nameBoxY = PH/2 + 20;
    pdf.setFontSize(13);
    pdf.setTextColor(...grey);
    pdf.text(isRtl ? 'تلوين البطل:' : 'Coloring by:', cx, nameBoxY, { align: 'center' });
    // Dashed name box
    pdf.setDrawColor(...grey);
    pdf.setLineWidth(0.5);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.rect(cx - 50, nameBoxY + 5, 100, 16, 'S');
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(20, 20, 20);
    pdf.text(story.child_name, cx, nameBoxY + 16, { align: 'center' });
  }

  // ── COLORING PAGES ─────────────────────────────────────────────────────────
  for (let i = 0; i < scenes.length; i++) {
    const scene  = scenes[i];
    const title  = (scene as any).title ?? (isRtl ? `صفحة تلوين ${i+1}` : `Coloring Page ${i+1}`);
    const imgB64 = b64[scene.scene_number];

    pdf.addPage();
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, PW, PH, 'F');
    drawBorder(pdf, M, M, PW - 2*M, PH - 2*M, black, 1.5);

    // Title
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, cx, 34, { align: 'center' });
    drawHR(pdf, cx, 40, 20, black, 0.5);

    // Line art image — large, centered
    const imgW = 160;
    const imgH = 140;
    if (imgB64) {
      pdf.addImage(imgB64, 'JPEG', cx - imgW/2, 48, imgW, imgH);
      pdf.setDrawColor(...black);
      pdf.setLineWidth(0.8);
      pdf.rect(cx - imgW/2, 48, imgW, imgH, 'S');
    } else {
      // Placeholder box
      pdf.setDrawColor(...grey);
      pdf.setLineWidth(0.5);
      pdf.setLineDashPattern([3, 3], 0);
      pdf.rect(cx - 80, 48, 160, 140, 'S');
      pdf.setLineDashPattern([], 0);
      pdf.setFontSize(11);
      pdf.setTextColor(...grey);
      pdf.text(isRtl ? 'لا توجد صورة' : 'Image not available', cx, 125, { align: 'center' });
    }

    // Page number
    pdf.setFontSize(9);
    pdf.setTextColor(...grey);
    pdf.text(`— ${i+1} —`, cx, PH - M - 6, { align: 'center' });
  }

  return pdf.output('blob');
}

export default function StoryViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [assets, setAssets] = useState<StoryAsset[]>([]);
  const [outputs, setOutputs] = useState<StoryOutputs>({});
  const [activeTab, setActiveTab] = useState<StoryTab>('story');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);

  // ─── PDF Generation: delegates to jsPDF builders, then uploads to backend ──
  const generateAndUploadPdf = useCallback(async (
    outputType: 'story_book_pdf' | 'coloring_book_pdf'
  ) => {
    if (!story || pdfGenerating) return;
    const label = outputType === 'story_book_pdf' ? 'Story Book' : 'Coloring Book';
    setPdfGenerating(label);

    try {
      const isRtl = story.language === 'ar';

      // Collect the correct asset list for this output type
      const imageAssets    = assets
        .filter(a => a.asset_type === 'image')
        .sort((a, b) => a.scene_number - b.scene_number);
      const coloringAssets = assets
        .filter(a => a.asset_type === 'coloring_page')
        .sort((a, b) => a.scene_number - b.scene_number);

      // Build the PDF blob using the dedicated jsPDF builders.
      // Each builder fetches its own images as base64 internally,
      // so we don't need to pre-fetch here.
      let pdfBlob: Blob;
      if (outputType === 'story_book_pdf') {
        pdfBlob = await buildStoryBookPdf(story, imageAssets, isRtl);
      } else {
        pdfBlob = await buildColoringBookPdf(story, coloringAssets, isRtl);
      }

      // Upload the generated PDF to the backend
      const res = await apiUploadStoryPdf(story.id, pdfBlob, outputType);
      setOutputs(prev => ({ ...prev, [outputType]: res.output }));

    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setPdfGenerating(null);
    }
  }, [story, assets, pdfGenerating]);

  useEffect(() => {
    if (!story || pdfGenerating) return;
    if (outputs.story_book_pdf?.status === 'planned') generateAndUploadPdf('story_book_pdf');
    else if (outputs.coloring_book_pdf?.status === 'planned') generateAndUploadPdf('coloring_book_pdf');
  }, [story, outputs, pdfGenerating, generateAndUploadPdf]);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopPolling = () => { if (pollingRef.current) clearTimeout(pollingRef.current); };

  const applyStatus = (status: StoryStatus) => {
    setStory(prev => prev ? {
      ...prev,
      status: status.status as Story['status'],
      processing_step: status.processing_step,
      error_message: status.error_message,
      assembled_video_url: status.assembled_video_url,
      narration_url: status.narration_url,
    } : prev);
    setOutputs(status.outputs || {});
  };

  const pollStatus = async (storyId: number) => {
    try {
      const status = await apiGetStoryStatus(storyId);
      applyStatus(status);
      if (status.status === 'processing') {
        const assetTotal = status.assets_count.images + status.assets_count.videos + status.assets_count.coloring_pages;
        if (assetTotal !== assets.length) {
          const { story: s2, assets: a2, outputs: o2 } = await apiGetStory(storyId);
          setStory(s2); setAssets(a2); setOutputs(o2 || {});
        }
        pollingRef.current = setTimeout(() => pollStatus(storyId), 5000);
      } else if (status.status === 'completed') {
        const { story: s2, assets: a2, outputs: o2 } = await apiGetStory(storyId);
        setStory(s2); setAssets(a2); setOutputs(o2 || {});
      }
    } catch {
      pollingRef.current = setTimeout(() => pollStatus(storyId), 8000);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push('/login'); return; }
    if (!id) return;
    const storyId = Number(id);
    (async () => {
      try {
        const { story: s, assets: a, outputs: o } = await apiGetStory(storyId);
        setStory(s); setAssets(a); setOutputs(o || {});
        if (s.status === 'processing') pollingRef.current = setTimeout(() => pollStatus(storyId), 5000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally { setLoading(false); }
    })();
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoggedIn, authLoading]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    stopPolling();
    try { await apiDeleteStory(Number(id)); router.push('/dashboard'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      draft:      { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Draft' },
      processing: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', label: 'Processing…' },
      completed:  { bg: 'rgba(52,211,153,0.15)',  color: '#34d399', label: 'Completed' },
      failed:     { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'Failed' },
    };
    const s = styles[status] || styles.draft;
    return <span style={{ background: s.bg, color: s.color, padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</span>;
  };

  const getThemeEmoji = (theme: string) => ({
    adventure: '🗺️', space: '🚀', jungle: '🌿', fantasy: '🏰',
    ocean: '🌊', dinosaur: '🦕', superhero: '🦸', princess: '👑', pirate: '⚓',
  } as Record<string, string>)[theme] || '✨';

  const getStepLabel = (step: string | null) => !step ? 'Ready' : step.replaceAll('_', ' ');
  const getProgress = () => {
    if (!story) return 0;
    if (story.status === 'completed' || story.status === 'failed') return 100;
    const step = story.processing_step;
    if (step === 'generate_story') return 15;
    if (step === 'generate_images') return 35;
    if (step === 'generate_videos') return 65;
    if (step === 'generate_narration') return 82;
    if (step === 'assemble_video') return 92;
    if (step === 'generate_story_products') return 97;
    return story.status === 'processing' ? 8 : 0;
  };

  const imageAssets    = assets.filter(a => a.asset_type === 'image').sort((a, b) => a.scene_number - b.scene_number);
  const videoAssets    = assets.filter(a => a.asset_type === 'video').sort((a, b) => a.scene_number - b.scene_number);
  const coloringAssets = assets.filter(a => a.asset_type === 'coloring_page').sort((a, b) => a.scene_number - b.scene_number);

  if (loading || authLoading) {
    return (
      <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CustomCursor /><Navbar />
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--k-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-2)' }}>Loading story…</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: '7rem' }}>
        <CustomCursor /><Navbar />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--k-pink)' }}>{error || 'Story not found'}</p>
          <button className="btn btn-ghost" onClick={() => router.push('/dashboard')} style={{ marginTop: '1rem' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const finalVideoUrl  = story.assembled_video_url || story.video_url || outputs.final_video?.url;
  const storyBook      = outputs.story_book_pdf;
  const interactiveBook = outputs.storybook_interactive;
  const flipbookStatus = interactiveBook?.status ?? storyBook?.status;
  const coloringBook   = outputs.coloring_book_pdf;
  const isRtl          = story.language === 'ar';

  let selectedOutputs: string[] = [];
  try {
    if (story.selected_outputs) {
      selectedOutputs = Array.isArray(story.selected_outputs)
        ? story.selected_outputs
        : JSON.parse(story.selected_outputs as unknown as string);
    }
  } catch { selectedOutputs = []; }

  const availableTabs = [
    { key: 'story'    as StoryTab, label: '📖 Story',         alwaysShow: true },
    { key: 'storybook'as StoryTab, label: '📚 Story Book',    condition: selectedOutputs.includes('story_book_pdf') },
    { key: 'coloring' as StoryTab, label: '🖍️ Coloring Book', condition: selectedOutputs.includes('coloring_book_pdf') },
    { key: 'audio'    as StoryTab, label: '🎙️ Audio',         condition: selectedOutputs.includes('audio') },
    { key: 'video'    as StoryTab, label: '🎞️ Video',         condition: selectedOutputs.includes('video') },
  ].filter(t => t.alwaysShow || t.condition);

  const DownloadButton = ({ output, label }: { output?: StoryOutput; label: string }) => {
    const isGen = output?.status === 'generating' || output?.status === 'planned' ||
      (pdfGenerating && (
        (output?.output_type === 'story_book_pdf'   && pdfGenerating === 'Story Book') ||
        (output?.output_type === 'coloring_book_pdf' && pdfGenerating === 'Coloring Book')
      ));
    if (output?.url && output.status === 'completed')
      return <a className="btn btn-primary" href={output.url} download style={{ display: 'inline-block' }}>⬇️ {label}</a>;
    if (output?.status === 'failed')
      return <span className="btn btn-ghost" style={{ opacity: 0.7, color: 'var(--k-pink)' }}>⚠️ PDF failed</span>;
    if (isGen)
      return <span className="btn btn-ghost" style={{ opacity: 0.7 }}>⏳ Generating PDF…</span>;
    return null;
  };

  return (
    <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <CustomCursor />
      <Navbar />

      <div className="section" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getThemeEmoji(story.theme)}</span>
              {getStatusBadge(story.status)}
            </div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{story.title}</h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>
              Created {new Date(story.created_at).toLocaleDateString()} · Theme: {story.theme.charAt(0).toUpperCase() + story.theme.slice(1)}
            </p>
          </motion.div>

          {/* Progress Block */}
          {(story.status === 'processing' || story.status === 'failed' || story.status === 'completed') && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
              style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(16px)', border: '1.5px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {story.status === 'processing' && <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid var(--k-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />}
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{getStepLabel(story.processing_step)}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: story.status === 'completed' ? 'var(--k-green)' : 'var(--k-blue)', fontSize: '1rem' }}>{getProgress()}%</span>
                  <button onClick={() => pollStatus(Number(id))} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '999px' }}>🔄 Refresh</button>
                </div>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: 'rgba(148,163,184,0.18)', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${getProgress()}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ height: '100%', background: story.status === 'failed' ? 'linear-gradient(90deg,#f87171,#ef4444)' : 'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)', boxShadow: '0 0 15px rgba(168,85,247,0.5)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                {[
                  { stepKey: 'generate_story',    label: '1. Story',    emoji: '✍️',  prog: 15 },
                  { stepKey: 'generate_images',   label: '2. Art',      emoji: '🎨',  prog: 35 },
                  { stepKey: 'generate_narration',label: '3. Voice',    emoji: '🎙️', prog: 82 },
                  { stepKey: 'generate_story_products', label: '4. PDF', emoji: '📚', prog: 97 },
                ].map(s => {
                  const done = getProgress() >= s.prog;
                  const isCurrent = story.processing_step === s.stepKey;
                  return (
                    <div key={s.stepKey} style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--r-md)', background: isCurrent ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.4)', border: isCurrent ? '1.5px solid var(--k-blue)' : '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontSize: '0.8rem', color: done ? 'var(--text)' : 'var(--text-3)' }}>
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{s.emoji}</div>
                      <div style={{ fontWeight: isCurrent ? 700 : 500 }}>{s.label}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.15rem', color: done ? 'var(--k-green)' : isCurrent ? 'var(--k-blue)' : 'var(--text-3)' }}>
                        {done ? '✓ Done' : isCurrent ? '● Processing…' : 'Waiting'}
                      </div>
                    </div>
                  );
                })}
              </div>
              {story.error_message && (
                <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>⚠️ {story.error_message}</p>
                  <button onClick={async () => { try { setLoading(true); await apiGenerateStory(Number(id)); const { story: s } = await apiGetStory(Number(id)); setStory(s); pollingRef.current = setTimeout(() => pollStatus(Number(id)), 3000); } catch (e) { setError(e instanceof Error ? e.message : 'Retry failed'); } finally { setLoading(false); } }} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>🔄 Retry</button>
                </div>
              )}
            </motion.div>
          )}

          {/* Tabs */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', position: 'sticky', top: 82, zIndex: 5, padding: '0.75rem', borderRadius: 'var(--r-lg)', background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)' }}>
            {availableTabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={activeTab === tab.key ? 'btn btn-primary' : 'btn btn-ghost'} style={{ padding: '0.65rem 0.95rem' }}>{tab.label}</button>
            ))}
          </div>

          {/* Story Tab */}
          {activeTab === 'story' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem' }}>
              {story.content && <section dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}><h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">📖 The Story</span></h3><p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{story.content}</p></section>}
              {imageAssets.length > 0 && <AssetGrid title="🖼️ Scene Images" assets={imageAssets} />}
              {story.scenes && story.scenes.length > 0 && <SceneBreakdown scenes={story.scenes} isRtl={isRtl} />}
            </motion.div>
          )}

          {/* Story Book Tab */}
          {activeTab === 'storybook' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
              <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3><span className="gradient-text">📚 Interactive Story Book</span></h3>
                    <p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>Print-ready pages with scene illustrations and {isRtl ? 'Arabic RTL' : 'English'} layout.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {flipbookStatus === 'completed'  && <span className="btn btn-ghost" style={{ opacity: 0.7, fontSize: '0.85rem' }}>📖 Viewer ✓</span>}
                    {(flipbookStatus === 'generating' || flipbookStatus === 'planned') && <span className="btn btn-ghost" style={{ opacity: 0.7, fontSize: '0.85rem' }}>⏳ Generating…</span>}
                    {flipbookStatus === 'failed' && <span className="btn btn-ghost" style={{ opacity: 0.7, fontSize: '0.85rem', color: 'var(--k-pink)' }}>⚠️ Failed</span>}
                    <DownloadButton output={storyBook} label="Download PDF (A4)" />
                  </div>
                </div>
              </section>
              {flipbookStatus === 'completed' ? (
                <StorybookViewer storyId={parseInt(Array.isArray(id) ? id[0] : id || '')} storybookUrl={story.storybook_url || ''} narrationUrl={story.narration_url} language={story.language || 'en'} />
              ) : flipbookStatus === 'failed' ? (
                <div style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</p>
                  <p style={{ color: 'var(--k-pink)', fontWeight: 600 }}>Storybook generation failed</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>{interactiveBook?.error_message || storyBook?.error_message}</p>
                </div>
              ) : (
                <div style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--k-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>Generating your interactive storybook…</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Usually 1–2 minutes. Page updates automatically.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Coloring Book Tab */}
          {activeTab === 'coloring' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
              <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3><span className="gradient-text">🖍️ Printable Coloring Book</span></h3>
                    <p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>Clean black-and-white line art pages.</p>
                  </div>
                  <DownloadButton output={coloringBook} label="Download PDF (A4)" />
                </div>
              </section>
              {coloringAssets.length > 0 ? (
                <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                  <h4 style={{ marginBottom: '1rem' }}>🎨 Coloring Pages</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1.5rem' }}>
                    {coloringAssets.map(asset => (
                      <div key={asset.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'white' }}>
                        <div style={{ position: 'relative', aspectRatio: '4/3', background: '#f5f5f5' }}>
                          <Image src={asset.url} alt={`Coloring Page ${asset.scene_number}`} fill sizes="(max-width:300px) 100vw" style={{ objectFit: 'contain' }} />
                        </div>
                        <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text)' }}>Page {asset.scene_number}</div>
                          <a href={asset.url} download={`coloring_page_${asset.scene_number}.jpg`} style={{ display: 'block', textAlign: 'center', fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', padding: '0.5rem', borderRadius: 'var(--r-sm)', background: 'var(--bg)', border: '1px solid var(--border)', marginTop: '0.5rem' }}>⬇️ Download</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--k-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>Generating coloring pages…</p>
                </section>
              )}
            </motion.div>
          )}

          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem' }}><span className="gradient-text">🎙️ Narration Audio</span></h3>
              {story.narration_url
                ? <><audio controls src={story.narration_url} style={{ width: '100%' }} /><a className="btn btn-primary" href={story.narration_url} download style={{ display: 'inline-block', marginTop: '1rem' }}>⬇️ Download Audio</a></>
                : <p style={{ color: 'var(--text-3)' }}>Narration has not been generated yet.</p>}
            </motion.div>
          )}

          {/* Video Tab */}
          {activeTab === 'video' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
              <section style={{ padding: '1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <h3 style={{ marginBottom: '1rem' }}><span className="gradient-text">🎞️ Final Story Video</span></h3>
                {finalVideoUrl
                  ? <><video src={finalVideoUrl} controls style={{ width: '100%', borderRadius: 'var(--r-md)', background: '#000' }} /><a className="btn btn-primary" href={finalVideoUrl} download style={{ display: 'inline-block', marginTop: '1rem' }}>⬇️ Download Video</a></>
                  : <p style={{ color: 'var(--text-3)' }}>Final MP4 has not been generated yet.</p>}
              </section>
              {videoAssets.length > 0 && !finalVideoUrl && <VideoGrid assets={videoAssets} />}
            </motion.div>
          )}

          {/* Meta */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem' }}>
            {story.child_name && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Child</p><p style={{ fontWeight: 600 }}>{story.child_name}</p></div>}
            {story.child_age  && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Age</p><p style={{ fontWeight: 600 }}>{story.child_age} years</p></div>}
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Language</p><p style={{ fontWeight: 600 }}>{story.language.toUpperCase()}</p></div>
            {selectedOutputs.includes('story_book_pdf')   && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Story Book</p><p style={{ fontWeight: 600 }}>{storyBook?.status === 'completed' ? '✓ Ready' : 'Processing'}</p></div>}
            {selectedOutputs.includes('coloring_book_pdf')&& <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Coloring Book</p><p style={{ fontWeight: 600 }}>{coloringBook?.status === 'completed' ? '✓ Ready' : 'Processing'}</p></div>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>← Back</button>
            <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--k-pink)' }}>🗑️ Delete Story</button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

function AssetGrid({ title, assets }: { title: string; assets: StoryAsset[] }) {
  if (!assets.length) return null;
  return (
    <section style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">{title}</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
        {assets.map(asset => (
          <div key={asset.id} style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
            <Image src={asset.url} alt={`Scene ${asset.scene_number}`} width={420} height={520} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
            <p style={{ padding: '0.75rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>Scene {asset.scene_number}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function VideoGrid({ assets }: { assets: StoryAsset[] }) {
  return (
    <section>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🎥 Scene Videos</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem' }}>
        {assets.map(asset => (
          <div key={asset.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
            <video src={asset.url} controls style={{ width: '100%', display: 'block' }} />
            <p style={{ padding: '0.5rem 0.75rem', color: 'var(--text-3)', fontSize: '0.8rem' }}>Scene {asset.scene_number}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SceneBreakdown({ scenes, isRtl }: { scenes: Story['scenes']; isRtl: boolean }) {
  if (!scenes?.length) return null;
  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">📋 Scene Breakdown</span></h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {scenes.map((scene, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--k-blue),var(--k-pink))', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{scene.scene_number || i + 1}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{scene.description}</p>
              {scene.image_prompt && <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{scene.image_prompt}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
