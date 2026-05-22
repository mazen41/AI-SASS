'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function DashboardPage() {
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useLang();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) router.push('/login');
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  const firstName = user?.name?.split(' ')[0] ?? '';
  const greeting = locale === 'ar' ? `مرحباً، ${firstName}` : `Welcome back, ${firstName}`;

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <CustomCursor />
      <Navbar />

      <div className="home-wrap">
        {/* Header */}
        <motion.div
          className="home-header"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div variants={fadeUp}>
            <span className="badge" style={{ marginBottom: '1rem' }}>
              <span className="badge-dot" />
              {locale === 'ar' ? 'استوديو القصص' : 'Story Studio'}
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp}>
            {greeting} <span className="gradient-text">✦</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={1} style={{ color: 'var(--text-2)' }}>
            {locale === 'ar'
              ? 'استوديو القصص الاصطناعي الخاص بك في انتظارك.'
              : 'Your AI story studio is waiting for you.'}
          </motion.p>
        </motion.div>

        <div className="home-grid">
          {/* CTA Card */}
          <motion.div
            className="glass home-cta-card"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
          >
            {/* Decorative orb */}
            <div style={{
              position: 'absolute', right: '-40px', top: '-40px',
              width: 200, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(180,85,255,0.2), transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '1rem',
                filter: 'drop-shadow(0 0 16px rgba(94,125,255,0.6))',
              }}>
                ✦
              </div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                {locale === 'ar' ? 'ابدأ قصتك الأولى' : 'Create your first story'}
              </h2>
              <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem', maxWidth: 480 }}>
                {locale === 'ar'
                  ? 'ارفع صورة طفلك وشاهد العالم السينمائي يُولد في ثوانٍ.'
                  : 'Upload a photo of your child and watch a cinematic world be born in seconds.'}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary">
                  <span>{locale === 'ar' ? '+ إنشاء قصة' : '+ Create Story'}</span>
                </button>
                <button className="btn btn-ghost">
                  {locale === 'ar' ? 'عرض الأمثلة' : 'View Examples'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Widget: My Stories */}
          <motion.div
            className="glass home-widget"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, borderColor: 'var(--border-hover)' }}
          >
            <div>
              <div className="widget-icon">📖</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {locale === 'ar' ? 'قصصي' : 'My Stories'}
              </h3>
            </div>
            <div className="widget-empty">
              <div className="widget-empty-icon">📚</div>
              <span>{locale === 'ar' ? 'لا توجد قصص بعد' : 'No stories yet'}</span>
            </div>
          </motion.div>

          {/* Widget: Videos */}
          <motion.div
            className="glass home-widget"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, borderColor: 'var(--border-hover)' }}
          >
            <div>
              <div className="widget-icon">🎬</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {locale === 'ar' ? 'فيديوهاتي' : 'My Videos'}
              </h3>
            </div>
            <div className="widget-empty">
              <div className="widget-empty-icon">🎞️</div>
              <span>{locale === 'ar' ? 'لا توجد فيديوهات بعد' : 'No videos yet'}</span>
            </div>
          </motion.div>

          {/* Widget: Gallery */}
          <motion.div
            className="glass home-widget"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, borderColor: 'var(--border-hover)' }}
          >
            <div>
              <div className="widget-icon">🖼️</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {locale === 'ar' ? 'معرضي' : 'My Gallery'}
              </h3>
            </div>
            <div className="widget-empty">
              <div className="widget-empty-icon">🎨</div>
              <span>{locale === 'ar' ? 'لا توجد صور بعد' : 'No images yet'}</span>
            </div>
          </motion.div>

          {/* Widget: Account */}
          <motion.div
            className="glass home-widget"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, borderColor: 'var(--border-hover)' }}
          >
            <div>
              <div className="widget-icon">👤</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {locale === 'ar' ? 'الحساب' : 'Account'}
              </h3>
            </div>
            <div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {user?.name}
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {user?.email}
              </div>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                background: 'var(--grad-subtle)',
                border: '1px solid var(--border)',
                fontSize: '0.75rem',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                color: 'var(--neon-2)',
                letterSpacing: '0.06em',
              }}>
                {locale === 'ar' ? 'مجاني' : 'FREE PLAN'}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
