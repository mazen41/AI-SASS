'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  apiGetStory,
  apiGetStoryStatus,
  apiDeleteStory,
  Story,
  StoryAsset,
  StoryOutput,
  StoryOutputs,
  StoryStatus,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';

const EXPECTED_SCENE_COUNT = 6;

type StoryTab = 'story' | 'storybook' | 'coloring' | 'audio' | 'video';

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued…',
  generate_story: '✍️ Writing story…',
  generate_images: '🎨 Generating scene images…',
  generate_videos: '🎬 Generating scene videos…',
  generate_narration: '🎙️ Recording narration…',
  assemble_video: '🎞️ Assembling final video…',
  generate_story_products: '📚 Building story and coloring books…',
};

const TAB_LABELS: Array<{ key: StoryTab; label: string }> = [
  { key: 'story', label: 'Story' },
  { key: 'storybook', label: 'Story Book' },
  { key: 'coloring', label: 'Coloring Book' },
  { key: 'audio', label: 'Audio' },
  { key: 'video', label: 'Video' },
];

export default function StoryViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [assets, setAssets] = useState<StoryAsset[]>([]);
  const [outputs, setOutputs] = useState<StoryOutputs>({});
  const [activeTab, setActiveTab] = useState<StoryTab>('story');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  }, [id, isLoggedIn]);

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

  const getStepLabel = (step: string | null) => (!step ? 'Ready' : STEP_LABELS[step] || step.replaceAll('_', ' '));

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

  if (loading) {
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
  const coloringBook = outputs.coloring_book_pdf;
  const isRtl = story.language === 'ar';

  const DownloadButton = ({ output, label }: { output?: StoryOutput; label: string }) => (
    output?.url && output.status === 'completed'
      ? <a className="btn btn-primary" href={output.url} download style={{ display: 'inline-block' }}>⬇️ {label}</a>
      : <span className="btn btn-ghost" style={{ display: 'inline-block', opacity: 0.7 }}>{output?.status === 'failed' ? 'Generation failed' : 'Generating…'}</span>
  );

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
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <strong>{getStepLabel(story.processing_step)}</strong>
                <span style={{ color: 'var(--text-3)' }}>{getProgress()}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.18)', overflow: 'hidden' }}>
                <div style={{ width: `${getProgress()}%`, height: '100%', background: story.status === 'failed' ? 'var(--k-pink)' : 'linear-gradient(90deg, var(--k-blue), var(--k-pink))', transition: 'width 0.4s ease' }} />
              </div>
              {story.status === 'processing' && <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginTop: '0.75rem' }}>This page updates automatically while AI creates the video, narration, story book PDF, and coloring book PDF.</p>}
              {story.error_message && <p style={{ color: 'var(--k-pink)', marginTop: '0.75rem' }}>{story.error_message}</p>}
            </motion.div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', position: 'sticky', top: 82, zIndex: 5, padding: '0.75rem', borderRadius: 'var(--r-lg)', background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)' }}>
            {TAB_LABELS.map((tab) => (
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
                  <div><h3><span className="gradient-text">📚 Digital Story Book</span></h3><p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>Cover, six scene pages, and an ending page. Mobile friendly with {isRtl ? 'Arabic RTL' : 'English'} layout.</p></div>
                  <DownloadButton output={storyBook} label="Download PDF" />
                </div>
              </section>
              <StoryBookViewer story={story} imageAssets={imageAssets} isRtl={isRtl} />
            </motion.div>
          )}

          {activeTab === 'coloring' && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '2rem', display: 'grid', gap: '1.25rem' }}>
              <section style={{ padding: '1.5rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div><h3><span className="gradient-text">🖍️ Printable Coloring Book</span></h3><p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>Print-ready A4 pages with clean black-and-white outlines for each scene.</p></div>
                  <DownloadButton output={coloringBook} label="Download PDF" />
                </div>
              </section>
              {coloringAssets.length > 0 ? <AssetGrid title="Coloring Pages" assets={coloringAssets} contain /> : <AssetGrid title="Preview Source Scenes" assets={imageAssets} />}
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
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Images</p><p style={{ fontWeight: 600 }}>{imageAssets.length} / {expectedSceneCount}</p></div>
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Videos</p><p style={{ fontWeight: 600 }}>{videoAssets.length} / {expectedSceneCount}</p></div>
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Book PDFs</p><p style={{ fontWeight: 600 }}>{[storyBook, coloringBook].filter((o) => o?.status === 'completed').length} / 2</p></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>← Back to Dashboard</button>
            <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--k-pink)' }}>🗑️ Delete Story</button>
          </motion.div>
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
