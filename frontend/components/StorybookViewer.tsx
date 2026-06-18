'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { useLang } from '@/context/LangContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface StorybookPage {
  id: number;
  page_number: number;
  page_type: string;
  title: string | null;
  content: string | null;
  dialogue: string | null;
  illustration_url: string | null;
  background_url: string | null;
  decorative_elements: any;
  layout_type: string;
  text_position: string;
  color_scheme: string;
}

interface StorybookViewerProps {
  storyId: number;
  storybookUrl: string;
  narrationUrl: string | null;
  language: string;
}

export default function StorybookViewer({
  storyId,
  storybookUrl,
  narrationUrl,
  language,
}: StorybookViewerProps) {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const [pages, setPages] = useState<StorybookPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  const t = {
    loading: isRTL ? 'جاري تحميل القصة...' : 'Loading storybook...',
    error: isRTL ? 'فشل تحميل القصة' : 'Failed to load storybook',
    previous: isRTL ? 'السابق' : 'Previous',
    next: isRTL ? 'التالي' : 'Next',
    play: isRTL ? 'تشغيل' : 'Play',
    pause: isRTL ? 'إيقاف' : 'Pause',
    page: isRTL ? 'صفحة' : 'Page',
    of: isRTL ? 'من' : 'of',
  };

  useEffect(() => {
    loadStorybook();
  }, [storyId]);

  const loadStorybook = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/stories/${storyId}/storybook`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${response.status}: Failed to load storybook`);
      }

      const data = await response.json();
      setPages(data.pages);
      setCurrentPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (isRTL) {
          handleNext();
        } else {
          handlePrevious();
        }
      } else if (e.key === 'ArrowRight') {
        if (isRTL) {
          handlePrevious();
        } else {
          handleNext();
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isPlaying, isRTL]);

  const getLayoutClass = () => {
    const page = pages[currentPage];
    if (!page) return 'split';

    switch (page.layout_type) {
      case 'full_illustration':
        return 'full-illustration';
      case 'text_overlay':
        return 'text-overlay';
      case 'text_left':
        return 'text-left';
      case 'text_right':
        return 'text-right';
      case 'text_top':
        return 'text-top';
      case 'text_bottom':
        return 'text-bottom';
      default:
        return 'split';
    }
  };

  const getColorScheme = () => {
    const page = pages[currentPage];
    if (!page) return 'bg-gradient-to-br from-blue-50 to-purple-50';

    switch (page.color_scheme) {
      case 'bright_primary':
        return 'bg-gradient-to-br from-blue-50 to-purple-50';
      case 'warm_pastel':
        return 'bg-gradient-to-br from-orange-50 to-pink-50';
      case 'vibrant':
        return 'bg-gradient-to-br from-pink-50 to-yellow-50';
      case 'soft':
        return 'bg-gradient-to-br from-gray-50 to-slate-100';
      case 'educational':
        return 'bg-gradient-to-br from-cyan-50 to-blue-50';
      case 'playful':
        return 'bg-gradient-to-br from-green-50 to-teal-50';
      case 'celebration':
        return 'bg-gradient-to-br from-yellow-50 to-orange-50';
      default:
        return 'bg-gradient-to-br from-blue-50 to-purple-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {isRTL ? 'لا توجد صفحات في القصة' : 'No pages in storybook'}
          </p>
        </div>
      </div>
    );
  }

  const page = pages[currentPage];
  const layoutClass = getLayoutClass();
  const colorScheme = getColorScheme();

  return (
    <div className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Audio Player */}
      {narrationUrl && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <audio
            ref={audioRef}
            src={narrationUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
            <Volume2 size={20} className="text-gray-400" />
          </div>
        </div>
      )}

      {/* Storybook Viewer */}
      <div className={`relative w-full aspect-[4/3] md:aspect-[3/2] rounded-2xl overflow-hidden shadow-2xl ${colorScheme}`}>
        {/* Background */}
        {page.background_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${page.background_url})` }}
          />
        )}

        {/* Decorative Elements */}
        {page.decorative_elements && Array.isArray(page.decorative_elements) && (
          <div className="absolute inset-0 pointer-events-none">
            {page.decorative_elements.map((element: any, index: number) => (
              <img
                key={index}
                src={element.url}
                alt=""
                className="absolute"
                style={{
                  left: `${element.position?.x || 50}%`,
                  top: `${element.position?.y || 50}%`,
                  width: `${element.size || 50}px`,
                  height: `${element.size || 50}px`,
                  transform: `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`,
                }}
              />
            ))}
          </div>
        )}

        {/* Content Layout */}
        <div className={`absolute inset-0 flex ${layoutClass}`}>
          {/* Illustration */}
          {page.illustration_url && (
            <div className={`flex-1 ${layoutClass === 'split' || layoutClass === 'text-left' || layoutClass === 'text-right' ? 'w-1/2' : 'w-full'}`}>
              <img
                src={page.illustration_url}
                alt={page.title || `Page ${page.page_number}`}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Text Content */}
          <div className={`flex-1 flex flex-col justify-center p-6 md:p-12 ${layoutClass === 'split' || layoutClass === 'text-left' || layoutClass === 'text-right' ? 'w-1/2' : 'w-full'}`}>
            {page.title && (
              <motion.h2
                key={`title-${currentPage}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
              >
                {page.title}
              </motion.h2>
            )}

            {page.content && (
              <motion.p
                key={`content-${currentPage}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-4"
              >
                {page.content}
              </motion.p>
            )}

            {page.dialogue && (
              <motion.div
                key={`dialogue-${currentPage}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <p className="text-base md:text-lg text-gray-800 dark:text-gray-200 italic">
                  "{page.dialogue}"
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Page Number Overlay */}
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t.page} {currentPage + 1} {t.of} {pages.length}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={currentPage === 0}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} className={isRTL ? '' : 'rotate-180'} />
          <span className="font-semibold text-gray-700 dark:text-gray-300">{t.previous}</span>
        </button>

        <div className="flex gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentPage
                  ? 'bg-indigo-600 w-6'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === pages.length - 1}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-semibold text-gray-700 dark:text-gray-300">{t.next}</span>
          <ChevronRight size={20} className={isRTL ? 'rotate-180' : ''} />
        </button>
      </div>

      {/* Keyboard Navigation */}
      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        {isRTL ? 'استخدم مفاتيح الأسهم للتنقل' : 'Use arrow keys to navigate'}
      </div>
    </div>
  );
}
