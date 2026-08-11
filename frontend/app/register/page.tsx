'use client';

import { FormEvent, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import {
  apiGetPublicPackage,
  apiGetPublicPackages,
  apiRegisterInitiate,
  apiRegisterResendOtp,
  apiRegisterVerifyOtp,
  apiRegisterComplete,
  Package,
} from '@/lib/api';
import CustomCursor from '@/components/CustomCursor';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

// Multi-step flow, in order. A package MUST be picked before 'details' is
// reachable, and 'details' MUST succeed (OTP sent) before 'otp' is reachable.
type Step = 'package' | 'details' | 'otp';

export default function RegisterPage() {
  return <Suspense fallback={null}><RegisterForm /></Suspense>;
}

function RegisterForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme } = useTheme();
  const { t, locale } = useLang();

  const searchParams = useSearchParams();
  const urlPackageId = searchParams.get('package') ? Number(searchParams.get('package')) : undefined;

  const [step, setStep] = useState<Step>('package');
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-selected via ?package=ID (e.g. coming from the pricing section)
  useEffect(() => {
    if (!urlPackageId) return;
    apiGetPublicPackage(urlPackageId)
      .then((res) => { setSelectedPackage(res.package); setStep('details'); })
      .catch(() => {});
  }, [urlPackageId]);

  // If no package pre-selected, load the list so the user can pick one —
  // this is the frontend half of "package required before registration".
  useEffect(() => {
    if (urlPackageId || selectedPackage) return;
    apiGetPublicPackages().then((res) => setPackages(res.packages)).catch(() => setPackages([]));
  }, [urlPackageId, selectedPackage]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  function choosePackage(pkg: Package) {
    setSelectedPackage(pkg);
    setStep('details');
    router.replace(`/register?package=${pkg.id}`);
  }

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    if (!selectedPackage) return; // guarded by UI, but double-check
    if (password !== confirm) return setError(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
    if (!termsAccepted) return setError(locale === 'ar' ? 'يجب الموافقة على الشروط والأحكام' : 'You must accept the Terms and Conditions');
    setLoading(true);
    setError('');
    try {
      const res = await apiRegisterInitiate({
        name, email, password, password_confirmation: confirm, package_id: selectedPackage.id,
      });
      setPendingId(res.pending_registration_id);
      setResendCooldown(60);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (!pendingId || resendCooldown > 0) return;
    setError('');
    try {
      await apiRegisterResendOtp(pendingId);
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend code');
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!pendingId) return;
    setLoading(true);
    setError('');
    try {
      await apiRegisterVerifyOtp(pendingId, otp);

      // Both free and paid packages call the same /register/complete —
      // the backend decides what to return based on the package price.
      const completeRes = await apiRegisterComplete(pendingId);

      if ('token' in completeRes) {
        // Free package: account created immediately.
        login(completeRes.token, completeRes.user);
        router.push('/dashboard');
      } else {
        // Paid package: hand off to Moyasar. No account exists yet — it's
        // created by the webhook once payment clears (see /register/success).
        window.location.href = completeRes.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <CustomCursor />
      <main className="auth-layout">

        {/* ── Left: Illustration Panel ── */}
        <div className="auth-illustration">
          <div className="auth-illus-blob auth-illus-blob-1" />
          <div className="auth-illus-blob auth-illus-blob-2" />
          <div className="auth-illus-blob auth-illus-blob-3" />
          <div style={{ position: 'absolute', top: '12%', left: '10%', fontSize: '2rem', animation: 'float 7s ease-in-out infinite', animationDelay: '-1s', pointerEvents: 'none', zIndex: 1 }}>⭐</div>
          <div style={{ position: 'absolute', top: '18%', right: '12%', fontSize: '1.5rem', animation: 'float 9s ease-in-out infinite', animationDelay: '-3s', pointerEvents: 'none', zIndex: 1 }}>✨</div>
          <div style={{ position: 'absolute', bottom: '15%', right: '10%', fontSize: '2.5rem', animation: 'float 6s ease-in-out infinite', animationDelay: '-2s', pointerEvents: 'none', zIndex: 1 }}>🌙</div>
          <div style={{ position: 'absolute', bottom: '22%', left: '8%', fontSize: '1.8rem', animation: 'float 8s ease-in-out infinite', animationDelay: '-4s', pointerEvents: 'none', zIndex: 1 }}>💫</div>

          <motion.div className="auth-illus-content" initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
            <span className="auth-illus-big-icon">🌟</span>
            <h2 className="auth-illus-title">{locale === 'ar' ? 'ابدأ الإبداع اليوم!' : 'Start creating today!'}</h2>
            <p className="auth-illus-sub">{locale === 'ar' ? 'آلاف الأسر تصنع ذكريات سينمائية مع أطفالها كل يوم.' : 'Thousands of families are creating cinematic memories with their children every day.'}</p>
            <div className="auth-char-cards">
              {[{ emoji: '🚀', delay: 0.5 }, { emoji: '🐉', delay: 0.65 }, { emoji: '🧜', delay: 0.8 }, { emoji: '🦁', delay: 0.95 }].map((item, i) => (
                <motion.div key={i} className="auth-char-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.delay, duration: 0.5 }}>
                  {item.emoji}
                </motion.div>
              ))}
            </div>
            <div className="auth-stats">
              {[
                { num: '10K+', label: locale === 'ar' ? 'أسرة' : 'Families' },
                { num: '50K+', label: locale === 'ar' ? 'قصة' : 'Stories' },
                { num: '4.9★', label: locale === 'ar' ? 'تقييم' : 'Rating' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div className="auth-stat-num">{stat.num}</div>
                  <div className="auth-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="auth-form-side">
          <motion.div className="auth-card" initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.75rem' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
            </Link>

            {/* ── Step 1: choose a package — cannot proceed without this ── */}
            {step === 'package' && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <h1 className="auth-form-title">{locale === 'ar' ? 'اختر باقتك أولاً' : 'Choose your package first'}</h1>
                <p className="auth-form-sub">{locale === 'ar' ? 'يجب اختيار باقة قبل إنشاء الحساب.' : 'A package must be selected before you can create an account.'}</p>

                {packages === null && <p style={{ marginTop: '1.5rem', color: 'var(--text-3)' }}>{locale === 'ar' ? 'جارِ التحميل...' : 'Loading...'}</p>}

                {packages && packages.length === 0 && (
                  <p style={{ marginTop: '1.5rem', color: 'var(--text-3)' }}>{locale === 'ar' ? 'لا توجد باقات متاحة حالياً.' : 'No packages available right now.'}</p>
                )}

                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1.5rem' }}>
                  {packages?.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => choosePackage(pkg)}
                      style={{
                        textAlign: 'left', border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
                        padding: '0.9rem 1.1rem', background: 'var(--surface)', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{pkg.name}</div>
                        {pkg.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.2rem' }}>{pkg.description}</div>}
                      </div>
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {Number(pkg.total_price) === 0
                          ? (locale === 'ar' ? 'مجاني' : 'Free')
                          : Number(pkg.total_price).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: registration details ── */}
            {step === 'details' && selectedPackage && (
              <>
                <motion.div variants={fadeUp} initial="hidden" animate="visible">
                  <h1 className="auth-form-title">{t('register_title')}</h1>
                  <p className="auth-form-sub">{t('register_sub')}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(84,120,255,0.12), rgba(84,120,255,0.05))',
                    border: '1.5px solid rgba(84,120,255,0.25)', borderRadius: 'var(--r-md)',
                    padding: '0.85rem 1rem', marginBottom: '1.25rem', marginTop: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0, color: 'var(--text)' }}>📦 {selectedPackage.name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '0.15rem 0 0' }}>
                      {Number(selectedPackage.total_price) === 0
                        ? (locale === 'ar' ? 'باقة مجانية — لا يلزم دفع' : 'Free package — no payment required')
                        : `${Number(selectedPackage.total_price).toFixed(2)} — ${locale === 'ar' ? 'سيُطلب الدفع بعد التحقق من البريد' : 'payment requested after email verification'}`}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setSelectedPackage(null); setStep('package'); router.replace('/register'); }}
                    style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {locale === 'ar' ? 'تغيير →' : 'Change →'}
                  </button>
                </motion.div>

                <motion.form onSubmit={onSubmitDetails} style={{ display: 'grid', gap: 0 }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}>
                  <motion.div className="inp-group" variants={fadeUp}>
                    <label className="inp-label">{t('register_name')}</label>
                    <input className="inp" type="text" placeholder={locale === 'ar' ? 'الاسم الكامل' : 'Full name'} value={name} onChange={(e) => setName(e.target.value)} required />
                  </motion.div>

                  <motion.div className="inp-group" variants={fadeUp}>
                    <label className="inp-label">{t('register_email')}</label>
                    <input className="inp" type="email" placeholder={locale === 'ar' ? 'بريدك الإلكتروني' : 'you@example.com'} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </motion.div>

                  <motion.div className="inp-group" variants={fadeUp}>
                    <label className="inp-label">{t('register_password')}</label>
                    <input className="inp" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </motion.div>

                  <motion.div className="inp-group" variants={fadeUp}>
                    <label className="inp-label">{t('register_confirm')}</label>
                    <input className="inp" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  </motion.div>

                  {error && <motion.div className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.div>}

                  <motion.div variants={fadeUp} style={{ marginTop: '0.5rem' }}>
                    <label className="flex items-start gap-2 cursor-pointer" style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5" required />
                      <span>
                        {locale === 'ar' ? 'أوافق على ' : 'I agree to the '}
                        <Link href="/terms" className="underline font-semibold" style={{ color: 'var(--primary)' }}>{locale === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</Link>
                        {' ' + (locale === 'ar' ? 'و' : 'and ') + ' '}
                        <Link href="/privacy" className="underline font-semibold" style={{ color: 'var(--primary)' }}>{locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
                      </span>
                    </label>

                    <motion.button className="btn btn-primary" type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                      {loading
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ animation: 'spin-star 1s linear infinite', display: 'inline-block' }}>⏳</span>{locale === 'ar' ? 'جارِ الإرسال...' : 'Sending code...'}</span>
                        : <>{locale === 'ar' ? 'إرسال رمز التحقق' : 'Send verification code'} ✦</>}
                    </motion.button>
                  </motion.div>
                </motion.form>
              </>
            )}

            {/* ── Step 3: verify the emailed OTP — required before completion ── */}
            {step === 'otp' && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <h1 className="auth-form-title">{locale === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check your email'}</h1>
                <p className="auth-form-sub">
                  {locale === 'ar' ? `أرسلنا رمزاً مكوناً من 6 أرقام إلى ${email}` : `We sent a 6-digit code to ${email}`}
                </p>

                <form onSubmit={onVerifyOtp} style={{ display: 'grid', gap: 0, marginTop: '1.25rem' }}>
                  <div className="inp-group">
                    <label className="inp-label">{locale === 'ar' ? 'رمز التحقق' : 'Verification code'}</label>
                    <input
                      className="inp" type="text" inputMode="numeric" maxLength={6} placeholder="123456"
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required
                      style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '1.2rem' }}
                    />
                  </div>

                  {error && <div className="auth-error" style={{ marginTop: '0.5rem' }}>{error}</div>}

                  <button className="btn btn-primary" type="submit" disabled={loading || otp.length !== 6}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                    {loading
                      ? (locale === 'ar' ? 'جارِ التحقق...' : 'Verifying...')
                      : (locale === 'ar' ? 'تحقق وتابع' : 'Verify & continue')}
                  </button>

                  <button type="button" onClick={onResendOtp} disabled={resendCooldown > 0}
                    style={{ marginTop: '0.85rem', background: 'none', border: 'none', fontSize: '0.8rem', color: resendCooldown > 0 ? 'var(--text-3)' : 'var(--primary)', cursor: resendCooldown > 0 ? 'default' : 'pointer' }}>
                    {resendCooldown > 0
                      ? (locale === 'ar' ? `أعد الإرسال خلال ${resendCooldown}ث` : `Resend in ${resendCooldown}s`)
                      : (locale === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code')}
                  </button>
                </form>
              </motion.div>
            )}

            <p className="auth-link" style={{ marginTop: '1.5rem' }}>
              {t('register_have_account')}{' '}<Link href="/login">{t('register_login_link')}</Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
