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
    lastUpdated: isRTL ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026',
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
          ? 'نولي في NazStudio أولوية قصوى لخصوصية عملائنا وأطفالهم. توضح هذه السياسة آلية جمع البيانات والصور، وكيفية معالجتها عبر خوارزميات الذكاء الاصطناعي، والإجراءات المشددة المتخذة لمنع أي وصول غير مصرح به.'
          : 'At NazStudio, we treat the privacy of our users and their children with the highest level of vigilance. This Privacy Policy details how data and photos are collected, securely processed by our AI pipelines, and safeguarded against unauthorized access.',
      },
      {
        id: 'collected-data',
        icon: UserCheck,
        title: isRTL ? '2. البيانات التي نجمعها' : '2. Information We Collect',
        points: [
          isRTL
            ? 'معلومات الحساب الأساسية: الاسم، عنوان البريد الإلكتروني، وتفضيلات لغة الاستوديو.'
            : 'Basic Account Data: User name, email address, password hash, and studio locale preference.',
          isRTL
            ? 'بيانات بطل القصة: اسم الطفل المستعار أو الحقيقي، جنسه، وفئته العمرية لتكييف السرد واللغة التربوية المناسبة.'
            : 'Hero Identity Data: Child’s first name or hero alias, gender, and age bracket to tailor age-appropriate educational storytelling.',
          isRTL
            ? 'الصور المرفوعة: صور الوجه المرفوعة بهدف تدريب واستخلاص الملامح الكرتونية لشخصية القصة فقط دون أي استخدام آخر.'
            : 'Uploaded Hero Photos: Facial imagery uploaded strictly to synthesize cartoon representations and character consistency across story frames.',
          isRTL
            ? 'بيانات المعاملات والاشتراكات: معرّفات الدفع وتاريخ الفواتير (لا نخزن أرقام البطاقات الائتمانية الكاملة نهائياً).'
            : 'Billing & Transaction Identifiers: Tokenized transaction records and subscription tiers (NazStudio never stores raw credit card details).',
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
              ? 'تُستخدم الصور المرفوعة كنقطة مرجعية رقمية (Face Vector Embeddings) لتحويل ملامح الطفل إلى شخصية كرتونية في مشاهد القصة والفيديوهات والكتب.'
              : 'Uploaded photos serve exclusively as visual feature embeddings to render character-consistent cartoon artwork across storybook illustrations, videos, and coloring pages.',
          },
          {
            subtitle: isRTL ? 'ب. عدم استخدام الصور في الإعلانات أو النماذج العامة:' : 'B. Zero Commercial or Public Model Training:',
            text: isRTL
              ? 'لا نقوم إطلاقاً ببيع أو تأجير صور أطفالكم أو بياناتكم الشخصية لأي طرف ثالث، ولا تُستخدم صور العملاء لتدريب نماذج ذكاء اصطناعي عامة متاحة للجمهور.'
              : 'We strictly never sell, license, or broker your children’s images or personal data. Customer photos are never used to train publicly distributed AI models.',
          },
        ],
      },
      {
        id: 'child-protection',
        icon: Lock,
        title: isRTL ? '4. حماية خصوصية الأطفال (COPPA & GDPR-K)' : '4. Child Privacy Protection Standards',
        content: isRTL
          ? 'نحن ملتزمون بالمعايير العالمية لحماية خصوصية الأطفال على الإنترنت (COPPA و GDPR-K). يُشترط أن تتم عملية إنشاء الحساب ورفع الصور ودفع الاشتراكات حصراً من قبل الولي الشرعي أو الأب أو الأم الراشدين.'
          : 'NazStudio strictly complies with global children’s online privacy frameworks including COPPA and GDPR-K. Account registration, image uploads, and billing must be conducted exclusively by adult parents or legal guardians.',
      },
      {
        id: 'infrastructure-security',
        icon: Server,
        title: isRTL ? '5. أمان البنية السحابية ومعالجة الذكاء الاصطناعي' : '5. Cloud Security & AI Processing',
        points: [
          isRTL
            ? 'تُشفر كافة البيانات المتدفقة بين متصفحك وسيرفراتنا باستخدام بروتوكولات التشفير المتقدمة (TLS 1.3 / SSL 256-bit).'
            : 'All network traffic between user devices and our backend clusters is encrypted via TLS 1.3 with 256-bit cipher suites.',
          isRTL
            ? 'تتم المعالجة عبر خوادم سحابية معزولة ومؤمنة (sandboxed ephemeral GPU nodes)، وتُحذف الملفات المؤقتة المستخدمة في مراحل التوليد فور اكتمال معالجة المشهد.'
            : 'AI generation executes in ephemeral, isolated GPU sandboxes, and intermediate raster tiles are scrubbed immediately once the scene finishes rendering.',
          isRTL
            ? 'مزودو نماذج الذكاء الاصطناعي الموثوقون (مثل Fal.ai و Anthropic) ملزمون باتفاقيات خصوصية مشددة تمنعهم من الاحتفاظ بالصور المدخلة لأغراضهم الخاصة.'
            : 'Our enterprise AI compute partners (e.g. Fal.ai, Anthropic) operate under stringent data processing agreements prohibiting secondary retention or ingestion of user inputs.',
        ],
      },
      {
        id: 'data-retention',
        icon: HardDrive,
        title: isRTL ? '6. الاحتفاظ بالبيانات وحق الحذف الفوري' : '6. Data Retention & Right to Erasure',
        points: [
          isRTL
            ? 'يمكن للعميل في أي وقت حذف أي قصة أو صورة بطل من لوحة التحكم الخاصة به، وسيتم شطب الملفات نهائياً من وحدات التخزين السحابية خلال مهلة أقصاها 24 ساعة.'
            : 'Users maintain continuous control to delete any story project, video asset, or uploaded hero portrait directly from the Studio Dashboard, triggering permanent deletion within 24 hours.',
          isRTL
            ? 'يحق للمستخدم طلب إغلاق الحساب ومحو كافة السجلات المرتبطة به بالتواصل مع فريق الدعم الفني، مع تأكيد الحذف غير القابل للاسترجاع.'
            : 'Users can request complete account closure and cryptographic erasure of all historical activity by reaching out to our privacy desk.',
        ],
      },
      {
        id: 'inquiries',
        icon: HelpCircle,
        title: isRTL ? '7. التواصل ومسؤول الخصوصية' : '7. Contact & Privacy Inquiries',
        content: isRTL
          ? 'إذا كان لديك أي استفسار أو طلب يتعلق بحماية بياناتك وخصوصية طفلك على منصة NazStudio، يُرجى مراسلة فريق الخصوصية والأمن السيبراني على: privacy@nazstudio.art وسيتم الرد على طلبك خلال 48 ساعة عمل.'
          : 'For questions, rights requests, or regulatory clarifications regarding family data safety at NazStudio, please direct inquiries to our data compliance desk at privacy@nazstudio.art — we respond within 48 business hours.',
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
