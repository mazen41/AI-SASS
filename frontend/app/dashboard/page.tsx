'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import {
  apiGetStories,
  Story,
  apiGetActiveSubscription,
  Subscription,
  apiGetProductBalances,
  ProductBalancesResponse,
  apiDeleteStory,
} from '@/lib/api';
import Navbar from '@/components/Navbar';
import CustomCursor from '@/components/CustomCursor';
import SplitTextReveal from '@/components/SplitTextReveal';
import StudioCanvas3D from '@/components/StudioCanvas3D';
import StudioInput from '@/components/StudioInput';
import {
  Sparkles,
  Plus,
  BookOpen,
  Film,
  Palette,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Play,
  Download,
  CreditCard,
  User,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Layers,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';

export default function CustomerDashboardPage() {
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLang();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [stories, setStories] = useState<Story[]>([]);
  const [activeSub, setActiveSub] = useState<Subscription | null>(null);
  const [packageData, setPackageData] = useState<ProductBalancesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'video' | 'storybook' | 'coloring'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'processing' | 'draft'>('all');

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/login');
  }, [authLoading, isLoggedIn, router]);

  const loadData = async () => {
    if (!isLoggedIn) return;
    try {
      const [storiesRes, subRes, pkgRes] = await Promise.all([
        apiGetStories(),
        apiGetActiveSubscription(),
        apiGetProductBalances(),
      ]);
      setStories(storiesRes.data || []);
      setActiveSub(subRes.subscription || null);
      setPackageData(pkgRes || null);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLoggedIn]);

  const handleDeleteStory = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه القصة؟' : 'Are you sure you want to delete this story?')) return;
    try {
      await apiDeleteStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchesSearch =
        searchQuery === '' ||
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (story.child_name && story.child_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' || story.status === statusFilter;

      const matchesTab =
        selectedTab === 'all' ||
        (selectedTab === 'video' && (story.assembled_video_url || story.selected_outputs?.includes('video'))) ||
        (selectedTab === 'storybook' && (story.outputs?.some(o => o.output_type === 'story_book_pdf') || story.selected_outputs?.includes('story_book_pdf'))) ||
        (selectedTab === 'coloring' && (story.outputs?.some(o => o.output_type === 'coloring_book_pdf') || story.selected_outputs?.includes('coloring_book_pdf')));

      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [stories, searchQuery, statusFilter, selectedTab]);

  const completedCount = stories.filter((s) => s.status === 'completed').length;
  const processingCount = stories.filter((s) => s.status === 'processing').length;
  const videoCount = stories.filter((s) => Boolean(s.assembled_video_url)).length;

  const firstName = user?.name ? user.name.split(' ')[0] : (isRTL ? 'مبدعنا' : 'Creator');

  if (authLoading || !isLoggedIn) return null;

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans antialiased relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <CustomCursor />
      <Navbar />

      {/* ── Volumetric Ambient Mesh Glow ── */}
      <div className="studio-mesh-bg pointer-events-none">
        <div className="studio-glow-orb-1" style={{ opacity: 0.15 }} />
        <div className="studio-glow-orb-2" style={{ opacity: 0.12 }} />
        <div className="absolute inset-0 studio-grid-pattern opacity-15" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-10">
        {/* ── Studio Welcome Hero ── */}
        <section className="relative rounded-3xl overflow-hidden studio-card p-8 sm:p-10 border border-white/10 shadow-2xl">
          {/* Subtle 3D Canvas Background in Hero */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <StudioCanvas3D variant="admin" className="w-full h-full" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-blue/10 border border-brand-blue/20 text-brand-blue">
                <Sparkles size={13} className="text-brand-blue" />
                {isRTL ? 'استوديو الإبداع السينمائي' : 'CREATIVE PRODUCTION STUDIO'}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                <SplitTextReveal as="span" by="words" delay={0.1}>
                  {isRTL ? `مرحباً بعودتك، ${firstName}` : `Welcome back, ${firstName}`}
                </SplitTextReveal>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                {isRTL
                  ? 'حوّل خيال طفلك إلى مغامرات سينمائية بدقة 4K، وكتب قصصية مصورة، وصفحات تلوين جاهزة للطباعة.'
                  : 'Transform your child into the hero of cinematic 4K video stories, illustrated keepsake storybooks, and printable coloring sheets.'}
              </p>

              {/* Quick stats pills */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <BookOpen size={13} className="text-brand-blue" />
                  <strong>{stories.length}</strong> {isRTL ? 'قصص' : 'Stories'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <Film size={13} className="text-brand-pink" />
                  <strong>{videoCount}</strong> {isRTL ? 'فيديوهات' : 'Videos'}
                </span>
                {processingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400 animate-pulse">
                    <Clock size={13} />
                    <strong>{processingCount}</strong> {isRTL ? 'قيد الإنتاج' : 'Rendering'}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link
                href="/create-story"
                className="py-4 px-8 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink hover:opacity-95 transition-all shadow-xl shadow-brand-blue/25 flex items-center justify-center gap-2 group hover:scale-[1.02]"
              >
                <Plus size={18} className="transition-transform group-hover:rotate-90" />
                <span>{isRTL ? 'إنشاء قصة جديدة' : 'Create New Story'}</span>
              </Link>
              <Link
                href="/billing"
                className="py-3 px-6 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <CreditCard size={15} />
                <span>
                  {activeSub
                    ? activeSub.plan?.name || (isRTL ? 'إدارة الاشتراك' : 'Manage Plan')
                    : isRTL
                    ? 'ترقية الباقة'
                    : 'Upgrade Package'}
                </span>
                <ArrowUpRight size={14} className="opacity-70" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Package Balance & Credits Telemetry ── */}
        {packageData?.active_package && (
          <section className="studio-card p-6 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isRTL ? 'رصيد باقتك النشطة' : 'Active Package Allowance'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {packageData.active_package.package?.name || (isRTL ? 'باقة الاستوديو' : 'Studio Package')}
                  </p>
                </div>
              </div>

              <Link
                href="/billing"
                className="text-xs font-mono font-bold text-brand-blue hover:text-brand-purple flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                <span>{isRTL ? 'شراء المزيد' : 'Add Allowance'}</span>
                <ChevronRight size={14} className="rtl:rotate-180" />
              </Link>
            </div>

            {/* Balances grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.values(packageData.balances).map((bal) => {
                const pct =
                  bal.initial_quantity > 0
                    ? Math.round((bal.quantity / bal.initial_quantity) * 100)
                    : 0;
                return (
                  <div
                    key={bal.product_id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-2"
                  >
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <span className="truncate">{bal.product_name}</span>
                      <span className="font-mono text-slate-400">{pct}%</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {bal.quantity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        / {bal.initial_quantity}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-purple transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Stories Library Workstation ── */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
                {isRTL ? 'مكتبة قصصك ومشاريعك' : 'Your Story Archives'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRTL
                  ? 'تصفح جميع مشاريعك المصممة بالذكاء الاصطناعي مع إمكانية القراءة والتحميل الفوري'
                  : 'Manage and replay your generated AI stories, videos, and personalized books'}
              </p>
            </div>

            {/* Deliverable Type Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setSelectedTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'all'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isRTL ? 'الكل' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('video')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'video'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Film size={13} />
                <span>{isRTL ? 'فيديوهات' : 'Videos'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('storybook')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'storybook'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen size={13} />
                <span>{isRTL ? 'كتب مصورة' : 'Storybooks'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('coloring')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedTab === 'coloring'
                    ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-md shadow-brand-blue/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Palette size={13} />
                <span>{isRTL ? 'تلوين' : 'Coloring'}</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <StudioInput
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث باسم القصة أو اسم البطل...' : 'Search stories by title or hero name...'}
                leadIcon={<Search size={16} />}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-blue"
              >
                <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="completed">{isRTL ? 'مكتمل' : 'Completed'}</option>
                <option value="processing">{isRTL ? 'قيد التوليد' : 'Rendering'}</option>
                <option value="draft">{isRTL ? 'مسودة' : 'Draft'}</option>
              </select>
            </div>
          </div>

          {/* Stories Grid */}
          {filteredStories.length === 0 ? (
            <div className="studio-card p-12 text-center rounded-3xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto">
                <BookOpen size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {stories.length === 0
                  ? isRTL
                    ? 'لا توجد قصص بعد'
                    : 'No stories created yet'
                  : isRTL
                  ? 'لا توجد نتائج تطابق بحثك'
                  : 'No stories matching filter'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {stories.length === 0
                  ? isRTL
                    ? 'ابدأ الآن بإنشاء أول قصة سينمائية لطفلك وشاهده بطلاً في عالم سحري متكامل!'
                    : 'Begin your journey by crafting your child’s very first personalized adventure!'
                  : isRTL
                  ? 'جرّب تعديل مصطلحات البحث أو تغيير فلتر الحالة.'
                  : 'Try adjusting your search query or reset active filters.'}
              </p>
              {stories.length === 0 && (
                <Link
                  href="/create-story"
                  className="inline-flex items-center gap-2 py-3 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 transition-all shadow-md shadow-brand-blue/20"
                >
                  <Plus size={16} />
                  <span>{isRTL ? 'إنشاء أول قصة الآن' : 'Create First Story Now'}</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStories.map((story) => (
                <motion.div
                  key={story.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="studio-card rounded-3xl overflow-hidden border border-white/10 shadow-lg flex flex-col group"
                >
                  {/* Card Cover */}
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    {story.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={story.photo_url}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-gradient-to-br from-slate-900 to-slate-800">
                        <BookOpen size={36} className="opacity-40 mb-2 text-brand-blue" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          {story.theme} Universe
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Top Status & Deliverables Badge */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold backdrop-blur-md ${
                          story.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : story.status === 'processing'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                            : 'bg-black/40 text-slate-300 border border-white/10'
                        }`}
                      >
                        {story.status === 'completed' ? (
                          <CheckCircle2 size={11} />
                        ) : story.status === 'processing' ? (
                          <Clock size={11} />
                        ) : null}
                        <span>{story.status.toUpperCase()}</span>
                      </span>

                      {/* Theme pill */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold bg-white/10 backdrop-blur-md text-white border border-white/15">
                        {story.theme}
                      </span>
                    </div>

                    {/* Bottom Title Bar inside Cover */}
                    <div className="absolute bottom-3 inset-x-3 flex items-end justify-between">
                      <div>
                        {story.child_name && (
                          <span className="text-[11px] font-bold text-cyan-300 block mb-0.5 font-mono">
                            ★ {story.child_name} {story.child_age ? `(${story.child_age} yrs)` : ''}
                          </span>
                        )}
                        <h3 className="text-base font-extrabold text-white line-clamp-1 font-display">
                          {story.title}
                        </h3>
                      </div>

                      {story.assembled_video_url && (
                        <div className="w-8 h-8 rounded-full bg-brand-pink text-white flex items-center justify-center shadow-lg shadow-brand-pink/30 shrink-0">
                          <Play size={13} className="ms-0.5 fill-current" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Deliverables Available */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {story.assembled_video_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-pink/10 text-brand-pink text-[10px] font-mono font-bold">
                          <Film size={10} /> 4K Video
                        </span>
                      )}
                      {story.outputs?.some((o) => o.output_type === 'story_book_pdf') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue text-[10px] font-mono font-bold">
                          <BookOpen size={10} /> Book PDF
                        </span>
                      )}
                      {story.outputs?.some((o) => o.output_type === 'coloring_book_pdf') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                          <Palette size={10} /> Coloring
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 ms-auto">
                        {new Date(story.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      <Link
                        href={`/stories/${story.id}`}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <span>{story.status === 'completed' ? (isRTL ? 'فتح القصة' : 'Open Story') : (isRTL ? 'متابعة الإنتاج' : 'View Progress')}</span>
                        <ChevronRight size={14} className="rtl:rotate-180" />
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteStory(e, story.id)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title={isRTL ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
