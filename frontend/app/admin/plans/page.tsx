'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetPlans, apiCreatePlan, apiUpdatePlan, apiDeletePlan, Plan } from '@/lib/api';

export default function PlansPage() {
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
      alert(err instanceof Error ? err.message : 'Failed to save plan');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await apiDeletePlan(id);
      loadPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Subscription Plans</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          + Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-gray-800 rounded-xl p-6 border ${
              plan.is_featured ? 'border-purple-500' : 'border-gray-700'
            } relative`}
          >
            {plan.is_featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 text-white text-xs rounded-full">
                Featured
              </div>
            )}
            {!plan.is_active && (
              <div className="absolute top-4 right-4 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                Inactive
              </div>
            )}
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
            <div className="mt-4">
              <span className="text-3xl font-bold text-white">${plan.price}</span>
              <span className="text-gray-400">/{plan.billing_period === 'monthly' ? 'mo' : 'yr'}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {plan.features?.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-gray-300 text-sm">
                  <span className="text-green-400">✓</span> {feature}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
              <p>Stripe: {plan.stripe_price_id || 'Not set'}</p>
              <p>PayPal: {plan.paypal_plan_id || 'Not set'}</p>
              <p className="mt-2">{plan.active_subscriptions_count || 0} active subscriptions</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => openEditModal(plan)}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingPlan ? 'Edit Plan' : 'Create Plan'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Billing Period</label>
                  <select
                    value={formData.billing_period}
                    onChange={(e) => setFormData({ ...formData, billing_period: e.target.value as 'monthly' | 'yearly' })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Features (one per line)</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  rows={4}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Stripe Price ID</label>
                  <input
                    type="text"
                    value={formData.stripe_price_id}
                    onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="price_xxx"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">PayPal Plan ID</label>
                  <input
                    type="text"
                    value={formData.paypal_plan_id}
                    onChange={(e) => setFormData({ ...formData, paypal_plan_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder="P-xxx"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                  />
                  Featured
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {editingPlan ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
