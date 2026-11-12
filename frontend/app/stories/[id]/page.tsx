'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  apiGetStory,
  apiGetStoryStatus,
  apiGenerateStory,
  apiDeleteStory,
  apiUploadStoryPdf,
  Story,
  StoryAsset,
  StoryOutput,
  StoryOutputs,
  StoryStatus,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import StorybookViewer from '@/components/StorybookViewer';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  BookOpen,
  Film,
  Palette,
  Volume2,
  Play,
  Pause,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Share2,
  Printer,
  Sparkles,
  Layers,
  FileText,
  User,
  Globe2,
  Loader2,
} from 'lucide-react';

const EXPECTED_SCENE_COUNT = 6;
type StoryTab = 'story' | 'storybook' | 'coloring' | 'audio' | 'video';

export default function StoryViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const isRtl = locale === 'ar';

  const [story, setStory] = useState<Story | null>(null);
  const [assets, setAssets] = useState<StoryAsset[]>([]);
  const [outputs, setOutputs] = useState<StoryOutputs>({});
  const [creditReservation, setCreditReservation] = useState<StoryStatus['credit_reservation']>(null);
  const [activeTab, setActiveTab] = useState<StoryTab>('story');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState<string | null>(null);

  // ─── PDF Generation: delegates to html2pdf on hidden templates ──
  const generateAndUploadPdf = useCallback(
    async (outputType: 'story_book_pdf' | 'coloring_book_pdf') => {
      if (!story || pdfGenerating) return;
      const label = outputType === 'story_book_pdf' ? 'Story Book' : 'Coloring Book';
      setPdfGenerating(label);

      try {
        await document.fonts.ready;
        const elementId =
          outputType === 'story_book_pdf'
            ? 'story-book-pdf-template'
            : 'coloring-book-pdf-template';
        const element = document.getElementById(elementId);
        if (!element) throw new Error('Template element not found in DOM');

        const images = element.querySelectorAll('img');
        const loadPromises = Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });
        await Promise.all(loadPromises);

        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin: 0,
          filename: `${outputType === 'story_book_pdf' ? 'story' : 'coloring'}_book.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            letterRendering: true,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
        const res = await apiUploadStoryPdf(story.id, pdfBlob, outputType);
        setOutputs((prev) => ({ ...prev, [outputType]: res.output }));
      } catch (err) {
        console.error('Failed to generate PDF:', err);
      } finally {
        setPdfGenerating(null);
      }
    },
    [story, pdfGenerating]
  );

  useEffect(() => {
    if (!story || pdfGenerating) return;
    if (outputs.story_book_pdf?.status === 'planned') generateAndUploadPdf('story_book_pdf');
    else if (outputs.coloring_book_pdf?.status === 'planned')
      generateAndUploadPdf('coloring_book_pdf');
  }, [story, outputs, pdfGenerating, generateAndUploadPdf]);

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopPolling = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
  };

  const applyStatus = (status: StoryStatus) => {
    setStory((prev) =>
      prev
        ? {
            ...prev,
            status: status.status as Story['status'],
            processing_step: status.processing_step,
            error_message: status.error_message,
            assembled_video_url: status.assembled_video_url,
            narration_url: status.narration_url,
          }
        : prev
    );
    setOutputs(status.outputs || {});
    setCreditReservation(status.credit_reservation || null);
  };

  const pollStatus = async (storyId: number) => {
    try {
      const status = await apiGetStoryStatus(storyId);
      applyStatus(status);
      if (status.status === 'processing') {
        const assetTotal =
          status.assets_count.images +
          status.assets_count.videos +
          status.assets_count.coloring_pages;
        if (assetTotal !== assets.length) {
          const { story: s2, assets: a2, outputs: o2 } = await apiGetStory(storyId);
          setStory(s2);
          setAssets(a2);
          setOutputs(o2 || {});
        }
        pollingRef.current = setTimeout(() => pollStatus(storyId), 5000);
      } else if (status.status === 'completed') {
        const { story: s2, assets: a2, outputs: o2 } = await apiGetStory(storyId);
        setStory(s2);
        setAssets(a2);
        setOutputs(o2 || {});
      }
    } catch {
      pollingRef.current = setTimeout(() => pollStatus(storyId), 8000);
    }
  };

  useEffect(() => {
    const loadFonts = async () => {
      try {
        const fontReg = new FontFace('AmiriCustom', "url('/Amiri/Amiri-Regular.ttf')");
        const fontBold = new FontFace('AmiriCustom', "url('/Amiri/Amiri-Bold.ttf')", {
          weight: 'bold',
        });
        const fontItalic = new FontFace('AmiriCustom', "url('/Amiri/Amiri-Italic.ttf')", {
          style: 'italic',
        });
        await Promise.all([fontReg.load(), fontBold.load(), fontItalic.load()]);
        document.fonts.add(fontReg);
        document.fonts.add(fontBold);
        document.fonts.add(fontItalic);
      } catch (err) {
        console.error('Failed to load Amiri Custom fonts:', err);
      }
    };
    loadFonts();

    if (authLoading) return;
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (!id) return;

    const storyId = Number(id);
    (async () => {
      try {
        const { story: s, assets: a, outputs: o } = await apiGetStory(storyId);
        setStory(s);
        setAssets(a);
        setOutputs(o || {});
        if (s.status === 'processing') {
          pollingRef.current = setTimeout(() => pollStatus(storyId), 5000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    })();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoggedIn, authLoading]);

  const handleDelete = async () => {
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذه القصة؟' : 'Are you sure you want to delete this story?'))
      return;
    stopPolling();
    try {
      await apiDeleteStory(Number(id));
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getProgress = () => {
    if (!story) return 0;
    if (story.status === 'completed' || story.status === 'failed') return 100;
    const step = story.processing_step;
    if (step === 'generate_story') return 18;
    if (step === 'generate_images') return 42;
    if (step === 'generate_videos') return 68;
    if (step === 'generate_narration') return 84;
    if (step === 'assemble_video') return 94;
    if (step === 'generate_story_products') return 98;
    return story.status === 'processing' ? 10 : 0;
  };

  const imageAssets = assets
    .filter((a) => a.asset_type === 'image')
    .sort((a, b) => a.scene_number - b.scene_number);
  const videoAssets = assets
    .filter((a) => a.asset_type === 'video')
    .sort((a, b) => a.scene_number - b.scene_number);
  const coloringAssets = assets
    .filter((a) => a.asset_type === 'coloring_page')
    .sort((a, b) => a.scene_number - b.scene_number);

  if (loading || authLoading) {
    return (
      <div
        data-theme={theme}
        className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--k-blue)]"
      >
        <CustomCursor />
        <Navbar />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-brand-blue" />
          <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">
            Loading Story Studio...
          </p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div
        data-theme={theme}
        className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center p-6 text-center"
      >
        <CustomCursor />
        <Navbar />
        <div className="studio-card p-8 max-w-md w-full space-y-4">
          <AlertCircle size={40} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {error || 'Story not found'}
          </h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="py-2.5 px-6 rounded-xl text-xs font-bold bg-brand-blue text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const finalVideoUrl = story.assembled_video_url || story.video_url || outputs.final_video?.url;
  const storyBook = outputs.story_book_pdf;
  const coloringBook = outputs.coloring_book_pdf;

  let selectedOutputs: string[] = [];
  try {
    if (story.selected_outputs) {
      selectedOutputs = Array.isArray(story.selected_outputs)
        ? story.selected_outputs
        : JSON.parse(story.selected_outputs as unknown as string);
    }
  } catch {
    selectedOutputs = [];
  }

  const availableTabs = [
    { key: 'story' as StoryTab, label: isRtl ? '📖 قصة المشاهد' : '📖 Story Scenes', alwaysShow: true },
    {
      key: 'storybook' as StoryTab,
      label: isRtl ? '📚 الكتاب المصور' : '📚 Storybook',
      condition: selectedOutputs.includes('story_book_pdf') || Boolean(storyBook?.url),
    },
    {
      key: 'coloring' as StoryTab,
      label: isRtl ? '🖍️ كتاب التلوين' : '🖍️ Coloring Sheets',
      condition: selectedOutputs.includes('coloring_book_pdf') || coloringAssets.length > 0,
    },
    {
      key: 'video' as StoryTab,
      label: isRtl ? '🎞️ الفيديو السينمائي' : '🎞️ 4K Video',
      condition: selectedOutputs.includes('video') || Boolean(finalVideoUrl),
    },
  ].filter((t) => t.alwaysShow || t.condition);

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased relative overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <CustomCursor />
      <Navbar />

      {/* Volumetric glow */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.15 }} />
        <div className="studio-glow-orb-2" style={{ opacity: 0.1 }} />
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        {/* Story Header Card */}
        <section className="studio-card p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                {story.theme} UNIVERSE
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  story.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : story.status === 'processing'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}
              >
                {story.status === 'completed' && <CheckCircle2 size={11} />}
                {story.status === 'processing' && <Clock size={11} />}
                <span>{story.status}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
              {story.title}
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Created on {new Date(story.created_at).toLocaleDateString(isRtl ? 'ar' : 'en')} ·{' '}
              {story.child_name ? `Starring ${story.child_name}` : 'Custom Hero'} · Language:{' '}
              {story.language.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => pollStatus(Number(id))}
              className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={story.status === 'processing' ? 'animate-spin' : ''} />
              <span>{isRtl ? 'تحديث' : 'Refresh'}</span>
            </button>
            <button
              onClick={handleDelete}
              className="py-2.5 px-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete Story"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </section>

        {/* Real-time Production Progress Meter */}
        {story.status === 'processing' && (
          <section className="studio-card p-6 sm:p-8 rounded-3xl border border-cyan-500/30 bg-cyan-500/[0.03] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isRtl ? 'خط الإنتاج قيد المعالجة الآن' : 'AI Generation Pipeline in Progress'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Step: {story.processing_step?.replaceAll('_', ' ') || 'Generating assets'}
                  </p>
                </div>
              </div>
              <span className="text-xl font-mono font-black text-cyan-400">
                {getProgress()}%
              </span>
            </div>

            {/* Glowing Progress bar */}
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink transition-all duration-700 shadow-md shadow-brand-blue/30"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
            {creditReservation && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs"><span>{isRtl ? 'الرصيد المحجوز:' : 'Credits reserved:'} <strong>{creditReservation.amount.toLocaleString()}</strong></span><span className="text-cyan-400">{creditReservation.status === 'reserved' ? (isRtl ? 'لن يتم اعتماد الخصم حتى اكتمال المخرجات' : 'Final charge is pending successful outputs') : creditReservation.status}</span></div>}

            {/* Pipeline Stage Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {[
                { key: 'generate_story', label: '1. Scriptwriting', prog: 18 },
                { key: 'generate_images', label: '2. 4K Character Art', prog: 42 },
                { key: 'generate_narration', label: '3. Voice Studio', prog: 84 },
                { key: 'assemble_video', label: '4. Video Render', prog: 98 },
              ].map((st) => {
                const done = getProgress() >= st.prog;
                return (
                  <div
                    key={st.key}
                    className={`p-2.5 rounded-xl border text-[11px] font-mono text-center ${
                      done
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-200 dark:border-white/5 text-slate-500'
                    }`}
                  >
                    <span>{st.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 overflow-x-auto">
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: STORY SCENES */}
        {activeTab === 'story' && (
          <div className="space-y-6">
            {imageAssets.length === 0 ? (
              <div className="studio-card p-12 text-center text-slate-400">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {story.status === 'processing'
                    ? 'Scene artwork is currently being synthesized...'
                    : 'No scene images found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {imageAssets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    whileHover={{ y: -3 }}
                    className="studio-card rounded-3xl overflow-hidden border border-white/10 shadow-lg flex flex-col"
                  >
                    <div className="relative h-64 w-full bg-slate-900">
                      {asset.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={`Scene ${asset.scene_number}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          Rendering...
                        </div>
                      )}
                      <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                        SCENE {asset.scene_number}
                      </div>
                    </div>

                    <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {asset.prompt && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                            {asset.prompt}
                          </p>
                        )}
                      </div>

                      {asset.url && (
                        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex justify-end">
                          <a
                            href={asset.url}
                            target="_blank"
                            download={`scene_${asset.scene_number}.png`}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-blue hover:text-brand-purple transition-colors"
                          >
                            <Download size={13} />
                            <span>{isRtl ? 'تحميل الصورة' : 'Download 4K Art'}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STORYBOOK VIEWER */}
        {activeTab === 'storybook' && (
          <div className="studio-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRtl ? 'الكتاب المصور التفاعلي' : 'Interactive Keepsake Storybook'}
                </h3>
                <p className="text-xs text-slate-400">
                  Flip through pages with voice narration or download the ready-to-print PDF
                </p>
              </div>

              {storyBook?.url && (
                <a
                  href={storyBook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md shadow-brand-blue/20"
                >
                  <Download size={14} />
                  <span>{isRtl ? 'تحميل كتاب PDF' : 'Download Storybook PDF'}</span>
                </a>
              )}
            </div>

            <StorybookViewer
              storyId={story.id}
              storybookUrl={outputs.storybook_interactive?.url || ''}
              narrationUrl={story.narration_url}
              language={story.language}
            />
          </div>
        )}

        {/* TAB 3: COLORING BOOK */}
        {activeTab === 'coloring' && (
          <div className="studio-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRtl ? 'كتاب التلوين عالي الدقة' : 'Printable Coloring Book'}
                </h3>
                <p className="text-xs text-slate-400">
                  High-contrast black & white lineart sheets for your child to color
                </p>
              </div>

              {coloringBook?.url && (
                <a
                  href={coloringBook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md shadow-emerald-600/20"
                >
                  <Download size={14} />
                  <span>{isRtl ? 'تحميل كتاب التلوين PDF' : 'Download Coloring Book'}</span>
                </a>
              )}
            </div>

            {coloringAssets.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Palette size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-xs">No coloring sheets rendered yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {coloringAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white p-3 space-y-2 group"
                  >
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-white">
                      {asset.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={`Coloring ${asset.scene_number}`}
                          className="w-full h-full object-contain filter contrast-125"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono font-bold text-slate-900">
                        Page {asset.scene_number}
                      </span>
                      {asset.url && (
                        <a
                          href={asset.url}
                          target="_blank"
                          download={`coloring_page_${asset.scene_number}.png`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-100 transition-colors"
                        >
                          <Printer size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: 4K VIDEO PLAYER */}
        {activeTab === 'video' && (
          <div className="studio-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRtl ? 'العرض السينمائي 4K' : 'Cinematic 4K Story Video'}
                </h3>
                <p className="text-xs text-slate-400">
                  Full animated feature with atmospheric Dolby audio narration
                </p>
              </div>

              {finalVideoUrl && (
                <a
                  href={finalVideoUrl}
                  target="_blank"
                  download={`${story.title}.mp4`}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold bg-brand-pink text-white hover:opacity-90 transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-md shadow-brand-pink/20"
                >
                  <Download size={14} />
                  <span>{isRtl ? 'تحميل الفيديو MP4' : 'Download 4K Video'}</span>
                </a>
              )}
            </div>

            {finalVideoUrl ? (
              <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-2xl border border-white/15">
                <video
                  src={finalVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={imageAssets[0]?.url || undefined}
                />
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <Film size={44} className="mx-auto mb-3 opacity-30 text-brand-pink" />
                <p className="text-sm font-bold text-slate-300">
                  {story.status === 'processing'
                    ? 'Video assembly is rendering in the background...'
                    : 'Video deliverable was not requested or is pending.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hidden PDF Generation Templates (Used by html2pdf) */}
      <div className="hidden" aria-hidden="true">
        <div id="story-book-pdf-template" className="p-8 bg-white text-black font-serif">
          <h1 className="text-3xl font-bold mb-4">{story.title}</h1>
          <p className="mb-6">{story.content}</p>
          {imageAssets.map((asset) => (
            <div key={asset.id} className="mb-6 page-break-after">
              {asset.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/proxy-image?url=${encodeURIComponent(asset.url)}`}
                  alt={`Scene ${asset.scene_number}`}
                  className="w-full h-auto"
                />
              )}
              <p className="mt-2 text-sm">{asset.prompt}</p>
            </div>
          ))}
        </div>

        <div id="coloring-book-pdf-template" className="p-8 bg-white text-black font-serif">
          <h1 className="text-3xl font-bold mb-4">{story.title} - Coloring Book</h1>
          {coloringAssets.map((asset) => (
            <div key={asset.id} className="mb-6 page-break-after">
              {asset.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/proxy-image?url=${encodeURIComponent(asset.url)}`}
                  alt={`Coloring ${asset.scene_number}`}
                  className="w-full h-auto"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
