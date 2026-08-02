'use client';



import type { ReactNode } from 'react';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { useParams, useRouter } from 'next/navigation';

import { motion } from 'framer-motion';

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

import Navbar from '@/components/Navbar';

import CustomCursor from '@/components/CustomCursor';

import StorybookViewer from '@/components/StorybookViewer';



const EXPECTED_SCENE_COUNT = 6;



type StoryTab = 'story' | 'storybook' | 'coloring' | 'audio' | 'video';



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

  const preloadImages = (urls: string[]) => {
    return Promise.all(
      urls.map((url) => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = resolve;
          img.onerror = resolve; // resolve anyway to not block
          img.src = url;
        });
      })
    );
  };

  const generateAndUploadPdf = async (outputType: 'story_book_pdf' | 'coloring_book_pdf') => {
    if (!story || pdfGenerating) return;

    setPdfGenerating(outputType === 'story_book_pdf' ? 'Story Book' : 'Coloring Book');

    try {
      const imageUrls: string[] = [];
      if (outputType === 'story_book_pdf') {
        const coverImage = assets.find(a => a.scene_number === 1 && a.asset_type === 'image')?.url;
        if (coverImage) imageUrls.push(coverImage);
        story.scenes?.forEach(scene => {
          const img = assets.find(a => a.scene_number === scene.scene_number && a.asset_type === 'image')?.url;
          if (img) imageUrls.push(img);
        });
      } else {
        story.scenes?.forEach(scene => {
          const img = assets.find(a => a.scene_number === scene.scene_number && a.asset_type === 'coloring_page')?.url;
          if (img) imageUrls.push(img);
        });
      }

      await preloadImages(imageUrls);

      const html2pdf = (await import('html2pdf.js')).default;
      const elementId = outputType === 'story_book_pdf' ? 'story-book-pdf-template' : 'coloring-book-pdf-template';
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Template element not found in DOM');
      }

      const opt = {
        margin: 0,
        filename: `${outputType === 'story_book_pdf' ? 'story' : 'coloring'}_book.pdf`,
        image: { type: 'jpeg', quality: 0.82 },
        html2canvas: { 
          scale: 1.5, 
          useCORS: true, 
          logging: false,
          allowTaint: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
      const res = await apiUploadStoryPdf(story.id, pdfBlob, outputType);

      setOutputs(prev => ({
        ...prev,
        [outputType]: res.output
      }));

    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setPdfGenerating(null);
    }
  };

  useEffect(() => {
    if (!story || pdfGenerating) return;

    if (outputs.story_book_pdf?.status === 'planned') {
      generateAndUploadPdf('story_book_pdf');
    } else if (outputs.coloring_book_pdf?.status === 'planned') {
      generateAndUploadPdf('coloring_book_pdf');
    }
  }, [story, outputs, pdfGenerating]);

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

  };



  const pollStatus = async (storyId: number) => {

    try {

      const status = await apiGetStoryStatus(storyId);

      applyStatus(status);



      if (status.status === 'processing') {

        const assetTotal = status.assets_count.images + status.assets_count.videos + status.assets_count.coloring_pages;

        if (assetTotal !== assets.length) {

          const { story: freshStory, assets: freshAssets, outputs: freshOutputs } = await apiGetStory(storyId);

          setStory(freshStory);

          setAssets(freshAssets);

          setOutputs(freshOutputs || {});

        }

        pollingRef.current = setTimeout(() => pollStatus(storyId), 5000);

      } else if (status.status === 'completed') {

        const { story: freshStory, assets: freshAssets, outputs: freshOutputs } = await apiGetStory(storyId);

        setStory(freshStory);

        setAssets(freshAssets);

        setOutputs(freshOutputs || {});

      }

    } catch {

      pollingRef.current = setTimeout(() => pollStatus(storyId), 8000);

    }

  };



  useEffect(() => {

    if (authLoading) return;

    if (!isLoggedIn) {

      router.push('/login');

      return;

    }

    if (!id) return;



    const storyId = Number(id);

    const load = async () => {

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

    };



    load();

    return () => stopPolling();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [id, isLoggedIn, authLoading]);



  const handleDelete = async () => {

    if (!confirm('Are you sure you want to delete this story?')) return;

    stopPolling();

    try {

      await apiDeleteStory(Number(id));

      router.push('/dashboard');

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to delete');

    }

  };



  const getStatusBadge = (status: string) => {

    const styles: Record<string, { bg: string; color: string; label: string }> = {

      draft: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Draft' },

      processing: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Processing…' },

      completed: { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: 'Completed' },

      failed: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'Failed' },

    };

    const s = styles[status] || styles.draft;

    return <span style={{ background: s.bg, color: s.color, padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}>{s.label}</span>;

  };



  const getThemeEmoji = (theme: string) => {

    const emojis: Record<string, string> = {

      adventure: '🗺️', space: '🚀', jungle: '🌿', fantasy: '🏰',

      ocean: '🌊', dinosaur: '🦕', superhero: '🦸', princess: '👑', pirate: '⚓',

    };

    return emojis[theme] || '✨';

  };



  const getStepLabel = (step: string | null) => (!step ? 'Ready' : step.replaceAll('_', ' '));



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



  const imageAssets = assets.filter((a) => a.asset_type === 'image').sort((a, b) => a.scene_number - b.scene_number);

  const videoAssets = assets.filter((a) => a.asset_type === 'video').sort((a, b) => a.scene_number - b.scene_number);

  const coloringAssets = assets.filter((a) => a.asset_type === 'coloring_page').sort((a, b) => a.scene_number - b.scene_number);

  const expectedSceneCount = story?.scenes?.length || EXPECTED_SCENE_COUNT;



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



  const finalVideoUrl = story.assembled_video_url || story.video_url || outputs.final_video?.url;

  const storyBook = outputs.story_book_pdf;

  const interactiveBook = outputs.storybook_interactive;

  // Backward-compat: stories generated before the story_book_pdf /
  // storybook_interactive split may only have status on storyBook.
  const flipbookStatus = interactiveBook?.status ?? storyBook?.status;

  const coloringBook = outputs.coloring_book_pdf;

  const isRtl = story.language === 'ar';

  // Parse selected outputs to determine which tabs to show
  let selectedOutputs: string[] = [];
  try {
    if (story.selected_outputs) {
      // Handle both array and string formats
      if (Array.isArray(story.selected_outputs)) {
        selectedOutputs = story.selected_outputs;
      } else if (typeof story.selected_outputs === 'string') {
        selectedOutputs = JSON.parse(story.selected_outputs);
      }
    }
  } catch (e) {
    console.error('Failed to parse selected_outputs:', story.selected_outputs, e);
    selectedOutputs = [];
  }
  
  // Determine which tabs should be visible based on user selection
  const availableTabs = [
    { key: 'story' as StoryTab, label: 'Story', alwaysShow: true }, // Story tab always shows
    { key: 'storybook' as StoryTab, label: 'Story Book', condition: selectedOutputs.includes('story_book_pdf') },
    { key: 'coloring' as StoryTab, label: 'Coloring Book', condition: selectedOutputs.includes('coloring_book_pdf') },
    { key: 'audio' as StoryTab, label: 'Audio', condition: selectedOutputs.includes('audio') },
    { key: 'video' as StoryTab, label: 'Video', condition: selectedOutputs.includes('video') },
  ].filter(tab => tab.alwaysShow || tab.condition);
  
  // Debug: log the available tabs
  console.log('Available tabs:', availableTabs);



  const DownloadButton = ({ output, label }: { output?: StoryOutput; label: string }) => {
    const isGenerating = output?.status === 'generating' || 
                        output?.status === 'planned' || 
                        (pdfGenerating && (
                          (output?.output_type === 'story_book_pdf' && pdfGenerating === 'Story Book') ||
                          (output?.output_type === 'coloring_book_pdf' && pdfGenerating === 'Coloring Book')
                        ));

    if (output?.url && output.status === 'completed') {
      return <a className="btn btn-primary" href={output.url} download style={{ display: 'inline-block' }}>⬇️ {label}</a>;
    }
    if (output?.status === 'failed') {
      return <span className="btn btn-ghost" style={{ display: 'inline-block', opacity: 0.7, color: 'var(--k-pink)' }}>⚠️ PDF failed</span>;
    }
    if (isGenerating) {
      return <span className="btn btn-ghost" style={{ display: 'inline-block', opacity: 0.7 }}>⏳ PDF generating…</span>;
    }
    return null;
  };



  const LetterDownloadLink = ({ output }: { output?: StoryOutput }) => {

    const letterUrl = output?.metadata?.letter_url as string | undefined;

    if (!letterUrl || output?.status !== 'completed') return null;

    return <a className="btn btn-ghost" href={letterUrl} download style={{ display: 'inline-block' }}>⬇️ US Letter PDF</a>;

  };



  return (

    <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      <CustomCursor />

      <Navbar />



      <div className="section" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>

        <div style={{ maxWidth: 980, margin: '0 auto' }}>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>

              <span style={{ fontSize: '1.5rem' }}>{getThemeEmoji(story.theme)}</span>

              {getStatusBadge(story.status)}

            </div>

            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>{story.title}</h1>

            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Created {new Date(story.created_at).toLocaleDateString()} · Theme: {story.theme.charAt(0).toUpperCase() + story.theme.slice(1)}</p>

          </motion.div>



          {(story.status === 'processing' || story.status === 'failed' || story.status === 'completed') && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                borderRadius: 'var(--r-lg)',
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1.5px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {story.status === 'processing' && (
                    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2.5px solid var(--k-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                  )}
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                    {getStepLabel(story.processing_step)}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: story.status === 'completed' ? 'var(--k-green)' : 'var(--k-blue)', fontSize: '1rem' }}>
                    {getProgress()}%
                  </span>
                  <button
                    onClick={() => pollStatus(Number(id))}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderRadius: '999px' }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div style={{ height: 12, borderRadius: 999, background: 'rgba(148,163,184,0.18)', overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgress()}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: story.status === 'failed'
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
                    boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
                  }}
                />
              </div>

              {/* Pipeline Steps Tracker */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                {[
                  { stepKey: 'generate_story', label: '1. Gemini Story', emoji: '✍️' },
                  { stepKey: 'generate_images', label: '2. Scenes Art', emoji: '🎨' },
                  { stepKey: 'generate_narration', label: '3. Voice Narration', emoji: '🎙️' },
                  { stepKey: 'generate_story_products', label: '4. Flipbook PDF', emoji: '📚' },
                ].map((s) => {
                  const currentProg = getProgress();
                  let stepDone = false;
                  if (s.stepKey === 'generate_story' && currentProg >= 15) stepDone = true;
                  if (s.stepKey === 'generate_images' && currentProg >= 35) stepDone = true;
                  if (s.stepKey === 'generate_narration' && currentProg >= 82) stepDone = true;
                  if (s.stepKey === 'generate_story_products' && currentProg >= 97) stepDone = true;

                  const isCurrent = story.processing_step === s.stepKey;

                  return (
                    <div
                      key={s.stepKey}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: 'var(--r-md)',
                        background: isCurrent ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.4)',
                        border: isCurrent ? '1.5px solid var(--k-blue)' : '1px solid rgba(255,255,255,0.06)',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: stepDone ? 'var(--text)' : 'var(--text-3)',
                        transition: 'all 0.3s',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{s.emoji}</div>
                      <div style={{ fontWeight: isCurrent ? 700 : 500 }}>{s.label}</div>
                      <div style={{ fontSize: '0.7rem', marginTop: '0.15rem', color: stepDone ? 'var(--k-green)' : (isCurrent ? 'var(--k-blue)' : 'var(--text-3)') }}>
                        {stepDone ? '✓ Completed' : (isCurrent ? '● Processing…' : 'Waiting')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {story.status === 'processing' && (
                <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
                  ✨ AI magic in progress! Gemini is generating your story content and assets in real time.
                </p>
              )}

              {story.error_message && (
                <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    ⚠️ {story.error_message}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        setError('');
                        setLoading(true);
                        await apiGenerateStory(Number(id));
                        const { story: freshStory } = await apiGetStory(Number(id));
                        setStory(freshStory);
                        pollingRef.current = setTimeout(() => pollStatus(Number(id)), 3000);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Retry failed');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                  >
                    🔄 Retry Generation
                  </button>
                </div>
              )}
            </motion.div>
          )}



          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', position: 'sticky', top: 82, zIndex: 5, padding: '0.75rem', borderRadius: 'var(--r-lg)', background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)' }}>

            {availableTabs.map((tab) => (

              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={activeTab === tab.key ? 'btn btn-primary' : 'btn btn-ghost'} style={{ padding: '0.65rem 0.95rem' }}>{tab.label}</button>

            ))}

          </div>



          {activeTab === 'story' && (

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem' }}>

              {story.content && <section dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}><h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">📖 The Story</span></h3><p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{story.content}</p></section>}

              {imageAssets.length > 0 && <AssetGrid title="🖼️ Scene Images" assets={imageAssets} />}

              {story.scenes && story.scenes.length > 0 && <SceneBreakdown scenes={story.scenes} isRtl={isRtl} />}

            </motion.div>

          )}



          {activeTab === 'storybook' && (

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>

              <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>

                  <div><h3><span className="gradient-text">📚 Interactive Story Book</span></h3><p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>300 DPI print-ready manga/comic-style pages with dynamic panel layouts, narration sync, and {isRtl ? 'Arabic RTL' : 'English'} layout.</p></div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* Interactive viewer badge — independent of PDF status */}
                    {flipbookStatus === 'completed' && (
                      <span className="btn btn-ghost" style={{ opacity: 0.7, fontSize: '0.85rem' }}>📖 Interactive Viewer ✓</span>
                    )}
                    {(flipbookStatus === 'generating' || flipbookStatus === 'planned') && (
                      <span className="btn btn-ghost" style={{ opacity: 0.7, fontSize: '0.85rem' }}>⏳ Viewer generating…</span>
                    )}
                    {flipbookStatus === 'failed' && (
                      <span className="btn btn-ghost" style={{ opacity: 0.7, fontSize: '0.85rem', color: 'var(--k-pink)' }}>⚠️ Viewer failed</span>
                    )}
                    {/* PDF download — independent of flipbook/viewer status */}
                    <DownloadButton output={storyBook} label="Download PDF (A4)" />
                    <LetterDownloadLink output={storyBook} />

                  </div>

                </div>

              </section>

              {storyBook?.metadata?.page_urls && Array.isArray(storyBook.metadata.page_urls) && storyBook.metadata.page_urls.length > 0 ? (
                <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                  <h4 style={{ marginBottom: '1rem' }}>📖 Page Preview</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                    {storyBook.metadata.page_urls.map((page: any) => (
                      <div key={page.page} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative', aspectRatio: '1240/1754', background: '#f5f5f5' }}>
                          <Image
                            src={page.url}
                            alt={`Page ${page.page} - ${page.label}`}
                            fill
                            sizes="(max-width: 300px) 100vw"
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ padding: '0.75rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>{page.label}</div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <a href={page.url} download={`story_page_${page.page}.jpg`} style={{
                              flex: 1,
                              textAlign: 'center',
                              fontSize: '0.75rem',
                              color: 'var(--primary)',
                              textDecoration: 'none',
                              padding: '0.5rem 0',
                              borderRadius: 'var(--r-sm)'
                            }}>
                              ⬇️ Image
                            </a>
                            {page.pdf_url && (
                              <a href={page.pdf_url} download={`story_page_${page.page}.pdf`} style={{
                                flex: 1,
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                padding: '0.5rem 0',
                                borderRadius: 'var(--r-sm)',
                                border: '1px solid var(--border)'
                              }}>
                                ⬇️ PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {flipbookStatus === 'completed' ? (
                <StorybookViewer
                  storyId={parseInt(Array.isArray(id) ? id[0] : id || '')}
                  storybookUrl={story.storybook_url || ''}
                  narrationUrl={story.narration_url}
                  language={story.language || 'en'}
                />
              ) : flipbookStatus === 'failed' ? (
                <div style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</p>
                  <p style={{ color: 'var(--k-pink)', fontWeight: 600, marginBottom: '0.5rem' }}>Storybook generation failed</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>{interactiveBook?.error_message || storyBook?.error_message || 'An error occurred during generation.'}</p>
                </div>
              ) : (
                <div style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--k-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>Generating your interactive storybook…</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.5rem' }}>This usually takes 1–2 minutes. The page updates automatically.</p>
                </div>
              )}

            </motion.div>

          )}



          {activeTab === 'coloring' && (

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>

              <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>

                  <div><h3><span className="gradient-text">🖍️ Printable Coloring Book</span></h3><p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>Clean black-and-white line art pages perfect for coloring.</p></div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

                    <DownloadButton output={coloringBook} label="Download PDF (A4)" />

                    <LetterDownloadLink output={coloringBook} />

                  </div>

                </div>

              </section>

              {/* Only show coloring book line art pages - no source scenes */}
              {coloringAssets.length > 0 ? (
                <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                  <h4 style={{ marginBottom: '1rem' }}>�️ Coloring Pages</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {coloringAssets.map((asset) => (
                      <div key={asset.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'white' }}>
                        <div style={{ position: 'relative', aspectRatio: '4/3', background: '#f5f5f5' }}>
                          <Image
                            src={asset.url}
                            alt={`Coloring Page ${asset.scene_number}`}
                            fill
                            sizes="(max-width: 300px) 100vw"
                            style={{ objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text)' }}>Page {asset.scene_number}</div>
                          <a href={asset.url} download={`coloring_page_${asset.scene_number}.jpg`} style={{
                            display: 'block',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            padding: '0.5rem',
                            borderRadius: 'var(--r-sm)',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            marginTop: '0.5rem'
                          }}>
                            ⬇️ Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section style={{ padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--k-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>Generating coloring pages…</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Creating clean black-and-white line art for you to color.</p>
                </section>
              )}

            </motion.div>

          )}



          {activeTab === 'audio' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem' }}><span className="gradient-text">🎙️ Narration Audio</span></h3>
              {story.narration_url ? <><audio controls src={story.narration_url} style={{ width: '100%' }} /><a className="btn btn-primary" href={story.narration_url} download style={{ display: 'inline-block', marginTop: '1rem' }}>⬇️ Download Audio</a></> : <p style={{ color: 'var(--text-3)' }}>Narration has not been generated yet.</p>}
            </motion.div>
          )}

          {activeTab === 'video' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
              <section style={{ padding: '1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <h3 style={{ marginBottom: '1rem' }}><span className="gradient-text">🎞️ Final Story Video</span></h3>
                {finalVideoUrl ? <><video src={finalVideoUrl} controls style={{ width: '100%', borderRadius: 'var(--r-md)', background: '#000' }} /><a className="btn btn-primary" href={finalVideoUrl} download style={{ display: 'inline-block', marginTop: '1rem' }}>⬇️ Download Video</a></> : <p style={{ color: 'var(--text-3)' }}>Final MP4 has not been generated yet.</p>}
              </section>
              {videoAssets.length > 0 && !finalVideoUrl && <VideoGrid assets={videoAssets} />}
            </motion.div>
          )}



          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>

            {story.child_name && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Child</p><p style={{ fontWeight: 600 }}>{story.child_name}</p></div>}

            {story.child_age && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Age</p><p style={{ fontWeight: 600 }}>{story.child_age} years</p></div>}

            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Language</p><p style={{ fontWeight: 600 }}>{story.language.toUpperCase()}</p></div>

            {selectedOutputs.includes('story_book_pdf') && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Story Book</p><p style={{ fontWeight: 600 }}>{storyBook?.status === 'completed' ? '✓ Ready' : 'Processing'}</p></div>}
            {selectedOutputs.includes('coloring_book_pdf') && <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Coloring Book</p><p style={{ fontWeight: 600 }}>{coloringBook?.status === 'completed' ? '✓ Ready' : 'Processing'}</p></div>}

          </motion.div>



          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>

            <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>← Back to Dashboard</button>

            <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--k-pink)' }}>🗑️ Delete Story</button>

          </motion.div>

        </div>

      </div>

      {/* ── Hidden PDF render templates (off-screen, captured by html2pdf.js) ── */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>

        {/* Story Book Template */}
        <div id="story-book-pdf-template" style={{ width: '210mm', fontFamily: 'Georgia, serif' }}>
          {/* Cover */}
          <div style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '20mm', backgroundColor: '#FFF8E7', position: 'relative', pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '15px solid #FFD700', boxShadow: 'inset 0 0 0 2px #4A0E4E, inset 0 0 0 6px #FFD700, inset 0 0 0 8px #4A0E4E', direction: isRtl ? 'rtl' : 'ltr' }}>
            <div style={{ width: '100%', textAlign: 'center', marginTop: '15mm' }}>
              <div style={{ fontSize: '14pt', fontWeight: 600, color: '#4A0E4E', letterSpacing: '2px', marginBottom: '5mm' }}>{isRtl ? '✦ قصة مصورة ✦' : '✦ STORY HERO ✦'}</div>
              <h1 style={{ fontSize: '32pt', fontFamily: 'Georgia, serif', color: '#4A0E4E', margin: '0', fontWeight: 'bold', lineHeight: 1.2 }}>{story.title}</h1>
              <div style={{ width: '30mm', height: '2px', backgroundColor: '#FFD700', margin: '6mm auto' }} />
            </div>
            {imageAssets[0] && (
              <div style={{ width: '140mm', height: '105mm', border: '4px solid #FFD700', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 6px 15px rgba(0,0,0,0.15)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageAssets[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" crossOrigin="anonymous" />
              </div>
            )}
            <div style={{ width: '100%', textAlign: 'center', marginBottom: '15mm' }}>
              {story.child_name && (<><div style={{ fontSize: '14pt', color: '#666', marginBottom: '2mm', fontStyle: 'italic' }}>{isRtl ? 'بطولة' : 'Starring'}</div><div style={{ fontSize: '24pt', fontFamily: 'Georgia, serif', color: '#D4AF37', fontWeight: 'bold' }}>{story.child_name}</div></>)}
            </div>
          </div>
          {/* Scene Pages */}
          {story.scenes?.map((scene, index) => {
            const sceneImg = imageAssets.find(a => a.scene_number === scene.scene_number)?.url;
            return (
              <div key={index} style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '20mm', backgroundColor: '#FFF8E7', position: 'relative', pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '12px solid #FFD700', boxShadow: 'inset 0 0 0 2px #4A0E4E, inset 0 0 0 5px #FFD700, inset 0 0 0 7px #4A0E4E', direction: isRtl ? 'rtl' : 'ltr' }}>
                <div style={{ width: '100%', textAlign: 'center', marginTop: '5mm' }}>
                  <h2 style={{ fontSize: '20pt', fontFamily: 'Georgia, serif', color: '#4A0E4E', margin: '0', fontWeight: 'bold' }}>{(scene as any).title || (isRtl ? `الصفحة ${index + 1}` : `Page ${index + 1}`)}</h2>
                  <div style={{ width: '20mm', height: '1px', backgroundColor: '#FFD700', margin: '4mm auto' }} />
                </div>
                {sceneImg && (<div style={{ width: '150mm', height: '110mm', border: '3px solid #D4AF37', borderRadius: '6px', overflow: 'hidden' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={sceneImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Scene ${index + 1}`} crossOrigin="anonymous" /></div>)}
                <div style={{ width: '100%', padding: '0 5mm', boxSizing: 'border-box', marginBottom: '15mm', textAlign: 'center' }}>
                  <p style={{ fontSize: '15pt', lineHeight: 1.6, color: '#333', margin: '0', fontFamily: 'sans-serif' }}>{scene.description || (scene as any).text}</p>
                </div>
                <div style={{ position: 'absolute', bottom: '8mm', fontSize: '11pt', color: '#999', width: '100%', textAlign: 'center' }}>— {index + 1} —</div>
              </div>
            );
          })}
          {/* End Page */}
          <div style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '20mm', backgroundColor: '#FFF8E7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '15px solid #FFD700', boxShadow: 'inset 0 0 0 2px #4A0E4E, inset 0 0 0 6px #FFD700, inset 0 0 0 8px #4A0E4E', direction: isRtl ? 'rtl' : 'ltr' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36pt', color: '#FFA500', marginBottom: '8mm' }}>✦</div>
              <h1 style={{ fontSize: '36pt', fontFamily: 'Georgia, serif', color: '#4A0E4E', fontWeight: 'bold', margin: '0 0 6mm 0' }}>{isRtl ? 'النهاية' : 'The End'}</h1>
              <p style={{ fontSize: '18pt', color: '#555', margin: '0', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{isRtl ? 'شكراً لقراءة هذه القصة الرائعة!' : 'Thank you for reading this amazing story!'}</p>
              <div style={{ fontSize: '36pt', color: '#FFA500', marginTop: '8mm' }}>✦</div>
            </div>
          </div>
        </div>

        {/* Coloring Book Template */}
        <div id="coloring-book-pdf-template" style={{ width: '210mm', fontFamily: 'Georgia, serif' }}>
          {/* Cover */}
          <div style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '20mm', backgroundColor: '#FFFFFF', position: 'relative', pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '15px double #333333', direction: isRtl ? 'rtl' : 'ltr' }}>
            <div style={{ width: '100%', textAlign: 'center', marginTop: '20mm' }}>
              <h1 style={{ fontSize: '36pt', fontFamily: 'Georgia, serif', color: '#111', margin: '0 0 4mm 0', fontWeight: 'bold' }}>{isRtl ? 'كتاب التلوين' : 'My Coloring Book'}</h1>
              <h2 style={{ fontSize: '24pt', fontFamily: 'Georgia, serif', color: '#555', margin: '0', fontWeight: 'normal' }}>{story.title}</h2>
              <div style={{ width: '40mm', height: '2px', backgroundColor: '#333', margin: '8mm auto' }} />
            </div>
            <div style={{ width: '100%', textAlign: 'center', marginBottom: '25mm' }}>
              {story.child_name && (<><div style={{ fontSize: '16pt', color: '#777', marginBottom: '3mm' }}>{isRtl ? 'تلوين البطل' : 'Coloring by'}</div><div style={{ fontSize: '28pt', fontFamily: 'Georgia, serif', color: '#111', fontWeight: 'bold', border: '2px dashed #333', display: 'inline-block', padding: '4mm 10mm', borderRadius: '8px' }}>{story.child_name}</div></>)}
            </div>
          </div>
          {/* Coloring Pages */}
          {story.scenes?.map((scene, index) => {
            const coloringImg = coloringAssets.find(a => a.scene_number === scene.scene_number)?.url;
            return (
              <div key={index} style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', padding: '20mm', backgroundColor: '#FFFFFF', position: 'relative', pageBreakAfter: 'always', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', border: '10px double #333', direction: isRtl ? 'rtl' : 'ltr' }}>
                <div style={{ width: '100%', textAlign: 'center', marginTop: '5mm' }}>
                  <h2 style={{ fontSize: '20pt', fontFamily: 'Georgia, serif', color: '#111', margin: '0', fontWeight: 'bold' }}>{(scene as any).title || (isRtl ? `صفحة تلوين ${index + 1}` : `Coloring Page ${index + 1}`)}</h2>
                  <div style={{ width: '25mm', height: '1px', backgroundColor: '#666', margin: '4mm auto' }} />
                </div>
                {coloringImg ? (<div style={{ width: '160mm', height: '120mm', border: '2px solid #333', overflow: 'hidden', backgroundColor: '#FFF' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={coloringImg} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={`Coloring ${index + 1}`} crossOrigin="anonymous" /></div>) : (<div style={{ width: '160mm', height: '120mm', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>No image</div>)}
                <div style={{ width: '100%', height: '20mm' }} />
                <div style={{ position: 'absolute', bottom: '8mm', fontSize: '11pt', color: '#666', width: '100%', textAlign: 'center' }}>— {index + 1} —</div>
              </div>
            );
          })}
        </div>

      </div>

    </div>

  );

}



function AssetGrid({ title, assets, contain = false }: { title: string; assets: StoryAsset[]; contain?: boolean }) {

  if (assets.length === 0) return null;

  return (

    <section style={{ marginTop: '2rem' }}>

      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">{title}</span></h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

        {assets.map((asset) => (

          <div key={asset.id} style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>

            <Image src={asset.url} alt={`Scene ${asset.scene_number}`} width={420} height={520} style={{ width: '100%', height: contain ? 260 : 180, objectFit: contain ? 'contain' : 'cover', background: '#fff', display: 'block' }} />

            <p style={{ padding: '0.75rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>Scene {asset.scene_number}</p>

          </div>

        ))}

      </div>

    </section>

  );

}



function VideoGrid({ assets }: { assets: StoryAsset[] }) {

  return <AssetGridShell title="🎥 Scene Videos">{assets.map((asset) => <div key={asset.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}><video src={asset.url} controls style={{ width: '100%', display: 'block' }} /><p style={{ padding: '0.5rem 0.75rem', color: 'var(--text-3)', fontSize: '0.8rem' }}>Scene {asset.scene_number}</p></div>)}</AssetGridShell>;

}



function AssetGridShell({ title, children }: { title: string; children: ReactNode }) {

  return <section><h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">{title}</span></h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>{children}</div></section>;

}



function SceneBreakdown({ scenes, isRtl }: { scenes: Story['scenes']; isRtl: boolean }) {

  if (!scenes?.length) return null;

  return (

    <section dir={isRtl ? 'rtl' : 'ltr'} style={{ marginTop: '2rem' }}>

      <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">📋 Scene Breakdown</span></h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {scenes.map((scene, i) => <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}><div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--k-blue), var(--k-pink))', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{scene.scene_number || i + 1}</div><div style={{ flex: 1 }}><p style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{scene.description}</p>{scene.image_prompt && <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{scene.image_prompt}</p>}</div></div>)}

      </div>

    </section>

  );

}



function StoryBookViewer({ story, imageAssets, isRtl }: { story: Story; imageAssets: StoryAsset[]; isRtl: boolean }) {

  const imageByScene = new Map(imageAssets.map((asset) => [asset.scene_number, asset]));

  const pages = [

    { title: story.title, text: story.child_name ? `${isRtl ? 'بطولة' : 'Starring'} ${story.child_name}` : '', image: imageAssets[0]?.url },

    ...(story.scenes || []).slice(0, 6).map((scene) => ({ title: `${isRtl ? 'الصفحة' : 'Page'} ${scene.scene_number}`, text: scene.description, image: imageByScene.get(scene.scene_number)?.url })),

    { title: isRtl ? 'النهاية' : 'The End', text: isRtl ? 'أحسنت! احتفظ بهذه القصة وشاركها مع عائلتك.' : 'Great job! Keep this story and share it with your family.', image: undefined },

  ];



  return (

    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>

      {pages.map((page, index) => <article key={index} style={{ minHeight: 420, padding: '1rem', borderRadius: 'var(--r-lg)', background: '#fffaf3', color: '#2d2340', border: '1.5px solid var(--border)', boxShadow: '0 18px 50px rgba(0,0,0,0.18)' }}>{page.image && <Image src={page.image} alt={page.title} width={520} height={320} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 'var(--r-md)', marginBottom: '1rem' }} />}<h4 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{page.title}</h4><p style={{ lineHeight: 1.7 }}>{page.text}</p></article>)}

    </div>

  );

}

