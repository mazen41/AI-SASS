'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiGetStory, apiGetStoryStatus, apiDeleteStory, Story, StoryAsset } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';

export default function StoryViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [assets, setAssets] = useState<StoryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    if (!id) return;
    
    const loadStory = async () => {
      try {
        const { story, assets } = await apiGetStory(Number(id));
        setStory(story);
        setAssets(assets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };
    loadStory();
  }, [id, isLoggedIn, router]);



  useEffect(() => {
    if (!id || !story || story.status !== 'processing') return;

    const interval = window.setInterval(async () => {
      try {
        const status = await apiGetStoryStatus(Number(id));
        setStory((current) => current ? { ...current, ...status } : current);

        const assetTotal = status.assets_count.images + status.assets_count.videos;
        if (status.status !== 'processing' || assetTotal !== assets.length) {
          const { story: freshStory, assets: freshAssets } = await apiGetStory(Number(id));
          setStory(freshStory);
          setAssets(freshAssets);
        }
      } catch (err) {
        console.error('Failed to refresh story status', err);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [id, story, assets.length]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story?')) return;
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
      processing: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Processing' },
      completed: { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: 'Completed' },
      failed: { bg: 'rgba(248,113,113,0.15)', color: '#f87171', label: 'Failed' },
    };
    const s = styles[status] || styles.draft;
    return (
      <span style={{ background: s.bg, color: s.color, padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}>
        {s.label}
      </span>
    );
  };

  const getThemeEmoji = (theme: string) => {
    const emojis: Record<string, string> = {
      adventure: '🗺️', space: '🚀', jungle: '🌿', fantasy: '🏰',
      ocean: '🌊', dinosaur: '🦕', superhero: '🦸', princess: '👑', pirate: '⚓',
    };
    return emojis[theme] || '✨';
  };

  if (loading) {
    return (
      <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CustomCursor />
        <Navbar />
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--k-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-2)' }}>Loading story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: '7rem' }}>
        <CustomCursor />
        <Navbar />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--k-pink)' }}>{error || 'Story not found'}</p>
          <button className="btn btn-ghost" onClick={() => router.push('/dashboard')} style={{ marginTop: '1rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }



  const getStepLabel = (step: string | null) => {
    const labels: Record<string, string> = {
      queued: 'Queued...',
      generate_story: 'Generating Story...',
      generate_images: 'Generating Images...',
      generate_videos: 'Generating Videos...',
      generate_narration: 'Generating Narration...',
      assemble_video: 'Assembling Final Video...',
    };
    return step ? (labels[step] || step.replaceAll('_', ' ')) : 'Ready';
  };

  const getProgress = () => {
    if (story.status === 'completed') return 100;
    if (story.status === 'failed') return 100;
    const step = story.processing_step;
    if (step === 'generate_story') return 15;
    if (step === 'generate_images') return 35;
    if (step === 'generate_videos') return 65;
    if (step === 'generate_narration') return 82;
    if (step === 'assemble_video') return 94;
    return story.status === 'processing' ? 8 : 0;
  };

  const imageAssets = assets.filter((asset) => asset.asset_type === 'image');
  const videoAssets = assets.filter((asset) => asset.asset_type === 'video');
  const finalVideoUrl = story.assembled_video_url || story.video_url;

  return (
    <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <CustomCursor />
      <Navbar />

      <div className="section" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{getThemeEmoji(story.theme)}</span>
              {getStatusBadge(story.status)}
            </div>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>
              {story.title}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>
              Created {new Date(story.created_at).toLocaleDateString()} · Theme: {story.theme.charAt(0).toUpperCase() + story.theme.slice(1)}
            </p>
          </motion.div>


          {/* AI Status */}
          {(story.status === 'processing' || story.status === 'failed' || story.status === 'completed') && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <strong>{getStepLabel(story.processing_step)}</strong>
                <span style={{ color: 'var(--text-3)' }}>{getProgress()}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.18)', overflow: 'hidden' }}>
                <div style={{ width: `${getProgress()}%`, height: '100%', background: story.status === 'failed' ? 'var(--k-pink)' : 'linear-gradient(90deg, var(--k-blue), var(--k-pink))', transition: 'width 0.4s ease' }} />
              </div>
              {story.status === 'processing' && (
                <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
                  This page updates automatically while AI writes the story, creates images, builds videos, narrates, and assembles the final MP4.
                </p>
              )}
              {story.error_message && <p style={{ color: 'var(--k-pink)', marginTop: '0.75rem' }}>{story.error_message}</p>}
            </motion.div>
          )}

          {/* Final Video */}
          {finalVideoUrl && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              style={{ marginTop: '2rem', padding: '1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🎞️ Final Story Video</span></h3>
              <video src={finalVideoUrl} controls style={{ width: '100%', borderRadius: 'var(--r-md)', background: '#000' }} />
              <a className="btn btn-primary" href={finalVideoUrl} download style={{ marginTop: '1rem' }}>⬇️ Download Video</a>
            </motion.div>
          )}

          {/* Photo */}
          {story.photo_url && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ marginTop: '2rem' }}
            >
              <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                <Image src={story.photo_url} alt="Story photo" width={800} height={400} style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
              </div>
            </motion.div>
          )}

          {/* Story Content */}
          {story.content && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                marginTop: '2rem',
                padding: '2rem',
                borderRadius: 'var(--r-lg)',
                background: 'var(--surface)',
                border: '1.5px solid var(--border)',
              }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
                <span className="gradient-text">📖 The Story</span>
              </h3>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {story.content}
              </p>
            </motion.div>
          )}

          {/* Scenes */}
          {story.scenes && story.scenes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ marginTop: '2rem' }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
                <span className="gradient-text">🎬 Scenes</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {story.scenes.map((scene, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--r-md)',
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--k-blue), var(--k-pink))',
                      display: 'grid', placeItems: 'center',
                      color: 'white', fontWeight: 700, fontSize: '0.85rem',
                      flexShrink: 0,
                    }}>
                      {scene.scene_number || scene.chapter || i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{scene.description}</p>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{scene.duration || 5}s</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}


          {/* Generated Assets */}
          {imageAssets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              style={{ marginTop: '2rem' }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🖼️ Generated Images</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {imageAssets.map((asset) => (
                  <div key={asset.id} style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                    <Image src={asset.url} alt={`Scene ${asset.scene_number}`} width={420} height={236} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                    <p style={{ padding: '0.75rem', color: 'var(--text-2)', fontSize: '0.9rem' }}>Scene {asset.scene_number}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {videoAssets.length > 0 && !finalVideoUrl && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.34 }}
              style={{ marginTop: '2rem' }}
            >
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🎥 Scene Videos</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {videoAssets.map((asset) => (
                  <video key={asset.id} src={asset.url} controls style={{ width: '100%', borderRadius: 'var(--r-md)', background: '#000' }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Info bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            style={{
              marginTop: '2rem',
              padding: '1.25rem',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
            }}
          >
            {story.child_name && (
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Child</p>
                <p style={{ fontWeight: 600 }}>{story.child_name}</p>
              </div>
            )}
            {story.child_age && (
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Age</p>
                <p style={{ fontWeight: 600 }}>{story.child_age} years</p>
              </div>
            )}
            {story.duration_seconds && (
              <div>
                <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Duration</p>
                <p style={{ fontWeight: 600 }}>{Math.floor(story.duration_seconds / 60)}:{String(story.duration_seconds % 60).padStart(2, '0')}</p>
              </div>
            )}
            <div>
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Language</p>
              <p style={{ fontWeight: 600 }}>{story.language.toUpperCase()}</p>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
          >
            <button
              className="btn btn-primary"
              onClick={() => router.push('/dashboard')}
            >
              ← Back to Dashboard
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleDelete}
              style={{ color: 'var(--k-pink)' }}
            >
              🗑️ Delete Story
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
