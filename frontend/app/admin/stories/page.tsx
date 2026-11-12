'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLang } from '@/context/LangContext';
import StudioInput from '@/components/StudioInput';
import {
  apiGetStories,
  apiGetStory,
  apiDeleteStory,
  Story,
  StoryAsset,
  StoryOutputs,
  PaginatedResponse,
} from '@/lib/api';
import {
  BookOpen,
  Film,
  Sparkles,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Download,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Palette,
  X,
  Volume2,
} from 'lucide-react';

export default function AdminStoriesPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'إدارة القصص والمحتوى المُولد' : 'Stories & AI Content Management',
    subtitle: isRTL
      ? 'استعراض ومراقبة جميع مشاريع القصص، الفيديوهات السينمائية، والكتب المصورة'
      : 'Inspect, monitor, and manage generated stories, cinematic videos, and storybooks',
    searchPlaceholder: isRTL ? 'ابحث باسم القصة أو اسم الطفل...' : 'Search by story title or child name...',
    allStatus: isRTL ? 'جميع الحالات' : 'All Statuses',
    completed: isRTL ? 'مكتمل' : 'Completed',
    processing: isRTL ? 'قيد المعالجة' : 'Processing',
    draft: isRTL ? 'مسودة' : 'Draft',
    failed: isRTL ? 'فشل' : 'Failed',
    allThemes: isRTL ? 'جميع العوالم' : 'All Themes',
    noStories: isRTL ? 'لا توجد قصص مطابقة' : 'No stories found',
    storyTitle: isRTL ? 'عنوان القصة' : 'Story Title',
    child: isRTL ? 'الطفل' : 'Child',
    theme: isRTL ? 'الثيم' : 'Theme',
    status: isRTL ? 'الحالة' : 'Status',
    outputs: isRTL ? 'المخرجات' : 'Outputs',
    date: isRTL ? 'تاريخ الإنشاء' : 'Created At',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    inspect: isRTL ? 'معاينة وفحص' : 'Inspect Details',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذه القصة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this story? This action cannot be undone.',
    previewInApp: isRTL ? 'فتح القصة في المنصة' : 'Open in Studio',
    scenes: isRTL ? 'المشاهد واللقطات' : 'Story Scenes',
  };

  const [stories, setStories] = useState<PaginatedResponse<Story> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [themeFilter, setThemeFilter] = useState('');

  // Inspect modal
  const [inspectStory, setInspectStory] = useState<Story | null>(null);
  const [inspectAssets, setInspectAssets] = useState<StoryAsset[]>([]);
  const [inspectOutputs, setInspectOutputs] = useState<StoryOutputs>({});
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page) };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (themeFilter) params.theme = themeFilter;

      const res = await apiGetStories(params);
      setStories(res);
    } catch (err) {
      console.error('Failed to fetch stories', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, themeFilter]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleOpenInspect = async (story: Story) => {
    setInspectStory(story);
    setInspectLoading(true);
    try {
      const res = await apiGetStory(story.id);
      setInspectAssets(res.assets || []);
      setInspectOutputs(res.outputs || {});
    } catch (err) {
      console.error('Failed to load story details', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDelete = async (storyId: number) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await apiDeleteStory(storyId);
      if (inspectStory?.id === storyId) setInspectStory(null);
      fetchStories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete story');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={11} /> {t.completed}
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 animate-pulse">
            <Clock size={11} /> {t.processing}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle size={11} /> {t.failed}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
            {t.draft}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-blue/10 border border-brand-blue/20 text-brand-blue mb-3">
            <Sparkles size={13} />
            {isRTL ? 'مركز إدارة المحتوى' : 'Content Management'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{t.subtitle}</p>
        </div>

        <Link
          href="/create-story"
          className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Sparkles size={15} />
          {isRTL ? '+ توليد قصة جديدة' : '+ Generate Story'}
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="studio-card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <StudioInput
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t.searchPlaceholder}
            leadIcon={<Search size={16} />}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-blue"
          >
            <option value="">{t.allStatus}</option>
            <option value="completed">{t.completed}</option>
            <option value="processing">{t.processing}</option>
            <option value="draft">{t.draft}</option>
            <option value="failed">{t.failed}</option>
          </select>

          <select
            value={themeFilter}
            onChange={(e) => {
              setThemeFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-blue"
          >
            <option value="">{t.allThemes}</option>
            <option value="adventure">Adventure</option>
            <option value="space">Space</option>
            <option value="jungle">Jungle</option>
            <option value="fantasy">Fantasy</option>
            <option value="ocean">Ocean</option>
            <option value="dinosaur">Dinosaur</option>
            <option value="superhero">Superhero</option>
            <option value="princess">Princess</option>
            <option value="pirate">Pirate</option>
          </select>
        </div>
      </div>

      {/* Stories Table */}
      <div className="studio-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-brand-blue" />
            <span className="text-xs font-mono uppercase text-slate-400">Loading stories...</span>
          </div>
        ) : !stories || stories.data.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={44} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">{t.noStories}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-start">{t.storyTitle}</th>
                  <th className="px-5 py-3.5 text-start">{t.child}</th>
                  <th className="px-5 py-3.5 text-start">{t.theme}</th>
                  <th className="px-5 py-3.5 text-start">{t.status}</th>
                  <th className="px-5 py-3.5 text-start">{t.date}</th>
                  <th className="px-5 py-3.5 text-end">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {stories.data.map((story) => (
                  <tr
                    key={story.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 shrink-0 relative flex items-center justify-center text-slate-400">
                          {story.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={story.photo_url}
                              alt={story.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                            {story.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: #{story.id} · {story.language?.toUpperCase() || 'EN'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {story.child_name ? (
                        <span>
                          {story.child_name}{' '}
                          {story.child_age ? (
                            <span className="text-[10px] text-slate-400">({story.child_age} yrs)</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-blue/10 text-brand-blue font-mono text-[10px] uppercase font-bold">
                        <Palette size={11} />
                        {story.theme}
                      </span>
                    </td>

                    <td className="px-5 py-4">{getStatusBadge(story.status)}</td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {new Date(story.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                    </td>

                    <td className="px-5 py-4 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenInspect(story)}
                          title={t.inspect}
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <Link
                          href={`/stories/${story.id}`}
                          target="_blank"
                          title={t.previewInApp}
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-purple hover:bg-brand-purple/10 transition-colors"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(story.id)}
                          title="Delete"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {stories && stories.last_page > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>
              Page {stories.current_page} of {stories.last_page} ({stories.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                {isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
              <button
                disabled={page >= stories.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectStory && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setInspectStory(null)}
        >
          <div
            className="studio-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {inspectStory.title}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  ID: #{inspectStory.id} · Theme: {inspectStory.theme} · Status: {inspectStory.status}
                </span>
              </div>
              <button
                onClick={() => setInspectStory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {inspectLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 size={28} className="animate-spin text-brand-blue" />
                </div>
              ) : (
                <>
                  {/* Summary grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Child</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {inspectStory.child_name || '—'} ({inspectStory.child_age || '—'} yrs)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Language</span>
                      <strong className="text-slate-800 dark:text-slate-200 uppercase">
                        {inspectStory.language}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Scenes</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {inspectAssets.length} Generated
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Video Status</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {inspectStory.assembled_video_url ? 'Ready ✓' : 'Pending'}
                      </strong>
                    </div>
                  </div>

                  {/* Generated Deliverables Row */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Generated Deliverables
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Video Output */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Film size={18} className="text-brand-pink" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Video</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {inspectStory.assembled_video_url ? 'Rendered' : 'Not Generated'}
                            </span>
                          </div>
                        </div>
                        {inspectStory.assembled_video_url && (
                          <a
                            href={inspectStory.assembled_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20 transition-colors"
                          >
                            <Play size={13} />
                          </a>
                        )}
                      </div>

                      {/* Storybook PDF */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <BookOpen size={18} className="text-brand-blue" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Storybook PDF</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {inspectOutputs.story_book_pdf?.url ? 'Ready' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        {inspectOutputs.story_book_pdf?.url && (
                          <a
                            href={inspectOutputs.story_book_pdf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition-colors"
                          >
                            <Download size={13} />
                          </a>
                        )}
                      </div>

                      {/* Coloring Book PDF */}
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Palette size={18} className="text-emerald-500" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Coloring PDF</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {inspectOutputs.coloring_book_pdf?.url ? 'Ready' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        {inspectOutputs.coloring_book_pdf?.url && (
                          <a
                            href={inspectOutputs.coloring_book_pdf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Download size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scene Assets Preview */}
                  {inspectAssets.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        {t.scenes} ({inspectAssets.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {inspectAssets.map((asset) => (
                          <div
                            key={asset.id}
                            className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-900 group relative"
                          >
                            {asset.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.url}
                                alt={`Scene ${asset.scene_number}`}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-32 flex items-center justify-center text-slate-600">
                                No image
                              </div>
                            )}
                            <div className="p-2 text-[10px] font-mono text-slate-300 bg-slate-900/90 flex justify-between items-center">
                              <span>Scene {asset.scene_number}</span>
                              {asset.asset_type === 'video' && <Film size={11} className="text-cyan-400" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Story Text */}
                  {inspectStory.content && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Generated Narrative
                      </h4>
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif max-h-48 overflow-y-auto">
                        {inspectStory.content}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
              <Link
                href={`/stories/${inspectStory.id}`}
                target="_blank"
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/20 transition-all flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                {t.previewInApp}
              </Link>
              <button
                onClick={() => setInspectStory(null)}
                className="py-2.5 px-5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
