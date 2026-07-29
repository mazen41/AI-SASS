'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiCreateStory, apiGenerateStory, apiGetStories, apiGetProductBalances, Story } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';

const themes = [
  { id: 'adventure', emoji: '🗺️', label: 'Adventure', desc: 'Epic quests and discoveries' },
  { id: 'space', emoji: '🚀', label: 'Space', desc: 'Cosmic journeys among stars' },
  { id: 'jungle', emoji: '🌿', label: 'Jungle', desc: 'Wild explorations in nature' },
  { id: 'fantasy', emoji: '🏰', label: 'Fantasy', desc: 'Magic realms and wonders' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', desc: 'Deep sea mysteries' },
  { id: 'dinosaur', emoji: '🦕', label: 'Dinosaur', desc: 'Prehistoric adventures' },
  { id: 'superhero', emoji: '🦸', label: 'Superhero', desc: 'Save the city with powers' },
  { id: 'princess', emoji: '👑', label: 'Princess', desc: 'Royal quests and castles' },
  { id: 'pirate', emoji: '⚓', label: 'Pirate', desc: 'Treasure hunting at sea' },
];

const themeEmoji: Record<string, string> = Object.fromEntries(themes.map(t => [t.id, t.emoji]));

export default function CreateStoryPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('adventure');
  const [language, setLanguage] = useState('en');
  const [customPrompt, setCustomPrompt] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [createdStory, setCreatedStory] = useState<Story | null>(null);
  const [error, setError] = useState('');
  
  // Generation options
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(['story_text']);
  const [balances, setBalances] = useState<Record<string, any>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Resume-able stories (draft or failed)
  const [resumableStories, setResumableStories] = useState<Story[]>([]);
  const [showResume, setShowResume] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Load resumable stories
    apiGetStories()
      .then(res => {
        const resumable = res.data.filter(
          s => s.status === 'draft' || s.status === 'failed'
        );
        setResumableStories(resumable);
      })
      .catch(() => {});

    // Load product balances
    setLoadingBalances(true);
    apiGetProductBalances()
      .then(res => {
        setBalances(res.balances || {});
      })
      .catch((err) => {
        console.error('Failed to load balances:', err);
      })
      .finally(() => setLoadingBalances(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    if (typeof window !== 'undefined' && !authLoading) router.push('/login');
    return null;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOutputToggle = (outputId: string) => {
    setSelectedOutputs(prev => {
      if (prev.includes(outputId)) {
        // Unchecking
        return prev.filter(o => o !== outputId);
      } else {
        // Checking - enforce mutual exclusivity
        if (outputId === 'video') {
          // Video cannot be combined with story_text or narration_audio
          return ['video', ...prev.filter(o => o !== 'story_text' && o !== 'narration_audio')];
        } else if (outputId === 'story_text' || outputId === 'narration_audio') {
          // story_text and narration_audio cannot be combined with video
          return [outputId, ...prev.filter(o => o !== 'video')];
        }
        return [...prev, outputId];
      }
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || generating) return;
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('theme', selectedTheme);
      if (childName) formData.append('child_name', childName);
      if (childAge) formData.append('child_age', childAge);
      formData.append('language', language);
      if (customPrompt) formData.append('custom_prompt', customPrompt);
      if (photo) formData.append('photo', photo);
      
      // Add selected outputs
      selectedOutputs.forEach(output => {
        formData.append('selected_outputs[]', output);
      });

      // 1. Create draft story
      const { story } = await apiCreateStory(formData);

      // 2. Immediately trigger Gemini AI generation pipeline
      setGenerating(true);
      const { story: genStory } = await apiGenerateStory(story.id);

      // 3. Route directly to live progress page
      router.push(`/stories/${genStory.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleGenerate = async (storyId?: number) => {
    const id = storyId ?? createdStory?.id;
    if (!id) return;
    setGenerating(true);
    setGeneratingId(id);
    setError('');

    try {
      const { story } = await apiGenerateStory(id);
      router.push(`/stories/${story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      setGenerating(false);
      setGeneratingId(null);
    }
  };

  if (createdStory) {
    return (
      <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <CustomCursor />
        <Navbar />
        <div className="section" style={{ paddingTop: '8rem', maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
            <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              Story Created!
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '2rem' }}>
              Your story &quot;{createdStory.title}&quot; is ready for AI generation.
            </p>

            {photoPreview && (
              <div style={{ marginBottom: '2rem' }}>
                <Image src={photoPreview} alt="Uploaded" width={200} height={200} style={{ objectFit: "cover", borderRadius: "var(--r-lg)", border: "2px solid var(--border)" }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={() => handleGenerate()}
                disabled={generating}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                {generating ? (
                  <>
                    <span className="spinner" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 8 }} />
                    Starting AI Pipeline...
                  </>
                ) : (
                  <>🪄 Generate Story</>
                )}
              </motion.button>
              <motion.button
                className="btn btn-ghost"
                onClick={() => router.push('/dashboard')}
                whileHover={{ scale: 1.02 }}
              >
                Back to Dashboard
              </motion.button>
            </div>

            {error && (
              <p style={{ color: 'var(--k-pink)', marginTop: '1rem' }}>{error}</p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="site-shell" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%, #090d16 100%)' }}>
      <CustomCursor />
      <Navbar />
      <div className="section" style={{ paddingTop: '7.5rem', paddingBottom: '5rem' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '2.5rem' }}
          >
            <span
              className="kido-badge"
              style={{
                marginBottom: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 1rem',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '999px',
                color: '#a5b4fc',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#ec4899' }}>✦</span> AI Gemini Powered Story Studio
            </span>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.6rem', color: '#fff' }}>
              Create a <span className="gradient-text" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Magical Adventure</span>
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: 540, margin: '0 auto' }}>
              Upload your child&apos;s photo, pick a theme, and let Google Gemini weave a personalized storybook experience.
            </p>
          </motion.div>

          {/* Resume Banner */}
          <AnimatePresence>
            {showResume && resumableStories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--r-lg)',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '2rem',
                  position: 'relative',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                }}
              >
                <button
                  onClick={() => setShowResume(false)}
                  style={{
                    position: 'absolute', top: '0.85rem', right: '0.85rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1,
                  }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>

                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  ⚡ Continue a draft or retriable story
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {resumableStories.map(s => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--r-md)',
                        padding: '0.75rem 1.1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
                          {themeEmoji[s.theme] ?? '📖'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.title}
                          </p>
                          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                            {s.status === 'failed' ? '❌ Failed — click to retry generation' : '📝 Saved draft — ready for AI'}
                            {s.child_name ? ` · ${s.child_name}` : ''}
                          </p>
                        </div>
                      </div>

                      <motion.button
                        className={`btn ${s.status === 'failed' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handleGenerate(s.id)}
                        disabled={generating}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ flexShrink: 0, fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
                      >
                        {generating && generatingId === s.id ? (
                          <>
                            <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 6 }} />
                            Launching Gemini...
                          </>
                        ) : (
                          s.status === 'failed' ? '🔄 Retry' : '▶ Generate'
                        )}
                      </motion.button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Creation Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
              background: 'rgba(30, 41, 59, 0.55)',
              backdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '2.25rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Photo Upload Zone */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                Child&apos;s Photo <span style={{ color: '#94a3b8', fontWeight: 400 }}>(for character consistency)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: photoPreview ? '2px solid var(--k-blue)' : '2px dashed rgba(255, 255, 255, 0.18)',
                  borderRadius: '16px',
                  padding: photoPreview ? '0.75rem' : '2rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: photoPreview ? 'rgba(15, 23, 42, 0.6)' : 'rgba(15, 23, 42, 0.4)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
              >
                {photoPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxHeight: 240, overflow: 'hidden', borderRadius: '12px' }}>
                    <Image src={photoPreview} alt="Child Preview" width={720} height={240} style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: '12px' }} />
                    <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', backdropFilter: 'blur(6px)' }}>
                      📸 Change Photo
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem' }}>📸</div>
                    <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '1rem', marginBottom: '0.2rem' }}>Click or drag a clear photo of your child</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Helps Gemini and image models match character face & appearance</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                Story Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Maya and the Secret Crystal Cave"
                required
                style={{
                  width: '100%',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '14px',
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            {/* Child Name & Age */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Child&apos;s Name
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Leo"
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Age
                </label>
                <input
                  type="number"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="6"
                  min={1}
                  max={18}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Language + Custom Prompt */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(15, 23, 42, 0.8)',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="ar">🇸🇦 Arabic (العربية)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Custom Special Idea <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Include a friendly friendly dragon and a lesson about kindness"
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '14px',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                Select Adventure Theme
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: '0.8rem' }}>
                {themes.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <motion.button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '1rem 0.8rem',
                        borderRadius: '16px',
                        border: isSelected ? '2px solid #a855f7' : '1.5px solid rgba(255, 255, 255, 0.08)',
                        background: isSelected ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.15) 100%)' : 'rgba(15, 23, 42, 0.5)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: '#fff',
                        boxShadow: isSelected ? '0 0 20px rgba(168, 85, 247, 0.3)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>{theme.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{theme.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>{theme.desc}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* What to Generate */}
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                What to Generate
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.85rem' }}>
                {[
                  { id: 'story_text', label: 'Story Text', emoji: '📝', desc: 'AI Gemini narrative & scenes' },
                  { id: 'narration_audio', label: 'Voice Narration', emoji: '🎙️', desc: 'Read-aloud voice audio' },
                  { id: 'story_book_pdf', label: 'Storybook', emoji: '📖', desc: 'Interactive flipbook' },
                  { id: 'coloring_book_pdf', label: 'Coloring Book', emoji: '🎨', desc: 'Printable line-art pages' },
                  { id: 'video', label: 'Cinematic Video', emoji: '🎬', desc: 'Full animated video' },
                ].map((option) => {
                  const balanceKey = option.id === 'story_text' ? 'story' : 
                                     option.id === 'narration_audio' ? 'narration' :
                                     option.id === 'story_book_pdf' ? 'story_book' :
                                     option.id === 'coloring_book_pdf' ? 'coloring_book' : 'video';
                  const balance = balances[balanceKey];
                  const hasBalance = balance && balance.quantity > 0;
                  
                  const hasVideo = selectedOutputs.includes('video');
                  const hasStoryText = selectedOutputs.includes('story_text');
                  const hasNarration = selectedOutputs.includes('narration_audio');
                  
                  const isDisabledByExclusivity = 
                    (option.id === 'video' && (hasStoryText || hasNarration)) ||
                    ((option.id === 'story_text' || option.id === 'narration_audio') && hasVideo);
                  
                  const isChecked = selectedOutputs.includes(option.id);
                  const isDisabled = (!hasBalance && !isChecked) || isDisabledByExclusivity;
                  
                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => handleOutputToggle(option.id)}
                      disabled={isDisabled}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '1.1rem',
                        borderRadius: '16px',
                        border: isChecked ? '2px solid #6366f1' : '1.5px solid rgba(255, 255, 255, 0.08)',
                        background: isChecked
                          ? 'rgba(99, 102, 241, 0.2)'
                          : isDisabledByExclusivity
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(15, 23, 42, 0.5)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: isDisabled ? 0.45 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>{option.emoji}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>{option.label}</span>
                        {isChecked && (
                          <span style={{ marginLeft: 'auto', color: '#6366f1', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{option.desc}</div>
                      {!loadingBalances && !isDisabledByExclusivity && (
                        <div style={{ fontSize: '0.72rem', marginTop: '0.4rem', fontWeight: 600, color: hasBalance ? '#34d399' : '#f87171' }}>
                          {hasBalance ? `${balance.quantity} credits available` : 'No credits available'}
                        </div>
                      )}
                      {isDisabledByExclusivity && (
                        <div style={{ fontSize: '0.72rem', marginTop: '0.4rem', color: '#f87171' }}>
                          Incompatible selection
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.9rem 1.1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.9rem' }}>
                ⚠️ {error}
              </div>
            )}

            <motion.button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '1.1rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 10px 25px rgba(168, 85, 247, 0.4)',
                border: 'none',
                color: '#fff',
                cursor: loading || !title ? 'not-allowed' : 'pointer',
                opacity: loading || !title ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ display: 'inline-block', width: 20, height: 20, border: '2.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 10 }} />
                  Creating Story...
                </>
              ) : (
                <>✨ Create Story & Generate</>
              )}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
