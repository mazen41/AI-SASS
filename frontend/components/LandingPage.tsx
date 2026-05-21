'use client';

import Link from 'next/link';
import { useLang } from '@/context/LangContext';

const FEATURES = [
  {
    key: 'feat1',
    icon: '✦',
    color: '#00d4ff',
  },
  {
    key: 'feat2',
    icon: '◈',
    color: '#4f7dff',
  },
  {
    key: 'feat3',
    icon: '◉',
    color: '#a855f7',
  },
  {
    key: 'feat4',
    icon: '◎',
    color: '#ec4899',
  },
  {
    key: 'feat5',
    icon: '⬡',
    color: '#00d4ff',
  },
] as const;

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

const PLANS = [
  {
    key: 'basic',
    features: ['3', 'hd', 'voice', 'download'],
    popular: false,
  },
  {
    key: 'pro',
    features: ['15', 'hd', 'voice', 'download'],
    popular: true,
  },
  {
    key: 'premium',
    features: ['unlimited', '4k', 'voice', 'download', 'priority'],
    popular: false,
  },
] as const;

export default function LandingPage() {
  const { t } = useLang();

  return (
    <div style={{ minHeight: '100vh', background: '#04040a' }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          paddingTop: '70px',
        }}
      >
        {/* Background glows */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
            width: '900px', height: '600px',
            background: 'radial-gradient(ellipse, rgba(79,125,255,0.18) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', top: '20%', left: '-10%',
            width: '500px', height: '500px',
            background: 'radial-gradient(ellipse, rgba(0,212,255,0.08) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', top: '30%', right: '-10%',
            width: '500px', height: '500px',
            background: 'radial-gradient(ellipse, rgba(168,85,247,0.08) 0%, transparent 70%)',
          }} />

          {/* Animated orbs */}
          <div className="animate-float" style={{
            position: 'absolute', top: '15%', left: '10%',
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#00d4ff', boxShadow: '0 0 20px #00d4ff',
            opacity: 0.6,
          }} />
          <div className="animate-float delay-300" style={{
            position: 'absolute', top: '60%', right: '15%',
            width: '4px', height: '4px', borderRadius: '50%',
            background: '#a855f7', boxShadow: '0 0 16px #a855f7',
            opacity: 0.6,
          }} />
          <div className="animate-float delay-200" style={{
            position: 'absolute', top: '40%', left: '80%',
            width: '5px', height: '5px', borderRadius: '50%',
            background: '#4f7dff', boxShadow: '0 0 18px #4f7dff',
            opacity: 0.5,
          }} />

          {/* Grid lines */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 2, textAlign: 'center',
          maxWidth: '860px', padding: '0 2rem',
        }}>
          <div className="badge animate-fade-up" style={{ marginBottom: '2rem', display: 'inline-flex' }}>
            <span>✦</span>
            {t('hero_badge')}
          </div>

          <h1
            className="font-display animate-fade-up delay-100"
            style={{
              fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              marginBottom: '1.75rem',
              opacity: 0,
            }}
          >
            <span style={{ color: '#e2e8f0' }}>{t('hero_headline_1')} </span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #4f7dff 50%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('hero_headline_2')}
            </span>
            <br />
            <span style={{ color: '#e2e8f0' }}>{t('hero_headline_3')}</span>
          </h1>

          <p
            className="animate-fade-up delay-200"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'rgba(226,232,240,0.65)',
              lineHeight: 1.75,
              marginBottom: '2.75rem',
              maxWidth: '640px',
              margin: '0 auto 2.75rem',
              opacity: 0,
            }}
          >
            {t('hero_sub')}
          </p>

          <div
            className="animate-fade-up delay-300"
            style={{
              display: 'flex', gap: '1rem', justifyContent: 'center',
              flexWrap: 'wrap', opacity: 0,
            }}
          >
            <Link href="/register" className="btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2.25rem' }}>
              {t('hero_cta_primary')}
              <span>→</span>
            </Link>
            <a href="#how" className="btn-ghost" style={{ fontSize: '1rem', padding: '0.9rem 2.25rem' }}>
              {t('hero_cta_secondary')}
            </a>
          </div>

          {/* Floating preview card */}
          <div
            className="animate-float delay-400"
            style={{
              marginTop: '5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 1.75rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ display: 'flex', gap: '-8px' }}>
              {['#00d4ff', '#4f7dff', '#a855f7'].map((color, i) => (
                <div key={i} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${color}88, ${color}22)`,
                  border: '2px solid rgba(255,255,255,0.15)',
                  marginLeft: i > 0 ? '-10px' : 0,
                }} />
              ))}
            </div>
            <span style={{ color: 'rgba(226,232,240,0.7)', fontSize: '0.875rem' }}>
              2,400+ stories created
            </span>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#00ff88', boxShadow: '0 0 10px #00ff88',
              display: 'inline-block',
            }} className="animate-pulse-glow" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section style={{ padding: '8rem 2rem', position: 'relative' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <div className="badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              {t('features_badge')}
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                marginBottom: '1.25rem',
              }}
            >
              {t('features_title')}
            </h2>
            <p style={{ color: 'rgba(226,232,240,0.55)', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
              {t('features_sub')}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {FEATURES.map((feat) => (
              <div
                key={feat.key}
                className="glass glow-border"
                style={{
                  borderRadius: '20px',
                  padding: '2rem',
                  transition: 'transform 0.25s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{
                  width: '44px', height: '44px',
                  borderRadius: '12px',
                  background: `${feat.color}18`,
                  border: `1px solid ${feat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                  color: feat.color,
                  marginBottom: '1.25rem',
                }}>
                  {feat.icon}
                </div>
                <h3
                  className="font-display"
                  style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#e2e8f0' }}
                >
                  {t(`${feat.key}_title` as Parameters<typeof t>[0])}
                </h3>
                <p style={{ color: 'rgba(226,232,240,0.55)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {t(`${feat.key}_desc` as Parameters<typeof t>[0])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '8rem 2rem', position: 'relative', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <div className="badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              {t('how_badge')}
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
              }}
            >
              {t('how_title')}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2rem',
              position: 'relative',
            }}
          >
            {STEPS.map((step, idx) => (
              <div key={step} style={{ textAlign: 'center', position: 'relative' }}>
                {/* Step number */}
                <div style={{
                  width: '64px', height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(79,125,255,0.2), rgba(168,85,247,0.2))',
                  border: '1px solid rgba(79,125,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  position: 'relative',
                }}>
                  <span
                    className="font-display"
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #00d4ff, #4f7dff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {idx + 1}
                  </span>
                </div>

                <h3
                  className="font-display"
                  style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#e2e8f0' }}
                >
                  {t(`${step}_title` as Parameters<typeof t>[0])}
                </h3>
                <p style={{ color: 'rgba(226,232,240,0.55)', fontSize: '0.88rem', lineHeight: 1.7 }}>
                  {t(`${step}_desc` as Parameters<typeof t>[0])}
                </p>

                {/* Connector arrow (not on last) */}
                {idx < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '32px',
                    right: '-1rem',
                    color: 'rgba(79,125,255,0.35)',
                    fontSize: '1.5rem',
                    display: 'none', // hidden on mobile; use CSS breakpoints
                  }}>
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────── */}
      <section style={{ padding: '8rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <div className="badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              {t('pricing_badge')}
            </div>
            <h2
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                marginBottom: '1.25rem',
              }}
            >
              {t('pricing_title')}
            </h2>
            <p style={{ color: 'rgba(226,232,240,0.55)', fontSize: '1.1rem' }}>
              {t('pricing_sub')}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className="glass"
                style={{
                  borderRadius: '20px',
                  padding: '2.25rem',
                  position: 'relative',
                  transition: 'transform 0.25s ease',
                  border: plan.popular
                    ? '1px solid rgba(79,125,255,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: plan.popular
                    ? 'linear-gradient(135deg, rgba(79,125,255,0.08), rgba(168,85,247,0.06))'
                    : 'rgba(255,255,255,0.03)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-6px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #4f7dff, #a855f7)',
                    color: '#fff',
                    padding: '0.3rem 1rem',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-syne), sans-serif',
                    whiteSpace: 'nowrap',
                  }}>
                    {t('plan_popular')}
                  </div>
                )}

                <div style={{ marginBottom: '1.75rem' }}>
                  <h3
                    className="font-display"
                    style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.35rem', color: '#e2e8f0' }}
                  >
                    {t(`plan_${plan.key}` as Parameters<typeof t>[0])}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(226,232,240,0.45)' }}>
                    {t(`plan_${plan.key}_desc` as Parameters<typeof t>[0])}
                  </p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <span
                    className="font-display"
                    style={{
                      fontSize: '2.75rem', fontWeight: 800,
                      background: 'linear-gradient(135deg, #00d4ff, #4f7dff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {t(`plan_${plan.key}_price` as Parameters<typeof t>[0])}
                  </span>
                  <span style={{ color: 'rgba(226,232,240,0.45)', fontSize: '0.9rem', marginLeft: '0.35rem' }}>
                    {t('plan_per_month')}
                  </span>
                </div>

                <ul style={{ listStyle: 'none', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'rgba(226,232,240,0.7)' }}>
                      <span style={{ color: '#00d4ff', fontSize: '0.8rem', flexShrink: 0 }}>✓</span>
                      {feat === 'unlimited'
                        ? t('feat_unlimited')
                        : feat === 'hd'
                        ? t('feat_hd')
                        : feat === 'voice'
                        ? t('feat_voice')
                        : feat === 'download'
                        ? t('feat_download')
                        : feat === '4k'
                        ? t('feat_4k')
                        : feat === 'priority'
                        ? t('feat_priority')
                        : `${feat} ${t('feat_stories')}`}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={plan.popular ? 'btn-primary' : 'btn-ghost'}
                  style={{ width: '100%', textAlign: 'center', display: 'block' }}
                >
                  {t('plan_cta')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem' }}>
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            textAlign: 'center',
            padding: '4rem 3rem',
            background: 'linear-gradient(135deg, rgba(79,125,255,0.1), rgba(168,85,247,0.08))',
            border: '1px solid rgba(79,125,255,0.2)',
            borderRadius: '28px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 600px 400px at 50% 100%, rgba(79,125,255,0.12) 0%, transparent 70%)',
          }} />
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              marginBottom: '1rem',
              position: 'relative',
            }}
          >
            Ready to create the{' '}
            <span style={{
              background: 'linear-gradient(135deg, #00d4ff, #4f7dff, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              perfect story?
            </span>
          </h2>
          <p style={{ color: 'rgba(226,232,240,0.6)', marginBottom: '2.5rem', fontSize: '1.05rem', position: 'relative' }}>
            Join thousands of parents creating unforgettable memories.
          </p>
          <Link href="/register" className="btn-primary" style={{ fontSize: '1rem', padding: '1rem 2.5rem', position: 'relative' }}>
            {t('hero_cta_primary')} →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '3.5rem 2rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
          }}>
            {/* Brand */}
            <div>
              <div
                className="font-display"
                style={{
                  fontSize: '1.3rem', fontWeight: 800,
                  background: 'linear-gradient(135deg, #00d4ff, #4f7dff, #a855f7)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  marginBottom: '0.75rem',
                }}
              >
                StoryHero
              </div>
              <p style={{ color: 'rgba(226,232,240,0.45)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                {t('footer_tagline')}
              </p>
            </div>

            {/* Links */}
            {[
              { label: t('footer_product'), links: [t('footer_features'), t('footer_pricing')] },
              { label: t('footer_company'), links: [t('footer_about'), t('footer_blog')] },
              { label: t('footer_legal'),   links: [t('footer_privacy'), t('footer_terms')] },
            ].map(col => (
              <div key={col.label}>
                <h4 style={{
                  fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'rgba(226,232,240,0.4)',
                  marginBottom: '1rem', fontFamily: 'var(--font-syne), sans-serif',
                }}>
                  {col.label}
                </h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" style={{
                        color: 'rgba(226,232,240,0.6)', textDecoration: 'none',
                        fontSize: '0.9rem', transition: 'color 0.2s',
                      }}
                        onMouseEnter={e => (e.target as HTMLElement).style.color = '#fff'}
                        onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(226,232,240,0.6)'}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <p style={{ color: 'rgba(226,232,240,0.3)', fontSize: '0.8rem' }}>
              {t('footer_rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
