'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetPlans, apiCreatePlan, apiUpdatePlan, apiDeletePlan, Plan } from '@/lib/api';
import { useLang } from '@/context/LangContext';
import { Plus, Edit2, Trash2, Check, AlertCircle, X, Star } from 'lucide-react';

export default function PlansPage() {
  const { locale } = useLang();
  const isRTL = locale === 'ar';
  
  const t = {
    title: isRTL ? 'خطط الاشتراك' : 'Subscription Plans',
    addPlan: isRTL ? 'إضافة خطة' : 'Add Plan',
    editPlan: isRTL ? 'تعديل خطة' : 'Edit Plan',
    createPlan: isRTL ? 'إنشاء خطة' : 'Create Plan',
    featured: isRTL ? 'مميز' : 'Featured',
    inactive: isRTL ? 'غير نشط' : 'Inactive',
    edit: isRTL ? 'تعديل' : 'Edit',
    delete: isRTL ? 'حذف' : 'Delete',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذه الخطة؟' : 'Are you sure you want to delete this plan?',
    deleteError: isRTL ? 'فشل حذف الخطة' : 'Failed to delete plan',
    saveError: isRTL ? 'فشل حفظ الخطة' : 'Failed to save plan',
    name: isRTL ? 'الاسم' : 'Name',
    slug: isRTL ? 'المعرف' : 'Slug',
    description: isRTL ? 'الوصف' : 'Description',
    price: isRTL ? 'السعر' : 'Price',
    billingPeriod: isRTL ? 'فترة الفوترة' : 'Billing Period',
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
    stripe: isRTL ? 'Stripe' : 'Stripe',
    paypal: isRTL ? 'PayPal' : 'PayPal',
    notSet: isRTL ? 'غير محدد' : 'Not set',
    activeSubscriptions: isRTL ? 'اشتراكات نشطة' : 'active subscriptions',
    noPlans: isRTL ? 'لا توجد خطط' : 'No plans found',
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
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
    loadPlans();
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
    try {
      const data = {
        ...formData,
        price: formData.price,
        features: formData.features.split('\n').filter(f => f.trim()),
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
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="plans-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="header">
        <h2 className="title">{t.title}</h2>
        <button onClick={openCreateModal} className="add-btn">
          <Plus size={18} />
          {t.addPlan}
        </button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>{t.noPlans}</p>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className={`plan-card ${plan.is_featured ? 'featured' : ''}`}>
              {plan.is_featured && (
                <div className="featured-badge">
                  <Star size={12} />
                  {t.featured}
                </div>
              )}
              {!plan.is_active && (
                <div className="inactive-badge">{t.inactive}</div>
              )}
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-price">
                <span className="price">${plan.price}</span>
                <span className="period">/{plan.billing_period === 'monthly' ? t.mo : t.yr}</span>
              </div>
              <ul className="features-list">
                {plan.features?.map((feature, index) => (
                  <li key={index}>
                    <Check size={14} className="check-icon" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="plan-meta">
                <p>{t.stripe}: {plan.stripe_price_id || t.notSet}</p>
                <p>{t.paypal}: {plan.paypal_plan_id || t.notSet}</p>
                <p className="subscriptions-count">{plan.active_subscriptions_count || 0} {t.activeSubscriptions}</p>
              </div>
              <div className="plan-actions">
                <button onClick={() => openEditModal(plan)} className="edit-btn">
                  <Edit2 size={14} />
                  {t.edit}
                </button>
                <button onClick={() => handleDelete(plan.id)} className="delete-btn">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPlan ? t.editPlan : t.createPlan}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t.name}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t.slug}</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.price}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t.billingPeriod}</label>
                  <select
                    value={formData.billing_period}
                    onChange={(e) => setFormData({ ...formData, billing_period: e.target.value as 'monthly' | 'yearly' })}
                  >
                    <option value="monthly">{t.monthly}</option>
                    <option value="yearly">{t.yearly}</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>{t.features}</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={4}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.stripePriceId}</label>
                  <input
                    type="text"
                    value={formData.stripe_price_id}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                    placeholder="price_xxx"
                  />
                </div>
                <div className="form-group">
                  <label>{t.paypalPlanId}</label>
                  <input
                    type="text"
                    value={formData.paypal_plan_id}
                    onChange={(e) => setFormData({ ...formData, paypal_plan_id: e.target.value })}
                    placeholder="P-xxx"
                  />
                </div>
              </div>
              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  {t.active}
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  />
                  {t.featured}
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn">
                  {editingPlan ? t.update : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .plans-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-btn:hover {
          background: #4f46e5;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-state svg {
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
        }

        .plan-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          position: relative;
          transition: all 0.2s;
        }

        .plan-card.featured {
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }

        .featured-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.35rem 0.75rem;
          background: #6366f1;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 20px;
        }

        .inactive-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.25rem 0.6rem;
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.75rem;
          border-radius: 4px;
        }

        [dir="rtl"] .inactive-badge {
          right: auto;
          left: 1rem;
        }

        .plan-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem;
        }

        .plan-description {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0 0 1rem;
        }

        .plan-price {
          margin-bottom: 1rem;
        }

        .price {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
        }

        .period {
          color: #64748b;
          font-size: 0.9rem;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem;
        }

        .features-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0;
          color: #475569;
          font-size: 0.9rem;
        }

        .check-icon {
          color: #22c55e;
          flex-shrink: 0;
        }

        .plan-meta {
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .plan-meta p {
          margin: 0.25rem 0;
        }

        .subscriptions-count {
          margin-top: 0.5rem !important;
          font-weight: 500;
          color: #6366f1;
        }

        .plan-actions {
          display: flex;
          gap: 0.5rem;
        }

        .edit-btn, .delete-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .edit-btn {
          flex: 1;
          background: #f1f5f9;
          color: #475569;
        }

        .edit-btn:hover {
          background: #e2e8f0;
        }

        .delete-btn {
          background: #fef2f2;
          color: #dc2626;
        }

        .delete-btn:hover {
          background: #fee2e2;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }

        .modal {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #1e293b;
        }

        .modal-form {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.6rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #1e293b;
          background: #fff;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .checkbox-row {
          display: flex;
          gap: 1.5rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #475569;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
          accent-color: #6366f1;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 0.5rem;
        }

        .cancel-btn, .submit-btn {
          flex: 1;
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #475569;
        }

        .cancel-btn:hover {
          background: #e2e8f0;
        }

        .submit-btn {
          background: #6366f1;
          color: white;
        }

        .submit-btn:hover {
          background: #4f46e5;
        }
      `}</style>
    </div>
  );
}
