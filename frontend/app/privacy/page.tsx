'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import Link from 'next/link';
import { Shield, ArrowRight, Lock, EyeOff, Server, UserCheck, HardDrive, HelpCircle } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const { locale } = useLang();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';
  const [activeSection, setActiveSection] = useState(0);

  const content = {
    badge: isRTL ? 'حماية البيانات والخصوصية الفائقة' : 'Data Protection & Privacy Safeguards',
    title: isRTL ? 'سياسة الخصوصية' : 'Privacy Policy',
    subtitle: isRTL ? 'التزام منصة NazStudio بحماية بياناتك وصور أطفالك' : 'NazStudio Commitment to Family and Child Data Privacy',
    lastUpdated: isRTL ? 'آخر تحديث: 12 نوفمبر 2026' : 'Last Updated: November 12, 2026',
    tocTitle: isRTL ? 'فهرس الخصوصية' : 'Privacy Index',
    backBtn: isRTL ? 'العودة إلى الاستوديو' : 'Back to Studio Home',
    termsPrompt: isRTL ? 'هل تود مراجعة الشروط والأحكام العامة للمنصة؟' : 'Looking for the general Terms and Conditions?',
    termsLink: isRTL ? 'عرض الشروط والأحكام' : 'View Terms & Conditions',

    sections: [
      {
        id: 'intro',
        icon: Shield,
        title: isRTL ? '1. التزامنا بحماية الخصوصية' : '1. Our Privacy Commitment',
        content: isRTL
          ? 'توضح هذه السياسة أنواع البيانات التي قد تجمعها NazStudio وكيف يمكن استخدامها في تشغيل الخدمة. راجع الأقسام التالية لمعرفة ما قد يُرسل إلى مزودي الخدمات الخارجيين.'
          : 'This policy describes categories of information NazStudio may collect and how they may be used to operate the service, including when information is sent to external providers.',
      },
      {
        id: 'collected-data',
        icon: UserCheck,
        title: isRTL ? '2. البيانات التي نجمعها' : '2. Information We Collect',
        points: [
          isRTL
            ? 'معلومات الحساب الأساسية: الاسم، عنوان البريد الإلكتروني، وتفضيلات لغة الاستوديو.'
            : 'Account details such as your name, email address, authentication data, and language preference.',
          isRTL
            ? 'بيانات بطل القصة: اسم الطفل المستعار أو الحقيقي، جنسه، وفئته العمرية لتكييف السرد واللغة التربوية المناسبة.'
            : 'Story details you provide, such as a character name, age, and preferences, to create the requested content.',
          isRTL
            ? 'الصور المرفوعة والوسائط المُنشأة المرتبطة بمشاريعك. قد تُرسل الصور إلى مزودي الذكاء الاصطناعي والوسائط المهيئين لإنشاء المخرجات المطلوبة.'
            : 'Uploaded photos and generated media associated with your projects. Photos may be transmitted to configured AI/media providers to create requested outputs.',
          isRTL
            ? 'سجلات الاشتراكات ومعاملات الدفع. قد يتولى مزود الدفع معالجة بيانات الدفع؛ راجع شروطه لمعرفة البيانات التي يحتفظ بها.'
            : 'Subscription and payment transaction records. Payment details may be handled by the selected payment provider; consult its terms for what it stores.',
        ],
      },
      {
        id: 'usage-purpose',
        icon: EyeOff,
        title: isRTL ? '3. كيف نستخدم البيانات والصور' : '3. How We Process Media and Information',
        subSections: [
          {
            subtitle: isRTL ? 'أ. التوليد الفني والسينمائي المخصص:' : 'A. Personalized Creative Synthesis:',
            text: isRTL
              ? 'قد تُرسل الصور المرفوعة إلى مزودي الذكاء الاصطناعي والوسائط المهيئين لإنشاء المخرجات التي طلبتها. تختلف المعالجة والاحتفاظ بحسب المزود.'
              : 'Uploaded photos may be sent to configured AI and media providers to generate the outputs you request. Processing and retention depend on each provider.',
          },
          {
            subtitle: isRTL ? 'ب. مزودو الخدمات الخارجية:' : 'B. External Service Providers:',
            text: isRTL
            ? 'لا ترفع صوراً إلا إذا كنت مخولاً بذلك. قد يعالجها مزود خارجي لتنفيذ طلبك، وتخضع معالجته لشروطه وسياساته. راجعها قبل رفع صور حساسة.'
          : 'Photos may be processed by external providers to fulfill your request and are subject to their terms and privacy practices. Review those practices before uploading sensitive images.',
          },
        ],
      },
      {
        id: 'child-protection',
        icon: Lock,
        title: isRTL ? '4. صور الأطفال وموافقة ولي الأمر' : '4. Children’s Photos and Parental Authorization',
        content: isRTL
          ? 'يجب أن ينشئ الحساب ويرفع الصور وليّ أمر أو شخص بالغ مخوّل. لا نزعم هنا اعتمادًا أو امتثالًا قانونيًا محددًا؛ ينبغي مراجعة المتطلبات القانونية المنطبقة على بلدك قبل رفع صور الأطفال.'
          : 'An adult parent or authorized guardian should create the account and upload a child’s photo. This policy does not claim a specific certification or legal compliance status; users and the company should review applicable child-privacy requirements in their jurisdictions.',
      },
      {
        id: 'infrastructure-security',
        icon: Server,
        title: isRTL ? '5. البنية السحابية ومعالجة الذكاء الاصطناعي' : '5. Infrastructure & AI Processing',
        points: [
          isRTL
            ? 'تعتمد حماية البيانات على إعدادات التطبيق والبنية التحتية والخدمات الخارجية المستخدمة. ينبغي لمشغل الخدمة توثيق التدابير التقنية الفعلية قبل نشر ادعاءات أمنية محددة.'
            : 'Data protection depends on the application, infrastructure, and external services in use. The operator should document the implemented safeguards before making specific security claims.',
          isRTL
            ? 'قد تستخدم عملية التوليد خدمات ذكاء اصطناعي ومعالجة وسائط خارجية. تعتمد مدة الاحتفاظ بالملفات المؤقتة وبيانات المزود على الإعدادات وشروط كل خدمة.'
            : 'Generation may use external AI and media-processing providers. Temporary-file and provider-side retention depend on the configured services; do not assume immediate deletion.',
          isRTL
            ? 'قد تُرسل الصور أو الوسائط إلى مزودي التوليد أو اللغة أو التعليق الصوتي لتنفيذ طلبك. راجع شروط كل مزود؛ لا تفترض وجود اتفاقية معالجة أو مدة حذف محددة.'
            : 'Photos and generated media may be sent to image, language, or narration providers to fulfill your request. Review each provider’s terms; no specific data-processing agreement or deletion period is claimed here.',
        ],
      },
      {
        id: 'data-retention',
        icon: HardDrive,
        title: isRTL ? '6. الاحتفاظ بالبيانات وطلبات الحذف' : '6. Data Retention & Deletion Requests',
        points: [
          isRTL
            ? 'يمكنك حذف المشاريع المتاحة من لوحة التحكم. حذف السجل من التطبيق لا يثبت وحده حذف النسخ الاحتياطية أو نسخ مزودي الخدمة فورًا. تواصل مع مشغل الخدمة لطلب حذف البيانات.'
            : 'You may delete available projects through the dashboard. Deletion from application records does not by itself establish an immediate deletion deadline for backups or third-party provider copies. Contact the service operator for a data deletion request.',
          isRTL
            ? 'قد يتطلب إغلاق الحساب وطلبات الحذف مساعدة مشغل الخدمة. لا يمكننا ضمان محو تشفيري أو موعد إكمال ما لم تدعم أنظمة التخزين والنسخ الاحتياطي ذلك.'
            : 'Account closure and deletion requests may require operator assistance. We cannot promise cryptographic erasure or a completion deadline unless the relevant storage and backup systems support it.',
        ],
      },
      {
        id: 'inquiries',
        icon: HelpCircle,
        title: isRTL ? '7. التواصل ومسؤول الخصوصية' : '7. Contact & Privacy Inquiries',
        content: isRTL
          ? 'للاستفسارات المتعلقة بالخصوصية أو طلبات الحذف، استخدم وسيلة الدعم المنشورة على موقع NazStudio. يجب على مشغل الخدمة تأكيد عنوان اتصال مخصص بالخصوصية ومدة الرد قبل نشرهما.'
          : 'For privacy questions or deletion requests, use the support contact published on the NazStudio website. A dedicated privacy contact and response-time commitment must be confirmed by the service operator before publication.',
      },
    ],
  };

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex flex-col relative overflow-hidden">
      <CustomCursor />
      <Navbar />

      {/* Ambient gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-violet/10 via-brand-pink/10 to-transparent blur-[120px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-violet/10 border border-brand-violet/20 text-brand-violet text-xs font-semibold mb-5">
            <Lock className="w-3.5 h-3.5" />
            <span>{content.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            {content.title}
          </h1>

          <p className="text-base text-gray-600 dark:text-gray-400 font-medium">
            {content.subtitle} · <span className="text-xs text-gray-400 dark:text-gray-500">{content.lastUpdated}</span>
          </p>
        </motion.div>

        {/* Two-column layout: Sticky Index + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Index Sidebar */}
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
                          ? 'bg-brand-violet/15 text-brand-violet border border-brand-violet/30 shadow-sm'
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
                <p className="text-gray-500 dark:text-gray-400 mb-2">{content.termsPrompt}</p>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1.5 font-bold text-brand-violet hover:text-brand-pink transition-colors"
                >
                  <span>{content.termsLink}</span>
                  <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            </div>
          </aside>

          {/* Policy Sections */}
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
                    <div className="w-9 h-9 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center text-brand-violet shrink-0 group-hover:scale-105 transition-transform">
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
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-violet shrink-0 mt-2" />
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

            {/* Bottom action */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-pink text-white text-sm font-bold shadow-lg shadow-brand-violet/25 hover:shadow-brand-violet/40 transition-all hover:scale-[1.02]"
              >
                <span>{content.backBtn}</span>
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </Link>
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-violet" />
                <span>Encrypted & Privacy Compliant · 2026</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
