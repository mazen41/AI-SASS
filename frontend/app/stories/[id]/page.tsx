'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiGetStory, apiDeleteStory, Story } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';

export default function StoryViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
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
        const { story } = await apiGetStory(Number(id));
        setStory(story);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };
    loadStory();
  }, [id, isLoggedIn, router]);

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

          {/* Photo */}
          {story.photo_url && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ marginTop: '2rem' }}
            >
              <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                <img
                  src={story.photo_url}
                  alt="Story photo"
                  style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
                />
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
                      {scene.chapter}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: '0.15rem' }}>{scene.description}</p>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{scene.duration}s</p>
                    </div>
                  </div>
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
