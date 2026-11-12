'use client';

import Link from 'next/link';
import { motion, useInView, AnimatePresence, Variants } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Navbar from './Navbar';
import CustomCursor from './CustomCursor';
import SmoothScroll from './SmoothScroll';
import SplitTextReveal from './SplitTextReveal';
import StudioCanvas3D from './StudioCanvas3D';
import { useLang } from '@/context/LangContext';
import { apiGetPublicPackages, Package } from '@/lib/api';
import {
  Sparkles,
  Film,
  BookOpen,
  Palette,
  FileText,
  Play,
  Pause,
  Volume2,
  Layers,
  Download,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Star,
  Check,
  Zap,
  ShieldCheck,
  Camera,
  Printer,
  Share2,
  Compass,
  Cpu,
  Feather,
  Wand2,
} from 'lucide-react';

/* ── Animation presets ── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function SectionReveal({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function LandingPage() {
  const { t, locale, isRTL } = useLang();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgLoading, setPkgLoading] = useState(true);

  // Studio Centerpiece Active Output Tab
  const [activeOutputTab, setActiveOutputTab] = useState<'video' | 'book' | 'coloring' | 'dna'>('video');
  const [isPlayingDemo, setIsPlayingDemo] = useState(true);
  const [coloringMode, setColoringMode] = useState<'colored' | 'lineart'>('colored');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    apiGetPublicPackages(locale)
      .then((res) => setPackages(res.packages.filter((p) => p.is_active)))
      .catch(() => setPackages([]))
      .finally(() => setPkgLoading(false));
  }, [locale]);

  const formatSar = (amount: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    }).format(amount);

  // 4 AI Studio Outputs
  const studioOutputs = [
    {
      id: 'video',
      icon: Film,
      title: locale === 'ar' ? 'فيديو سينمائي 4K' : '4K Cinematic Videos',
      subtitle: locale === 'ar' ? 'رسوم متحركة وإخراج سينمائي' : 'Motion graphics & director pacing',
      desc:
        locale === 'ar'
          ? 'مشاهد متحركة مذهلة بدقة 4K مع إضاءة درامية، وزوايا كاميرا ديناميكية، ومؤثرات صوتية محيطية تجعل طفلك نجماً حقيقياً.'
          : 'Breathtaking 4K animated sequences with dramatic studio lighting, dynamic camera pans, and orchestral audio engineering.',
      badge: locale === 'ar' ? 'إخراج سنمائي' : 'Director Cut',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'book',
      icon: BookOpen,
      title: locale === 'ar' ? 'كتاب مصور فاخر' : 'Illustrated Storybooks',
      subtitle: locale === 'ar' ? 'لوحات فنية وتصميم احترافي' : 'Archival digital paintings',
      desc:
        locale === 'ar'
          ? 'كتاب قصصي متكامل بصفحات ورسومات فنية غنية جاهز للتصفح الرقمي والطباعة المجلدة ليبقى ذكرى خالدة.'
          : 'Full multi-page illustrated albums crafted with archival-grade digital artwork, ready for digital flipping or hardcover printing.',
      badge: locale === 'ar' ? 'طباعة وتصفح' : 'Hardcover Ready',
      color: 'from-purple-500 to-pink-600',
    },
    {
      id: 'coloring',
      icon: Palette,
      title: locale === 'ar' ? 'صفحات تلوين جاهزة للطباعة' : 'Printable Coloring Books',
      subtitle: locale === 'ar' ? 'خطوط فيكتور عالية النقاء 300DPI' : '300 DPI vector line art',
      desc:
        locale === 'ar'
          ? 'تحويل فوري لكل مشهد في القصة إلى رسم خطي دقيق جاهز للطباعة فوراً ليشارك الطفل في تلوين مغامرته بيديه.'
          : 'Instant extraction of high-resolution vector line art from every story scene for offline tactile coloring and boundless creativity.',
      badge: locale === 'ar' ? 'طباعة منزلية' : 'Vector 300 DPI',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      id: 'dna',
      icon: Layers,
      title: locale === 'ar' ? 'سرد أدبي وشخصية متسقة' : 'Character DNA & Narrative',
      subtitle: locale === 'ar' ? 'اتساق تام لملامح الوجه وحبكة عميقة' : 'Zero facial drift across scenes',
      desc:
        locale === 'ar'
          ? 'محرك ذكاء اصطناعي يحفظ تطابق ملامح الطفل عبر كافة الفصول والأزمنة مع نصوص أدبية ثرية ومناسبة للعمر.'
          : 'Proprietary facial geometry anchor guaranteeing recognizable protagonist likeness across all universes with rich literary arcs.',
      badge: locale === 'ar' ? 'ذكاء متقدم' : 'Neural Geometry',
      color: 'from-amber-500 to-rose-600',
    },
  ];

  // Workflow Steps
  const workflowSteps = [
    {
      num: '01',
      icon: Camera,
      title: locale === 'ar' ? 'ارفع صورة واحدة فقط' : 'Upload a Single Portrait',
      desc:
        locale === 'ar'
          ? 'التقط أو ارفع صورة واضحة. يستخرج نظامنا ملامح الوجه بدقة وأمان تام يحترم الخصوصية.'
          : 'Share a clear portrait. Our neural pipeline maps facial landmarks while upholding strict family privacy safeguards.',
    },
    {
      num: '02',
      icon: Compass,
      title: locale === 'ar' ? 'اختر العالم والرسالة الأخلاقية' : 'Direct the Universe & Theme',
      desc:
        locale === 'ar'
          ? 'حدد بيئة المغامرة (فضاء، فروسية، غابة سحرية) والقيم التربوية مثل الشجاعة، والتعاون، والصدق.'
          : 'Select the narrative genre (Cosmic, Mythic, Rainforest) and customize core moral values like courage, teamwork, or curiosity.',
    },
    {
      num: '03',
      icon: Cpu,
      title: locale === 'ar' ? 'المعالجة بالذكاء الاصطناعي الفائق' : 'Multi-Modal Studio Synthesis',
      desc:
        locale === 'ar'
          ? 'تتعاون نماذج الذكاء الاصطناعي (Claude وFal.ai) لتوليد النصوص، واللوحات، والتعليق الصوتي المتناغم.'
          : 'Claude and Fal.ai engines collaborate to author custom chapters, paint bespoke scenes, and compose cinematic voiceovers.',
    },
    {
      num: '04',
      icon: Download,
      title: locale === 'ar' ? 'استلم تحفتك الفنية الشاملة' : 'Receive Multi-Format Delivery',
      desc:
        locale === 'ar'
          ? 'شاهد الفيديو بجودة 4K، وتصفح الكتاب المصور، واطبع صفحات التلوين، وشارك الذكرى مع العائلة.'
          : 'Stream your 4K video, flip through the digital storybook, print crisp coloring sheets, and download archival files.',
    },
  ];

  // Story Universes
  const storyUniverses = [
    {
      title: locale === 'ar' ? 'ملحمة سديم الفضاء' : 'The Nebula Odyssey',
      genre: locale === 'ar' ? 'خيال علمي واستكشاف' : 'Sci-Fi Exploration',
      chapters: locale === 'ar' ? '٤ فصول سينمائية' : '4 Cinematic Chapters',
      badge: '4K Cinema + Book',
      gradient: 'from-blue-600 via-indigo-900 to-black',
      tagColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
    },
    {
      title: locale === 'ar' ? 'حراس الغابة الأسطورية' : 'Guardians of the Enchanted Woods',
      genre: locale === 'ar' ? 'مغامرات الطبيعة والسحر' : 'Mythic Nature Adventure',
      chapters: locale === 'ar' ? '٦ فصول مصورة' : '6 Illustrated Chapters',
      badge: 'Bilingual Audio',
      gradient: 'from-emerald-700 via-teal-950 to-black',
      tagColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
    },
    {
      title: locale === 'ar' ? 'فارس مملكة الصحراء الذهبية' : 'Knight of the Golden Dune',
      genre: locale === 'ar' ? 'تاريخ وفروسية ملحمية' : 'Epic Desert Chivalry',
      chapters: locale === 'ar' ? '٥ فصول تاريخية' : '5 Epic Chapters',
      badge: 'Coloring Sheets Included',
      gradient: 'from-amber-600 via-orange-950 to-black',
      tagColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
    },
    {
      title: locale === 'ar' ? 'أعماق المحيط السري' : 'Abyss of the Luminous Pearl',
      genre: locale === 'ar' ? 'استكشاف تحت الماء' : 'Deep Marine Odyssey',
      chapters: locale === 'ar' ? '٤ فصول بحرية' : '4 Marine Chapters',
      badge: 'Dolby Voice Narration',
      gradient: 'from-cyan-700 via-blue-950 to-black',
      tagColor: 'text-blue-400 bg-blue-950/60 border-blue-800',
    },
  ];

  // Testimonials
  const testimonials = [
    {
      name: 'Nouf Al-Otaibi',
      location: 'Riyadh, KSA',
      verified: true,
      text:
        locale === 'ar'
          ? '"رؤية ملامح ابني عبد الله وهو يقود مركبة فضائية في فيديو سينمائي عالي الجودة جعلت العائلة كلها تبكي من التأثر. إنه استوديو حقيقي وليس مجرد تطبيق أطفال."'
          : '"Watching my son Abdullah star as a space explorer in true 4K quality brought our entire family to tears. This feels like Pixar crafted a movie specifically for him."',
      childHero: locale === 'ar' ? 'البطل: عبد الله (٧ سنوات)' : 'Hero: Abdullah (Age 7)',
      rating: 5,
    },
    {
      name: 'Tariq Mansoor',
      location: 'Dubai, UAE',
      verified: true,
      text:
        locale === 'ar'
          ? '"جودة التعليق الصوتي باللغة العربية الفصحى لا تصدق. طبعنا كتاب القصة وصفحات التلوين، وأصبحت ابنتي تقرأ قصتها الخاصة كل ليلة قبل النوم."'
          : '"The literary Arabic narration is breathtaking. We printed the hardcover book and coloring sheets; my daughter reads her own tale every night before bed."',
      childHero: locale === 'ar' ? 'البطلة: سارة (٥ سنوات)' : 'Hero: Sarah (Age 5)',
      rating: 5,
    },
    {
      name: 'Dr. Michael Chen',
      location: 'London, UK',
      verified: true,
      text:
        locale === 'ar'
          ? '"اتساق وجه الطفل عبر جميع المشاهد دقيق بنسبة مذهلة. استطاع الذكاء الاصطناعي الحفاظ على هويته في الغابة وفي الفضاء بدون أي تشوه."'
          : '"The identity retention across different art styles is state-of-the-art. Zero distortion, stunning consistency, and export-ready outputs."',
      childHero: locale === 'ar' ? 'البطل: ليو (٦ سنوات)' : 'Hero: Leo (Age 6)',
      rating: 5,
    },
  ];

  // FAQ
  const faqs =
    locale === 'ar'
      ? [
          {
            q: 'كيف يختلف NazStudio عن أدوات توليد الصور التقليدية؟',
            a: 'NazStudio ليس مولد صور بسيط؛ إنه استوديو إنتاجي متكامل. نوظف تقنيات ذكاء اصطناعي متقدمة للحفاظ على ملامح وجه طفلك عبر قصة روائية كاملة متعددة الفصول، وننتج أربعة مخرجات متزامنة: فيديو سينمائي 4K، وكتاب قصة فاخر قابل للتصفح، وصفحات تلوين جاهزة للطباعة، وتعليق صوتي سينمائي.',
          },
          {
            q: 'هل صور طفلي وبياناته العائلية آمنة ومحمية؟',
            a: 'نعم، بكل تأكيد. الأمان والخصوصية هما أولويتنا القصوى. صور الوجه تُستخدم حصراً لتدريب ملامح الشخصية لإنتاج القصة فقط، ولا يتم بيعها أو مشاركتها مع أطراف خارجية، كما أنها محمية بأنظمة تشفير مصرفية متوافقة مع معايير حماية البيانات.',
          },
          {
            q: 'كم يستغرق استوديو الذكاء الاصطناعي لإنتاج القصة والمخرجات؟',
            a: 'تستغرق عملية التأليف، والرسم، والتحريك، والتعليق الصوتي ما بين دقيقتين إلى ٥ دقائق فقط. يمكنك متابعة تقدم الإنتاج لحظة بلحظة واستلام المخرجات فور اكتمالها.',
          },
          {
            q: 'هل يمكنني طباعة كتاب القصة وصفحات التلوين على ورق حقيقي؟',
            a: 'نعم! نوفر ملفات PDF مهيأة للطباعة بجودة المطابع (300 DPI) وبأبعاد معيارية للكتب المصورة وصفحات التلوين المنزلية بصيغة Vector فائقة الدقة.',
          },
          {
            q: 'هل تتوفر القصص باللغتين العربية والإنجليزية؟',
            a: 'نعم، المنصة تدعم السرد الأدبي والتعليق الصوتي بأصوات احترافية طبيعية باللغتين العربية الفصحى والإنجليزية، مع إمكانية التبديل بينهما بسهولة.',
          },
        ]
      : [
          {
            q: 'How does NazStudio differ from generic AI image generators?',
            a: 'NazStudio is a dedicated creative production studio. We synthesize facial geometry to keep your child recognizably consistent across a multi-chapter storyline, delivering four coordinated deliverables: a 4K cinematic video, an illustrated digital/print storybook, 300 DPI printable coloring pages, and professional audio narration.',
          },
          {
            q: 'Is my child’s photo and private data secure?',
            a: 'Completely. We enforce enterprise-grade encryption and strict data protection policies. Photos are strictly used to anchor the artistic character likeness for your requested story and are never sold, exposed, or used for model training.',
          },
          {
            q: 'How long does full story generation take?',
            a: 'The entire end-to-end studio pipeline—writing, painting scenes, generating speech, and rendering video motion—completes in just 2 to 5 minutes.',
          },
          {
            q: 'Can I print the storybook and coloring pages physically?',
            a: 'Yes! We deliver print-ready PDF assets at 300 DPI standard resolution, formatted for standard hardcover binding and crisp home-printer coloring sheets.',
          },
          {
            q: 'Are stories available in both Arabic and English?',
            a: 'Yes. NazStudio natively generates literary narratives and emotive voice acting in classical Arabic and modern English.',
          },
        ];

  return (
    <SmoothScroll>
      <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden">
        <CustomCursor />
        <Navbar />

        {/* ── Volumetric Ambient Studio Background ── */}
        <div className="studio-mesh-bg">
          <div className="studio-glow-orb-1" />
          <div className="studio-glow-orb-2" />
          <div className="studio-glow-orb-3" />
          <div className="absolute inset-0 studio-grid-pattern opacity-30" />
        </div>

        {/* ══════════════════════════════════════════════════════════
            HERO SECTION — The Cinematic AI Story Studio
        ═════════════════════════════════════════════════════════════ */}
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
          {/* Subtle 3D Storytelling Geometry in Hero */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] sm:w-[650px] sm:h-[650px] pointer-events-none opacity-40 z-0">
            <StudioCanvas3D variant="hero" />
          </div>
        <div className="text-center max-w-4xl mx-auto">
          {/* Studio Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-6"
          >
            <div className="studio-badge">
              <span className="studio-badge-pulse" />
              <span className="text-[var(--text-2)] tracking-wider">
                {locale === 'ar' ? 'استوديو الذكاء الاصطناعي السينمائي' : 'Cinematic AI Storytelling Studio'}
              </span>
              <span className="text-[var(--k-blue)] font-bold">✦ 2.0</span>
            </div>
          </motion.div>

          {/* Master Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
            style={{ fontFamily: 'Outfit, Cairo, sans-serif' }}
          >
            {locale === 'ar' ? (
              <>
                حوّل طفلك إلى <br className="hidden sm:inline" />
                <span className="gradient-text">بطل ملحمة سينمائية</span> متكاملة
              </>
            ) : (
              <>
                Where Imagination <br className="hidden sm:inline" />
                Becomes <span className="gradient-text">Cinematic Art</span>
              </>
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-xl text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed mb-10"
          >
            {locale === 'ar'
              ? 'صورة واحدة تصنع كوناً روائياً ساحراً: فيديوهات سينمائية بدقة 4K، كتب مصورة فاخرة، صفحات تلوين مطبوعة، وسرد أدبي يحفظ ملامح بطلك الصغير بدقة مطلقة.'
              : 'Upload a single portrait. NazStudio synthesizes 4K cinematic video, archival illustrated storybooks, printable vector coloring sheets, and literary narratives with zero facial drift.'}
          </motion.p>

          {/* Action Callouts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Link
              href="/register"
              className="studio-btn-primary w-full sm:w-auto text-base px-8 py-4 shadow-xl"
            >
              <Wand2 className="w-5 h-5 animate-spin-slow" />
              <span>{locale === 'ar' ? 'ابدأ إنتاج قصتك مجاناً' : 'Launch Story Studio'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#outputs"
              className="studio-btn-secondary w-full sm:w-auto text-base px-8 py-4"
            >
              <Film className="w-4 h-4 text-[var(--k-blue)]" />
              <span>{locale === 'ar' ? 'استكشف المخرجات الإبداعية' : 'Explore Outputs'}</span>
            </a>
          </motion.div>

          {/* Proof Metric Ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-6 border-t border-[var(--border)]"
          >
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold gradient-text">50,000+</div>
              <div className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mt-0.5">
                {locale === 'ar' ? 'قصة تم إنتاجها' : 'Stories Crafted'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--k-blue)]">4K UHD</div>
              <div className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mt-0.5">
                {locale === 'ar' ? 'جودة سينمائية' : 'Cinematic Resolution'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--k-mint)]">99.4%</div>
              <div className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mt-0.5">
                {locale === 'ar' ? 'اتساق الشخصية' : 'Facial Consistency'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[var(--k-pink)]">300 DPI</div>
              <div className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mt-0.5">
                {locale === 'ar' ? 'جاهز للطباعة' : 'Print Hardcover'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Interactive Studio Centerpiece Mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 max-w-5xl mx-auto"
        >
          {/* Workstation Frame */}
          <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-4 sm:p-6 backdrop-blur-2xl overflow-hidden">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs font-mono font-semibold text-[var(--text-3)]">
                  NazStudio Master Deck v2.4
                </span>
              </div>

              {/* Segmented Output Switcher Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
                {[
                  { id: 'video', label: locale === 'ar' ? 'فيديو 4K' : 'Cinema Video', icon: Film },
                  { id: 'book', label: locale === 'ar' ? 'الكتاب المصور' : 'Storybook', icon: BookOpen },
                  { id: 'coloring', label: locale === 'ar' ? 'صفحات التلوين' : 'Coloring Sheet', icon: Palette },
                  { id: 'dna', label: locale === 'ar' ? 'اتساق الوجه' : 'Character DNA', icon: Layers },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeOutputTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveOutputTab(tab.id as typeof activeOutputTab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]'
                          : 'text-[var(--text-3)] hover:text-[var(--text)]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--k-blue)]' : ''}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workstation Display Area */}
            <div className="mt-5 relative aspect-video sm:aspect-[16/9] w-full rounded-2xl overflow-hidden border border-[var(--border)] bg-slate-950 flex flex-col justify-between p-4 sm:p-8">
              {/* Tab 1: 4K Cinematic Video Viewport */}
              {activeOutputTab === 'video' && (
                <div className="relative w-full h-full flex flex-col justify-between">
                  {/* Dynamic Universe Gradient Layer */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-950 via-indigo-950 to-slate-900 opacity-90" />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at center, #1E90FF 0%, transparent 60%)',
                    }}
                  />

                  {/* Top HUD */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-red-600/90 text-white animate-pulse">
                        REC 4K UHD
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-blue-600/30 text-cyan-300 border border-blue-500/40">
                        FPS: 60 · HDR10
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Chapter 1: The Galactic Citadel
                    </div>
                  </div>

                  {/* Center Playback & Character Presentation */}
                  <div className="relative z-10 text-center my-auto">
                    <button
                      onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[var(--k-blue)] to-[var(--k-navy)] text-white flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(30,144,255,0.6)] hover:scale-105 transition-transform"
                    >
                      {isPlayingDemo ? (
                        <Pause className="w-7 h-7 sm:w-8 sm:h-8" />
                      ) : (
                        <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1" />
                      )}
                    </button>
                    <h3 className="text-white text-lg sm:text-2xl font-bold mt-4 tracking-wide font-display">
                      {locale === 'ar' ? '«بطل السديم الفضائي»' : '"The Cosmic Starlight Voyager"'}
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                      {locale === 'ar'
                        ? 'إنتاج ذكاء اصطناعي سينمائي متكامل مع تعليق صوتي وموسيقى أوركسترالية'
                        : 'Fully personalized scene with orchestral score and neural camera pan'}
                    </p>
                  </div>

                  {/* Bottom Timeline Controls */}
                  <div className="relative z-10 space-y-2 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>01:42</span>
                      <div className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-400 font-semibold">Arabic / English Narration</span>
                      </div>
                      <span>03:45</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer">
                      <div className="h-full w-2/5 bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 rounded-full" />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Illustrated Storybook Spread */}
              {activeOutputTab === 'book' && (
                <div className="relative w-full h-full flex flex-col justify-between">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-950/60 via-stone-900 to-slate-950" />
                  {/* Book header */}
                  <div className="relative z-10 flex items-center justify-between text-xs text-amber-200/80 font-mono">
                    <span>HARDCOVER EDITION · 36 PAGES</span>
                    <span>ARCHIVAL 300 DPI</span>
                  </div>

                  {/* Center Book Spread Preview */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto my-auto items-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                    {/* Left: Illustration */}
                    <div className="aspect-[4/3] rounded-lg bg-gradient-to-tr from-indigo-900 to-amber-700 p-4 flex flex-col justify-end text-white border border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                        {locale === 'ar' ? 'لوحة فنية أصلية' : 'Digital Painting'}
                      </span>
                      <p className="text-xs font-semibold mt-1">
                        {locale === 'ar'
                          ? 'الفصل الثالث: عندما أضاءت البلورة في يد البطل'
                          : 'Chapter III: The Luminescent Crystal Awakening'}
                      </p>
                    </div>

                    {/* Right: Literary Prose */}
                    <div className="text-left rtl:text-right p-2 text-slate-200">
                      <span className="text-amber-400 text-xs font-mono font-bold block mb-2">
                        {locale === 'ar' ? 'الصفحة ١٤' : 'PAGE 14'}
                      </span>
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-300 italic">
                        {locale === 'ar'
                          ? '"وقف الصغير بشجاعة في مواجهة الرياح المتلألئة، حاملاً في قلبه نداء النجوم التي لطالما حلم بالوصول إليها. لم يكن الخوف يثنيه، بل زاد إصراره على أن ينير الدرب لكل أصدقائه."'
                          : '"With courage unwavering, our young hero looked into the swirling aurora. The stars had chosen their guardian, and the path ahead was painted in radiant gold."'}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {locale === 'ar' ? 'سرد أدبي منسق' : 'Literary Composition'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Book Footer */}
                  <div className="relative z-10 flex justify-between text-xs text-slate-400">
                    <span>PDF Print-Ready</span>
                    <span>Designed for Keepsake Libraries</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Printable Coloring Sheet Comparison */}
              {activeOutputTab === 'coloring' && (
                <div className="relative w-full h-full flex flex-col justify-between">
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 to-slate-950" />
                  {/* Top Switcher */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-300">VECTOR LINE-ART EXTRACTION</span>
                    <div className="flex items-center gap-2 bg-white/10 p-1 rounded-xl">
                      <button
                        onClick={() => setColoringMode('colored')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          coloringMode === 'colored'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {locale === 'ar' ? 'المشهد الملون' : 'Color Master'}
                      </button>
                      <button
                        onClick={() => setColoringMode('lineart')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          coloringMode === 'lineart'
                            ? 'bg-cyan-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {locale === 'ar' ? 'صفحة التلوين' : 'Coloring Sheet (Line Art)'}
                      </button>
                    </div>
                  </div>

                  {/* Center Demo Display */}
                  <div className="relative z-10 my-auto text-center max-w-md mx-auto p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                    <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center bg-cyan-500/20 text-cyan-400 mb-3 border border-cyan-500/40">
                      <Printer className="w-10 h-10" />
                    </div>
                    <h4 className="text-white text-base sm:text-lg font-bold">
                      {coloringMode === 'colored'
                        ? locale === 'ar'
                          ? 'الرسمة الرقمية الأصلية بالكامل'
                          : 'Original Master Digital Painting'
                        : locale === 'ar'
                        ? 'رسم خطي دقيق جاهز للطباعة'
                        : 'Vector Line-Art Ready to Print'}
                    </h4>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1">
                      {locale === 'ar'
                        ? 'كل مشهد في القصة يتم توليده تلقائياً كصفحة تلوين بحجم A4 وبدقة 300 DPI ليشارك طفلك بإبداعه.'
                        : 'Every generated story frame is auto-converted to clean vector line art formatted for instant A4 printing.'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {locale === 'ar' ? 'تنزيل PDF فوري' : 'Direct PDF Download'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="relative z-10 flex justify-between text-xs text-slate-400">
                    <span>A4 / US Letter Formats</span>
                    <span>100% Crisp Vector Lines</span>
                  </div>
                </div>
              )}

              {/* Tab 4: Character DNA Consistency Matrix */}
              {activeOutputTab === 'dna' && (
                <div className="relative w-full h-full flex flex-col justify-between">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-black" />
                  <div className="relative z-10 flex items-center justify-between text-xs text-indigo-300 font-mono">
                    <span>FACIAL GEOMETRY ANCHOR ENGINE</span>
                    <span>IDENTITY RETENTION: 99.4%</span>
                  </div>

                  {/* DNA Grid Display */}
                  <div className="relative z-10 my-auto grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto w-full">
                    {[
                      {
                        title: locale === 'ar' ? 'صورة الإدخال' : 'Source Photo',
                        role: locale === 'ar' ? 'ملامح الطفل الأصلية' : 'Real Facial Anchor',
                        tag: 'Original Input',
                        color: 'from-slate-700 to-slate-900',
                      },
                      {
                        title: locale === 'ar' ? 'بطل الفضاء' : 'Space Cadet',
                        role: locale === 'ar' ? 'خيال علمي مستقبلي' : 'Cyber Universe',
                        tag: 'Zero Drift',
                        color: 'from-blue-600 to-indigo-950',
                      },
                      {
                        title: locale === 'ar' ? 'فارس الأسطورة' : 'Mythic Knight',
                        role: locale === 'ar' ? 'عالم القرون الوسطى' : 'Fantasy Kingdom',
                        tag: 'Style Transfer',
                        color: 'from-amber-600 to-rose-950',
                      },
                      {
                        title: locale === 'ar' ? 'مستكشف الغابة' : 'Jungle Ranger',
                        role: locale === 'ar' ? 'مغامرات الطبيعة' : 'Rainforest Realm',
                        tag: 'Identical Hero',
                        color: 'from-emerald-600 to-teal-950',
                      },
                    ].map((slot, i) => (
                      <div
                        key={i}
                        className={`rounded-xl p-3 border border-white/10 bg-gradient-to-b ${slot.color} flex flex-col justify-between text-center min-h-[140px]`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-white/70">
                          <span>0{i + 1}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[9px]">
                            {slot.tag}
                          </span>
                        </div>
                        <div className="my-auto">
                          <div className="text-white font-bold text-xs sm:text-sm">{slot.title}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{slot.role}</div>
                        </div>
                        <div className="w-full h-1 rounded-full bg-cyan-400/40" />
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 flex justify-between text-xs text-slate-400">
                    <span>Powered by Fal.ai Neural Adapters</span>
                    <span>No Distortions or Ghosting</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          THE 4 AI STUDIO DELIVERABLES (DEEP DIVE)
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal id="outputs" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div variants={fadeUp}>
            <div className="studio-badge mb-3">
              <span className="studio-badge-pulse" />
              <span>{t('outputs_badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 font-display">
              {t('outputs_title')}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-2)] leading-relaxed">
              {t('outputs_sub')}
            </p>
          </motion.div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {studioOutputs.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                variants={fadeUp}
                custom={index}
                whileHover={{ y: -6 }}
                className="studio-card-glass p-8 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Ambient glow accent */}
                <div
                  className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${item.color} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity duration-300`}
                />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--k-blue)] shadow-sm">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-[var(--surface-2)] text-[var(--k-blue)] border border-[var(--border)]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight mb-2 font-display">
                    {item.title}
                  </h3>
                  <div className="text-xs font-bold text-[var(--k-blue)] uppercase tracking-wider mb-3">
                    {item.subtitle}
                  </div>
                  <p className="text-[var(--text-2)] text-sm sm:text-base leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-3)]">
                    {locale === 'ar' ? 'مشمول في جميع الباقات' : 'Included in Studio Packages'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] group-hover:text-[var(--k-blue)] group-hover:border-[var(--k-blue)] transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          CHARACTER DNA — FACIAL GEOMETRY CONSISTENCY
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal id="character-dna" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-14 shadow-xl overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div variants={fadeUp}>
              <div className="studio-badge mb-4">
                <span className="studio-badge-pulse" />
                <span>{t('dna_badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 font-display">
                {t('dna_title')}
              </h2>
              <p className="text-[var(--text-2)] text-base sm:text-lg leading-relaxed mb-6">
                {t('dna_sub')}
              </p>

              <div className="space-y-4">
                {[
                  {
                    title: locale === 'ar' ? 'تطابق بيومتري آمن' : 'Biometric Landmark Tracking',
                    desc:
                      locale === 'ar'
                        ? 'تحديد دقيق لملامح العينين، والابتسامة، وشكل الوجه لحفظ الهوية دون تغيير.'
                        : 'Extracts exact bone structure, smile dynamics, and eye landmarks.',
                  },
                  {
                    title: locale === 'ar' ? 'نقل سينمائي عبر مختلف الأساليب' : 'Style Adaptation without Distortion',
                    desc:
                      locale === 'ar'
                        ? 'القدرة على وضع الطفل في زي رائد فضاء أو درع فارس مع بقائه معروفاً بنسبة ١٠٠٪.'
                        : 'Seamlessly projects identity into armor, space suits, or fantasy garb without ghosting.',
                  },
                  {
                    title: locale === 'ar' ? 'حماية تامة لخصوصية الأطفال' : 'Family Privacy First Protocol',
                    desc:
                      locale === 'ar'
                        ? 'الصور تُعالج في بيئة مغلقة ومشفرة وتُحذف فور توليد الشخصية.'
                        : 'Encrypted ephemeral processing with strict zero-leakage retention policies.',
                  },
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{point.title}</h4>
                      <p className="text-xs text-[var(--text-2)] mt-0.5">{point.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Visual DNA Showcase Box */}
            <motion.div variants={fadeUp} custom={1} className="relative">
              <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] text-xs font-mono font-bold text-[var(--text-3)]">
                  <span>NEURAL LANDMARK MAP</span>
                  <span className="text-[var(--k-blue)]">99.4% MATCH</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 text-[var(--k-blue)] flex items-center justify-center mb-2">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold block">{locale === 'ar' ? 'الصورة الحقيقية' : 'Uploaded Photo'}</span>
                    <span className="text-[10px] text-[var(--text-3)]">{locale === 'ar' ? 'صورة واحدة' : '1 Reference'}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-[var(--k-blue)] bg-blue-500/5 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/20 text-[var(--k-blue)] flex items-center justify-center mb-2">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-xs font-bold block text-[var(--k-blue)]">
                      {locale === 'ar' ? 'شخصية القصة' : 'Synthesized Hero'}
                    </span>
                    <span className="text-[10px] text-[var(--text-3)]">{locale === 'ar' ? 'مطابقة تامة' : 'Zero Drift'}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-950 text-cyan-400 font-mono text-[11px] flex items-center justify-between">
                  <span>&gt; FAL_AI::FACE_CONSISTENCY_OK</span>
                  <span className="text-emerald-400">ACTIVE</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          STUDIO WORKFLOW — 4 STEPS
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal id="workflow" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div variants={fadeUp}>
            <div className="studio-badge mb-3">
              <span className="studio-badge-pulse" />
              <span>{t('how_badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 font-display">
              {t('how_title')}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-2)] leading-relaxed">
              {locale === 'ar'
                ? 'رحلة سلسة تبدأ من صورة واحدة لتصل إلى استلام فيلمك وكتابك المصور في غضون دقائق معدودة.'
                : 'A seamless 4-step creative pipeline transforming a family photo into an archival cinematic experience.'}
            </p>
          </motion.div>
        </div>

        {/* 4 Steps Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                variants={fadeUp}
                custom={idx}
                whileHover={{ y: -6 }}
                className="studio-card-glass p-6 flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-extrabold font-mono text-[var(--text-3)] group-hover:text-[var(--k-blue)] transition-colors">
                      {step.num}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--k-blue)]">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold tracking-tight mb-2 font-display">
                    {step.title}
                  </h3>
                  <p className="text-[var(--text-2)] text-xs sm:text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-xs font-bold text-[var(--k-blue)]">
                  <span>{locale === 'ar' ? 'الخطوة' : 'Step'} {step.num}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          CREATIVE UNIVERSES / STORY THEMES
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div variants={fadeUp}>
            <div className="studio-badge mb-3">
              <span className="studio-badge-pulse" />
              <span>{locale === 'ar' ? 'العوالم الروائية' : 'Narrative Worlds'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 font-display">
              {locale === 'ar' ? 'عوالم خيالية لا حدود لجمالها' : 'Infinite Creative Universes'}
            </h2>
            <p className="text-[var(--text-2)] text-base leading-relaxed">
              {locale === 'ar'
                ? 'اختر من بين عشرات العوالم الملحمية المصممة بعناية لتناسب اهتمامات طفلك وتلهم خياله.'
                : 'Choose from hand-curated mythic worlds designed to spark boundless wonder in every young mind.'}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {storyUniverses.map((uni, idx) => (
            <motion.div
              key={uni.title}
              variants={fadeUp}
              custom={idx}
              whileHover={{ scale: 1.02 }}
              className={`rounded-2xl p-6 bg-gradient-to-b ${uni.gradient} border border-white/10 text-white shadow-xl flex flex-col justify-between min-h-[220px]`}
            >
              <div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border ${uni.tagColor}`}>
                  {uni.badge}
                </span>
                <h3 className="text-lg font-bold mt-4 font-display leading-tight">{uni.title}</h3>
                <p className="text-xs text-white/70 mt-1">{uni.genre}</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span>{uni.chapters}</span>
                <span className="text-cyan-300 font-bold">▶</span>
              </div>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          VOICE & NARRATION AUDIO STUDIO
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <motion.div variants={fadeUp}>
              <div className="studio-badge mb-3">
                <span className="studio-badge-pulse" />
                <span>{t('voice_badge')}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 font-display">
                {t('voice_title')}
              </h2>
              <p className="text-[var(--text-2)] text-base sm:text-lg leading-relaxed mb-6">
                {t('voice_sub')}
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                  {locale === 'ar' ? 'عربية فصحى راقية' : 'Classical Arabic'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                  {locale === 'ar' ? 'إنجليزية سينمائية' : 'Cinematic English'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
                  {locale === 'ar' ? 'موسيقى تصويرية متناغمة' : 'Orchestral Score'}
                </span>
              </div>
            </motion.div>

            {/* Interactive Audio Player Simulation */}
            <motion.div variants={fadeUp} custom={1} className="p-6 rounded-2xl bg-slate-950 text-white border border-white/10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono text-cyan-300">DOLBY NEURAL SPEECH ENGINE</span>
                </div>
                <span className="text-xs font-mono text-slate-400">96 kHz / 24-bit</span>
              </div>

              {/* Animated Waveform Display */}
              <div className="my-6 flex items-center justify-center gap-1.5 h-14">
                {[8, 14, 28, 20, 36, 16, 24, 32, 12, 28, 38, 18, 30, 22, 14, 32, 26, 12, 24, 34, 18, 28, 10, 22, 30].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="audio-bar"
                      style={{
                        animationDelay: `${(i % 5) * 0.2}s`,
                        height: isPlayingAudio ? `${h}px` : '6px',
                      }}
                    />
                  )
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs transition-colors"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>
                    {isPlayingAudio
                      ? locale === 'ar'
                        ? 'إيقاف مؤقت'
                        : 'Pause Narration'
                      : locale === 'ar'
                      ? 'استمع إلى عينة السرد'
                      : 'Listen to Narration'}
                  </span>
                </button>
                <span className="text-xs text-slate-400 font-mono">00:45 / 02:18</span>
              </div>
            </motion.div>
          </div>
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          EDITORIAL TESTIMONIALS
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div variants={fadeUp}>
            <div className="studio-badge mb-3">
              <span className="studio-badge-pulse" />
              <span>{locale === 'ar' ? 'آراء العائلات' : 'Parent & Creator Accolades'}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 font-display">
              {locale === 'ar' ? 'لحظات فخر تصنع ذكريات العمر' : 'Treasured Family Memories'}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-2)] leading-relaxed">
              {locale === 'ar'
                ? 'استمع إلى ما تقوله آلاف الأسر التي وثقت بنا لتحويل خيال أطفالها إلى تحف سينمائية حقيقية.'
                : 'Join thousands of families turning their children into the stars of their own epic sagas.'}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              custom={idx}
              whileHover={{ y: -6 }}
              className="studio-card-glass p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-[var(--text-2)] text-sm sm:text-base leading-relaxed italic mb-6">
                  {t.text}
                </p>
              </div>

              <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[var(--text)]">{t.name}</div>
                  <div className="text-xs text-[var(--text-3)]">{t.location}</div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--surface-2)] text-[var(--k-blue)] border border-[var(--border)]">
                  {t.childHero}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          PRICING PACKAGES (CONNECTED TO LIVE API)
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div variants={fadeUp}>
            <div className="studio-badge mb-3">
              <span className="studio-badge-pulse" />
              <span>{t('pricing_badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 font-display">
              {t('pricing_title')}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-2)] leading-relaxed">
              {t('pricing_sub')}
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {pkgLoading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="studio-card-glass min-h-[420px] animate-pulse flex flex-col p-8 opacity-60"
              />
            ))
          ) : packages.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-[var(--text-3)]">
              {locale === 'ar' ? 'لا توجد باقات متاحة حالياً.' : 'No active packages available right now.'}
            </div>
          ) : (
            packages.map((pkg, i) => {
              const isFeatured = i === 1;
              const price =
                Number(pkg.total_price) === 0
                  ? locale === 'ar'
                    ? 'مجاني'
                    : 'Free'
                  : formatSar(Number(pkg.total_price));

              return (
                <motion.div
                  key={pkg.id}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -8 }}
                  className={`studio-card-glass p-8 flex flex-col justify-between relative ${
                    isFeatured
                      ? 'border-2 border-[var(--k-blue)] shadow-[0_20px_50px_rgba(30,144,255,0.2)]'
                      : ''
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-[var(--k-blue)] to-[var(--k-navy)] shadow-md">
                      {t('plan_popular')}
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight mb-2 font-display">{pkg.name}</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-3)] mb-6 min-h-[38px]">
                      {pkg.description || (locale === 'ar' ? 'باقة إنتاج شاملة' : 'Complete studio experience')}
                    </p>

                    <div className="mb-6 pb-6 border-b border-[var(--border)]">
                      <span className="text-4xl sm:text-5xl font-extrabold tracking-tight gradient-text">
                        {price}
                      </span>
                      {Number(pkg.total_price) > 0 && (
                        <span className="text-xs text-[var(--text-3)] ml-2 rtl:mr-2">
                          {locale === 'ar' ? 'دفعة واحدة' : 'One-time access'}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {pkg.items?.map((item) => (
                        <li key={item.id} className="flex items-center gap-2.5 text-xs sm:text-sm">
                          <div className="w-5 h-5 rounded-full bg-[var(--k-blue)]/15 text-[var(--k-blue)] flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span>
                            {item.quantity} × {item.product?.name}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--text-2)]">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{locale === 'ar' ? 'فيديو سينمائي 4K' : '4K Cinematic Video'}</span>
                      </li>
                      <li className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--text-2)]">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{locale === 'ar' ? 'صفحات تلوين A4' : 'A4 Printable Coloring Sheets'}</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    href={`/register?package=${pkg.id}`}
                    className={`w-full text-center py-3.5 rounded-full font-bold text-sm transition-all ${
                      isFeatured
                        ? 'studio-btn-primary shadow-lg'
                        : 'studio-btn-secondary'
                    }`}
                  >
                    {Number(pkg.total_price) === 0
                      ? locale === 'ar'
                        ? 'ابدأ مجاناً الآن'
                        : 'Start Free ✦'
                      : t('plan_cta')}
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Monthly Subscription Tiers Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl studio-card-glass border border-[var(--k-blue)]/30 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-start">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase">
              <Sparkles size={14} />
              <span>{locale === 'ar' ? 'الاشتراكات الشهرية والسنوية' : 'Monthly & Yearly Memberships'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-display text-[var(--text)]">
              {locale === 'ar' ? 'هل تفضل اشتراكاً شهرياً مع رصيد ذكاء اصطناعي متجدد؟' : 'Prefer a monthly membership with auto-renewing AI credits?'}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-3)] max-w-xl">
              {locale === 'ar'
                ? 'استكشف خططنا الشهرية (تبدأ من 30 رصيداً مجاناً وحتى 4,000 رصيد) مع أولوية المعالجة ودعم متواصل.'
                : 'Explore our 5 tiers (from Free 30 credits up to Ultimate 4,000 credits) with priority generation and commercial usage.'}
            </p>
          </div>
          <Link
            href="/pricing"
            className="py-3 px-6 rounded-full font-bold text-xs bg-gradient-to-r from-[var(--k-blue)] to-[var(--k-purple)] text-white hover:opacity-95 transition-all shadow-md shrink-0 flex items-center gap-2"
          >
            <span>{locale === 'ar' ? 'عرض خطط الاشتراك' : 'Explore Studio Tiers'}</span>
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          CURATED FAQ (ACCORDION)
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal id="faq" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div variants={fadeUp}>
            <div className="studio-badge mb-3">
              <span className="studio-badge-pulse" />
              <span>{t('nav_faq')}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 font-display">
              {locale === 'ar' ? 'كل ما تود معرفته عن الاستوديو' : 'Frequently Asked Questions'}
            </h2>
          </motion.div>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="studio-card-glass overflow-hidden cursor-pointer"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="p-6 flex items-center justify-between gap-4">
                <span className="font-bold text-base sm:text-lg">{faq.q}</span>
                <div
                  className={`w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] transition-transform duration-300 shrink-0 ${
                    openFaq === i ? 'rotate-180 text-[var(--k-blue)]' : ''
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 text-sm sm:text-base text-[var(--text-2)] leading-relaxed border-t border-[var(--border)] pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          CLIMACTIC STUDIO CTA
      ═════════════════════════════════════════════════════════════ */}
      <SectionReveal className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="rounded-3xl p-10 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 border border-blue-500/30">
          <div className="absolute inset-0 bg-radial-at-c from-blue-500/20 to-transparent pointer-events-none" />

          <motion.div variants={fadeUp} className="relative z-10 max-w-2xl mx-auto">
            <span className="px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-white/10 text-cyan-300 border border-white/20 inline-block mb-6">
              {locale === 'ar' ? 'اصنع الذكرى الآن' : 'START YOUR ADVENTURE'}
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6 font-display">
              {locale === 'ar' ? (
                <>
                  امنح طفلك <span className="text-cyan-300">القصة السينمائية</span> التي يستحقها
                </>
              ) : (
                <>
                  Give your child the <span className="text-cyan-300">cinematic legacy</span> they deserve
                </>
              )}
            </h2>
            <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
              {locale === 'ar'
                ? 'ابدأ اليوم مجاناً. ارفع صورة طفلك وشاهد ذكاء NazStudio يحولها إلى عمل سينمائي خالد.'
                : 'Upload a portrait in seconds. Experience real-time neural storytelling with cinema-grade outputs.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base bg-white text-slate-950 hover:bg-slate-100 shadow-xl transition-all"
              >
                {locale === 'ar' ? 'ابدأ مجاناً الآن ✦' : 'Create Story Free ✦'}
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base border border-white/30 text-white hover:bg-white/10 transition-all"
              >
                {t('nav_login')}
              </Link>
            </div>
          </motion.div>
        </div>
      </SectionReveal>

      {/* ══════════════════════════════════════════════════════════
          STUDIO FOOTER
      ═════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] pt-16 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[var(--border)]">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="NazStudio" className="h-10 w-auto object-contain" />
                <span className="font-extrabold text-xl tracking-tight gradient-text font-display">
                  NazStudio
                </span>
              </div>
              <p className="text-sm text-[var(--text-2)] max-w-sm leading-relaxed mb-6">
                {locale === 'ar'
                  ? 'منصة الذكاء الاصطناعي الإبداعية لإنتاج الفيديوهات السينمائية، والكتب المصورة، وصفحات التلوين الشخصية.'
                  : 'The premier creative AI studio engineering personalized cinematic videos, luxury storybooks, and vector coloring books.'}
              </p>
              <div className="text-xs text-[var(--text-3)] font-mono">
                ENGINEERED WITH FAL.AI & CLAUDE
              </div>
            </div>

            {/* Col 2: Studio Outputs */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-3)] mb-4 font-mono">
                {locale === 'ar' ? 'المخرجات' : 'Outputs'}
              </h4>
              <ul className="space-y-2.5 text-sm text-[var(--text-2)]">
                <li><a href="#outputs" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'فيديو 4K' : '4K Videos'}</a></li>
                <li><a href="#outputs" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'كتاب مصور' : 'Illustrated Books'}</a></li>
                <li><a href="#outputs" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'صفحات تلوين' : 'Coloring Sheets'}</a></li>
                <li><a href="#outputs" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'سرد أدبي' : 'Narratives'}</a></li>
              </ul>
            </div>

            {/* Col 3: Navigation */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-3)] mb-4 font-mono">
                {locale === 'ar' ? 'الاستوديو' : 'Studio'}
              </h4>
              <ul className="space-y-2.5 text-sm text-[var(--text-2)]">
                <li><a href="#workflow" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'كيف يعمل' : 'Workflow'}</a></li>
                <li><a href="#character-dna" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'اتساق الشخصية' : 'Character DNA'}</a></li>
                <li><a href="#pricing" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'الأسعار والباقات' : 'Studio Plans'}</a></li>
                <li><a href="#faq" className="hover:text-[var(--k-blue)] transition-colors">{locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</a></li>
              </ul>
            </div>

            {/* Col 4: Legal & Privacy */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--text-3)] mb-4 font-mono">
                {locale === 'ar' ? 'قانوني وأمان' : 'Trust & Legal'}
              </h4>
              <ul className="space-y-2.5 text-sm text-[var(--text-2)]">
                <li><Link href="/privacy" className="hover:text-[var(--k-blue)] transition-colors">{t('footer_privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-[var(--k-blue)] transition-colors">{t('footer_terms')}</Link></li>
                <li><span className="text-xs text-[var(--text-3)]">{locale === 'ar' ? 'تشفير بيانات فائق' : 'SSL 256-bit Secure'}</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-3)]">
            <span>{t('footer_rights')}</span>
            <span>{locale === 'ar' ? 'صُمم بكل حب للأبطال الصغار' : 'Crafted with precision for little heroes'}</span>
          </div>
        </div>
      </footer>
    </div>
  </SmoothScroll>
  );
}
