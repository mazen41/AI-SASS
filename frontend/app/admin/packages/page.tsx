'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGetPackages, apiGetProducts, apiCreatePackage, apiUpdatePackage, apiDeletePackage, Package, Product } from '@/lib/api';
import { Plus, Edit2, Trash2, X, Loader2, AlertCircle, CheckCircle, ShoppingBag, Minus } from 'lucide-react';

interface OrderItem { product_id: number; quantity: number; }

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

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [pkgRes, prodRes] = await Promise.all([apiGetPackages(), apiGetProducts()]);
      setPackages(pkgRes.packages);
      setProducts(prodRes.products.filter(p => p.is_active));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const computeTotal = () =>
    items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
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
    setItems(pkg.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));
    setShowModal(true);
  };

  const addItem = () => {
    const available = products.find(p => !items.find(i => i.product_id === p.id));
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
    if (items.length === 0) { showToast('Add at least one product to the package', 'error'); return; }
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Packages</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bundle products into packages with custom quantities</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus size={18} /> Create Package
        </button>
      </div>

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-center">
          <ShoppingBag size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No packages yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create your first package by bundling products</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pkg.description}</p>}
                </div>
                <span className={`shrink-0 ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${pkg.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Items */}
              <div className="flex-1 space-y-2 mb-4">
                {pkg.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{item.product?.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">×{item.quantity}</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">${item.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${pkg.total_price.toFixed(2)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => openEdit(pkg)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
                  <Edit2 size={15} /> Edit
                </button>
                <button onClick={() => handleDelete(pkg.id)} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingPackage ? 'Edit Package' : 'New Package'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Name */}
                <div>
                  <label className={labelClass}>Package Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} required placeholder="e.g. Starter Bundle" />
                </div>
                {/* Description */}
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputClass} rows={2} placeholder="Optional description..." />
                </div>

                {/* Products / Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`${labelClass} mb-0`}>Products</label>
                    <button type="button" onClick={addItem} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1">
                      <Plus size={13} /> Add Product
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500">No products added yet</p>
                      <button type="button" onClick={addItem} className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">+ Add your first product</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const product = products.find(p => p.id === item.product_id);
                        const subtotal = product ? product.price * item.quantity : 0;
                        return (
                          <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                            {/* Product Select */}
                            <select
                              value={item.product_id}
                              onChange={e => updateItem(index, 'product_id', Number(e.target.value))}
                              className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (${p.price.toFixed(2)})</option>
                              ))}
                            </select>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                              <button type="button" onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))} className="px-2.5 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                              <button type="button" onClick={() => updateItem(index, 'quantity', item.quantity + 1)} className="px-2.5 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <Plus size={14} />
                              </button>
                            </div>

                            {/* Subtotal */}
                            <span className="w-16 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">${subtotal.toFixed(2)}</span>

                            {/* Remove */}
                            <button type="button" onClick={() => removeItem(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <X size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Auto-calculated Total */}
                {items.length > 0 && (
                  <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Package Total</span>
                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">${computeTotal().toFixed(2)}</span>
                  </div>
                )}

                {/* Active */}
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors shadow-sm">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
