'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import {
  apiGetPublicPricingPlans,
  apiSubscribeFree,
  Plan,
  PlanCapabilities,
} from '@/lib/api';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  Sparkles,
  CheckCircle2,
  Check,
  ArrowRight,
  Loader2,
  ShieldCheck,
  HelpCircle,
  Zap,
  BookOpen,
  Video,
  Palette,
  Heart,
  Crown,
  Star,
  Gift,
} from 'lucide-react';

export default function PricingPage() {
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const t = {
    badge: isRTL ? 'الخطط والأسعار' : 'PRICING & MEMBERSHIP',
    title: isRTL ? 'اختر خطتك وأطلق العنان لخيال طفلك' : 'Choose Your Studio Tier',
    subtitle: isRTL
      ? 'خطط مرنة مصممة للعائلات والمبدعين مع رصيد ذكاء اصطناعي يتجدد شهرياً'
      : 'Flexible plans built for families, creators, and storytellers with monthly AI credits and instant exports.',
    monthly: isRTL ? 'شهرياً' : 'Monthly',
    yearly: isRTL ? 'سنوياً' : 'Yearly',
    saveDiscount: isRTL ? 'وفر حتى 20%' : 'Save ~20%',
    popular: isRTL ? 'الأكثر طلباً' : 'RECOMMENDED',
    freeCta: isRTL ? 'ابدأ مجاناً' : 'Get Started Free',
    subscribeCta: isRTL ? 'اشترك الآن' : 'Upgrade Plan',
    creditsSuffix: isRTL ? 'رصيد ذكاء اصطناعي شهرياً' : 'AI Credits / mo',
    faqTitle: isRTL ? 'الأسئلة الشائعة حول الخطط' : 'Frequently Asked Questions',
    faq1Q: isRTL ? 'ما هو رصيد الذكاء الاصطناعي وكيف يتم استهلاكه؟' : 'What are AI Credits and how are they used?',
    faq1A: isRTL
      ? 'يتم استخدام الرصيد لتوليد القصص، الرسوم التوضيحية عالية الدقة، والكتب المصورة، والفيديوهات السينمائية. يتجدد الرصيد مع كل دورة اشتراك.'
      : 'Credits are used to generate stories, HD illustrations, printable books, and cinematic video scenes. Your quota renews every billing cycle.',
    faq2Q: isRTL ? 'هل يمكنني الترقية أو إلغاء الاشتراك في أي وقت؟' : 'Can I upgrade, downgrade, or cancel anytime?',
    faq2A: isRTL
      ? 'نعم، يمكنك إدارة وتعديل خطتك بسهولة من صفحة الفوترة، وستبقى ميزاتك نشطة حتى نهاية الدورة الحالية.'
      : 'Yes! You can manage or cancel your renewal anytime from your billing settings. Your access continues until the current cycle ends.',
    faq3Q: isRTL ? 'ما الفرق بين الكتب المصورة وصفحات التلوين والفيديو؟' : 'What outputs are included in the plans?',
    faq3A: isRTL
      ? 'تتضمن الخطط قصصاً رقمية مكتوبة، وكتب PDF قابلة للطباعة بدقة عالية، وكتيبات تلوين A4، وفيديوهات متحركة بتعليق صوتي سنمائي.'
      : 'Depending on your tier, you can produce written stories, full PDF storybooks, printable coloring books, and full cinematic animated videos.',
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiGetPublicPricingPlans();
        // Sort by sort_order
        const sorted = (res.plans || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setPlans(sorted);
      } catch (err) {
        console.error('Failed to load pricing plans', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchPlans();
  }, []);

  const handleSelectPlan = async (plan: Plan) => {
    const isFree = Number(plan.price) === 0 || plan.slug === 'free';

    if (isFree) {
      if (isLoggedIn) {
        setActionLoading(plan.id);
        try {
          const res = await apiSubscribeFree(plan.id);
          alert(res.message);
          router.push('/dashboard');
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Free plan enrollment failed');
        } finally {
          setActionLoading(null);
        }
      } else {
        router.push(`/register?plan=${plan.slug}`);
      }
      return;
    }

    // Paid plan
    if (isLoggedIn) {
      router.push(`/billing?plan=${plan.id}&cycle=${billingCycle}`);
    } else {
      router.push(`/register?plan=${plan.slug}&cycle=${billingCycle}`);
    }
  };

  const getPlanIcon = (slug: string, iconName?: string | null) => {
    switch (iconName || slug) {
      case 'sparkles':
      case 'free':
        return <Gift className="w-5 h-5 text-emerald-400" />;
      case 'zap':
      case 'starter':
        return <Zap className="w-5 h-5 text-brand-blue" />;
      case 'heart':
      case 'family':
        return <Heart className="w-5 h-5 text-brand-pink fill-current" />;
      case 'creator':
        return <Star className="w-5 h-5 text-amber-400 fill-current" />;
      case 'crown':
      case 'ultimate':
        return <Crown className="w-5 h-5 text-yellow-400 fill-current" />;
      default:
        return <Sparkles className="w-5 h-5 text-brand-blue" />;
    }
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased relative overflow-hidden pb-20"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CustomCursor />
      <Navbar />

      {/* Volumetric background mesh */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.15 }} />
        <div className="studio-glow-orb-2" style={{ opacity: 0.1 }} />
        <div className="absolute inset-0 studio-grid-pattern opacity-15" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-pink/10 border border-brand-pink/20 text-brand-pink">
            <Sparkles size={13} />
            <span>{t.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {t.title}
            </SplitTextReveal>
          </h1>

          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`py-2 px-5 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.monthly}
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`py-2 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{t.yearly}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded-full">
                  {t.saveDiscount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[380px] gap-3">
            <Loader2 size={36} className="animate-spin text-brand-blue" />
            <p className="text-xs uppercase font-mono tracking-widest text-slate-400">
              Loading available tiers...
            </p>
          </div>
        )}

        {/* Pricing Cards Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 items-stretch">
            {plans.map((plan) => {
              const isFeatured = plan.is_featured;
              const isFree = Number(plan.price) === 0 || plan.slug === 'free';
              const caps = (plan.effective_capabilities || plan.capabilities || {}) as PlanCapabilities;

              // Price calculation
              const hasYearly = plan.yearly_price && Number(plan.yearly_price) > 0;
              const displayPrice =
                billingCycle === 'yearly' && hasYearly
                  ? (Number(plan.yearly_price) / 12).toFixed(2)
                  : parseFloat(plan.price).toFixed(2);

              const featuresList = plan.features || [];

              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -6 }}
                  className={`studio-card rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 border ${
                    isFeatured
                      ? 'border-brand-purple ring-2 ring-brand-purple/30 shadow-2xl shadow-brand-purple/20'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  {/* Featured / Badge Tag */}
                  {isFeatured && (
                    <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 px-3 py-1 text-[9px] font-mono font-bold uppercase bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-bl-xl rtl:rounded-bl-none rtl:rounded-br-xl shadow-md">
                      {plan.badge || t.popular}
                    </div>
                  )}

                  <div>
                    {/* Icon & Plan Name */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center shadow-sm">
                        {getPlanIcon(plan.slug, plan.icon)}
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                        {plan.name}
                      </h3>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 min-h-[32px] line-clamp-2">
                      {plan.description}
                    </p>

                    {/* Price Block */}
                    <div className="my-5 pb-5 border-b border-slate-200 dark:border-white/10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-display">
                          {isFree ? (isRTL ? 'مجاني' : '$0') : `$${displayPrice}`}
                        </span>
                        {!isFree && (
                          <span className="text-[11px] font-mono text-slate-400">
                            /{isRTL ? 'شهرياً' : 'mo'}
                          </span>
                        )}
                      </div>

                      {billingCycle === 'yearly' && hasYearly && (
                        <div className="text-[10px] font-mono text-emerald-500 font-bold mt-1">
                          ${parseFloat(plan.yearly_price!).toLocaleString()}/{isRTL ? 'سنوياً' : 'yr billed'}
                        </div>
                      )}

                      {/* AI Credits pill */}
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-blue/10 text-brand-blue text-[11px] font-bold">
                        <Sparkles size={12} />
                        <span>{Number(plan.monthly_credits).toLocaleString()} {t.creditsSuffix}</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 mb-6 text-[11px] text-slate-700 dark:text-slate-300">
                      {featuresList.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-tight">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={actionLoading === plan.id}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                      isFeatured
                        ? 'bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink text-white hover:opacity-95 shadow-brand-blue/20'
                        : isFree
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
                    } disabled:opacity-50`}
                  >
                    {actionLoading === plan.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <span>{isFree ? t.freeCta : t.subscribeCta}</span>
                        <ArrowRight size={13} className="rtl:rotate-180" />
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Enterprise & Custom Inquiries Banner */}
        <div className="studio-card p-6 sm:p-8 rounded-3xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue/[0.03] to-brand-purple/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-start">
            <h4 className="text-base font-black text-slate-900 dark:text-white font-display">
              {isRTL ? 'هل تحتاج إلى خطة مخصصة للمدارس أو استوديوهات الإنتاج؟' : 'Need a Custom Plan for Schools or Creative Studios?'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isRTL
                ? 'تواصل مع فريقنا للحصول على رخص تجارية مخصصة، واجهات برمجة API، وحسابات فريق متعددة.'
                : 'Contact our team for dedicated high-throughput GPU rendering, white-label exports, and multi-seat licensing.'}
            </p>
          </div>
          <Link
            href="/contact"
            className="py-2.5 px-5 rounded-xl text-xs font-bold border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 transition-all shrink-0"
          >
            {isRTL ? 'تواصل معنا' : 'Contact Support'}
          </Link>
        </div>

        {/* FAQs */}
        <div className="studio-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 space-y-6">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <HelpCircle size={18} className="text-brand-blue" />
            <h3>{t.faqTitle}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.faq1Q}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.faq1A}</p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.faq2Q}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.faq2A}</p>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.faq3Q}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.faq3A}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
