'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  apiCreateStory,
  apiGenerateStory,
  apiGetStories,
  apiEstimateAiCredits,
  AiCreditEstimate,
  Story,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import StudioInput from '@/components/StudioInput';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  Sparkles,
  Upload,
  User,
  Calendar,
  Globe2,
  Film,
  BookOpen,
  Palette,
  Volume2,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Clock,
  Layers,
  Wand2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Camera,
} from 'lucide-react';

const themes = [
  {
    id: 'adventure',
    label: 'Adventure',
    labelAr: 'مغامرات استكشافية',
    desc: 'Epic quests, treasure maps, and hidden realms',
    descAr: 'رحلات استكشافية وخرائط الكنوز وعوالم خفية',
    gradient: 'from-amber-500 to-orange-600',
    icon: '🗺️',
  },
  {
    id: 'space',
    label: 'Space Pioneer',
    labelAr: 'رائد فضاء كوني',
    desc: 'Galactic voyages, alien worlds, and cosmic stars',
    descAr: 'رحلات فضائية بين الكواكب والنجوم والمجرات',
    gradient: 'from-indigo-500 to-purple-600',
    icon: '🚀',
  },
  {
    id: 'fantasy',
    label: 'Enchanted Kingdom',
    labelAr: 'المملكة السحرية',
    desc: 'Magic castles, friendly dragons, and wizards',
    descAr: 'قلاع سحرية، تنانين ودودة، وحكايات خيالية',
    gradient: 'from-pink-500 to-rose-600',
    icon: '🏰',
  },
  {
    id: 'jungle',
    label: 'Wild Safari',
    labelAr: 'سفاري الأدغال',
    desc: 'Exotic wildlife, ancient ruins, and canopy treetops',
    descAr: 'مغامرات استوائية بين الحيوانات وعجائب الطبيعة',
    gradient: 'from-emerald-500 to-teal-600',
    icon: '🌿',
  },
  {
    id: 'ocean',
    label: 'Deep Ocean Odyssey',
    labelAr: 'أعماق البحار',
    desc: 'Sunken coral reefs, submarines, and mermaids',
    descAr: 'شعاب مرجانية، غواصات، وأسرار البحار الغامضة',
    gradient: 'from-cyan-500 to-blue-600',
    icon: '🌊',
  },
  {
    id: 'dinosaur',
    label: 'Prehistoric World',
    labelAr: 'عالم الديناصورات',
    desc: 'Roaming T-Rex, volcanic valleys, and fossil mysteries',
    descAr: 'لقاء الديناصورات الضخمة واستكشاف وادي البراكين',
    gradient: 'from-lime-500 to-emerald-600',
    icon: '🦕',
  },
  {
    id: 'superhero',
    label: 'City Guardian',
    labelAr: 'بطل خارق',
    desc: 'Flying through the city and saving the day',
    descAr: 'قوى خارقة لحماية المدينة ومساعدة الأصدقاء',
    gradient: 'from-blue-600 to-indigo-700',
    icon: '🦸',
  },
  {
    id: 'princess',
    label: 'Royal Princess',
    labelAr: 'الأميرة الملكية',
    desc: 'Sparkling tiaras, fairy gardens, and ballroom dreams',
    descAr: 'تيجان ملكية وحدائق سحرية ومسؤوليات نبيلة',
    gradient: 'from-fuchsia-500 to-pink-600',
    icon: '👑',
  },
  {
    id: 'pirate',
    label: 'High Seas Pirate',
    labelAr: 'قراصنة البحار',
    desc: 'Sailing ships, mystery islands, and secret treasure',
    descAr: 'أشرعة وسفن أسطورية وجزر الكنوز الضائعة',
    gradient: 'from-amber-600 to-red-600',
    icon: '⚓',
  },
];

