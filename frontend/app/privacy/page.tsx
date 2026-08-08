'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const { locale } = useLang();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';

  const content = {
    title: isRTL ? 'سياسة الخصوصية' : 'Privacy Policy',
    subtitle: isRTL ? 'منصة Naz Studio' : 'Naz Studio Platform',
    lastUpdated: isRTL ? 'آخر تحديث: أغسطس 2026' : 'Last Updated: August 2026',
    
    sections: [
      {
        title: isRTL ? '1. تعريف الخدمة' : '1. Service Definition',
        content: isRTL 
          ? 'منصة Naz Studio هي منصة رقمية تعتمد على تقنيات الذكاء الاصطناعي المتقدمة لتوليد محتوى مخصص للأطفال (قصص رقمية، مقاطع فيديو سينمائية متحركة، تعليق صوتي، كتب تلوين، وخلفيات شاشات)، بناءً على المدخلات والصور التي يرفعها المستخدم.'
          : 'Naz Studio is a digital platform that uses advanced AI technologies to generate custom content for children (digital stories, cinematic animated videos, voice narration, coloring books, and wallpapers), based on the inputs and photos uploaded by users.'
      },
      {
        title: isRTL ? '2. شروط الحساب والبيانات والخصوصية' : '2. Account, Data, and Privacy Terms',
        points: [
          isRTL ? 'يلتزم المستخدم بتقديم معلومات دقيقة وصحيحة عند التسجيل (مثل الاسم، البريد الإلكتروني، وعمر الطفل).' : 'Users are required to provide accurate and correct information during registration (such as name, email, and child\'s age).',
          isRTL ? 'عند رفع صور الأطفال، يُقر المستخدم بأنه الولي الشرعي أو يملك الحق القانوني الكامل لاستخدام هذه الصور وتوليد محتوى كرتوني بناءً عليها.' : 'When uploading children\'s photos, the user acknowledges that they are the legal guardian or have full legal rights to use these photos and generate cartoon content based on them.',
          isRTL ? 'تتعهد المنصة بالمحافظة على خصوصية الصور المرفوعة والبيانات الشخصية وفقاً لسياسة الخصوصية المعتمدة لدينا، ويتم معالجتها أوتوماتيكياً عبر الـ APIs المشفرة لإنتاج المحتوى دون أي تدخل بشري أو استخدام تجاري خارجي للصور الأصلية.' : 'The platform is committed to maintaining the privacy of uploaded photos and personal data in accordance with our approved privacy policy. They are processed automatically through encrypted APIs to produce content without any human intervention or external commercial use of the original photos.'
        ]
      },
      {
        title: isRTL ? '3. حقوق الملكية الفكرية' : '3. Intellectual Property Rights',
        points: [
          {
            subtitle: isRTL ? 'ملكية المنصة:' : 'Platform Ownership:',
            content: isRTL 
              ? 'جميع البرمجيات، الواجهات، خوارزميات الأتمتة، التصاميم، والشعارات الخاصة بـ Naz Studio هي ملكية فكرية مطلقة للمنصة ولا يجوز نسخها أو إعادة هندستها.'
              : 'All software, interfaces, automation algorithms, designs, and logos specific to Naz Studio are the absolute intellectual property of the platform and may not be copied or reverse engineered.'
          },
          {
            subtitle: isRTL ? 'ملكية المحتوى المُولد:' : 'Generated Content Ownership:',
            content: isRTL 
              ? 'تمنح المنصة العميل رخصة استخدام شخصية، دائمية، وغير حصرية للقصص والفيديوهات التي تم توليدها لطفله. لا يحق للعميل إعادة بيع المحتوى المُولد لأغراض تجارية أو استخدامه في منصات إعلامية ربحية خارج النطاق الشخصي أو العائلي دون إذن خطي مسبق من المنصة.'
              : 'The platform grants the client a personal, perpetual, and non-exclusive license for the stories and videos generated for their child. The client may not resell the generated content for commercial purposes or use it on profit-making media platforms outside the personal or family scope without prior written permission from the platform.'
          }
        ]
      },
      {
        title: isRTL ? '4. سياسة الدفع، الباقات، والاشتراكات' : '4. Payment, Packages, and Subscription Policy',
        points: [
          isRTL ? 'تتوفر خدماتنا عبر نظام باقات رقمية (توليد فوري) أو باقات مطبوعة (حسب الطلب).' : 'Our services are available through digital packages (instant generation) or printed packages (on demand).',
          isRTL ? 'يتم تحصيل الرسوم عبر بوابات الدفع الإلكترونية المعتمدة في المنصة، وتخضع الأسعار للتحديث والتغيير بناءً على العروض والمواسم.' : 'Fees are collected through approved electronic payment gateways on the platform, and prices are subject to updates and changes based on offers and seasons.',
          isRTL ? 'يتحمل المستخدم تكلفة استهلاك النقاط (Credits) داخل باقته بناءً على حجم المحتوى الذي تم توليده فعلياً.' : 'The user bears the cost of consuming credits within their package based on the actual volume of content generated.'
        ]
      },
      {
        title: isRTL ? '5. سياسة إلغاء الطلب والاسترجاع' : '5. Cancellation and Refund Policy',
        points: [
          {
            subtitle: isRTL ? 'المنتجات الرقمية (القصص، الفيديوهات، الملفات):' : 'Digital Products (Stories, Videos, Files):',
            content: isRTL 
              ? 'بمجرد بدء النظام في معالجة الطلب وتوليد الصور أو الفيديو عبر أدوات الذكاء الاصطناعي، لا يحق للعميل إلغاء الطلب أو طلب استرجاع المبالغ النقدية تملقاً بطبيعة المنتجات الرقمية الفورية القابلة للاستهلاك.'
              : 'Once the system begins processing the request and generating images or videos through AI tools, the client may not cancel the request or request cash refunds due to the nature of instant, consumable digital products.'
          },
          {
            subtitle: isRTL ? 'المنتجات المادية المطبوعة (حسب الطلب):' : 'Printed Physical Products (On Demand):',
            content: isRTL 
              ? 'يتم طباعة الكتب والصناديق بشكل مخصص لاسم وملامح طفلك فور تأكيد الطلب، وبالتالي لا يمكن إلغاؤها أو استرجاعها إلا في حالتين فقط: وجود خطأ مطبعي واضح ناتج من طرفنا يختلف عن البيانات التي أدخلها العميل، أو تلف المنتج أثناء عملية الشحن والتوصيل، ويجب الإبلاغ عن ذلك خلال 48 ساعة من الاستلام مدعوماً بالصور للتعويض.'
              : 'Books and boxes are printed specifically for your child\'s name and features immediately upon order confirmation, and therefore cannot be cancelled or refunded except in two cases only: clear printing error on our part that differs from the data entered by the client, or product damage during shipping and delivery, which must be reported within 48 hours of receipt supported by photos for compensation.'
          }
        ]
      },
      {
        title: isRTL ? '6. إخلاء المسؤولية وحدودها' : '6. Disclaimer and Limitations',
        points: [
          isRTL ? 'مخرجات الذكاء الاصطناعي (الصور والفيديوهات والنصوص) تعتمد بالكامل على مدخلات المستخدم وجودة الصورة المرفوعة. المنصة غير مسؤولة عن عدم الرضا الفني الشخصي للعميل عن النتيجة الكرتونية طالما أن النظام قام بالتوليد بناءً على معايير الجودة التقنية المعمول بها.' : 'AI outputs (images, videos, and texts) depend entirely on user inputs and the quality of the uploaded photo. The platform is not responsible for the client\'s personal technical dissatisfaction with the cartoon result as long as the system performed generation based on applicable technical quality standards.',
          isRTL ? 'تبذل المنصة قصارى جهدها لضمان عمل السيرفرات على مدار الساعة، ولكنها لا تضمن عدم حدوث انقطاعات مؤقتة ناتجة عن صيانة السيرفرات أو توقف مفاجئ في خدمات الـ APIs العالمية (مثل OpenAI أو Kling أو ElevenLabs)، وفي هذه الحالة يتم معالجة الطلبات المتأخرة فور عودة الخدمة دون أدنى مسؤولية مالية أو تعويضية على المنصة.' : 'The platform makes its best efforts to ensure servers operate around the clock, but does not guarantee that temporary interruptions will not occur due to server maintenance or sudden stops in global API services (such as OpenAI, Kling, or ElevenLabs). In such cases, delayed requests are processed as soon as service returns without any financial or compensatory liability on the platform.'
        ]
      },
      {
        title: isRTL ? '7. القانون الواجب التطبيق' : '7. Applicable Law',
        content: isRTL 
          ? 'تخضع هذه الشروط والأحكام وتُفسر وفقاً للأنظمة والقوانين السارية في المملكة العربية السعودية، وأي نزاع ينشأ عنها يتم حله ودياً، وفي حال تعذر ذلك يُحال إلى المحاكم المختصة بمدينة المدينة المنورة.'
          : 'These terms and conditions are subject to and interpreted in accordance with the laws and regulations in force in the Kingdom of Saudi Arabia, and any dispute arising from them is resolved amicably, and if that is not possible, it is referred to the competent courts in the city of Medina.'
      }
    ]
  };

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <CustomCursor />
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="kido-badge">
            <span className="kido-badge-star">🔒</span>
            {content.title}
          </span>
          <h1 className="text-4xl font-black mt-6 mb-4" style={{ color: 'var(--text)' }}>
            {content.subtitle}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {content.lastUpdated}
          </p>
        </motion.div>

        {/* Content Sections */}
        <div className="space-y-8">
          {content.sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>
                {section.title}
              </h2>
              
              {section.content && (
                <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
                  {section.content}
                </p>
              )}
              
              {section.points && (
                <div className="space-y-4">
                  {section.points.map((point, pointIndex) => (
                    <div key={pointIndex}>
                      {typeof point === 'string' ? (
                        <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {point}
                        </p>
                      ) : (
                        <div className="mb-4">
                          <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>
                            {point.subtitle}
                          </h3>
                          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {point.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all"
            style={{
              background: 'var(--primary)',
              color: 'white',
            }}
          >
            {isRTL ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}