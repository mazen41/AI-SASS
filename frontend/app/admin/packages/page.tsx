'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiGetPackages,
  apiGetProducts,
  apiCreatePackage,
  apiUpdatePackage,
  apiDeletePackage,
  Package,
  Product,
} from '@/lib/api';
import StudioInput from '@/components/StudioInput';
import SplitTextReveal from '@/components/SplitTextReveal';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShoppingBag,
  Minus,
  Sparkles,
  Check,
} from 'lucide-react';

interface OrderItem {
  product_id: number;
  quantity: number;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [items, setItems] = useState<OrderItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [pkgRes, prodRes] = await Promise.all([apiGetPackages(), apiGetProducts()]);
      setPackages(pkgRes.packages);
      setProducts(prodRes.products.filter((p) => p.is_active));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const computeTotal = () =>
    items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

  const openCreate = () => {
    setEditingPackage(null);
    setFormData({ name: '', description: '', is_active: true });
    setItems([]);
    setShowModal(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({ name: pkg.name, description: pkg.description || '', is_active: pkg.is_active });
    setItems(pkg.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })));
    setShowModal(true);
  };

  const addItem = () => {
    const available = products.find((p) => !items.find((i) => i.product_id === p.id));
    if (available) setItems([...items, { product_id: available.id, quantity: 1 }]);
    else if (products.length > 0) setItems([...items, { product_id: products[0].id, quantity: 1 }]);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: 'product_id' | 'quantity', value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('Add at least one product to the package', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formData, items };
      if (editingPackage) {
        await apiUpdatePackage(editingPackage.id, payload);
        showToast('Package updated successfully', 'success');
      } else {
        await apiCreatePackage(payload);
        showToast('Package created successfully', 'success');
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save package', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await apiDeletePackage(id);
      showToast('Package deleted', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete package', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 size={36} className="animate-spin text-[var(--k-blue)]" />
        <span className="text-xs font-mono text-[var(--text-3)] uppercase">LOADING PACKAGES...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-white text-xs sm:text-sm font-bold ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--k-blue)] uppercase tracking-wider mb-1">
            <ShoppingBag size={14} />
            <span>CATALOG & PLANS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              Studio Packages & Pricing
            </SplitTextReveal>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">
            Bundle products into packages with customized quantities and pricing
          </p>
        </div>

        <button
          onClick={openCreate}
          className="studio-btn-primary px-5 py-3 text-xs font-bold shrink-0 shadow-lg"
        >
          <Plus size={16} />
          <span>New Studio Package</span>
        </button>
      </div>

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <div className="studio-card-glass p-16 text-center">
          <ShoppingBag size={48} className="mx-auto text-[var(--text-3)] opacity-30 mb-3" />
          <h3 className="text-base font-bold text-[var(--text)]">No packages created yet</h3>
          <p className="text-xs text-[var(--text-3)] mt-1 mb-6">
            Create your first package bundle by grouping available products
          </p>
          <button onClick={openCreate} className="studio-btn-primary px-6 py-2.5 text-xs font-bold">
            <Plus size={14} />
            <span>Create First Package</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="studio-card-glass p-6 flex flex-col justify-between hover:border-[var(--k-blue)] transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text)] font-display group-hover:text-[var(--k-blue)] transition-colors">
                      {pkg.name}
                    </h3>
                    {pkg.description && (
                      <p className="text-xs text-[var(--text-3)] mt-0.5 line-clamp-2">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 ${
                      pkg.is_active
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Items in Package */}
                <div className="space-y-2 my-4">
                  {pkg.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-[var(--text)]">{item.product?.name}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[var(--text-3)]">×{item.quantity}</span>
                        <span className="font-bold text-[var(--k-blue)]">
                          ${item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {/* Total */}
                <div className="pt-4 border-t border-[var(--border)] flex items-baseline justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[var(--text-3)] uppercase">
                    Package Total
                  </span>
                  <span className="text-2xl font-extrabold gradient-text font-display">
                    ${pkg.total_price.toFixed(2)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(pkg)}
                    className="flex-1 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--k-blue)] font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id)}
                    className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Delete Package"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg studio-card-glass p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)] shrink-0">
              <h3 className="text-lg font-bold font-display text-[var(--text)]">
                {editingPackage ? 'Edit Studio Package' : 'Create New Package'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <StudioInput
                label="Package Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Creator Studio Pro"
                required
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of the package and deliverables..."
                  rows={2}
                  className="studio-input text-xs sm:text-sm resize-none"
                />
              </div>

              {/* Items in Package */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
                    Products & Quantities
                  </label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-[var(--k-blue)] hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--border)] text-center text-xs text-[var(--text-3)]">
                    <p>No products added to this package yet.</p>
                    <button
                      type="button"
                      onClick={addItem}
                      className="mt-2 text-xs font-bold text-[var(--k-blue)] hover:underline"
                    >
                      + Add product item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, index) => {
                      const product = products.find((p) => p.id === item.product_id);
                      const subtotal = product ? product.price * item.quantity : 0;
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
                        >
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))}
                            className="studio-input flex-1 h-9 text-xs font-semibold py-1"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (${p.price.toFixed(2)})
                              </option>
                            ))}
                          </select>

                          {/* Stepper */}
                          <div className="flex items-center gap-1 border border-[var(--border)] rounded-lg bg-[var(--surface)] p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(index, 'quantity', Math.max(1, item.quantity - 1))
                              }
                              className="p-1 text-[var(--text-3)] hover:text-[var(--text)]"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center text-xs font-mono font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                              className="p-1 text-[var(--text-3)] hover:text-[var(--text)]"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <span className="w-14 text-right text-xs font-mono font-bold text-[var(--k-blue)]">
                            ${subtotal.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-400 hover:text-red-500"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Package Total Display */}
              {items.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-[var(--text-3)]">
                    Calculated Package Total
                  </span>
                  <span className="text-xl font-extrabold gradient-text font-display">
                    ${computeTotal().toFixed(2)}
                  </span>
                </div>
              )}

              {/* Active Toggle */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface-2)] cursor-pointer text-xs font-semibold text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-[var(--k-blue)]"
                />
                <span>Active Package (Available for customer subscription)</span>
              </label>

              {/* Actions */}
              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="studio-btn-secondary px-5 py-2.5 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="studio-btn-primary px-6 py-2.5 text-xs font-bold"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : editingPackage ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