export default function CreateStoryPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [title, setTitle] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('adventure');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [storyTone, setStoryTone] = useState<'gentle' | 'funny' | 'adventurous' | 'educational'>('gentle');
  const [genre, setGenre] = useState('');
  const [purpose, setPurpose] = useState<'entertainment' | 'educational'>('entertainment');
  const [illustrationStyle, setIllustrationStyle] = useState<'storybook' | 'watercolor' | 'cartoon'>('storybook');
  const [characterConsistency, setCharacterConsistency] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>(['video', 'story_book_pdf']);
  const [pageCount, setPageCount] = useState(8);
  const [creditEstimate, setCreditEstimate] = useState<AiCreditEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [resumableStories, setResumableStories] = useState<Story[]>([]);
  const [showResume, setShowResume] = useState(true);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/login');
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGetStories()
      .then((res) => {
        const resumable = res.data.filter((s) => s.status === 'draft' || s.status === 'failed');
        setResumableStories(resumable);
      })
      .catch(() => {});

  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || selectedOutputs.length === 0) return;
    let current = true;
    const timer = setTimeout(() => {
      setEstimateLoading(true);
      apiEstimateAiCredits({ selected_outputs: selectedOutputs, page_count: pageCount })
        .then(result => { if (current) setCreditEstimate(result); })
        .catch(err => { if (current) setError(err instanceof Error ? err.message : (isRTL ? 'تعذر حساب تكلفة التوليد.' : 'Could not estimate generation credits.')); })
        .finally(() => { if (current) setEstimateLoading(false); });
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [isLoggedIn, selectedOutputs, pageCount, isRTL]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOutputToggle = (outputId: string) => {
    setSelectedOutputs((prev) => {
      if (prev.includes(outputId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((o) => o !== outputId);
      } else {
        if (outputId === 'video') {
          return ['video', ...prev.filter((o) => o !== 'story_text' && o !== 'narration_audio')];
        } else if (outputId === 'story_text' || outputId === 'narration_audio') {
          return [outputId, ...prev.filter((o) => o !== 'video')];
        }
        return [...prev, outputId];
      }
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || generating) return;
    setError('');
    setLoading(true);

    try {
      const storyTitle = title.trim() || `${childName || 'Little Hero'}'s ${selectedTheme} Adventure`;
      const formData = new FormData();
      formData.append('title', storyTitle);
      formData.append('theme', selectedTheme);
      if (childName) formData.append('child_name', childName);
      if (childAge) formData.append('child_age', childAge);
      formData.append('language', language);
      formData.append('page_count', String(pageCount));
      formData.append('story_tone', storyTone);
      formData.append('purpose', purpose);
      formData.append('illustration_style', illustrationStyle);
      formData.append('character_consistency', String(characterConsistency));
      if (genre) formData.append('genre', genre);
      if (customPrompt) formData.append('custom_prompt', customPrompt);
      if (photo) formData.append('photo', photo);

      selectedOutputs.forEach((output) => {
        formData.append('selected_outputs[]', output);
      });

      const { story } = await apiCreateStory(formData);
      setGenerating(true);
      const { story: genStory } = await apiGenerateStory(story.id);
      router.push(`/stories/${genStory.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch generation pipeline');
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleResumeStory = async (storyId: number) => {
    setGenerating(true);
    try {
      const { story } = await apiGenerateStory(storyId);
      router.push(`/stories/${story.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resume generation');
      setGenerating(false);
    }
  };

  const steps = [
    { number: 1, label: isRTL ? 'بيانات البطل والصورة' : 'Hero & Photo' },
    { number: 2, label: isRTL ? 'عالم القصة' : 'Universe Theme' },
    { number: 3, label: isRTL ? 'المخرجات السينمائية' : 'Outputs' },
    { number: 4, label: isRTL ? 'توجيه القصة والإطلاق' : 'Story Direction' },
  ];

  if (authLoading || !isLoggedIn) return null;

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CustomCursor />
      <Navbar />

      {/* ── Volumetric Ambient Glow ── */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.15 }} />
        <div className="studio-glow-orb-2" style={{ opacity: 0.12 }} />
        <div className="absolute inset-0 studio-grid-pattern opacity-15" />
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
            <Wand2 size={13} />
            {isRTL ? 'استوديو التوليد السينمائي' : 'AI PRODUCTION PIPELINE'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              {isRTL ? 'صياغة مغامرة سينمائية جديدة' : 'Craft a Cinematic Adventure'}
            </SplitTextReveal>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isRTL
              ? 'ارفع صورة طفلك، واختر ثيم العالم، وحدد المخرجات لتوليد القصة بذكاء اصطناعي فائق.'
              : 'Upload your child’s photo, choose a narrative world, and configure production outputs.'}
          </p>
        </div>

        {/* Resumable Drafts Banner */}
        <AnimatePresence>
          {showResume && resumableStories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="studio-card p-4 rounded-2xl border-brand-blue/30 bg-brand-blue/[0.04] flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isRTL ? 'لديك مسودات قصص سابقة غير مكتملة' : 'Unfinished story generations found'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    &quot;{resumableStories[0].title}&quot; ({resumableStories[0].theme})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResumeStory(resumableStories[0].id)}
                  disabled={generating}
                  className="py-1.5 px-3 rounded-lg text-xs font-bold bg-brand-blue text-white hover:bg-brand-blue/90 transition-all flex items-center gap-1"
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  <span>{isRTL ? 'استئناف' : 'Resume'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResume(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Progress Tracker */}
        <div className="studio-card p-3 rounded-2xl flex items-center justify-between overflow-x-auto">
          {steps.map((s, idx) => {
            const isActive = step === s.number;
            const isDone = step > s.number;
            return (
              <div key={s.number} className="flex items-center flex-1 min-w-[120px]">
                <button
                  type="button"
                  onClick={() => setStep(s.number as any)}
                  className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                    isActive
                      ? 'text-brand-blue'
                      : isDone
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : s.number}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full ${
                      isDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="studio-card p-6 sm:p-8 rounded-3xl space-y-8">
          {/* STEP 1: Hero Identity & Photo Upload */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRTL ? '١. بيانات بطل القصة وصورته' : '1. Hero Identity & Character DNA'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRTL
                    ? 'سيستخدم الذكاء الاصطناعي ملامح الصورة للحفاظ على شخصية الطفل عبر كل صفحات القصة والفيديو'
                    : 'The AI will preserve your child’s likeness across every scene, video frame, and coloring sheet'}
                </p>
              </div>

              {/* Photo Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-brand-blue p-6 transition-all cursor-pointer group bg-slate-50 dark:bg-white/[0.02] flex flex-col items-center justify-center text-center"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-brand-blue shadow-xl shadow-brand-blue/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        {isRTL ? 'تغيير الصورة' : 'Change Photo'}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      {photo?.name}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Camera size={26} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isRTL ? 'انقر لرفع صورة واضحة لوجه الطفل' : 'Click or drop a clear photo of your child’s face'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG, WEBP up to 10MB · Front-facing portrait recommended
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Child Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StudioInput
                  label={isRTL ? 'اسم الطفل' : 'Child’s Name'}
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder={isRTL ? 'مثال: سارة أو يوسف' : 'e.g. Leo or Emma'}
                  leadIcon={<User size={16} />}
                  required
                />
                <StudioInput
                  label={isRTL ? 'عمر الطفل' : 'Child’s Age'}
                  type="number"
                  min="1"
                  max="16"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="e.g. 6"
                  leadIcon={<Calendar size={16} />}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <span>{isRTL ? 'التالي: اختيار عالم القصة' : 'Next: Choose World'}</span>
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Universe Theme */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRTL ? '٢. عالم القصة والثيم السحري' : '2. Narrative Universe & Theme'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRTL ? 'اختر العالم الذي ستدور فيه أحداث القصة' : 'Select the magical environment where the adventure unfolds'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {themes.map((th) => {
                  const isSelected = selectedTheme === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => setSelectedTheme(th.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-blue bg-brand-blue/[0.08] shadow-lg shadow-brand-blue/15 scale-[1.02]'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{th.icon}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center">
                            <Check size={11} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {isRTL ? th.labelAr : th.label}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {isRTL ? th.descAr : th.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-3 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} className="rtl:rotate-180" />
                  <span>{isRTL ? 'السابق' : 'Back'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <span>{isRTL ? 'التالي: مخرجات الإنتاج' : 'Next: Deliverables'}</span>
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Studio Output Selection */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRTL ? '٣. المخرجات السينمائية المطلوبة' : '3. Studio Deliverables Selection'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRTL
                    ? 'أنشئ مخرجات القصة التي تختارها، وقد تختلف الميزات حسب إعدادات حسابك.'
                    : 'Choose the story outputs you want. Available features depend on your account configuration.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Story video output */}
                <div
                  onClick={() => handleOutputToggle('video')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                    selectedOutputs.includes('video')
                      ? 'border-brand-pink bg-brand-pink/[0.08] shadow-lg shadow-brand-pink/15'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-pink/10 text-brand-pink flex items-center justify-center shrink-0">
                    <Film size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isRTL ? 'فيديو القصة' : 'Story Video'}
                      </h4>
                      <input
                        type="checkbox"
                        checked={selectedOutputs.includes('video')}
                        readOnly
                        className="w-4 h-4 rounded text-brand-pink"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isRTL
                        ? 'مقطع فيديو مخصص للقصة؛ تختلف الجودة والمدة حسب الإعدادات المتاحة.'
                        : 'A personalized story video. Resolution and duration depend on the available generation settings.'}
                    </p>
                  </div>
                </div>

                {/* Storybook PDF */}
                <div
                  onClick={() => handleOutputToggle('story_book_pdf')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                    selectedOutputs.includes('story_book_pdf')
                      ? 'border-brand-blue bg-brand-blue/[0.08] shadow-lg shadow-brand-blue/15'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isRTL ? 'كتاب مصور جاهز للطباعة (PDF)' : 'Keepsake Storybook (PDF)'}
                      </h4>
                      <input
                        type="checkbox"
                        checked={selectedOutputs.includes('story_book_pdf')}
                        readOnly
                        className="w-4 h-4 rounded text-brand-blue"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isRTL
                        ? 'كتاب ملون عالي الدقة بأسلوب الرسوم الكرتونية يمكن قراءته أو طباعته'
                        : 'Beautiful high-res color illustrated book formatted for screen or print'}
                    </p>
                  </div>
                </div>

                {/* Coloring Book PDF */}
                <div
                  onClick={() => handleOutputToggle('coloring_book_pdf')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                    selectedOutputs.includes('coloring_book_pdf')
                      ? 'border-emerald-500 bg-emerald-500/[0.08] shadow-lg shadow-emerald-500/15'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Palette size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {isRTL ? 'كتاب تلوين مخصص (PDF)' : 'Printable Coloring Book'}
                      </h4>
                      <input
                        type="checkbox"
                        checked={selectedOutputs.includes('coloring_book_pdf')}
                        readOnly
                        className="w-4 h-4 rounded text-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isRTL
                        ? 'صفحات تلوين خطية عالية التباين لشخصية طفلك في مغامرته'
                        : 'High-contrast line-art pages featuring your child as the coloring hero'}
                    </p>
                  </div>
                </div>

                {/* Story Text Only */}
                {!selectedOutputs.includes('video') && (
                  <div
                    onClick={() => handleOutputToggle('story_text')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                      selectedOutputs.includes('story_text')
                        ? 'border-brand-purple bg-brand-purple/[0.08] shadow-lg shadow-brand-purple/15'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-slate-50 dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {isRTL ? 'نص القصة فقط' : 'Written Narrative Text'}
                        </h4>
                        <input
                          type="checkbox"
                          checked={selectedOutputs.includes('story_text')}
                          readOnly
                          className="w-4 h-4 rounded text-brand-purple"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isRTL ? 'نص مكتوب فصيح مقسم إلى مشاهد' : 'Story chapters written by Claude & Gemini'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-3 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} className="rtl:rotate-180" />
                  <span>{isRTL ? 'السابق' : 'Back'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <span>{isRTL ? 'التالي: توجيه القصة' : 'Next: Story Direction'}</span>
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Story Script & Directing */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                  {isRTL ? '٤. توجيه القصة واللغة والإطلاق' : '4. Story Script & Creative Direction'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRTL
                    ? 'اختر لغة الرواية وأضف أي تفاصيل خاصة تريد تضمينها في أحداث القصة'
                    : 'Choose story language and optional custom plot twists or moral lessons'}
                </p>
              </div>

              {/* Title & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <StudioInput
                    label={isRTL ? 'عنوان القصة (اختياري)' : 'Story Title (Optional)'}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      childName
                        ? isRTL
                          ? `مغامرة ${childName} في عالم ${selectedTheme}`
                          : `${childName}’s ${selectedTheme} Adventure`
                        : isRTL
                        ? 'عنوان المقترح تلقائياً'
                        : 'Auto-generated by AI if left blank'
                    }
                    leadIcon={<BookOpen size={16} />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    {isRTL ? 'لغة القصة والصوت' : 'Story & Narration Language'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLanguage('ar')}
                      className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        language === 'ar'
                          ? 'bg-brand-blue/15 border-brand-blue text-brand-blue'
                          : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500'
                      }`}
                    >
                      <Globe2 size={13} />
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        language === 'en'
                          ? 'bg-brand-purple/15 border-brand-purple text-brand-purple'
                          : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500'
                      }`}
                    >
                      <Globe2 size={13} />
                      English
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-2 text-xs font-bold text-slate-500"><span>{isRTL ? 'نبرة القصة' : 'Story tone'}</span><select value={storyTone} onChange={e => setStoryTone(e.target.value as typeof storyTone)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"><option value="gentle">{isRTL ? 'هادئة' : 'Gentle'}</option><option value="funny">{isRTL ? 'مرحة' : 'Funny'}</option><option value="adventurous">{isRTL ? 'مغامرة' : 'Adventurous'}</option><option value="educational">{isRTL ? 'تعليمية' : 'Educational'}</option></select></label>
                <label className="space-y-2 text-xs font-bold text-slate-500"><span>{isRTL ? 'نوع القصة' : 'Genre'}</span><select value={genre} onChange={e => setGenre(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"><option value="">{isRTL ? 'تلقائي' : 'Choose / automatic'}</option>{['adventure','fantasy','comedy','mystery','science fiction'].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
                <label className="space-y-2 text-xs font-bold text-slate-500"><span>{isRTL ? 'هدف القصة' : 'Story purpose'}</span><select value={purpose} onChange={e => setPurpose(e.target.value as typeof purpose)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"><option value="entertainment">{isRTL ? 'ترفيه' : 'Entertainment'}</option><option value="educational">{isRTL ? 'تعليم' : 'Educational'}</option></select></label>
                <label className="space-y-2 text-xs font-bold text-slate-500"><span>{isRTL ? 'أسلوب الرسم' : 'Illustration style'}</span><select value={illustrationStyle} onChange={e => setIllustrationStyle(e.target.value as typeof illustrationStyle)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"><option value="storybook">Storybook</option><option value="watercolor">Watercolor</option><option value="cartoon">Cartoon</option></select></label>
              </div>
              <label className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300"><input type="checkbox" checked={characterConsistency} onChange={e=>setCharacterConsistency(e.target.checked)} className="h-4 w-4 accent-brand-blue"/>{isRTL ? 'الحفاظ على اتساق مظهر الشخصية بين الصفحات' : 'Keep the character appearance consistent across pages'}</label>

              {/* Custom Prompt Textarea */}
              {(selectedOutputs.includes('story_book_pdf') || selectedOutputs.includes('coloring_book_pdf')) && (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                  <div className="space-y-2">
                    <label htmlFor="page-count" className="block text-xs font-bold text-slate-500">{isRTL ? 'عدد الصفحات' : 'Book page count'}</label>
                    <select id="page-count" value={pageCount} onChange={e => setPageCount(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                      {[8, 12, 16, 20].map(count => <option key={count} value={count}>{count} {isRTL ? 'صفحات' : 'pages'}</option>)}
                    </select>
                    <p className="text-[11px] text-slate-500">{isRTL ? 'يُستخدم نفس العدد لتخطيط صفحات الكتب والرسوم.' : 'The backend validates this and uses it to plan book pages.'}</p>
                  </div>
                  <div aria-live="polite" className="rounded-2xl border border-brand-blue/20 bg-brand-blue/[0.06] p-4">
                    <div className="text-xs font-bold">{isRTL ? 'تقدير الأرصدة' : 'Credit estimate'}</div>
                    {estimateLoading ? <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin"/>{isRTL ? 'جارٍ الحساب من الخادم...' : 'Calculating on the server…'}</div> : creditEstimate ? <>
                      <div className="mt-2 text-2xl font-black">{creditEstimate.total_credits.toLocaleString()} <span className="text-xs font-medium text-slate-500">{isRTL ? 'رصيد' : 'credits'}</span></div>
                      <div className="mt-1 text-xs text-slate-500">{isRTL ? 'المتاح:' : 'Available:'} {creditEstimate.wallet.available_credits.toLocaleString()} · {isRTL ? 'بعد التوليد:' : 'After generation:'} {creditEstimate.wallet.remaining_after_generation.toLocaleString()}</div>
                      {!creditEstimate.sufficient && <div className="mt-2 text-xs font-semibold text-red-400">{isRTL ? `تحتاج ${creditEstimate.shortfall.toLocaleString()} رصيد إضافي.` : `${creditEstimate.shortfall.toLocaleString()} more credits needed.`}</div>}
                    </> : <div className="mt-2 text-xs text-slate-500">{isRTL ? 'حدد المخرجات لحساب التكلفة.' : 'Select outputs to calculate the estimate.'}</div>}
                  </div>
                </div>
              )}

              {/* Custom Prompt Textarea */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  {isRTL ? 'توجيه المخرج (اختياري)' : 'Creative Director Prompt (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'مثال: اجعل البطل يتعلم قيمة الصدق، أو أضف صديقه القط ميسي إلى المغامرة...'
                      : 'e.g. Include his golden retriever pet, teach teamwork, or feature a magical treehouse...'
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-blue resize-y font-sans"
                />
              </div>

              {/* Launch Pipeline Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-blue/[0.08] via-brand-purple/[0.08] to-brand-pink/[0.08] border border-white/15 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>PRODUCTION REVIEW</span>
                  <span className="text-cyan-400 font-bold">READY TO LAUNCH</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-800 dark:text-slate-200">
                    Hero: <strong>{childName || 'Child Hero'}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-800 dark:text-slate-200 uppercase">
                    Theme: <strong>{selectedTheme}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-800 dark:text-slate-200">
                    Outputs: <strong>{selectedOutputs.length} formats</strong>
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-3 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} className="rtl:rotate-180" />
                  <span>{isRTL ? 'السابق' : 'Back'}</span>
                </button>

                <button
                  type="submit"
                  disabled={loading || generating || estimateLoading || (creditEstimate !== null && !creditEstimate.sufficient)}
                  className="py-3.5 px-8 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink hover:opacity-95 shadow-xl shadow-brand-blue/30 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{isRTL ? 'جاري بدء خط إنتاج الذكاء الاصطناعي...' : 'Starting AI Pipeline...'}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      <span>{isRTL ? 'توليد القصة بالذكاء الاصطناعي' : 'Launch Story Generation'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </main>
    </div>
  );
}
