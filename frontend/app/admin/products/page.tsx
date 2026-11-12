'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiGetProducts,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
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
  Package,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', is_active: true });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const { products } = await apiGetProducts();
      setProducts(products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      is_active: p.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...formData, price: parseFloat(formData.price) };
      if (editingProduct) {
        await apiUpdateProduct(editingProduct.id, data);
        showToast('Product updated successfully', 'success');
      } else {
        await apiCreateProduct(data);
        showToast('Product created successfully', 'success');
      }
      setShowModal(false);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiDeleteProduct(id);
      showToast('Product deleted', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete product', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 size={36} className="animate-spin text-[var(--k-blue)]" />
        <span className="text-xs font-mono text-[var(--text-3)] uppercase">LOADING PRODUCTS...</span>
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
            <Package size={14} />
            <span>PRODUCT INVENTORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[var(--text)]">
            <SplitTextReveal as="span" by="words" delay={0.1}>
              Products & Items Catalog
            </SplitTextReveal>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-3)] mt-1">
            Manage unit items, story credits, rendering allotments, and prices
          </p>
        </div>

        <button
          onClick={openCreate}
          className="studio-btn-primary px-5 py-3 text-xs font-bold shrink-0 shadow-lg"
        >
          <Plus size={16} />
          <span>New Product</span>
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="studio-card-glass p-16 text-center">
          <Package size={48} className="mx-auto text-[var(--text-3)] opacity-30 mb-3" />
          <h3 className="text-base font-bold text-[var(--text)]">No products configured</h3>
          <p className="text-xs text-[var(--text-3)] mt-1 mb-6">
            Add your first product to bundle into studio packages
          </p>
          <button onClick={openCreate} className="studio-btn-primary px-6 py-2.5 text-xs font-bold">
            <Plus size={14} />
            <span>Create First Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="studio-card-glass p-6 flex flex-col justify-between hover:border-[var(--k-blue)] transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text)] font-display group-hover:text-[var(--k-blue)] transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-[var(--text-3)] mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                      p.is_active
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-[var(--text-3)] uppercase">
                    Base Price
                  </span>
                  <span className="text-2xl font-extrabold gradient-text font-display">
                    ${Number(p.price).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--k-blue)] font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Delete Product"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md studio-card-glass p-6 sm:p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold font-display text-[var(--text)]">
                {editingProduct ? 'Edit Product Item' : 'New Product Item'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <StudioInput
                label="Product Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Video Story Credit"
                required
              />

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details..."
                  rows={2}
                  className="studio-input text-xs sm:text-sm resize-none"
                />
              </div>

              <StudioInput
                label="Unit Price ($)"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface-2)] cursor-pointer text-xs font-semibold text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-[var(--k-blue)]"
                />
                <span>Active Product</span>
              </label>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
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
                  {saving ? <Loader2 size={14} className="animate-spin" /> : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
