'use client';

import { useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiCreateStory, apiGenerateStory, Story } from '@/lib/api';
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

export default function CreateStoryPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
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
  const [createdStory, setCreatedStory] = useState<Story | null>(null);
  const [error, setError] = useState('');

  if (!isLoggedIn) {
    if (typeof window !== 'undefined') router.push('/login');
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

      const { story } = await apiCreateStory(formData);
      setCreatedStory(story);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!createdStory) return;
    setGenerating(true);
    setError('');

    try {
      const { story } = await apiGenerateStory(createdStory.id);
      router.push(`/stories/${story.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      setGenerating(false);
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
                onClick={handleGenerate}
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
    <div className="site-shell" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <CustomCursor />
      <Navbar />
      <div className="section" style={{ paddingTop: '7rem', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="kido-badge" style={{ marginBottom: '1rem', display: 'inline-block' }}>
              <span className="kido-badge-star">✦</span> Story Studio
            </span>
            <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
              Create a <span className="gradient-text">Magical Story</span>
            </h1>
            <p style={{ color: 'var(--text-2)', marginBottom: '2.5rem' }}>
              Upload a photo, choose a theme, and let our AI create a cinematic adventure.
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* Photo Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: photoPreview ? 'transparent' : 'var(--surface)',
                transition: 'all 0.3s',
                position: 'relative',
              }}
            >
              {photoPreview ? (
                <Image src={photoPreview} alt="Preview" width={720} height={300} style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: "var(--r-md)" }} />
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📸</div>
                  <p style={{ color: 'var(--text)', fontWeight: 600 }}>Click to upload a photo</p>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Clear photo of your child works best</p>
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

            {/* Title */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                Story Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Little Hero's Adventure"
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--r-md)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Child Name & Age */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Child&apos;s Name
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Emma"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Age
                </label>
                <input
                  type="number"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="5"
                  min={1}
                  max={18}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>


            {/* Language + Custom Prompt */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Custom story idea <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Make it about kindness, space robots, or learning bravery"
                  maxLength={500}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.6rem', fontWeight: 600 }}>
                Choose a Theme
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {themes.map((theme) => (
                  <motion.button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--r-md)',
                      border: selectedTheme === theme.id ? '2px solid var(--k-blue)' : '1.5px solid var(--border)',
                      background: selectedTheme === theme.id ? 'rgba(84,120,255,0.08)' : 'var(--surface)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: 'var(--text)',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: '0.3rem' }}>{theme.emoji}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{theme.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.15rem' }}>{theme.desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--k-pink)', fontSize: '0.9rem' }}>{error}</p>
            )}

            <motion.button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !title}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 8 }} />
                  Creating...
                </>
              ) : (
                <>✨ Create Story</>
              )}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
