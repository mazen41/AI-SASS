'use client';

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
  StoryStatus,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued…',
  generate_story: '✍️ Writing story…',
  generate_images: '🎨 Generating scene images…',
  generate_videos: '🎬 Generating scene videos…',
  generate_narration: '🎙️ Recording narration…',
  assemble_video: '🎞️ Assembling final video…',
};

export default function StoryViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [assets, setAssets] = useState<StoryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
  };

  const pollStatus = async (storyId: number) => {
    try {
      const status: StoryStatus = await apiGetStoryStatus(storyId);

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

      if (status.status === 'processing') {
        // Reload full story + assets if images/videos are coming in
        if (status.assets_count.images > 0 || status.assets_count.videos > 0) {
          const fresh = await apiGetStory(storyId);
          setStory(fresh.story);
          setAssets(fresh.assets);
        }
        pollingRef.current = setTimeout(() => pollStatus(storyId), 5000);
      } else if (status.status === 'completed') {
        // Final load
        const fresh = await apiGetStory(storyId);
        setStory(fresh.story);
        setAssets(fresh.assets);
      }
    } catch {
      // Retry on transient errors
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
        const { story: s, assets: a } = await apiGetStory(storyId);
        setStory(s);
        setAssets(a);
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

  const imageAssets = assets.filter((a) => a.asset_type === 'image').sort((a, b) => a.scene_number - b.scene_number);
  const videoAssets = assets.filter((a) => a.asset_type === 'video').sort((a, b) => a.scene_number - b.scene_number);

  if (loading) {
    return (
      <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CustomCursor />
        <Navbar />
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

  return (
    <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <CustomCursor />
      <Navbar />

      <div className="section" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

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

          {/* Processing indicator */}
          {story.status === 'processing' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem 1.5rem',
                borderRadius: 'var(--r-lg)',
                background: 'rgba(251,191,36,0.08)',
                border: '1.5px solid rgba(251,191,36,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div style={{ width: 24, height: 24, border: '2.5px solid #fbbf24', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 600, color: '#fbbf24' }}>
                  {story.processing_step ? (STEP_LABELS[story.processing_step] ?? story.processing_step) : 'Processing…'}
                </p>
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.15rem' }}>This can take a few minutes. The page updates automatically.</p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {story.status === 'failed' && story.error_message && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: '1.5rem',
                padding: '1.25rem 1.5rem',
                borderRadius: 'var(--r-lg)',
                background: 'rgba(248,113,113,0.08)',
                border: '1.5px solid rgba(248,113,113,0.3)',
              }}
            >
              <p style={{ fontWeight: 600, color: '#f87171' }}>Generation Failed</p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{story.error_message}</p>
            </motion.div>
          )}

          {/* Final Video */}
          {(story.assembled_video_url || story.video_url) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🎬 Final Story Video</span></h3>
              <video
                controls
                style={{ width: '100%', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--border)', background: '#000' }}
                src={story.assembled_video_url || story.video_url || undefined}
              />
              <div style={{ marginTop: '0.75rem' }}>
                <a
                  href={story.assembled_video_url || story.video_url || '#'}
                  download
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  ⬇️ Download Video
                </a>
              </div>
            </motion.div>
          )}

          {/* Narration */}
          {story.narration_url && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem' }}><span className="gradient-text">🎙️ Narration</span></h3>
              <audio controls src={story.narration_url} style={{ width: '100%' }} />
            </motion.div>
          )}

          {/* Story Text */}
          {story.content && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ marginTop: '2rem', padding: '2rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">📖 The Story</span></h3>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{story.content}</p>
            </motion.div>
          )}

          {/* Scene Images */}
          {imageAssets.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🎨 Scene Images</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {imageAssets.map((asset) => (
                  <div key={asset.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                    <Image src={asset.url} alt={`Scene ${asset.scene_number}`} width={480} height={270} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                    <div style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Scene {asset.scene_number}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene Videos */}
          {videoAssets.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">🎞️ Scene Videos</span></h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {videoAssets.map((asset) => (
                  <div key={asset.id} style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1.5px solid var(--border)', background: 'var(--surface)' }}>
                    <video controls src={asset.url} style={{ width: '100%', display: 'block' }} />
                    <div style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Scene {asset.scene_number}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scenes list */}
          {story.scenes && story.scenes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}><span className="gradient-text">📋 Scene Breakdown</span></h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {story.scenes.map((scene, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--k-blue), var(--k-pink))', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                      {scene.scene_number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{scene.description}</p>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{scene.image_prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Info bar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            {story.child_name && (<div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Child</p><p style={{ fontWeight: 600 }}>{story.child_name}</p></div>)}
            {story.child_age && (<div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Age</p><p style={{ fontWeight: 600 }}>{story.child_age} years</p></div>)}
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Language</p><p style={{ fontWeight: 600 }}>{story.language.toUpperCase()}</p></div>
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Images</p><p style={{ fontWeight: 600 }}>{imageAssets.length} / 6</p></div>
            <div><p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>Videos</p><p style={{ fontWeight: 600 }}>{videoAssets.length} / 6</p></div>
          </motion.div>

          {/* Actions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>← Back to Dashboard</button>
            <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--k-pink)' }}>🗑️ Delete Story</button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
