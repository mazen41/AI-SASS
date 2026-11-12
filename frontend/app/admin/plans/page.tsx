'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiGetPlans,
  apiCreatePlan,
  apiUpdatePlan,
  apiDeletePlan,
  apiDuplicatePlan,
  apiArchivePlan,
  apiUpdatePlanOrder,
  Plan,
  PlanCapabilities,
} from '@/lib/api';
import { useLang } from '@/context/LangContext';
import StudioInput from '@/components/StudioInput';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Archive,
  ArrowUp,
  ArrowDown,
  Check,
  AlertCircle,
  X,
  Star,
  Loader2,
  Sparkles,
  CreditCard,
  Users,
  Tag,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Sliders,
  Shield,
  Video,
  BookOpen,
  Palette,
  Volume2,
  Cpu,
  Eye,
  EyeOff,
  Flame,
  Award,
} from 'lucide-react';

type TabKey = 'general' | 'limits' | 'capabilities' | 'features' | 'gateways';

export default function PlansPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'إدارة خطط الاشتراك' : 'Subscription Plans Management',
    subtitle: isRTL
      ? 'تحكم كامل في خطط الاشتراك، التسعير، الأرصدة، الحدود، والميزات الديناميكية'
      : 'Full control over subscription tiers, pricing, AI credits, generation limits, and studio capabilities',
    addPlan: isRTL ? 'خطة جديدة' : 'New Plan',
    editPlan: isRTL ? 'تعديل الخطة' : 'Edit Plan',
    createPlan: isRTL ? 'إنشاء خطة جديدة' : 'Create New Plan',
    featured: isRTL ? 'الأكثر طلباً' : 'Featured',
    inactive: isRTL ? 'غير نشط' : 'Inactive',
    archived: isRTL ? 'مؤرشف' : 'Archived',
    public: isRTL ? 'ظاهر للعامة' : 'Public',
    hidden: isRTL ? 'مخفي' : 'Hidden',
    edit: isRTL ? 'تعديل' : 'Edit',
    duplicate: isRTL ? 'نسخ' : 'Duplicate',
    archive: isRTL ? 'أرشفة' : 'Archive',
    delete: isRTL ? 'حذف' : 'Delete',
    moveUp: isRTL ? 'تقديم' : 'Move Up',
    moveDown: isRTL ? 'تأخير' : 'Move Down',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذه الخطة؟ لا يمكن حذف الخطط التي تحتوي على مشتركين.' : 'Are you sure you want to delete this plan? Plans with subscription history cannot be deleted.',
    archiveConfirm: isRTL ? 'هل تريد أرشفة هذه الخطة؟ سيبقى المشتركون الحاليون محتفظين باشتراكاتهم ولكن لن تظهر للمشتركين الجدد.' : 'Archive this plan? Existing subscribers will keep access, but it will be hidden from new customers.',
    duplicateConfirm: isRTL ? 'إنشاء نسخة مطابقة من هذه الخطة للتعديل عليها؟' : 'Create an exact duplicate of this plan to customize?',
    deleteError: isRTL ? 'فشل حذف الخطة' : 'Failed to delete plan',
    saveError: isRTL ? 'فشل حفظ الخطة' : 'Failed to save plan',
    name: isRTL ? 'اسم الخطة' : 'Plan Name',
    slug: isRTL ? 'المعرف الفريد (Slug)' : 'Unique Slug',
    description: isRTL ? 'الوصف الترويجي' : 'Marketing Description',
    price: isRTL ? 'السعر الشهري (ر.س)' : 'Monthly Price (SAR)',
    yearlyPrice: isRTL ? 'السعر السنوي (ر.س)' : 'Yearly Price (SAR)',
    billingPeriod: isRTL ? 'دورة الفوترة الافتراضية' : 'Default Billing Cycle',
    monthly: isRTL ? 'شهري' : 'Monthly',
    yearly: isRTL ? 'سنوي' : 'Yearly',
    monthlyCredits: isRTL ? 'رصيد الذكاء الاصطناعي الشهري' : 'Monthly AI Credits',
    features: isRTL ? 'المميزات الترويجية (سطر لكل ميزة)' : 'Marketing Features (one per line)',
    stripePriceId: isRTL ? 'معرف Stripe Price' : 'Stripe Price ID',
    paypalPlanId: isRTL ? 'معرف PayPal Plan' : 'PayPal Plan ID',
    moyasarProductId: isRTL ? 'معرف Moyasar Product' : 'Moyasar Product ID',
    myfatoorahProductId: isRTL ? 'معرف MyFatoorah Product' : 'MyFatoorah Product ID',
    icon: isRTL ? 'الأيقونة' : 'Icon',
    badge: isRTL ? 'شارة مميزة (Badge)' : 'Badge Label',
    trialDays: isRTL ? 'أيام التجربة المجانية' : 'Free Trial Days',
    sortOrder: isRTL ? 'الترتيب' : 'Sort Order',
    active: isRTL ? 'نشط' : 'Active',
    isPublic: isRTL ? 'عرض في صفحة الأسعار العامة' : 'Display on Public Pricing Page',
    isFeatured: isRTL ? 'تمميز كأفضل خيار (Featured)' : 'Highlight as Recommended / Popular',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    update: isRTL ? 'حفظ التعديلات' : 'Save Changes',
    create: isRTL ? 'إنشاء الخطة' : 'Create Plan',
    mo: isRTL ? 'شهر' : 'mo',
    yr: isRTL ? 'سنة' : 'yr',
    activeSubscriptions: isRTL ? 'مشترك نشط' : 'active subs',
    totalSubscriptions: isRTL ? 'إجمالي الاشتراكات' : 'total subs',
    noPlans: isRTL ? 'لا توجد خطط تطابق البحث' : 'No plans found matching criteria',
    searchPlaceholder: isRTL ? 'بحث بالاسم، المعرف، أو الوصف...' : 'Search by name, slug, or description...',
    allFilter: isRTL ? 'الكل' : 'All',
    activeFilter: isRTL ? 'النشطة فقط' : 'Active Only',
    publicFilter: isRTL ? 'الظاهرة فقط' : 'Public Only',
    totalPlans: isRTL ? 'إجمالي الخطط' : 'Total Plans',
    subscribersCount: isRTL ? 'المشتركون النشطون' : 'Active Subscribers',
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'public'>('all');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '0',
    yearly_price: '',
    monthly_credits: '30',
    story_limit: '2',
    video_limit: '0',
    daily_story_limit: '1',
    daily_video_limit: '0',
    billing_period: 'monthly' as 'monthly' | 'yearly',
    icon: 'sparkles',
    badge: '',
    trial_days: '0',
    sort_order: '1',
    features: '',
    is_active: true,
    is_public: true,
    is_featured: false,
    stripe_price_id: '',
    paypal_plan_id: '',
    moyasar_product_id: '',
    myfatoorah_product_id: '',
    capabilities: {
      story_enabled: true,
      storybook_enabled: true,
      coloring_enabled: true,
      narration_enabled: false,
      video_enabled: false,
      max_storybook_pages: 8,
      max_coloring_pages: 8,
      max_video_duration_seconds: 0,
      allowed_ai_models: ['standard'],
      character_consistency: false,
      priority_generation: false,
      commercial_usage: false,
      custom_branding: false,
      support_level: 'community',
    } as PlanCapabilities,
  });

  const loadPlans = useCallback(async () => {
    try {
      const { plans } = await apiGetPlans();
      setPlans(plans);
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setActiveTab('general');
    const nextOrder = plans.length > 0 ? Math.max(...plans.map((p) => p.sort_order || 0)) + 1 : 1;
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '9.99',
      yearly_price: '99.99',
      monthly_credits: '250',
      story_limit: '15',
      video_limit: '2',
      daily_story_limit: '3',
      daily_video_limit: '1',
      billing_period: 'monthly',
      icon: 'sparkles',
      badge: '',
      trial_days: '0',
      sort_order: String(nextOrder),
      features: '250 AI Credits per month\nUp to 15 stories & 2 videos\n12-page illustrated storybooks\nCharacter consistency\nStandard support',
      is_active: true,
      is_public: true,
      is_featured: false,
      stripe_price_id: '',
      paypal_plan_id: '',
      moyasar_product_id: '',
      myfatoorah_product_id: '',
      capabilities: {
        story_enabled: true,
        storybook_enabled: true,
        coloring_enabled: true,
        narration_enabled: true,
        video_enabled: true,
        max_storybook_pages: 12,
        max_coloring_pages: 12,
        max_video_duration_seconds: 30,
        allowed_ai_models: ['standard', 'high_quality'],
        character_consistency: true,
        priority_generation: false,
        commercial_usage: false,
        custom_branding: false,
        support_level: 'email',
      },
    });
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setActiveTab('general');
    const caps = (plan.effective_capabilities || plan.capabilities || {}) as PlanCapabilities;
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price: String(plan.price),
      yearly_price: plan.yearly_price ? String(plan.yearly_price) : '',
      monthly_credits: String(plan.monthly_credits ?? 0),
      story_limit: String(plan.story_limit ?? 0),
      video_limit: String(plan.video_limit ?? 0),
      daily_story_limit: String(plan.daily_story_limit ?? 0),
      daily_video_limit: String(plan.daily_video_limit ?? 0),
      billing_period: plan.billing_period,
      icon: plan.icon || 'sparkles',
      badge: plan.badge || '',
      trial_days: String(plan.trial_days ?? 0),
      sort_order: String(plan.sort_order ?? 0),
      features: plan.features?.join('\n') || '',
      is_active: plan.is_active,
      is_public: plan.is_public !== false,
      is_featured: plan.is_featured,
      stripe_price_id: plan.stripe_price_id || '',
      paypal_plan_id: plan.paypal_plan_id || '',
      moyasar_product_id: plan.moyasar_product_id || '',
      myfatoorah_product_id: plan.myfatoorah_product_id || '',
      capabilities: {
        story_enabled: caps.story_enabled !== false,
        storybook_enabled: caps.storybook_enabled !== false,
        coloring_enabled: caps.coloring_enabled !== false,
        narration_enabled: !!caps.narration_enabled,
        video_enabled: caps.video_enabled !== false && (plan.video_limit ?? 0) > 0,
        max_storybook_pages: Number(caps.max_storybook_pages ?? 12),
        max_coloring_pages: Number(caps.max_coloring_pages ?? 12),
        max_video_duration_seconds: Number(caps.max_video_duration_seconds ?? 30),
        allowed_ai_models: Array.isArray(caps.allowed_ai_models) ? caps.allowed_ai_models : ['standard'],
        character_consistency: caps.character_consistency !== false,
        priority_generation: !!caps.priority_generation,
        commercial_usage: !!caps.commercial_usage,
        custom_branding: !!caps.custom_branding,
        support_level: caps.support_level || 'email',
      },
    });
    setShowModal(true);
  };

  const handleCapabilityChange = (key: keyof PlanCapabilities, value: any) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [key]: value,
      },
    }));
  };

  const handleModelToggle = (modelName: string) => {
    const current = formData.capabilities.allowed_ai_models || ['standard'];
    const exists = current.includes(modelName);
    const updated = exists ? current.filter((m) => m !== modelName) : [...current, modelName];
    handleCapabilityChange('allowed_ai_models', updated.length > 0 ? updated : ['standard']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Plan> = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price: formData.price,
        yearly_price: formData.yearly_price ? formData.yearly_price : null,
        monthly_credits: Number(formData.monthly_credits),
        story_limit: Number(formData.story_limit),
        video_limit: Number(formData.video_limit),
        daily_story_limit: Number(formData.daily_story_limit),
        daily_video_limit: Number(formData.daily_video_limit),
        billing_period: formData.billing_period,
        icon: formData.icon || null,
        badge: formData.badge || null,
        trial_days: Number(formData.trial_days || 0),
        sort_order: Number(formData.sort_order || 0),
        is_active: formData.is_active,
        is_public: formData.is_public,
        is_featured: formData.is_featured,
        stripe_price_id: formData.stripe_price_id || null,
        paypal_plan_id: formData.paypal_plan_id || null,
        moyasar_product_id: formData.moyasar_product_id || null,
        myfatoorah_product_id: formData.myfatoorah_product_id || null,
        features: formData.features.split('\n').map((s) => s.trim()).filter(Boolean),
        capabilities: formData.capabilities,
      };

      if (editingPlan) {
        await apiUpdatePlan(editingPlan.id, payload);
      } else {
        await apiCreatePlan(payload);
      }
      setShowModal(false);
      await loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (plan: Plan) => {
    if (!confirm(t.duplicateConfirm)) return;
    try {
      await apiDuplicatePlan(plan.id);
      await loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to duplicate plan');
    }
  };

  const handleArchive = async (plan: Plan) => {
    if (!confirm(t.archiveConfirm)) return;
    try {
      await apiArchivePlan(plan.id);
      await loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive plan');
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await apiDeletePlan(plan.id);
      await loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.deleteError);
    }
  };

  const handleMoveOrder = async (planIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? planIndex - 1 : planIndex + 1;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const newPlans = [...plans];
    const temp = newPlans[planIndex];
    newPlans[planIndex] = newPlans[targetIndex];
    newPlans[targetIndex] = temp;

    const orders = newPlans.map((p, idx) => ({ id: p.id, sort_order: idx + 1 }));
    setPlans(newPlans);

    try {
      await apiUpdatePlanOrder(orders);
    } catch (err) {
      console.error('Failed to update order', err);
      await loadPlans();
    }
  };

  // Filter & Search
  const filteredPlans = plans.filter((plan) => {
    if (filterMode === 'active' && !plan.is_active) return false;
    if (filterMode === 'public' && (plan.is_public === false || !plan.is_active)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = plan.name.toLowerCase().includes(q);
      const matchSlug = plan.slug.toLowerCase().includes(q);
      const matchDesc = plan.description?.toLowerCase().includes(q) || false;
      return matchName || matchSlug || matchDesc;
    }
    return true;
  });

  const totalActiveSubs = plans.reduce((acc, p) => acc + (p.active_subscriptions_count || 0), 0);
  const totalAllSubs = plans.reduce((acc, p) => acc + (p.subscriptions_count || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-4">
        <Loader2 size={36} className="animate-spin text-brand-blue" />
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          Loading subscription tiers...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header & Stats Banner */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-pink/10 border border-brand-pink/20 text-brand-pink mb-3">
            <Sparkles size={13} />
            {isRTL ? 'محرك الخطط والاشتراكات' : 'Studio Subscription Engine'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{t.subtitle}</p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink text-white hover:opacity-95 transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus size={16} />
          {t.addPlan}
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="studio-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono text-slate-400">{t.totalPlans}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{plans.length}</div>
          </div>
        </div>

        <div className="studio-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono text-slate-400">{isRTL ? 'الخطط النشطة' : 'Active Plans'}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {plans.filter((p) => p.is_active).length}
            </div>
          </div>
        </div>

        <div className="studio-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center font-bold">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono text-slate-400">{t.subscribersCount}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{totalActiveSubs}</div>
          </div>
        </div>

        <div className="studio-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono text-slate-400">{t.totalSubscriptions}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{totalAllSubs}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl studio-card">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full py-2 px-9 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-brand-blue"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            {t.allFilter}
          </button>
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'active'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            {t.activeFilter}
          </button>
          <button
            onClick={() => setFilterMode('public')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'public'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
            }`}
          >
            {t.publicFilter}
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <div className="studio-card flex flex-col items-center justify-center p-16 text-center rounded-3xl">
          <AlertCircle size={44} className="text-slate-400 dark:text-slate-500 mb-4 opacity-40" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t.noPlans}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan, index) => {
            const caps = (plan.effective_capabilities || plan.capabilities || {}) as PlanCapabilities;
            return (
              <div
                key={plan.id}
                className={`relative studio-card p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 border ${
                  plan.is_featured
                    ? 'border-brand-purple shadow-xl shadow-brand-purple/15 ring-2 ring-brand-purple/30'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                {/* Header & Badges */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-mono font-bold">
                        #{plan.sort_order}
                      </span>
                      {plan.badge && (
                        <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-brand-pink/10 text-brand-pink border border-brand-pink/20">
                          {plan.badge}
                        </span>
                      )}
                      {plan.is_featured && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-sm">
                          <Star size={10} className="fill-current" />
                          {t.featured}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {plan.is_public ? (
                        <span className="p-1 rounded text-emerald-500 bg-emerald-500/10 text-[10px] font-mono" title={t.public}>
                          <Eye size={13} />
                        </span>
                      ) : (
                        <span className="p-1 rounded text-slate-400 bg-slate-100 dark:bg-white/5 text-[10px] font-mono" title={t.hidden}>
                          <EyeOff size={13} />
                        </span>
                      )}
                      {!plan.is_active && (
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20 rounded-full">
                          {t.inactive}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plan Name & Slug */}
                  <div className="mb-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">
                      {plan.name}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{plan.slug}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 min-h-[32px]">
                      {plan.description || (isRTL ? 'لا يوجد وصف مخصص' : 'No description provided')}
                    </p>
                  </div>

                  {/* Price & Monthly Credits Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/[0.02] dark:to-white/[0.04] border border-slate-200/80 dark:border-white/5 mb-5 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-3xl font-black text-slate-900 dark:text-white font-display">
                          {Number(plan.price) === 0 ? (isRTL ? 'مجاني' : 'Free') : `${parseFloat(plan.price).toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`}
                        </span>
                        {Number(plan.price) > 0 && (
                          <span className="text-xs text-slate-400 font-mono ms-1">
                            /{plan.billing_period === 'monthly' ? t.mo : t.yr}
                          </span>
                        )}
                      </div>
                      {plan.yearly_price && Number(plan.yearly_price) > 0 && (
                        <div className="text-end">
                          <span className="text-xs font-bold text-emerald-500 font-mono">
                            {parseFloat(plan.yearly_price).toLocaleString()} {isRTL ? 'ر.س سنوياً' : 'SAR/yr'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/5 text-xs font-bold text-brand-blue">
                      <Sparkles size={14} />
                      <span>{Number(plan.monthly_credits).toLocaleString()} {isRTL ? 'رصيد شهرياً' : 'Credits / mo'}</span>
                    </div>
                  </div>

                  {/* Studio Capabilities Overview Pills */}
                  <div className="mb-5 space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {isRTL ? 'إمكانيات الأستوديو والحدود' : 'Studio Capabilities & Limits'}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <BookOpen size={11} className="text-brand-blue" />
                        <span>{caps.max_storybook_pages ?? 8}p Book</span>
                      </span>
                      {caps.video_enabled && (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Video size={11} className="text-brand-purple" />
                          <span>{caps.max_video_duration_seconds ?? 30}s Video</span>
                        </span>
                      )}
                      {caps.coloring_enabled && (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Palette size={11} className="text-brand-pink" />
                          <span>Coloring</span>
                        </span>
                      )}
                      {caps.narration_enabled && (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Volume2 size={11} className="text-teal-500" />
                          <span>Voice</span>
                        </span>
                      )}
                      {caps.character_consistency && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                          <Shield size={11} />
                          <span>Consistency</span>
                        </span>
                      )}
                      {caps.commercial_usage && (
                        <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                          Commercial
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gateway Indicators */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400 mb-5">
                    <div className="flex items-center gap-2">
                      <span className={plan.stripe_price_id ? 'text-slate-700 dark:text-slate-200 font-bold' : 'opacity-40'}>
                        Stripe
                      </span>
                      <span>·</span>
                      <span className={plan.paypal_plan_id ? 'text-slate-700 dark:text-slate-200 font-bold' : 'opacity-40'}>
                        PayPal
                      </span>
                      <span>·</span>
                      <span className={plan.myfatoorah_product_id ? 'text-slate-700 dark:text-slate-200 font-bold' : 'opacity-40'}>
                        MyFatoorah
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-brand-blue font-bold">
                      <Users size={11} />
                      {plan.active_subscriptions_count || 0} {t.activeSubscriptions}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-1.5 flex-wrap">
                  {/* Order Up / Down */}
                  <button
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                    title={t.moveUp}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === filteredPlans.length - 1}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                    title={t.moveDown}
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(plan)}
                    className="p-2 rounded-xl text-slate-500 hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
                    title={t.duplicate}
                  >
                    <Copy size={14} />
                  </button>

                  {/* Archive */}
                  <button
                    onClick={() => handleArchive(plan)}
                    className="p-2 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                    title={t.archive}
                  >
                    <Archive size={14} />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 size={13} />
                    <span>{t.edit}</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all"
                    title={t.delete}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Comprehensive Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-3xl studio-card flex flex-col max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple text-white flex items-center justify-center shadow-md">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white font-display">
                    {editingPlan ? `${t.editPlan}: ${editingPlan.name}` : t.createPlan}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400">
                    {editingPlan ? editingPlan.slug : 'Configure pricing, quotas & capabilities'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="flex items-center px-5 border-b border-slate-200 dark:border-white/10 gap-1 overflow-x-auto bg-slate-50/50 dark:bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'general'
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Tag size={13} />
                <span>{isRTL ? 'البيانات والتسعير' : 'General & Pricing'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('limits')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'limits'
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>{isRTL ? 'الحدود والحصص' : 'Limits & Quotas'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('capabilities')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'capabilities'
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cpu size={13} />
                <span>{isRTL ? 'إمكانيات الأستوديو' : 'Capabilities & AI'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('features')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'features'
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText size={13} />
                <span>{isRTL ? 'المميزات الترويجية' : 'Marketing Bullets'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gateways')}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'gateways'
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CreditCard size={13} />
                <span>{isRTL ? 'البوابات والظهور' : 'Gateways & Status'}</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* TAB 1: GENERAL & PRICING */}
                {activeTab === 'general' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StudioInput
                        label={t.name}
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Family Plan"
                        leadIcon={<Tag size={16} />}
                        required
                      />

                      <StudioInput
                        label={t.slug}
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="family"
                        leadIcon={<Layers size={16} />}
                        required
                      />
                    </div>

                    <StudioInput
                      label={t.description}
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={isRTL ? 'وصف مختصر للخطة' : 'Brief plan description'}
                      leadIcon={<FileText size={16} />}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <StudioInput
                        label={t.price}
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="19.99"
                        leadIcon={<DollarSign size={16} />}
                        required
                      />

                      <StudioInput
                        label={t.yearlyPrice}
                        type="number"
                        step="0.01"
                        value={formData.yearly_price}
                        onChange={(e) => setFormData({ ...formData, yearly_price: e.target.value })}
                        placeholder="199.99"
                        leadIcon={<DollarSign size={16} />}
                      />

                      <StudioInput
                        label={t.monthlyCredits}
                        type="number"
                        value={formData.monthly_credits}
                        onChange={(e) => setFormData({ ...formData, monthly_credits: e.target.value })}
                        placeholder="750"
                        leadIcon={<Sparkles size={16} />}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <StudioInput
                        label={t.badge}
                        type="text"
                        value={formData.badge}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        placeholder="RECOMMENDED"
                        leadIcon={<Award size={16} />}
                      />

                      <StudioInput
                        label={t.icon}
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="sparkles / heart / crown"
                        leadIcon={<Star size={16} />}
                      />

                      <StudioInput
                        label={t.trialDays}
                        type="number"
                        value={formData.trial_days}
                        onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                        placeholder="0"
                        leadIcon={<Calendar size={16} />}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: LIMITS & QUOTAS */}
                {activeTab === 'limits' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 text-xs text-brand-blue space-y-1">
                      <span className="font-bold">{isRTL ? 'ملاحظة مهمة حول الحدود:' : 'Usage Quotas Note:'}</span>
                      <p className="text-slate-600 dark:text-slate-300">
                        {isRTL
                          ? 'تحدد هذه القيم الحد الأقصى للقصص والفيديوهات التي يمكن للمشترك توليدها شهرياً ويومياً. يمكن إدخال 0 أو أرقام كبيرة لإلغاء القيود.'
                          : 'Set the maximum monthly and daily creation limits. Use high values (e.g. 99999) or rely on AI credit consumption balance.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StudioInput
                        label={isRTL ? 'الحد الأقصى للقصص شهرياً' : 'Monthly Stories Limit'}
                        type="number"
                        value={formData.story_limit}
                        onChange={(e) => setFormData({ ...formData, story_limit: e.target.value })}
                        placeholder="40"
                        leadIcon={<BookOpen size={16} />}
                      />

                      <StudioInput
                        label={isRTL ? 'الحد الأقصى للفيديوهات شهرياً' : 'Monthly Videos Limit'}
                        type="number"
                        value={formData.video_limit}
                        onChange={(e) => setFormData({ ...formData, video_limit: e.target.value })}
                        placeholder="8"
                        leadIcon={<Video size={16} />}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StudioInput
                        label={isRTL ? 'الحد الأقصى اليومي للقصص' : 'Daily Stories Limit'}
                        type="number"
                        value={formData.daily_story_limit}
                        onChange={(e) => setFormData({ ...formData, daily_story_limit: e.target.value })}
                        placeholder="5"
                        leadIcon={<BookOpen size={16} />}
                      />

                      <StudioInput
                        label={isRTL ? 'الحد الأقصى اليومي للفيديوهات' : 'Daily Videos Limit'}
                        type="number"
                        value={formData.daily_video_limit}
                        onChange={(e) => setFormData({ ...formData, daily_video_limit: e.target.value })}
                        placeholder="2"
                        leadIcon={<Video size={16} />}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: CAPABILITIES & AI */}
                {activeTab === 'capabilities' && (
                  <div className="space-y-5">
                    {/* Core outputs toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Storybook */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen size={15} className="text-brand-blue" />
                            {isRTL ? 'توليد كتب القصص المصورة (Storybook)' : 'Storybook Generation'}
                          </span>
                          <input
                            type="checkbox"
                            checked={formData.capabilities.storybook_enabled !== false}
                            onChange={(e) => handleCapabilityChange('storybook_enabled', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-blue"
                          />
                        </label>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">
                            {isRTL ? 'الحد الأقصى لصفحات الكتاب' : 'Max Storybook Pages'}
                          </label>
                          <input
                            type="number"
                            value={formData.capabilities.max_storybook_pages ?? 12}
                            onChange={(e) => handleCapabilityChange('max_storybook_pages', Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                          />
                        </div>
                      </div>

                      {/* Coloring Book */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Palette size={15} className="text-brand-pink" />
                            {isRTL ? 'صفحات التلوين (Coloring Book)' : 'Coloring Book Generation'}
                          </span>
                          <input
                            type="checkbox"
                            checked={formData.capabilities.coloring_enabled !== false}
                            onChange={(e) => handleCapabilityChange('coloring_enabled', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-pink"
                          />
                        </label>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">
                            {isRTL ? 'الحد الأقصى لصفحات التلوين' : 'Max Coloring Pages'}
                          </label>
                          <input
                            type="number"
                            value={formData.capabilities.max_coloring_pages ?? 12}
                            onChange={(e) => handleCapabilityChange('max_coloring_pages', Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                          />
                        </div>
                      </div>

                      {/* Cinematic Video */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Video size={15} className="text-brand-purple" />
                            {isRTL ? 'توليد الفيديو السينمائي' : 'Cinematic Video Generation'}
                          </span>
                          <input
                            type="checkbox"
                            checked={formData.capabilities.video_enabled !== false}
                            onChange={(e) => handleCapabilityChange('video_enabled', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-purple"
                          />
                        </label>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-400 mb-1">
                            {isRTL ? 'أقصى مدة فيديو بالثواني' : 'Max Video Duration (seconds)'}
                          </label>
                          <input
                            type="number"
                            value={formData.capabilities.max_video_duration_seconds ?? 30}
                            onChange={(e) => handleCapabilityChange('max_video_duration_seconds', Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs"
                          />
                        </div>
                      </div>

                      {/* Narration */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Volume2 size={15} className="text-teal-500" />
                            {isRTL ? 'التعليق الصوتي الصوتي (Narration)' : 'Voice Narration'}
                          </span>
                          <input
                            type="checkbox"
                            checked={!!formData.capabilities.narration_enabled}
                            onChange={(e) => handleCapabilityChange('narration_enabled', e.target.checked)}
                            className="w-4 h-4 rounded text-teal-500"
                          />
                        </label>
                        <p className="text-[11px] text-slate-500">
                          {isRTL ? 'تمكين توليد الأصوات العاطفية لكل مشهد' : 'Enable emotional AI narration per story scene'}
                        </p>
                      </div>
                    </div>

                    {/* Pro & Enterprise Toggles */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {isRTL ? 'الميزات المتقدمة والرخص' : 'Advanced Creative Features & Licenses'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {isRTL ? 'ثبات ملامح الشخصية (Character Consistency)' : 'Character Consistency Engine'}
                          </span>
                          <input
                            type="checkbox"
                            checked={formData.capabilities.character_consistency !== false}
                            onChange={(e) => handleCapabilityChange('character_consistency', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-blue"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {isRTL ? 'أولوية قصوى في طابور المعالجة (Priority)' : 'Priority GPU Generation Queue'}
                          </span>
                          <input
                            type="checkbox"
                            checked={!!formData.capabilities.priority_generation}
                            onChange={(e) => handleCapabilityChange('priority_generation', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-blue"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {isRTL ? 'حقوق الاستخدام التجاري (Commercial Usage)' : 'Commercial Usage Rights'}
                          </span>
                          <input
                            type="checkbox"
                            checked={!!formData.capabilities.commercial_usage}
                            onChange={(e) => handleCapabilityChange('commercial_usage', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-blue"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {isRTL ? 'إزالة العلامة المائية / علامة مخصصة' : 'Custom Watermark & White Label'}
                          </span>
                          <input
                            type="checkbox"
                            checked={!!formData.capabilities.custom_branding}
                            onChange={(e) => handleCapabilityChange('custom_branding', e.target.checked)}
                            className="w-4 h-4 rounded text-brand-blue"
                          />
                        </label>
                      </div>
                    </div>

                    {/* AI Models & Support Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                          {isRTL ? 'نماذج الذكاء الاصطناعي المتاحة' : 'Allowed AI Models'}
                        </label>
                        <div className="space-y-1.5">
                          {['standard', 'high_quality', 'premium'].map((model) => (
                            <label key={model} className="flex items-center gap-2 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={(formData.capabilities.allowed_ai_models || []).includes(model)}
                                onChange={() => handleModelToggle(model)}
                                className="w-4 h-4 rounded text-brand-blue"
                              />
                              <span className="capitalize">{model.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                          {isRTL ? 'مستوى الدعم الفني' : 'Support Level'}
                        </label>
                        <select
                          value={formData.capabilities.support_level || 'email'}
                          onChange={(e) => handleCapabilityChange('support_level', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs focus:outline-none"
                        >
                          <option value="community">Community</option>
                          <option value="email">Standard Email</option>
                          <option value="priority">Priority 24/7</option>
                          <option value="dedicated">Dedicated VIP Account Manager</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: MARKETING BULLETS */}
                {activeTab === 'features' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-900 dark:text-white">
                      {t.features}
                    </label>
                    <p className="text-xs text-slate-500">
                      {isRTL
                        ? 'تظهر هذه القائمة على شكل نقاط للمستخدم في صفحة الأسعار وصفحة الدفع.'
                        : 'These bullets are displayed on pricing cards and checkout screens. Write one benefit per line.'}
                    </p>
                    <textarea
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      rows={8}
                      placeholder={`750 AI Credits per month\nUp to 40 stories & 8 videos\n16-page storybooks\nCharacter consistency\nPriority queue`}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-brand-blue font-mono"
                    />
                  </div>
                )}

                {/* TAB 5: GATEWAYS & STATUS */}
                {activeTab === 'gateways' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StudioInput
                        label={t.stripePriceId}
                        type="text"
                        value={formData.stripe_price_id}
                        onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                        placeholder="price_1xxxx"
                        leadIcon={<CreditCard size={16} />}
                      />

                      <StudioInput
                        label={t.paypalPlanId}
                        type="text"
                        value={formData.paypal_plan_id}
                        onChange={(e) => setFormData({ ...formData, paypal_plan_id: e.target.value })}
                        placeholder="P-xxxx"
                        leadIcon={<CreditCard size={16} />}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <StudioInput
                        label={t.moyasarProductId}
                        type="text"
                        value={formData.moyasar_product_id}
                        onChange={(e) => setFormData({ ...formData, moyasar_product_id: e.target.value })}
                        placeholder="moyasar_plan_xxx"
                        leadIcon={<CreditCard size={16} />}
                      />

                      <StudioInput
                        label={t.myfatoorahProductId}
                        type="text"
                        value={formData.myfatoorah_product_id}
                        onChange={(e) => setFormData({ ...formData, myfatoorah_product_id: e.target.value })}
                        placeholder="myfatoorah_plan_xxx"
                        leadIcon={<CreditCard size={16} />}
                      />
                    </div>

                    {/* Status Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                      <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t.active}
                        </span>
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 rounded text-brand-blue"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t.isPublic}
                        </span>
                        <input
                          type="checkbox"
                          checked={formData.is_public}
                          onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-500"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Star size={12} className="text-amber-500" />
                          {t.isFeatured}
                        </span>
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex gap-3 shrink-0 bg-slate-50/50 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue via-brand-purple to-brand-pink text-white hover:opacity-90 shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingPlan ? t.update : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
