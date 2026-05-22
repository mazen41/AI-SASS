'use client';

import Link from 'next/link';
import { motion, useInView, Variants } from 'framer-motion';
import { useRef } from 'react';
import AnimatedScene from './AnimatedScene';
import Navbar from './Navbar';
import CustomCursor from './CustomCursor';
import { useLang } from '@/context/LangContext';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const { t, locale } = useLang();

  const features = [
    { icon: '✦', title: t('feat1_title'), desc: t('feat1_desc') },
    { icon: '◈', title: t('feat2_title'), desc: t('feat2_desc') },
    { icon: '◎', title: t('feat3_title'), desc: t('feat3_desc') },
    { icon: '◉', title: t('feat4_title'), desc: t('feat4_desc') },
    { icon: '⬡', title: t('feat5_title'), desc: t('feat5_desc') },
  ];

  const steps = [
    { title: t('step1_title'), desc: t('step1_desc') },
    { title: t('step2_title'), desc: t('step2_desc') },
    { title: t('step3_title'), desc: t('step3_desc') },
    { title: t('step4_title'), desc: t('step4_desc') },
  ];

  const pricingPlans = [
    {
      name: t('plan_basic'),
      price: t('plan_basic_price'),
      period: t('plan_per_month'),
      desc: t('plan_basic_desc'),
      features: ['3 ' + t('feat_stories'), t('feat_hd'), t('feat_voice')],
      featured: false,
    },
    {
      name: t('plan_pro'),
      price: t('plan_pro_price'),
      period: t('plan_per_month'),
      desc: t('plan_pro_desc'),
      features: ['15 ' + t('feat_stories'), t('feat_hd'), t('feat_voice'), t('feat_download')],
      featured: true,
    },
    {
      name: t('plan_premium'),
      price: t('plan_premium_price'),
      period: t('plan_per_month'),
      desc: t('plan_premium_desc'),
      features: [t('feat_unlimited'), t('feat_4k'), t('feat_voice'), t('feat_download'), t('feat_priority')],
      featured: false,
    },
  ];

  const testimonials = [
    { name: 'Sarah M.', initial: 'S', text: locale === 'ar' ? 'ابني أصبح بطل قصته الخاصة! السحر الحقيقي.' : 'My son became the hero of his own story! Pure magic.', stars: 5 },
    { name: 'James K.', initial: 'J', text: locale === 'ar' ? 'جودة سينمائية لا تصدق من صورة واحدة فقط.' : 'Incredible cinematic quality from just one photo.', stars: 5 },
    { name: 'Layla R.', initial: 'L', text: locale === 'ar' ? 'هدية مثالية. ابنتي تشاهد قصتها كل يوم.' : "Perfect gift. My daughter watches her story every day.", stars: 5 },
  ];

  return (
    <div className="site-shell">
      <CustomCursor />
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="hero">
        <AnimatedScene />
        <div className="overlay" />
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="badge">
              <span className="badge-dot" />
              {t('hero_badge')}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('hero_headline_1')}{' '}
            <span className="gradient-text">{t('hero_headline_2')}</span>
            <br />
            {t('hero_headline_3')}
          </motion.h1>

          <motion.p
            className="sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            {t('hero_sub')}
          </motion.p>

          <motion.div
            className="cta-row"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Link href="/register" className="btn btn-primary">
              <span>{t('hero_cta_primary')}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="#how" className="btn btn-ghost">
              {t('hero_cta_secondary')}
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}
          >
            <div style={{
              width: '1.5px',
              height: '50px',
              background: 'linear-gradient(to bottom, transparent, var(--neon-2))',
              borderRadius: '9999px',
              animation: 'float 2s ease-in-out infinite',
              opacity: 0.6,
            }} />
          </motion.div>
        </motion.div>
      </section>

      <div className="glow-divider" />

      {/* ─── FEATURES ─── */}
      <section className="section">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="badge"><span className="badge-dot" />{t('features_badge')}</span>
            <h2>{t('features_title')}</h2>
            <p>{t('features_sub')}</p>
          </motion.div>

          <div className="grid-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="glass card"
                variants={fadeUp}
                custom={i}
                whileHover={{ rotateX: 3, rotateY: -4, scale: 1.03, y: -4 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div style={{
                  fontSize: '1.4rem',
                  marginBottom: '0.9rem',
                  background: 'var(--grad-subtle)',
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid var(--border)',
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {f.title}
                </h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      <div className="glow-divider" />

      {/* ─── HOW IT WORKS ─── */}
      <section className="section" id="how">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="badge"><span className="badge-dot" />{t('how_badge')}</span>
            <h2>{t('how_title')}</h2>
          </motion.div>

          <div className="steps-grid">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                className="glass step-card"
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -6, borderColor: 'var(--border-hover)' }}
              >
                <div className="step-num">{i + 1}</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {s.title}
                </h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      <div className="glow-divider" />

      {/* ─── AI SHOWCASE ─── */}
      <section className="section">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="badge"><span className="badge-dot" />AI Output</span>
            <h2>See what gets{' '}
              <span className="gradient-text">created</span>
            </h2>
            <p>From one photo — a complete cinematic universe.</p>
          </motion.div>

          <div className="showcase-grid">
            {/* Video mock */}
            <motion.div
              className="showcase-video-mock glass"
              variants={fadeUp}
              whileHover={{ scale: 1.02 }}
            >
              <div className="video-bg">
                {/* Floating scene elements */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at 25% 35%, rgba(94,125,255,0.3), transparent 45%), radial-gradient(ellipse at 75% 65%, rgba(180,85,255,0.25), transparent 45%)',
                  animation: 'float 7s ease-in-out infinite',
                }} />
                <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                  <div className="play-btn" style={{ margin: '0 auto 1rem' }}>
                    <div className="play-icon" />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0, fontFamily: 'Syne, sans-serif', fontWeight: 600, letterSpacing: '0.08em' }}>
                    CINEMATIC STORY PREVIEW
                  </p>
                </div>
                {/* Fake progress bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '0.75rem 1rem',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                }}>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 1, marginBottom: '0.4rem' }}>
                    <div style={{ width: '42%', height: '100%', background: 'var(--grad)', borderRadius: 1 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    <span>1:24</span><span>3:12</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Story cards */}
            <div className="story-cards">
              {[
                { emoji: '🌌', title: locale === 'ar' ? 'مغامرة الفضاء' : 'Space Adventure', subtitle: locale === 'ar' ? '٤ فصول · ٢ دقيقة' : '4 chapters · 2 min' },
                { emoji: '🌿', title: locale === 'ar' ? 'مملكة الغابة' : 'Jungle Kingdom', subtitle: locale === 'ar' ? '٦ فصول · ٣ دقائق' : '6 chapters · 3 min' },
                { emoji: '🏰', title: locale === 'ar' ? 'أسطورة الفارس' : 'Knight\'s Legend', subtitle: locale === 'ar' ? '٥ فصول · ٢.٥ دقيقة' : '5 chapters · 2.5 min' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="glass story-card"
                  variants={fadeUp}
                  custom={i + 1}
                  whileHover={{ borderColor: 'var(--border-hover)' }}
                >
                  <div className="story-thumb" style={{
                    background: `radial-gradient(135deg, var(--grad))`,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '1.5rem',
                  }}>
                    {item.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {item.title}
                    </div>
                    <div style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                      {item.subtitle}
                    </div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'grid', placeItems: 'center',
                    fontSize: '0.65rem', color: 'var(--neon-2)',
                    flexShrink: 0,
                  }}>▶</div>
                </motion.div>
              ))}

              <motion.div variants={fadeUp} custom={4} style={{ marginTop: '0.25rem' }}>
                <Link href="/register" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {t('hero_cta_primary')}
                </Link>
              </motion.div>
            </div>
          </div>
        </Section>
      </section>

      <div className="glow-divider" />

      {/* ─── PRICING ─── */}
      <section className="section">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="badge"><span className="badge-dot" />{t('pricing_badge')}</span>
            <h2>{t('pricing_title')}</h2>
            <p>{t('pricing_sub')}</p>
          </motion.div>

          <div className="pricing-grid">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`glass pricing-card ${plan.featured ? 'featured' : ''}`}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -6 }}
              >
                {plan.featured && (
                  <div className="price-badge">{t('plan_popular')}</div>
                )}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', margin: 0 }}>{plan.desc}</p>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                <ul className="feat-list">
                  {plan.features.map(f => (
                    <li key={f}>
                      <span className="check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`btn ${plan.featured ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                >
                  {t('plan_cta')}
                </Link>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      <div className="glow-divider" />

      {/* ─── TESTIMONIALS ─── */}
      <section className="section">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="badge"><span className="badge-dot" />
              {locale === 'ar' ? 'ماذا يقول المستخدمون' : 'What parents say'}
            </span>
            <h2>
              {locale === 'ar' ? 'لحظات' : 'Moments that'}{' '}
              <span className="gradient-text">
                {locale === 'ar' ? 'لا تُنسى' : 'last forever'}
              </span>
            </h2>
          </motion.div>

          <div className="testi-grid">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="glass testi-card"
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, borderColor: 'var(--border-hover)' }}
              >
                <div className="stars">{'★'.repeat(t.stars)}</div>
                <p style={{ color: 'var(--text-2)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>
                  "{t.text}"
                </p>
                <div className="testi-author">
                  <div className="avatar">{t.initial}</div>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-logo" style={{ fontSize: '1.2rem' }}>StoryHero</span>
            <p>{t('footer_tagline')}</p>
          </div>
          <div className="footer-col">
            <h4>{t('footer_product')}</h4>
            <a href="#">{t('footer_features')}</a>
            <a href="#">{t('footer_pricing')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('footer_company')}</h4>
            <a href="#">{t('footer_about')}</a>
            <a href="#">{t('footer_blog')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('footer_legal')}</h4>
            <a href="#">{t('footer_privacy')}</a>
            <a href="#">{t('footer_terms')}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t('footer_rights')}</span>
          <span style={{ opacity: 0.5 }}>✦</span>
        </div>
      </footer>
    </div>
  );
}
