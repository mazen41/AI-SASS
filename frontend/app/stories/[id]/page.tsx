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

// ─── Convert an image URL to a base64 data-URL ───────────────────────────────
// html2canvas cannot load cross-origin images even with useCORS:true unless the
// server sends the right CORS headers — which S3/CDN often don't for <canvas>.
// Embedding images as base64 data-URLs completely bypasses the CORS restriction.
async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fallback – image may still load if same-origin
  }
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

  // ─── PDF Generation (Next.js / html2pdf, all images embedded as base64) ─────
  const generateAndUploadPdf = useCallback(async (
    outputType: 'story_book_pdf' | 'coloring_book_pdf'
  ) => {
    if (!story || pdfGenerating) return;
    const label = outputType === 'story_book_pdf' ? 'Story Book' : 'Coloring Book';
    setPdfGenerating(label);

    try {
      // 1. Collect image URLs we need
      const imageAssets = assets.filter(a => a.asset_type === 'image').sort((a, b) => a.scene_number - b.scene_number);
      const coloringAssets = assets.filter(a => a.asset_type === 'coloring_page').sort((a, b) => a.scene_number - b.scene_number);

      // 2. Resolve all images to base64 in parallel (bypasses CORS canvas block)
      const urlsToFetch = outputType === 'story_book_pdf'
        ? imageAssets.map(a => a.url)
        : coloringAssets.map(a => a.url);

      const base64Map: Record<string, string> = {};
      await Promise.all(urlsToFetch.map(async url => {
        base64Map[url] = await toDataUrl(url);
      }));

      // 3. Build HTML string for the PDF (NOT rendered to DOM — avoids layout side-effects)
      const isRtl = story.language === 'ar';
      const dir = isRtl ? 'rtl' : 'ltr';
      const scenes = story.scenes ?? [];

      let html = '';
      const page = (content: string, bg = '#FFF8E7', border = '#C8A96E') =>
        `<div style="width:794px;min-height:1123px;box-sizing:border-box;padding:48px;
          background:${bg};page-break-after:always;display:flex;flex-direction:column;
          align-items:center;justify-content:space-between;
          border:16px solid ${border};font-family:Georgia,serif;direction:${dir};">
          ${content}
        </div>`;

      const hr = (color = '#C8A96E') =>
        `<div style="width:200px;height:3px;background:${color};margin:16px auto;border-radius:2px;"></div>`;

      const starRow = (color = '#C8A96E', n = 5) =>
        `<div style="color:${color};font-size:20px;letter-spacing:8px;margin:8px 0;">${'✦'.repeat(n)}</div>`;

      if (outputType === 'story_book_pdf') {
        // ── Cover ──────────────────────────────────────────────────────────────
        const coverB64 = base64Map[imageAssets[0]?.url ?? ''] ?? '';
        html += page(`
          <div style="text-align:center;width:100%;margin-top:32px;">
            ${starRow('#D4AF37', 7)}
            <div style="font-size:13px;font-weight:700;color:#6B3FA0;letter-spacing:4px;
              text-transform:uppercase;margin-bottom:12px;">
              ${isRtl ? 'قصة مصورة' : 'Story Hero'}
            </div>
            <h1 style="font-size:42px;color:#3D1F6E;margin:0;line-height:1.2;font-weight:bold;">
              ${story.title}
            </h1>
            ${hr('#D4AF37')}
          </div>
          ${coverB64 ? `
          <div style="width:580px;height:420px;border-radius:16px;overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,0.25);border:5px solid #D4AF37;">
            <img src="${coverB64}" style="width:100%;height:100%;object-fit:cover;" />
          </div>` : '<div style="height:420px;"></div>'}
          <div style="text-align:center;margin-bottom:32px;">
            ${story.child_name ? `
              <div style="font-size:15px;color:#888;font-style:italic;margin-bottom:6px;">
                ${isRtl ? 'بطولة' : 'Starring'}
              </div>
              <div style="font-size:28px;color:#3D1F6E;font-weight:bold;
                border:2px solid #D4AF37;display:inline-block;padding:8px 32px;
                border-radius:8px;background:rgba(212,175,55,0.1);">
                ${story.child_name}
              </div>` : ''}
            ${starRow('#D4AF37', 7)}
          </div>
        `);

        // ── Scene pages ────────────────────────────────────────────────────────
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const asset = imageAssets.find(a => a.scene_number === scene.scene_number);
          const b64 = asset ? (base64Map[asset.url] ?? '') : '';
          const title = (scene as any).title ?? (isRtl ? `الصفحة ${i + 1}` : `Page ${i + 1}`);
          const text = scene.description ?? (scene as any).text ?? '';

          html += page(`
            <div style="text-align:center;width:100%;margin-top:8px;">
              <h2 style="font-size:28px;color:#3D1F6E;margin:0;font-weight:bold;">
                ${title}
              </h2>
              ${hr()}
            </div>
            ${b64 ? `
            <div style="width:580px;height:400px;border-radius:12px;overflow:hidden;
              box-shadow:0 6px 24px rgba(0,0,0,0.2);border:4px solid #C8A96E;">
              <img src="${b64}" style="width:100%;height:100%;object-fit:cover;" />
            </div>` : '<div style="height:400px;"></div>'}
            <div style="width:100%;text-align:center;margin-bottom:8px;">
              <p style="font-size:19px;color:#333;line-height:1.75;margin:0;
                padding:0 16px;font-family:Georgia,serif;">
                ${text}
              </p>
              <div style="margin-top:16px;font-size:13px;color:#AAA;">— ${i + 1} —</div>
            </div>
          `);
        }

        // ── End page ───────────────────────────────────────────────────────────
        html += page(`
          <div style="flex:1;display:flex;align-items:center;justify-content:center;
            width:100%;text-align:center;">
            <div>
              ${starRow('#D4AF37', 7)}
              <h1 style="font-size:52px;color:#3D1F6E;margin:16px 0;font-weight:bold;">
                ${isRtl ? 'النهاية' : 'The End'}
              </h1>
              ${hr('#D4AF37')}
              <p style="font-size:20px;color:#666;font-style:italic;margin-top:12px;">
                ${isRtl
                  ? 'شكراً لقراءة هذه القصة الرائعة!'
                  : 'Thank you for reading this amazing story!'}
              </p>
              ${starRow('#D4AF37', 7)}
            </div>
          </div>
        `);

      } else {
        // ── Coloring Book Cover ────────────────────────────────────────────────
        html += page(`
          <div style="text-align:center;width:100%;margin-top:40px;">
            <div style="font-size:48px;margin-bottom:16px;">🖍️</div>
            <h1 style="font-size:44px;color:#111;margin:0;font-weight:bold;">
              ${isRtl ? 'كتاب التلوين' : 'My Coloring Book'}
            </h1>
            ${hr('#333')}
            <h2 style="font-size:24px;color:#555;margin:8px 0;font-weight:normal;">
              ${story.title}
            </h2>
          </div>
          <div style="text-align:center;margin-bottom:40px;">
            ${story.child_name ? `
              <div style="font-size:18px;color:#777;margin-bottom:12px;">
                ${isRtl ? 'تلوين البطل' : 'Coloring by'}
              </div>
              <div style="font-size:32px;color:#111;font-weight:bold;
                border:3px dashed #333;display:inline-block;padding:10px 40px;
                border-radius:12px;min-width:200px;">
                ${story.child_name}
              </div>` : ''}
          </div>
        `, '#FFFFFF', '#333333');

        // ── Coloring pages ─────────────────────────────────────────────────────
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const asset = coloringAssets.find(a => a.scene_number === scene.scene_number);
          const b64 = asset ? (base64Map[asset.url] ?? '') : '';
          const title = (scene as any).title ?? (isRtl ? `صفحة تلوين ${i + 1}` : `Coloring Page ${i + 1}`);

          html += page(`
            <div style="text-align:center;width:100%;margin-top:8px;">
              <h2 style="font-size:26px;color:#111;margin:0;font-weight:bold;">
                ${title}
              </h2>
              <div style="width:160px;height:2px;background:#333;margin:12px auto;"></div>
            </div>
            ${b64 ? `
            <div style="width:600px;height:460px;border:2px solid #333;overflow:hidden;">
              <img src="${b64}" style="width:100%;height:100%;object-fit:contain;" />
            </div>` : `
            <div style="width:600px;height:460px;border:2px dashed #ccc;
              display:flex;align-items:center;justify-content:center;color:#bbb;font-size:18px;">
              ${isRtl ? 'لا توجد صورة' : 'No image'}
            </div>`}
            <div style="width:100%;text-align:center;margin-bottom:8px;">
              <div style="font-size:13px;color:#999;">— ${i + 1} —</div>
            </div>
          `, '#FFFFFF', '#333333');
        }
      }

      // 4. Create a temporary container and inject the page divs directly.
      //    IMPORTANT: never set innerHTML to a full <!DOCTYPE html> string —
      //    browsers silently strip <html>/<head>/<body> tags when assigned via
      //    innerHTML, leaving the container empty and producing a blank PDF.
      const container = document.createElement('div');
      container.style.cssText = [
        'position:fixed', 'left:-99999px', 'top:0',
        'width:794px', 'background:white',
        'font-family:Georgia,serif',
      ].join(';');
      // html is already just the inner page divs — no document wrapper needed
      container.innerHTML = html;
      document.body.appendChild(container);

      // Give the browser one frame to finish layout before capture
      await new Promise(r => requestAnimationFrame(r));

      const html2pdf = (await import('html2pdf.js')).default;
      const pdfBlob: Blob = await html2pdf()
        .from(container)
        .set({
          margin: 0,
          filename: `${outputType === 'story_book_pdf' ? 'story' : 'coloring'}_book.pdf`,
          image: { type: 'jpeg', quality: 0.90 },
          html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: false },
          jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' },
        })
        .output('blob');

      document.body.removeChild(container);

      // 6. Upload to Laravel
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
