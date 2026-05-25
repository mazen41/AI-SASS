'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import {
  apiGetBillingPlans,
  apiGetActiveSubscription,
  apiSubscribeStripe,
  apiSubscribePaypal,
  apiUserCancelSubscription,
  Plan,
  Subscription,
} from '@/lib/api';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import {
  CreditCard,
  Wallet,
  CheckCircle,
  HelpCircle,
  Loader2,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export default function BillingPage() {
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'خطط الاشتراك والترقية' : 'Choose Your Plan',
    subtitle: isRTL ? 'اختر الخطة المثالية لفتح عوالم سحرية وسينمائية لطفلك.' : 'Unlock magical, cinematic AI adventures for your child.',
    activeSubTitle: isRTL ? 'اشتراكك الحالي' : 'Your Active Subscription',
    activeSubDesc: isRTL ? 'أنت مشترك حالياً في هذه الخطة.' : 'You are currently subscribed to this plan.',
    nextBilling: isRTL ? 'تاريخ التجديد القادم:' : 'Next billing date:',
    cancelSub: isRTL ? 'إلغاء الاشتراك' : 'Cancel Subscription',
    canceling: isRTL ? 'جاري الإلغاء...' : 'Canceling...',
    cancelConfirm: isRTL ? 'هل أنت متأكد من إلغاء اشتراكك؟ ستبقى ميزاتك نشطة حتى نهاية الفترة الحالية.' : 'Are you sure you want to cancel your subscription? Your access will remain active until the end of the current billing cycle.',
    selectPayment: isRTL ? 'اختر بوابة الدفع المفضلة' : 'Select Payment Method',
    popular: isRTL ? 'الأكثر شعبية' : 'Most Popular',
    freePlan: isRTL ? 'الخطة المجانية' : 'FREE PLAN',
    subscribeBtn: isRTL ? 'اشترك الآن' : 'Subscribe Now',
    checkoutRedirecting: isRTL ? 'جاري توجيهك إلى بوابة الدفع...' : 'Redirecting to payment gateway...',
    faqTitle: isRTL ? 'الأسئلة المتكررة حول الدفع' : 'Frequently Asked Questions',
    faq1Q: isRTL ? 'هل يمكنني تغيير خطتي لاحقاً؟' : 'Can I change my plan later?',
    faq1A: isRTL ? 'نعم، يمكنك الترقية أو التخفيض في أي وقت من إعدادات حسابك.' : 'Yes, you can upgrade, downgrade, or cancel your subscription at any time.',
    faq2Q: isRTL ? 'ما هي بوابات الدفع المدعومة؟' : 'Which payment gateways are supported?',
    faq2A: isRTL ? 'نحن ندعم الدفع الآمن بنسبة 100٪ عن طريق Stripe (بطاقات الائتمان) و PayPal.' : 'We support completely secure payments via Stripe (Credit Cards) and PayPal.',
    faq3Q: isRTL ? 'هل هناك فترة التزام؟' : 'Is there a minimum contract period?',
    faq3A: isRTL ? 'لا، خططنا شهرية مرنة ويمكنك إلغاؤها بضغطة زر دون أي التزامات.' : 'No, all plans are billed monthly and you can cancel anytime without cancellation fees.',
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [gateway, setGateway] = useState<'stripe' | 'paypal'>('stripe');
  const [checkoutPlanId, setCheckoutPlanId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) router.push('/login');
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    const loadBillingData = async () => {
      try {
        const [plansRes, subRes] = await Promise.all([
          apiGetBillingPlans(),
          apiGetActiveSubscription(),
        ]);
        setPlans(plansRes.plans);
        setActiveSub(subRes.subscription);
      } catch (err) {
        console.error('Error loading billing data', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadBillingData();
  }, [isLoggedIn]);

  const handleSubscribe = async (planId: number) => {
    setCheckoutPlanId(planId);
    setActionLoading(true);
    try {
      let url = '';
      if (gateway === 'stripe') {
        const response = await apiSubscribeStripe(planId);
        url = response.url;
      } else {
        const response = await apiSubscribePaypal(planId);
        url = response.url;
      }
      
      if (url) {
        window.location.assign(url);
      } else {
        throw new Error('Redirection URL not returned.');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Checkout failed');
      setActionLoading(false);
      setCheckoutPlanId(null);
    }
  };

  const handleCancelSub = async () => {
    if (!confirm(t.cancelConfirm)) return;
    setActionLoading(true);
    try {
      const response = await apiUserCancelSubscription();
      alert(response.message);
      setActiveSub(response.subscription);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <div data-theme={theme} className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 size={40} className="animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="pb-16">
      <CustomCursor />
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12" dir={isRTL ? 'rtl' : 'ltr'}>
        
        {/* Header */}
        <div className="text-center mb-12">
          <span className="kido-badge">
            <span className="kido-badge-star">💎</span>
            {isRTL ? 'فوترة وعضوية' : 'Billing & Pricing'}
          </span>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-4 font-sans tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        {/* Active Subscription Details */}
        {activeSub && (
          <div className="mb-10 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.activeSubTitle}</h3>
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mt-1 uppercase">
                  {activeSub.plan?.name} — ${activeSub.plan?.price}/{isRTL ? 'شهر' : 'mo'}
                </p>
                {activeSub.current_period_end && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t.nextBilling} {new Date(activeSub.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            
            {activeSub.status !== 'canceled' ? (
              <button
                onClick={handleCancelSub}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-900/20 dark:text-red-400 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
              >
                {actionLoading ? t.canceling : t.cancelSub}
              </button>
            ) : (
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {isRTL ? 'سينتهي اشتراكك قريباً' : 'Subscription pending cancellation'}
              </span>
            )}
          </div>
        )}

        {/* Pricing Layout */}
        {!activeSub && (
          <div className="flex flex-col gap-8">
            {/* Payment Method Selector */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{t.selectPayment}</span>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-1.5 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
                <button
                  onClick={() => setGateway('stripe')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    gateway === 'stripe'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <CreditCard size={16} />
                  Stripe
                </button>
                <button
                  onClick={() => setGateway('paypal')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    gateway === 'paypal'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Wallet size={16} />
                  PayPal
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => {
                const isFeatured = plan.is_featured;
                const featuresList = plan.features || [];

                return (
                  <motion.div
                    key={plan.id}
                    className={`relative bg-white dark:bg-gray-800 border rounded-3xl p-6 shadow-sm flex flex-col justify-between overflow-hidden ${
                      isFeatured
                        ? 'border-indigo-600 ring-2 ring-indigo-500/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    whileHover={{ y: -4 }}
                  >
                    {isFeatured && (
                      <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-bl-2xl">
                        {t.popular}
                      </div>
                    )}

                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                      
                      <div className="my-6">
                        <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${parseFloat(plan.price).toLocaleString()}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/{isRTL ? 'شهرياً' : 'mo'}</span>
                      </div>

                      <ul className="space-y-3 mb-8">
                        {featuresList.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                            <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={actionLoading}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                        isFeatured
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
                      } disabled:opacity-50`}
                    >
                      {actionLoading && checkoutPlanId === plan.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {isRTL ? 'جاري التحويل...' : 'Redirecting...'}
                        </>
                      ) : (
                        <>
                          {t.subscribeBtn}
                          <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* FAQs */}
        <div className="mt-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <HelpCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
            {t.faqTitle}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">{t.faq1Q}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{t.faq1A}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">{t.faq2Q}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{t.faq2A}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">{t.faq3Q}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{t.faq3A}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
