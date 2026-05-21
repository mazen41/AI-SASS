'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedScene from './AnimatedScene';

const features = [
  'AI-generated cinematic story arcs',
  'Personalized characters from one photo',
  'Narrated voiceovers in seconds',
  'Beautiful visual scenes per chapter',
  'Instant shareable family moments',
];

export default function LandingPage() {
  return (
    <div className="site-shell">
      <section className="hero">
        <AnimatedScene />
        <div className="overlay" />
        <motion.div className="hero-content" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <p className="badge">AI STORYVERSE</p>
          <h1>Turn your child into the hero of an AI-powered story</h1>
          <p className="sub">Upload one photo and generate cinematic stories, visuals, and magical moments instantly.</p>
          <div className="cta-row">
            <Link href="/register" className="btn btn-primary">Create Account</Link>
            <Link href="/login" className="btn btn-ghost">Login</Link>
          </div>
        </motion.div>
      </section>

      <section className="section">
        <h2>Features built for wonder</h2>
        <div className="grid">
          {features.map((f, i) => (
            <motion.div key={f} className="glass card" whileHover={{ rotateX: 4, rotateY: -5, scale: 1.03 }} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <p>{f}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <div className="steps">
          {['Upload child photo', 'Select theme + style', 'Receive story, images, and video'].map((s, i) => <div key={s} className="step glass"><span>{i + 1}</span>{s}</div>)}
        </div>
      </section>

      <section className="section">
        <h2>Pricing</h2>
        <div className="grid pricing">
          {['Starter', 'Pro', 'Studio'].map((p) => <div key={p} className="glass card price"><h3>{p}</h3><p>Premium cinematic generation</p></div>)}
        </div>
      </section>
      <footer className="footer">© {new Date().getFullYear()} AI StoryVerse</footer>
    </div>
  );
}
