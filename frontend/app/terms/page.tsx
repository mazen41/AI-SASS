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
    lastUpdated: isRTL ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026',
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
          ? 'منصة NazStudio هي منصة سحابية إبداعية تعتمد على أحدث تقنيات ونماذج الذكاء الاصطناعي التوليدي لإنتاج محتوى ترفيهي وتعليمي مخصص للأطفال (قصص رقمية مصورة، مقاطع فيديو سينمائية متحركة بدقة 4K، تعليق صوتي سينمائي، كتب تلوين تفاعلية، وخلفيات شاشات عالية الدقة)، بناءً على المدخلات النصية والصور الشخصية التي يرفعها المستخدم.'
          : 'NazStudio is a creative cloud platform leveraging generative AI architectures to produce personalized entertainment and educational content for children (illustrated storybooks, 4K cinematic video stories, expressive voiceovers, printable coloring sheets, and studio wallpapers), tailored to the prompt inputs and photos uploaded by users.',
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
            ? 'تتعهد المنصة بالمحافظة على سرية الصور والبيانات الشخصية وفقاً لسياسة الخصوصية المعتمدة لدينا، وتتم معالجة الصور عبر مسارات تشفير آمنة (TLS/HTTPS) دون أي تدخل بشري أو استخدام تجاري خارجي للصور الأصلية.'
            : 'NazStudio strictly protects the privacy of uploaded media in accordance with our Privacy Policy. Photos are processed exclusively through encrypted API pipelines without human review or external unauthorized commercial use.',
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
              ? 'جميع البرمجيات، الواجهات الرسومية، خوارزميات الأتمتة الذكية، والتصاميم والشعارات الخاصة بـ NazStudio هي ملكية فكرية حصرية للمنصة، ومحمية بموجب أنظمة حماية حقوق المؤلف والعلامات التجارية.'
              : 'All software, user interfaces, automation engines, designs, and branding of NazStudio are the exclusive intellectual property of NazStudio, protected by international copyright and trademark laws.',
          },
          {
            subtitle: isRTL ? 'ب. ترخيص المحتوى المُولد للعميل:' : 'B. Client Generated Content License:',
            text: isRTL
              ? 'تمنح المنصة العميل رخصة استخدام شخصية وعائلية دائمة وغير حصرية للقصص والفيديوهات والكتب المُولدة. لا يحق للعميل إعادة بيع المحتوى تجارياً أو إعادة توزيعه كمنتج رقمي ربحي دون اتفاق خطي مسبق مع إدارة NazStudio.'
              : 'NazStudio grants clients a perpetual, personal, and non-exclusive license to enjoy and share the generated stories and videos within their family circle. Commercial resale or broadcast distribution requires prior written authorization.',
          },
        ],
      },
      {
        id: 'payment-credits',
        icon: BookOpen,
        title: isRTL ? '4. الرسوم والباقات واستهلاك النقاط' : '4. Pricing, Credits & Subscription Plans',
        points: [
          isRTL
            ? 'تتوفر خدمات المنصة عبر باقات رقمية فورية أو اشتراكات شهرية/سنوية تمنح رصيداً محدداً من القصص والفيديوهات وكتب التلوين.'
            : 'NazStudio services are available via instant credit packages or recurrent subscription plans conferring monthly story quotas, 4K rendering credits, and coloring sheet allowances.',
          isRTL
            ? 'يتم استهلاك النقاط فور بدء توليد القصة بنجاح على خوادم المعالجة السحابية.'
            : 'Credits are deducted immediately upon confirming the creative pipeline execution on cloud render clusters.',
          isRTL
            ? 'الأسعار والرسوم معلنة بعملة الريال السعودي (SAR) أو الدولار الأمريكي (USD) بحسب بوابة الدفع المختارة، وقد تخضع للتحديث الدوري مع تطبيق أسعار التجديد المعلنة.'
            : 'All prices are clearly stated in SAR or USD depending on selected payment gateways (Stripe, Moyasar, MyFatoorah, PayPal) and are subject to transparent periodic schedule adjustments.',
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
              ? 'نظراً لأن معالجة الذكاء الاصطناعي واستهلاك موارد السيرفرات تبدأ فورياً عند ضغط زر التوليد، فإن المبالغ والنقاط المستهلكة في عمليات التوليد الرقمي المكتملة غير قابلة للاسترداد النقدي.'
              : 'Because GPU compute resources and AI model execution commence instantaneously upon request, completed digital generations and consumed credits are non-refundable once processed.',
          },
          {
            subtitle: isRTL ? 'ب. المنتجات المطبوعة الفاخرة (حسب الطلب):' : 'B. Physical Custom Printed Editions:',
            text: isRTL
              ? 'تُطبع الكتب الفاخرة وتُجلّد خصيصاً باسم وملامح الطفل، لذا لا يمكن إلغاء الطلب بعد دخوله مرحلة الطباعة، إلا في حال وجود خطأ مطبعي جسيم من جانبنا أو تلف أثناء الشحن يتم الإبلاغ عنه خلال 48 ساعة من الاستلام.'
              : 'Custom physical editions are printed and bound specifically for each hero. Orders cannot be canceled once sent to press, except in the documented event of manufacturing defect or shipping damage reported within 48 hours with photographic proof.',
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
            ? 'تحرص المنصة على توفير جهوزية خدمة مستمرة تفوق 99.5%، ولكنها غير مسؤولة عن الانقطاعات العالمية الطارئة الناتجة عن صيانة مزودي خدمات السحابية أو بوابات الدفع الخارجية.'
            : 'We endeavor to maintain 99.5%+ uptime, yet cannot be held liable for upstream third-party cloud infrastructure maintenance or global payment clearing halts beyond our reasonable control.',
        ],
      },
      {
        id: 'jurisdiction',
        icon: Scale,
        title: isRTL ? '7. القانون المعمول به وتسوية النزاعات' : '7. Governing Law & Dispute Resolution',
        content: isRTL
          ? 'تخضع هذه الشروط والأحكام وتُفسر وفقاً للأنظمة واللوائح المعمول بها في المملكة العربية السعودية. ويتم حل أي خلاف ودياً بالتواصل مع فريق الدعم، وفي حال تعذر ذلك تختص المحاكم النظامية المختصة في المملكة بالنظر فيه.'
          : 'These Terms of Service are governed by and construed in accordance with the laws and regulations of the Kingdom of Saudi Arabia. Any dispute shall first seek amicable resolution, failing which jurisdiction lies with the competent courts in KSA.',
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
