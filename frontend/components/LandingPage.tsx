'use client';

import Link from 'next/link';
import { motion, useInView, Variants } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import AnimatedScene from './AnimatedScene';
import Navbar from './Navbar';
import CustomCursor from './CustomCursor';
import { useLang } from '@/context/LangContext';
import { apiGetPublicPackages, Package } from '@/lib/api';

/* ── Animation presets ── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.72, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

function Section({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={stagger} className={className} style={style}>
      {children}
    </motion.div>
  );
}

/* ── Wavy SVG Divider ── */
function WaveDivider({ flip = false, color = 'var(--bg-2)' }: { flip?: boolean; color?: string }) {
  return (
    <div className="wave-divider" style={flip ? { transform: 'scaleY(-1)' } : {}}>
      <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: 60, display: 'block' }}>
        <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill={color} />
      </svg>
    </div>
  );
}

export default function LandingPage() {
  const { t, locale } = useLang();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);

  useEffect(() => {
    apiGetPublicPackages()
      .then((res) => setPackages(res.packages.filter((p) => p.is_active)))
      .catch(() => setPackages([]))
      .finally(() => setPkgLoading(false));
  }, []);

  const features = [
    { icon: '🎭', color: 'feat-icon-blue',   accent: 'kido-card-blue',   title: t('feat1_title'), desc: t('feat1_desc') },
    { icon: '✨', color: 'feat-icon-pink',   accent: 'kido-card-pink',   title: t('feat2_title'), desc: t('feat2_desc') },
    { icon: '🎬', color: 'feat-icon-yellow', accent: 'kido-card-yellow', title: t('feat3_title'), desc: t('feat3_desc') },
    { icon: '🌍', color: 'feat-icon-mint',   accent: 'kido-card-mint',   title: t('feat4_title'), desc: t('feat4_desc') },
    { icon: '🔮', color: 'feat-icon-purple', accent: 'kido-card-magic',  title: t('feat5_title'), desc: t('feat5_desc') },
  ];

  const steps = [
    { icon: '📸', numClass: 'step-num-1', title: t('step1_title'), desc: t('step1_desc') },
    { icon: '🪄', numClass: 'step-num-2', title: t('step2_title'), desc: t('step2_desc') },
    { icon: '🎞️', numClass: 'step-num-3', title: t('step3_title'), desc: t('step3_desc') },
    { icon: '🌟', numClass: 'step-num-4', title: t('step4_title'), desc: t('step4_desc') },
  ];


  const testimonials = [
    { initial: 'S', avatarClass: 'testi-avatar-blue',   name: 'Sarah M.', stars: 5,
      text: locale === 'ar' ? '"ابني أصبح بطل قصته الخاصة! السحر الحقيقي."' : '"My son became the hero of his own story! Pure magic."' },
    { initial: 'J', avatarClass: 'testi-avatar-pink',   name: 'James K.', stars: 5,
      text: locale === 'ar' ? '"جودة سينمائية لا تصدق من صورة واحدة فقط."' : '"Incredible cinematic quality from just one photo."' },
    { initial: 'L', avatarClass: 'testi-avatar-yellow', name: 'Layla R.', stars: 5,
      text: locale === 'ar' ? '"هدية مثالية. ابنتي تشاهد قصتها كل يوم."' : '"Perfect gift. My daughter watches her story every day."' },
  ];

  const faqs = locale === 'ar' ? [
    { q: 'ما هو StoryHero؟', a: 'منصة ذكاء اصطناعي لتحويل صور أطفالك إلى قصص ومقاطع فيديو سينمائية رائعة.' },
    { q: 'كم من الوقت يستغرق إنشاء القصة؟', a: 'بضع دقائق فقط! يعالج الذكاء الاصطناعي صورتك وينتج قصة كاملة مع مقطع فيديو.' },
    { q: 'هل هو آمن للأطفال؟', a: 'نعم! نحن نضع سلامة الأطفال في المقام الأول. جميع المحتويات مناسبة للأعمار وخاضعة للمراجعة.' },
    { q: 'هل يمكنني تنزيل القصص؟', a: 'نعم، يمكن لمشتركي الخطة الاحترافية والمميزة تنزيل القصص بجودة عالية.' },
  ] : [
    { q: 'What is StoryHero?', a: 'An AI platform that transforms photos of your children into breathtaking cinematic stories and videos.' },
    { q: 'How long does it take to create a story?', a: 'Just a few minutes! Our AI processes your photo and produces a complete story with a video.' },
    { q: 'Is it safe for kids?', a: 'Absolutely! We prioritize child safety. All content is age-appropriate and reviewed.' },
    { q: 'Can I download the stories?', a: 'Yes, Pro and Premium subscribers can download stories in high quality.' },
  ];

  return (
    <div className="site-shell">
      <CustomCursor />
      <Navbar />

      {/* ════════════════════════════════════════════
          HERO — Cinematic Full Viewport
      ═══════════════════════════════════════════════ */}
      <section className="kido-hero">
        {/* Background blobs */}
        <div className="hero-bg-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="blob blob-4" />
          <div className="blob blob-5" />
        </div>

        {/* Animated scene canvas */}
        <AnimatedScene />
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', opacity: 0.1 }} />

        {/* Floating decorations */}
        <div className="hero-deco hero-deco-star" style={{ top: '20%', left: '8%', animationDelay: '-1s' }}>⭐</div>
        <div className="hero-deco hero-deco-star-sm" style={{ top: '35%', left: '4%', animationDelay: '-3s' }}>✦</div>
        <div className="hero-deco hero-deco-star" style={{ top: '25%', right: '7%', animationDelay: '-2s' }}>🌟</div>
        <div className="hero-deco hero-deco-cloud" style={{ bottom: '28%', left: '6%', animationDelay: '-4s' }}>☁️</div>
        <div className="hero-deco hero-deco-cloud" style={{ bottom: '32%', right: '5%', animationDelay: '-1.5s' }}>☁️</div>
        <div className="hero-deco" style={{ top: '60%', right: '12%', animationDelay: '-3.5s', animation: 'float 7s ease-in-out infinite', fontSize: '2rem' }}>🎪</div>
        <div className="hero-deco" style={{ top: '15%', left: '30%', animationDelay: '-2.5s', animation: 'float 9s ease-in-out infinite', fontSize: '1.5rem' }}>💫</div>

        {/* Main content */}
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 55 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <span className="kido-badge">
              <span className="kido-badge-star">✦</span>
              {t('hero_badge')}
            </span>
          </motion.div>

          <motion.h1
            className="hero-h1"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('hero_headline_1')}{' '}
            <span className="gradient-text">{t('hero_headline_2')}</span>
            <br />
            {t('hero_headline_3')}
          </motion.h1>

          <motion.p
            className="hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {t('hero_sub')}
          </motion.p>

          <motion.div
            className="cta-row"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
          >
            <Link href="/register" className="btn btn-primary btn-lg">
              <span>{t('hero_cta_primary')}</span>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="#how" className="btn btn-ghost btn-lg">
              {t('hero_cta_secondary')}
            </Link>
          </motion.div>

          {/* Preview story tags */}
          <motion.div
            className="hero-preview-strip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            {[
              { emoji: '🌌', label: locale === 'ar' ? 'مغامرة الفضاء' : 'Space Adventure' },
              { emoji: '🌿', label: locale === 'ar' ? 'مملكة الغابة' : 'Jungle Kingdom' },
              { emoji: '🏰', label: locale === 'ar' ? 'أسطورة الفارس' : 'Knight\'s Legend' },
              { emoji: '🧙', label: locale === 'ar' ? 'ساحر العالم' : 'Wizard World' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="hero-preview-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + i * 0.1 }}
                style={{ animationDelay: `${i * 1.5}s` }}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
                <div className="hero-preview-dot" />
              </motion.div>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
            }}>
              <span style={{ color: 'var(--text-3)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Fredoka, sans-serif' }}>
                {locale === 'ar' ? 'اكتشف المزيد' : 'Scroll to explore'}
              </span>
              <div style={{
                width: '1.5px', height: '44px',
                background: 'linear-gradient(to bottom, transparent, var(--k-blue))',
                borderRadius: '9999px',
                animation: 'float 2s ease-in-out infinite',
                opacity: 0.5,
              }} />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Wave divider */}
      <WaveDivider color="var(--bg-2)" />

      {/* ════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════ */}
      <div style={{ background: 'var(--bg-2)' }}>
        <section className="section">
          <Section>
            <motion.div className="section-header" variants={fadeUp}>
              <span className="kido-badge"><span className="kido-badge-star">✦</span>{t('features_badge')}</span>
              <h2>{t('features_title')}</h2>
              <p>{t('features_sub')}</p>
            </motion.div>

            <div className="features-grid">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  className={`kido-card ${f.accent}`}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ rotateX: 2, rotateY: -3, scale: 1.03, y: -6 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`feat-icon-wrap ${f.color}`}>{f.icon}</div>
                  <h3 className="feat-title">{f.title}</h3>
                  <p className="feat-desc">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </Section>
        </section>
      </div>

      <WaveDivider flip color="var(--bg-2)" />

      {/* ════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════ */}
      <section className="section" id="how">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="kido-badge"><span className="kido-badge-star">🪄</span>{t('how_badge')}</span>
            <h2>{t('how_title')}</h2>
          </motion.div>

          <div className="steps-grid">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                className="step-card"
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -8, borderColor: 'var(--border-hover)' }}
              >
                <div className={`step-num ${s.numClass}`}>{i + 1}</div>
                <span className="step-icon animate-float" style={{ animationDelay: `${i * 0.5}s` }}>{s.icon}</span>
                <h3 className="step-title">{s.title}</h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.91rem', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      <WaveDivider color="var(--bg-3)" />

      {/* ════════════════════════════════════════════
          AI SHOWCASE
      ═══════════════════════════════════════════════ */}
      <div style={{ background: 'var(--bg-3)' }}>
        <section className="section">
          <Section>
            <motion.div className="section-header" variants={fadeUp}>
              <span className="kido-badge"><span className="kido-badge-star">🎬</span>
                {locale === 'ar' ? 'المخرجات الإبداعية' : 'AI Output'}
              </span>
              <h2>
                {locale === 'ar' ? 'شاهد ما يتم' : 'See what gets'}{' '}
                <span className="gradient-text">{locale === 'ar' ? 'إنشاؤه' : 'created'}</span>
              </h2>
              <p>{locale === 'ar' ? 'من صورة واحدة — عالم سينمائي كامل.' : 'From one photo — a complete cinematic universe.'}</p>
            </motion.div>

            <div className="showcase-grid">
              {/* Video mock */}
              <motion.div className="video-mock glass" variants={fadeUp} whileHover={{ scale: 1.02 }}>
                <div className="video-inner">
                  <div className="video-stars" />
                  <div className="video-planet" />
                  <div className="video-moon" />
                  <div className="video-comet" />
                  <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                    <div className="play-btn-kido" style={{ margin: '0 auto 1rem' }}>
                      <div className="play-icon-kido" />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', margin: 0, fontFamily: 'Fredoka, sans-serif', fontWeight: 600, letterSpacing: '0.08em' }}>
                      CINEMATIC STORY PREVIEW
                    </p>
                  </div>
                  <div className="video-progress">
                    <div className="progress-bar"><div className="progress-fill" /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                      <span>1:24</span><span>3:12</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Story cards */}
              <div className="story-cards-list">
                {[
                  { emoji: '🌌', bg: 'linear-gradient(135deg, #2a1a6e, #5478FF)', title: locale === 'ar' ? 'مغامرة الفضاء' : 'Space Adventure', sub: locale === 'ar' ? '٤ فصول · ٢ دقيقة' : '4 chapters · 2 min' },
                  { emoji: '🌿', bg: 'linear-gradient(135deg, #1a4a2e, #59B292)', title: locale === 'ar' ? 'مملكة الغابة' : 'Jungle Kingdom', sub: locale === 'ar' ? '٦ فصول · ٣ دقائق' : '6 chapters · 3 min' },
                  { emoji: '🏰', bg: 'linear-gradient(135deg, #4a1a1a, #E87F24)', title: locale === 'ar' ? 'أسطورة الفارس' : "Knight's Legend", sub: locale === 'ar' ? '٥ فصول · ٢.٥ دقيقة' : '5 chapters · 2.5 min' },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    className="story-card-item glass"
                    variants={fadeUp}
                    custom={i + 1}
                    whileHover={{ borderColor: 'var(--border-hover)' }}
                  >
                    <div className="story-thumb-emoji" style={{ background: item.bg }}>{item.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: '0.98rem', marginBottom: '0.25rem' }}>{item.title}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{item.sub}</div>
                    </div>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'var(--surface)', border: '1.5px solid var(--border)',
                      display: 'grid', placeItems: 'center', fontSize: '0.65rem',
                      color: 'var(--k-blue)', flexShrink: 0,
                    }}>▶</div>
                  </motion.div>
                ))}

                <motion.div variants={fadeUp} custom={4} style={{ marginTop: '0.5rem' }}>
                  <Link href="/register" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    {t('hero_cta_primary')}
                  </Link>
                </motion.div>
              </div>
            </div>
          </Section>
        </section>
      </div>

      <WaveDivider flip color="var(--bg-3)" />

      {/* ════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════ */}
      <section className="section" id="pricing">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="kido-badge"><span className="kido-badge-star">💎</span>{t('pricing_badge')}</span>
            <h2>{t('pricing_title')}</h2>
            <p>{t('pricing_sub')}</p>
          </motion.div>

          <div className="pricing-grid">
            {pkgLoading ? (
              [0,1,2].map((i) => (
                <div key={i} className="pricing-card" style={{ opacity: 0.4, minHeight: 320, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))
            ) : packages.length === 0 ? (
              <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-3)' }}>No packages available yet.</p>
            ) : (
              packages.map((pkg, i) => {
                const isFeatured = i === 1;
                const checkClasses = ['pricing-check-blue', 'pricing-check-pink', 'pricing-check-yellow'];
                const checkClass = checkClasses[i % checkClasses.length];
                const price = pkg.total_price === 0 ? (locale === 'ar' ? 'مجاني' : 'Free') : `${Number(pkg.total_price).toFixed(2)}`;
                return (
                  <motion.div
                    key={pkg.id}
                    className={`pricing-card ${isFeatured ? 'featured' : ''}`}
                    variants={fadeUp}
                    custom={i}
                    whileHover={{ y: -8 }}
                  >
                    {isFeatured && <div className="pricing-featured-badge">{t('plan_popular')}</div>}
                    <div>
                      <div className="pricing-name">{pkg.name}</div>
                      <div className="pricing-desc">{pkg.description || ''}</div>
                    </div>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span className="pricing-amount">{price}</span>
                      {pkg.total_price > 0 && <span className="pricing-period">{t('plan_per_month')}</span>}
                    </div>
                    <ul className="pricing-features">
                      {pkg.items?.map((item) => (
                        <li key={item.id}>
                          <span className={`pricing-check ${checkClass}`}>✓</span>
                          {item.quantity} {item.product?.name}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={`/register?package=${pkg.id}`}
                      className={`btn ${isFeatured ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', textDecoration: 'none' }}
                    >
                      {pkg.total_price === 0
                        ? (locale === 'ar' ? 'ابدأ مجانًا' : 'Start Free')
                        : t('plan_cta')}
                    </a>
                  </motion.div>
                );
              })
            )}
          </div>
        </Section>
      </section>

      <WaveDivider color="var(--bg-2)" />

      {/* ════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════ */}
      <div style={{ background: 'var(--bg-2)' }}>
        <section className="section">
          <Section>
            <motion.div className="section-header" variants={fadeUp}>
              <span className="kido-badge"><span className="kido-badge-star">💬</span>
                {locale === 'ar' ? 'ماذا يقول الآباء' : 'What parents say'}
              </span>
              <h2>
                {locale === 'ar' ? 'لحظات' : 'Moments that'}{' '}
                <span className="gradient-text">{locale === 'ar' ? 'لا تُنسى' : 'last forever'}</span>
              </h2>
            </motion.div>

            <div className="testi-grid">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  className="testi-card"
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -5 }}
                >
                  <div className="testi-stars">{'★'.repeat(t.stars)}</div>
                  <p className="testi-text">{t.text}</p>
                  <div className="testi-author-row">
                    <div className={`testi-avatar ${t.avatarClass}`}>{t.initial}</div>
                    <span className="testi-name">{t.name}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Section>
        </section>
      </div>

      <WaveDivider flip color="var(--bg-2)" />

      {/* ════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════ */}
      <section className="section">
        <Section>
          <motion.div className="section-header" variants={fadeUp}>
            <span className="kido-badge"><span className="kido-badge-star">❓</span>
              {locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
            </span>
            <h2>
              {locale === 'ar' ? 'هل لديك' : 'Got'}{' '}
              <span className="gradient-text">{locale === 'ar' ? 'أسئلة؟' : 'questions?'}</span>
            </h2>
          </motion.div>

          <div className="faq-list">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className="faq-item"
                variants={fadeUp}
                custom={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="faq-q">
                  {faq.q}
                  <span style={{ fontSize: '1.2rem', flexShrink: 0, transition: 'transform 0.3s ease', transform: openFaq === i ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
                </div>
                {openFaq === i && (
                  <motion.p
                    className="faq-a"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {faq.a}
                  </motion.p>
                )}
              </motion.div>
            ))}
          </div>
        </Section>
      </section>

      {/* ════════════════════════════════════════════
          CTA SECTION
      ═══════════════════════════════════════════════ */}
      <Section className="cta-section" style={{ position: 'relative' }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(84,120,255,0.15), transparent 70%)', top: '-60px', right: '-60px', animation: 'float-blob 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,62,155,0.12), transparent 70%)', bottom: '-40px', left: '-40px', animation: 'float-blob 10s ease-in-out infinite reverse' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeUp}>
            <span className="kido-badge"><span className="kido-badge-star">🚀</span>
              {locale === 'ar' ? 'ابدأ مجاناً' : 'Start for free'}
            </span>
          </motion.div>
          <motion.h2 variants={fadeUp} custom={1}>
            {locale === 'ar'
              ? <>اصنع <span className="gradient-text">ذكريات سينمائية</span> اليوم</>
              : <>Create <span className="gradient-text">cinematic memories</span> today</>}
          </motion.h2>
          <motion.p variants={fadeUp} custom={2}>
            {locale === 'ar'
              ? 'انضم إلى آلاف الأسر التي تحوّل صور أطفالها إلى قصص سحرية لا تُنسى.'
              : 'Join thousands of families turning their children\'s photos into magical stories.'}
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="cta-row">
            <Link href="/register" className="btn btn-primary btn-lg">
              {locale === 'ar' ? 'ابدأ مجاناً ✦' : 'Start Free ✦'}
            </Link>
            <Link href="/login" className="btn btn-ghost btn-lg">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Log In'}
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="nav-logo-kido" style={{ fontSize: '1.4rem' }}>
              <span className="nav-logo-star">✦</span> StoryHero
            </span>
            <p className="footer-brand-desc" style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.78, marginTop: '0.9rem', maxWidth: 280 }}>
              {t('footer_tagline')}
            </p>
            <div className="footer-social" style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
              {['𝕏', '📘', '📸', '▶'].map((icon, i) => (
                <a key={i} href="#" className="footer-social-btn">{icon}</a>
              ))}
            </div>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer_product')}</h4>
            <a href="#">{t('footer_features')}</a>
            <a href="#">{t('footer_pricing')}</a>
            <a href="#">{locale === 'ar' ? 'أمثلة' : 'Examples'}</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer_company')}</h4>
            <a href="#">{t('footer_about')}</a>
            <a href="#">{t('footer_blog')}</a>
            <a href="#">{locale === 'ar' ? 'وظائف' : 'Careers'}</a>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">{t('footer_legal')}</h4>
            <a href="#">{t('footer_privacy')}</a>
            <a href="#">{t('footer_terms')}</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t('footer_rights')}</span>
          <span style={{ opacity: 0.4 }}>Made with 💛 for little adventurers</span>
        </div>
      </footer>
    </div>
  );
}
