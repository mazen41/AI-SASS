'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetPlans, apiCreatePlan, apiUpdatePlan, apiDeletePlan, Plan } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import StudioInput from '@/components/StudioInput';
import {
  Plus,
  Edit2,
  Trash2,
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
} from 'lucide-react';

export default function PlansPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';

  const t = {
    title: isRTL ? 'خطط الاشتراك' : 'Subscription Plans',
    subtitle: isRTL
      ? 'إنشاء وإدارة خطط الاشتراك، تعيين الأسعار، وربط بوابات الدفع'
      : 'Create and manage subscription plans, set pricing tiers, and link payment gateways',
    addPlan: isRTL ? 'خطة جديدة' : 'New Plan',
    editPlan: isRTL ? 'تعديل الخطة' : 'Edit Plan',
    createPlan: isRTL ? 'إنشاء خطة جديدة' : 'Create New Plan',
    featured: isRTL ? 'مميز' : 'Featured',
    inactive: isRTL ? 'غير نشط' : 'Inactive',
    edit: isRTL ? 'تعديل' : 'Edit',
    delete: isRTL ? 'حذف' : 'Delete',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذه الخطة؟' : 'Are you sure you want to delete this plan?',
    deleteError: isRTL ? 'فشل حذف الخطة' : 'Failed to delete plan',
    saveError: isRTL ? 'فشل حفظ الخطة' : 'Failed to save plan',
    name: isRTL ? 'الاسم' : 'Name',
    slug: isRTL ? 'المعرف (Slug)' : 'Slug',
    description: isRTL ? 'الوصف' : 'Description',
    price: isRTL ? 'السعر' : 'Price',
    billingPeriod: isRTL ? 'دورة الفوترة' : 'Billing Cycle',
    monthly: isRTL ? 'شهري' : 'Monthly',
    yearly: isRTL ? 'سنوي' : 'Yearly',
    features: isRTL ? 'المميزات (سطر لكل ميزة)' : 'Features (one per line)',
    stripePriceId: isRTL ? 'معرف سعر Stripe' : 'Stripe Price ID',
    paypalPlanId: isRTL ? 'معرف خطة PayPal' : 'PayPal Plan ID',
    active: isRTL ? 'نشط' : 'Active',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    update: isRTL ? 'تحديث' : 'Update',
    create: isRTL ? 'إنشاء' : 'Create',
    mo: isRTL ? 'شهر' : 'mo',
    yr: isRTL ? 'سنة' : 'yr',
    stripe: 'Stripe',
    paypal: 'PayPal',
    notSet: isRTL ? 'غير محدد' : 'Not set',
    activeSubscriptions: isRTL ? 'اشتراكات نشطة' : 'active subs',
    noPlans: isRTL ? 'لم يتم إنشاء أي خطط بعد' : 'No plans created yet',
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    billing_period: 'monthly' as 'monthly' | 'yearly',
    features: '',
    is_active: true,
    is_featured: false,
    stripe_price_id: '',
    paypal_plan_id: '',
  });

  const loadPlans = useCallback(async () => {
    try {
      const { plans } = await apiGetPlans();
      setPlans(plans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      billing_period: 'monthly',
      features: '',
      is_active: true,
      is_featured: false,
      stripe_price_id: '',
      paypal_plan_id: '',
    });
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price: plan.price,
      billing_period: plan.billing_period,
      features: plan.features?.join('\n') || '',
      is_active: plan.is_active,
      is_featured: plan.is_featured,
      stripe_price_id: plan.stripe_price_id || '',
      paypal_plan_id: plan.paypal_plan_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        price: formData.price,
        features: formData.features.split('\n').filter((f) => f.trim()),
      };
      if (editingPlan) {
        await apiUpdatePlan(editingPlan.id, data as Partial<Plan>);
      } else {
        await apiCreatePlan(data as Partial<Plan>);
      }
      setShowModal(false);
      loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.deleteConfirm)) return;
    try {
      await apiDeletePlan(id);
      loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : t.deleteError);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-4">
        <Loader2 size={36} className="animate-spin text-brand-blue" />
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          Loading plans...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-wider uppercase bg-brand-pink/10 border border-brand-pink/20 text-brand-pink mb-3">
            <Sparkles size={13} />
            {isRTL ? 'نظام الاشتراكات' : 'Subscription Engine'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{t.subtitle}</p>
        </div>

        <button
          onClick={openCreateModal}
          className="py-3 px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-all shadow-md shadow-brand-blue/20 flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus size={16} />
          {t.addPlan}
        </button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="studio-card flex flex-col items-center justify-center p-16 text-center">
          <AlertCircle size={44} className="text-slate-400 dark:text-slate-500 mb-4 opacity-30" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.noPlans}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative studio-card p-6 flex flex-col h-full transition-all duration-300 ${
                plan.is_featured
                  ? 'border-brand-purple/40 shadow-lg shadow-brand-purple/10 scale-[1.02]'
                  : ''
              }`}
            >
              {/* Featured Badge */}
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-brand-blue to-brand-purple text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md shadow-brand-purple/20">
                  <Star size={11} className="fill-current" />
                  {t.featured}
                </div>
              )}

              {/* Inactive Badge */}
              {!plan.is_active && (
                <div
                  className={`absolute top-4 ${
                    isRTL ? 'left-4' : 'right-4'
                  } px-2.5 py-1 text-[10px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20 rounded-full`}
                >
                  {t.inactive}
                </div>
              )}

              {/* Plan Info */}
              <div className="mb-5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8">
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-mono">
                    /{plan.billing_period === 'monthly' ? t.mo : t.yr}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <ul className="flex-1 space-y-2.5 mb-5">
                {plan.features?.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <Check
                      size={14}
                      className="text-emerald-500 shrink-0 mt-0.5"
                    />
                    <span className="leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Gateway IDs */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-1.5 mb-5">
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] text-[10px] font-mono">
                  <span className="text-slate-400">Stripe</span>
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[60%] text-end">
                    {plan.stripe_price_id || t.notSet}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] text-[10px] font-mono">
                  <span className="text-slate-400">PayPal</span>
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[60%] text-end">
                    {plan.paypal_plan_id || t.notSet}
                  </span>
                </div>
                <div className="text-center pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-full">
                    <Users size={11} />
                    {plan.active_subscriptions_count || 0} {t.activeSubscriptions}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => openEditModal(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all"
                >
                  <Edit2 size={14} />
                  {t.edit}
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                  title={t.delete}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg studio-card flex flex-col max-h-[90vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPlan ? t.editPlan : t.createPlan}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StudioInput
                    label={t.name}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Pro Plan"
                    leadIcon={<Tag size={16} />}
                    required
                  />

                  <StudioInput
                    label={t.slug}
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="pro-monthly"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StudioInput
                    label={t.price}
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="29.99"
                    leadIcon={<DollarSign size={16} />}
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      {t.billingPeriod}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, billing_period: 'monthly' })}
                        className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          formData.billing_period === 'monthly'
                            ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500'
                        }`}
                      >
                        <Calendar size={13} />
                        {t.monthly}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, billing_period: 'yearly' })}
                        className={`flex-1 py-3 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          formData.billing_period === 'yearly'
                            ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple'
                            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-500'
                        }`}
                      >
                        <Calendar size={13} />
                        {t.yearly}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {t.features}
                  </label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    rows={4}
                    placeholder={`Feature 1\nFeature 2\nFeature 3`}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-blue resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StudioInput
                    label={t.stripePriceId}
                    type="text"
                    value={formData.stripe_price_id}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                    placeholder="price_xxx"
                    leadIcon={<CreditCard size={16} />}
                  />

                  <StudioInput
                    label={t.paypalPlanId}
                    type="text"
                    value={formData.paypal_plan_id}
                    onChange={(e) => setFormData({ ...formData, paypal_plan_id: e.target.value })}
                    placeholder="P-xxx"
                    leadIcon={<CreditCard size={16} />}
                  />
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t.active}
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Star size={12} className="text-amber-500" />
                      {t.featured}
                    </span>
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                    />
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex gap-3 shrink-0">
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
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 shadow-md shadow-brand-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
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
