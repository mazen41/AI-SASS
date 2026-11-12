'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import Link from 'next/link';
import { FileText, ArrowRight, ShieldCheck, Sparkles, Scale, BookOpen, AlertCircle } from 'lucide-react';

export default function TermsPage() {
  const { locale } = useLang();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';
  const [activeSection, setActiveSection] = useState(0);

  const content = {
    badge: isRTL ? 'المعايير القانونية والشروط' : 'Legal & Platform Standards',
    title: isRTL ? 'الشروط والأحكام' : 'Terms and Conditions',
    subtitle: isRTL ? 'منصة استوديو الإبداع NazStudio' : 'NazStudio Creative Platform',
    lastUpdated: isRTL ? 'آخر تحديث: 12 نوفمبر 2026' : 'Last Updated: November 12, 2026',
    tocTitle: isRTL ? 'فهرس الشروط' : 'Table of Contents',
    backBtn: isRTL ? 'العودة إلى الاستوديو' : 'Back to Studio Home',
    privacyPrompt: isRTL ? 'هل تبحث عن تفاصيل حماية البيانات والخصوصية؟' : 'Looking for details about data protection and privacy?',
    privacyLink: isRTL ? 'عرض سياسة الخصوصية' : 'View Privacy Policy',

    sections: [
      {
        id: 'definition',
        icon: Sparkles,
        title: isRTL ? '1. تعريف الخدمة وطبيعتها' : '1. Service Definition & Scope',
        content: isRTL
          ? 'NazStudio خدمة إبداعية سحابية يمكنها إنشاء قصص وكتب مصورة وصفحات تلوين وتعليق صوتي ومقاطع فيديو مخصصة من مدخلات المستخدم والصور المرفوعة. تعتمد المخرجات والجودة والمدة والتنسيقات على الميزات المتاحة للحساب.'
          : 'NazStudio is a creative cloud service that can generate personalized stories, illustrated storybooks, coloring pages, narration, and video content from user prompts and uploaded photos. Available outputs, quality, duration, and formats depend on the features enabled for your account.',
      },
      {
        id: 'account-terms',
        icon: ShieldCheck,
        title: isRTL ? '2. شروط الحساب والبيانات والولاية الشرعية' : '2. Account, Guardian Consent & Identity',
        points: [
          isRTL
            ? 'يلتزم المستخدم بتقديم معلومات دقيقة وصحيحة ومحدثة عند التسجيل (مثل الاسم، البريد الإلكتروني، وعمر بطل القصة).'
            : 'Users are required to provide accurate and up-to-date information during account creation (such as name, email, and the child hero’s age).',
          isRTL
            ? 'عند رفع صور الأطفال، يُقر المستخدم ويتعهد بأنه الولي الشرعي أو يملك التفويض القانوني الكامل لاستخدام صور الطفل وتحويلها رقمياً إلى أعمال كرتونية وفنية.'
            : 'When uploading photos of children, the user warrants and represents that they are the legal guardian or possess full legal authority to upload and stylize the child’s likeness.',
          isRTL
            ? 'تخضع معالجة الصور والوسائط لسياسة الخصوصية وشروط مزودي الخدمة الخارجيين. قد تُرسل الصور إلى مزود خارجي لتنفيذ طلب التوليد، ولا تضمن هذه الشروط معالجة خاصة أو عدم الاحتفاظ بها من قبل المزود.'
            : 'Uploaded photos and media are handled under the Privacy Policy and applicable third-party provider terms. Photos may be sent to an external provider for generation; these terms do not guarantee special handling or zero provider retention.',
        ],
      },
      {
        id: 'ip-rights',
        icon: Scale,
        title: isRTL ? '3. حقوق الملكية الفكرية والترخيص' : '3. Intellectual Property & Licensing',
        subSections: [
          {
            subtitle: isRTL ? 'أ. ملكية المنصة والبرمجيات:' : 'A. Platform Intellectual Property:',
            text: isRTL
              ? 'تخضع حقوق البرمجيات والواجهات والتصاميم والعلامات التجارية للقوانين والاتفاقات المنطبقة. يجب على مشغل الخدمة تأكيد ملكية الأصول والتراخيص قبل نشر تفاصيل قانونية محددة.'
              : 'Rights in the software, interfaces, designs, and branding are subject to applicable law and agreements. The service operator should confirm ownership and licenses before publishing specific legal claims.',
          },
          {
            subtitle: isRTL ? 'ب. ترخيص المحتوى المُولد للعميل:' : 'B. Client Generated Content License:',
            text: isRTL
              ? 'تعتمد حقوقك وحقوق المنصة في المدخلات والمخرجات على القانون المعمول به والاتفاقات التي تنطبق على حسابك. ينبغي لمشغل الخدمة اعتماد شروط ترخيص واضحة قبل نشر ادعاء بمنح حقوق دائمة أو حصرية.'
              : 'Your and NazStudio’s rights in inputs and generated outputs are subject to applicable law and agreements governing your account. The service operator should approve a clear license before claiming permanent or exclusive rights.',
          },
        ],
      },
      {
        id: 'payment-credits',
        icon: BookOpen,
        title: isRTL ? '4. الرسوم والباقات واستهلاك النقاط' : '4. Pricing, Credits & Subscription Plans',
        points: [
          isRTL
            ? 'قد تقدم NazStudio خدماتها عبر باقات رصيد أو اشتراكات. تظهر الخطة الحالية ومقدار الرصيد والأسعار المنطبقة داخل التطبيق قبل الشراء.'
            : 'NazStudio services may be offered through credit packages or subscription plans. The current plan, credit amounts, and applicable prices are shown in the application before purchase.',
          isRTL
              ? 'قد يحجز النظام الرصيد قبل المعالجة ثم يعتمد الخصم أو يعيد الرصيد وفق النتيجة المسجلة وسياسة الرصيد المعروضة داخل التطبيق. راجع سجل المعاملات لمعرفة نتيجة الطلب.'
            : 'Generation may reserve credits before processing and finalize or restore them according to the recorded outcome and the applicable in-product credit policy. Check the transaction history for the result of a request.',
          isRTL
            ? 'تظهر الأسعار والعملة وشروط التجديد داخل التطبيق قبل إتمام الشراء، وتطبق على العملية الأسعار المعروضة عند الدفع.'
            : 'Prices, currency, and renewal terms are displayed in the application before checkout. The price shown at payment applies to that transaction.',
        ],
      },
      {
        id: 'refunds',
        icon: AlertCircle,
        title: isRTL ? '5. سياسة الاسترجاع والإلغاء' : '5. Cancellation & Refund Policy',
        subSections: [
          {
            subtitle: isRTL ? 'أ. المخرجات والخدمات الرقمية:' : 'A. Instant Digital Generations:',
            text: isRTL
              ? 'تُراجع طلبات الاسترداد وفق الأنظمة المعمول بها وشروط الدفع المعروضة وقت الشراء. تُعالج إعادة الرصيد الناتجة عن أخطاء التوليد وفق سياسة الرصيد داخل التطبيق وسجل نتيجة الطلب.'
              : 'Refund requests are reviewed under applicable law and the checkout terms shown at purchase. Credit restoration for generation errors follows the in-product credit policy and the recorded outcome of the request.',
          },
          {
            subtitle: isRTL ? 'ب. إلغاء الاشتراك:' : 'B. Subscription cancellation:',
            text: isRTL
              ? 'يمكن إلغاء الاشتراك من إعدادات الحساب إذا كانت الميزة متاحة. تبقى صلاحية الخطة حتى نهاية الفترة المدفوعة وفق حالة الاشتراك المعروضة داخل التطبيق.'
              : 'You may cancel a subscription from account settings when that control is available. Access for the paid term follows the subscription status displayed in the application.',
          },
        ],
      },
      {
        id: 'disclaimer',
        icon: Scale,
        title: isRTL ? '6. إخلاء المسؤولية التقنية والأداء' : '6. Technical Disclaimers & Availability',
        points: [
          isRTL
            ? 'تعتمد دقة الملامح الكرتونية على جودة وإضاءة الصورة المرفوعة من قبل العميل، وتبذل نماذجنا أقصى جهد لتقديم أفضل محاكاة فنية ممكنة.'
            : 'Artistic caricature results correlate directly with user photo quality and lighting conditions. Our neural pipelines exert state-of-the-art fidelity while preserving creative cartoon aesthetics.',
          isRTL
              ? 'قد تتوقف الخدمة مؤقتاً بسبب الصيانة أو الأعطال أو انقطاع خدمات الأطراف الخارجية. لا تنشر المنصة ضماناً لمستوى توفر محدد ما لم يوجد اتفاق مستوى خدمة معتمد.'
              : 'The service may be temporarily unavailable due to maintenance, faults, or third-party outages. No specific uptime guarantee is made unless an approved service-level agreement applies.',
        ],
      },
      {
        id: 'jurisdiction',
        icon: Scale,
        title: isRTL ? '7. القانون المعمول به وتسوية النزاعات' : '7. Governing Law & Dispute Resolution',
        content: isRTL
          ? 'يجب على مشغل الخدمة تحديد القانون الحاكم والجهة القضائية المختصة ومراجعة هذه الصياغة قانونياً قبل نشرها. لا تُنشئ هذه الصفحة التزاماً باختصاص دولة بعينها.'
          : 'The service operator must identify the governing law and competent forum and obtain legal review before publishing this section. This page does not assert a particular jurisdiction.',
      },
    ],
  };

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex flex-col relative overflow-hidden">
      <CustomCursor />
      <Navbar />

      {/* Decorative ambient gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-blue/10 via-brand-violet/10 to-transparent blur-[120px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-semibold mb-5">
            <FileText className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            {content.title}
          </h1>

          <p className="text-base text-gray-600 dark:text-gray-400 font-medium">
            {content.subtitle} · <span className="text-xs text-gray-400 dark:text-gray-500">{content.lastUpdated}</span>
          </p>
        </motion.div>

        {/* Two-column layout: Sticky Nav + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Quick Index Sidebar (Sticky on Desktop) */}
          <aside className="lg:col-span-4 sticky top-24 hidden lg:block">
            <div className="studio-card p-5 rounded-2xl border border-white/10 dark:border-white/10 shadow-xl backdrop-blur-xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-2">
                {content.tocTitle}
              </h2>
              <nav className="space-y-1">
                {content.sections.map((sec, idx) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === idx;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(idx)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{sec.title}</span>
                    </a>
                  );
                })}
              </nav>

              <div className="mt-6 pt-5 border-t border-white/10 dark:border-white/10 text-xs">
                <p className="text-gray-500 dark:text-gray-400 mb-2">{content.privacyPrompt}</p>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1.5 font-bold text-brand-blue hover:text-brand-violet transition-colors"
                >
                  <span>{content.privacyLink}</span>
                  <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            </div>
          </aside>

          {/* Sections List */}
          <div className="lg:col-span-8 space-y-6">
            {content.sections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  className="studio-card p-6 sm:p-8 rounded-2xl border border-white/10 dark:border-white/10 shadow-lg backdrop-blur-xl relative overflow-hidden group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                      {section.title}
                    </h2>
                  </div>

                  {section.content && (
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-normal">
                      {section.content}
                    </p>
                  )}

                  {section.points && (
                    <ul className="space-y-3 mt-3">
                      {section.points.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0 mt-2" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.subSections && (
                    <div className="space-y-4 mt-4">
                      {section.subSections.map((sub, sIdx) => (
                        <div key={sIdx} className="p-4 rounded-xl bg-white/5 dark:bg-white/[0.03] border border-white/10 dark:border-white/5">
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-1.5">
                            {sub.subtitle}
                          </h3>
                          <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                            {sub.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>
              );
            })}

            {/* Back action */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-violet text-white text-sm font-bold shadow-lg shadow-brand-blue/25 hover:shadow-brand-blue/40 transition-all hover:scale-[1.02]"
              >
                <span>{content.backBtn}</span>
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>NazStudio Legal Compliance · 2026</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
