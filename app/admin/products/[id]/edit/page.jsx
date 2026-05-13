'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { generateSlug } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { generateId, formatCurrency } from '@/lib/utils';

export default function EditProductPage({ params }) {
  const { id } = use(params);
  const { client } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ name: '', sku: '', description: '', category: '', basePrice: '', discountPercent: '', inventory: '0', lowStockThreshold: '10', purchasePrice: '', location: '', slug: '', metaDescription: '', status: 'active' });
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    if (!client) return;
    const init = async () => {
      setCategories(await storage.getCategories(client.id));
      const p = await storage.getProduct(client.id, id);
      if (p) {
        // Calculate discount percent from basePrice and salePrice
        let discPct = '';
        if (p.salePrice && p.salePrice < p.basePrice) {
          discPct = String(Math.round(((p.basePrice - p.salePrice) / p.basePrice) * 100));
        }
        setForm({ name: p.name, sku: p.sku, description: p.description, category: p.category, basePrice: String(p.basePrice), discountPercent: discPct, inventory: String(p.inventory), lowStockThreshold: String(p.lowStockThreshold), purchasePrice: p.purchasePrice ? String(p.purchasePrice) : '', location: p.location || '', slug: p.slug, metaDescription: p.metaDescription || '', status: p.status });
        setVariants(p.variants);
      }
    };
    init();
  }, [client, id]);

  const addVariant = () => { setVariants([...variants, { id: generateId(), type: '', options: [] }]); };
  const removeVariant = (idx) => { setVariants(variants.filter((_, i) => i !== idx)); };
  const addOption = (idx, opt) => { if (!opt.trim()) return; const v = [...variants]; v[idx].options.push(opt.trim()); setVariants(v); };
  const removeOption = (vi, oi) => { const v = [...variants]; v[vi].options.splice(oi, 1); setVariants(v); };

  // Calculate final price from base price and discount
  const baseNum = Number(form.basePrice) || 0;
  const discNum = Number(form.discountPercent) || 0;
  const finalPrice = discNum > 0 ? Math.round(baseNum * (1 - discNum / 100)) : baseNum;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.basePrice || baseNum <= 0) e.basePrice = 'Must be > 0';
    if (discNum < 0 || discNum >= 100) e.discountPercent = 'Must be 0-99%';
    if (!form.category) e.category = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!client || !validate()) return;
    setSaving(true);
    const salePrice = discNum > 0 ? finalPrice : undefined;
    await storage.updateProduct(client.id, id, {
      name: form.name.trim(), sku: form.sku, description: form.description, category: form.category,
      basePrice: baseNum, salePrice,
      variants, inventory: Number(form.inventory), lowStockThreshold: Number(form.lowStockThreshold),
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined, location: form.location,
      slug: form.slug || generateSlug(form.name), metaDescription: form.metaDescription, status: form.status,
    });
    router.push('/admin/products');
  };

  const F = ({ label, error, children }) => (
    <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}{error && <p className="text-xs text-red-500 mt-1">{error}</p>}</div>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">Edit Product</h1><button onClick={() => router.push('/admin/products')} className="text-sm text-gray-500">← Back</button></div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold">Basic Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <F label="Name *" error={errors.name}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></F>
          <F label="SKU"><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></F>
        </div>
        <F label="Description"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value.slice(0, 500) })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></F>
        <F label="Category *" error={errors.category}><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="">Select</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></F>
      </div>

      {/* Simplified Pricing: Price → Discount % → Final Price */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold">Pricing</h2>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <F label="Price *" error={errors.basePrice}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
              <input type="number" value={form.basePrice} onChange={e => setForm({ ...form, basePrice: e.target.value })} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </F>
          <F label="Discount %" error={errors.discountPercent}>
            <div className="relative">
              <input type="number" min="0" max="99" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
            </div>
          </F>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Final Price</label>
            <div className="flex items-center gap-2 h-[38px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-lg font-bold text-green-600">{formatCurrency(finalPrice)}</span>
              {discNum > 0 && <span className="text-xs text-gray-400 line-through">{formatCurrency(baseNum)}</span>}
            </div>
          </div>
        </div>
        <F label="Purchase Price (cost)"><input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none max-w-xs" /></F>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Variants</h2><button onClick={addVariant} className="text-sm text-blue-500">+ Add</button></div>
        {variants.map((v, vi) => (
          <div key={v.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex gap-2"><input value={v.type} onChange={e => { const vs = [...variants]; vs[vi].type = e.target.value; setVariants(vs); }} placeholder="Type" className="flex-1 px-3 py-2 border rounded-lg text-sm" /><button onClick={() => removeVariant(vi)} className="text-red-500 text-sm">×</button></div>
            <div className="flex flex-wrap gap-1">{v.options.map((o, oi) => <span key={oi} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs flex items-center gap-1">{o}<button onClick={() => removeOption(vi, oi)}>×</button></span>)}</div>
            <input placeholder="Add option (Enter)" className="w-full px-3 py-2 border rounded-lg text-sm" onKeyDown={e => { if (e.key === 'Enter') { addOption(vi, (e.target).value); (e.target).value = ''; } }} />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold">Inventory & SEO</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <F label="Stock"><input type="number" value={form.inventory} onChange={e => setForm({ ...form, inventory: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></F>
          <F label="Low Stock Threshold"><input type="number" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></F>
          <F label="Location"><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></F>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <F label="Slug"><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></F>
          <F label="Status"><div className="flex gap-4 mt-1">{(['active','hidden','archived']).map(s => <label key={s} className="flex items-center gap-1 text-sm"><input type="radio" checked={form.status===s} onChange={()=>setForm({...form,status:s})} />{s}</label>)}</div></F>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">{saving ? 'Saving...' : 'Update Product'}</button>
      </div>
    </div>
  );
}
