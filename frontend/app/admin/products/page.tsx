'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetProducts, apiCreateProduct, apiUpdateProduct, apiDeleteProduct, Product } from '@/lib/api';
import { Plus, Edit2, Trash2, X, Loader2, Package, AlertCircle, CheckCircle } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', is_active: true });

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

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

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({ name: p.name, description: p.description || '', price: String(p.price), is_active: p.is_active });
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your products and their prices</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Table */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-center">
          <Package size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No products yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first product to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Product</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Description</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Price</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-right px-6 py-3.5 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{p.description || '—'}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">${p.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${p.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Product Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} required placeholder="e.g. Story Book" />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputClass} rows={3} placeholder="Optional description..." />
              </div>
              <div>
                <label className={labelClass}>Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className={`${inputClass} pl-8`} required placeholder="0.00" />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
