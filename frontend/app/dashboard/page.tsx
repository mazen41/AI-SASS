'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
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

      {/* Animated background blobs */}
      <div className="dash-bg-blobs" aria-hidden>
        <div className="dash-bg-blob dash-bg-blob-1" />
        <div className="dash-bg-blob dash-bg-blob-2" />
      </div>

      <div className="dash-wrap">
        <div className="dash-inner">

          {/* ── Header ── */}
          <motion.div
            className="dash-header"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div variants={fadeUp}>
              <span className="kido-badge">
                <span className="kido-badge-star">✦</span>
                {locale === 'ar' ? 'استوديو القصص' : 'Story Studio'}
              </span>
            </motion.div>
            <motion.h1 className="dash-greeting" variants={fadeUp}>
              {greeting} <span className="gradient-text">✦</span>
            </motion.h1>
            <motion.p className="dash-sub" variants={fadeUp} custom={1}>
              {locale === 'ar'
                ? 'استوديو القصص الاصطناعي الخاص بك في انتظارك.'
                : 'Your AI story studio is waiting for you.'}
            </motion.p>
          </motion.div>

          {/* ── Grid ── */}
          <div className="dash-grid">

            {/* CTA Hero Card */}
            <motion.div
              className="dash-hero-card"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
            >
              <div className="dash-hero-deco" />
              <div className="dash-hero-deco-2" />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span className="dash-hero-emoji">✦</span>
                <h2 className="dash-hero-title">
                  {locale === 'ar' ? 'ابدأ قصتك الأولى' : 'Create your first story'}
                </h2>
                <p className="dash-hero-sub">
                  {locale === 'ar'
                    ? 'ارفع صورة طفلك وشاهد العالم السينمائي يُولد في ثوانٍ.'
                    : 'Upload a photo of your child and watch a cinematic world be born in seconds.'}
                </p>
                <div className="dash-hero-actions">
                  <motion.button
                    className="btn btn-primary"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {locale === 'ar' ? '+ إنشاء قصة' : '+ Create Story'}
                  </motion.button>
                  <motion.button
                    className="btn btn-ghost"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {locale === 'ar' ? 'عرض الأمثلة' : 'View Examples'}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Widget: My Stories */}
            <motion.div
              className="dash-widget"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <div className="widget-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(84,120,255,0.15), rgba(84,120,255,0.05))' }}>
                  📖
                </div>
                <p className="widget-title">{locale === 'ar' ? 'قصصي' : 'My Stories'}</p>
              </div>
              <div className="widget-empty-state">
                <div className="widget-empty-emoji">📚</div>
                <span>{locale === 'ar' ? 'لا توجد قصص بعد' : 'No stories yet'}</span>
              </div>
            </motion.div>

            {/* Widget: Videos */}
            <motion.div
              className="dash-widget"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <div className="widget-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(255,62,155,0.15), rgba(255,62,155,0.05))' }}>
                  🎬
                </div>
                <p className="widget-title">{locale === 'ar' ? 'فيديوهاتي' : 'My Videos'}</p>
              </div>
              <div className="widget-empty-state">
                <div className="widget-empty-emoji">🎞️</div>
                <span>{locale === 'ar' ? 'لا توجد فيديوهات بعد' : 'No videos yet'}</span>
              </div>
            </motion.div>

            {/* Widget: Gallery */}
            <motion.div
              className="dash-widget"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <div className="widget-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(255,222,66,0.18), rgba(255,222,66,0.06))' }}>
                  🖼️
                </div>
                <p className="widget-title">{locale === 'ar' ? 'معرضي' : 'My Gallery'}</p>
              </div>
              <div className="widget-empty-state">
                <div className="widget-empty-emoji">🎨</div>
                <span>{locale === 'ar' ? 'لا توجد صور بعد' : 'No images yet'}</span>
              </div>
            </motion.div>

            {/* Widget: Account */}
            <motion.div
              className="dash-widget"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <div className="widget-icon-wrap" style={{ background: 'linear-gradient(135deg, rgba(102,208,188,0.18), rgba(102,208,188,0.06))' }}>
                  👤
                </div>
                <p className="widget-title">{locale === 'ar' ? 'الحساب' : 'Account'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
                  {user?.name}
                </p>
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', margin: '0 0 1rem' }}>
                  {user?.email}
                </p>
                <span className="plan-badge">
                  {locale === 'ar' ? 'مجاني' : 'FREE PLAN'}
                </span>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
