'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { generateId, generateSKU, generateSlug } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import FormField from '@/components/shared/FormField';

const INITIAL_FORM = {
  name: '', sku: '', description: '', category: '', basePrice: '', salePrice: '',
  inventory: '0', lowStockThreshold: '10', purchasePrice: '', location: '',
  slug: '', metaDescription: '', status: 'active', imageUrls: '',
};

export default function NewProductPage() {
  const { client } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(INITIAL_FORM);
  const [variants, setVariants] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatImage, setNewCatImage] = useState('');
  const [uploadingCatImage, setUploadingCatImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (client) storage.getCategories(client.id).then(setCategories);
  }, [client]);

  // Use a stable updater to prevent re-render cascades
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Generate SKU/slug on blur, NOT on every keystroke
  const handleNameBlur = useCallback(() => {
    setForm(prev => ({
      ...prev,
      sku: prev.sku || generateSKU(prev.name),
      slug: generateSlug(prev.name),
    }));
  }, []);

  const addVariant = useCallback(() => {
    setVariants(prev => [...prev, { id: generateId(), type: '', options: [] }]);
  }, []);

  const updateVariant = useCallback((idx, field, value) => {
    setVariants(prev => {
      const v = [...prev];
      if (field === 'type') v[idx] = { ...v[idx], type: value };
      return v;
    });
  }, []);

  const addOption = useCallback((idx, option) => {
    if (!option.trim()) return;
    setVariants(prev => {
      const v = [...prev];
      v[idx] = { ...v[idx], options: [...v[idx].options, option.trim()] };
      return v;
    });
  }, []);

  const removeOption = useCallback((vIdx, oIdx) => {
    setVariants(prev => {
      const v = [...prev];
      v[vIdx] = { ...v[vIdx], options: v[vIdx].options.filter((_, i) => i !== oIdx) };
      return v;
    });
  }, []);

  const removeVariant = useCallback((idx) => {
    setVariants(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCatImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCatImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setNewCatImage(data.url);
    } catch (err) { console.error('Upload failed:', err); }
    setUploadingCatImage(false);
  }, []);

  const addNewCategory = useCallback(async () => {
    if (!client || !newCat.trim()) return;
    const cat = {
      id: generateId(), clientId: client.id, name: newCat.trim(),
      image: newCatImage || '', displayOrder: categories.length + 1, createdAt: new Date().toISOString(),
    };
    await storage.addCategory(client.id, cat);
    setCategories(prev => [...prev, cat]);
    updateField('category', newCat.trim());
    setNewCat('');
    setNewCatImage('');
    setShowNewCat(false);
  }, [client, newCat, newCatImage, categories.length, updateField]);

  // Handle Cloudinary image upload
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setImagePreview(prev => [...prev, data.url]);
        setForm(prev => ({
          ...prev,
          imageUrls: prev.imageUrls ? prev.imageUrls + '\n' + data.url : data.url,
        }));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploadingImage(false);
  }, []);

  const removeImage = useCallback((idx) => {
    setImagePreview(prev => prev.filter((_, i) => i !== idx));
    setForm(prev => {
      const urls = prev.imageUrls.split('\n').filter(u => u.trim());
      urls.splice(idx, 1);
      return { ...prev, imageUrls: urls.join('\n') };
    });
  }, []);

  const validate = useCallback(() => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.basePrice || Number(form.basePrice) <= 0) e.basePrice = 'Must be > 0';
    if (form.salePrice && Number(form.salePrice) >= Number(form.basePrice)) e.salePrice = 'Must be less than base price';
    if (!form.category) e.category = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form.name, form.basePrice, form.salePrice, form.category]);

  const save = useCallback(async (addAnother) => {
    if (!client || !validate()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const images = form.imageUrls
        ? form.imageUrls.split('\n').filter(u => u.trim())
        : ['/placeholder-product.svg'];

      const product = {
        id: generateId(), clientId: client.id,
        name: form.name.trim(),
        sku: form.sku || generateSKU(form.name),
        description: form.description,
        category: form.category,
        basePrice: Number(form.basePrice),
        salePrice: form.salePrice ? Number(form.salePrice) : null,
        images,
        variants,
        inventory: Number(form.inventory) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 10,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        location: form.location || '',
        slug: form.slug || generateSlug(form.name),
        metaDescription: form.metaDescription || '',
        status: form.status,
        views: 0, addToCartCount: 0, purchaseCount: 0,
        createdAt: now, updatedAt: now,
      };
      await storage.addProduct(client.id, product);

      if (addAnother) {
        setForm({ ...INITIAL_FORM, category: form.category });
        setVariants([]);
        setImagePreview([]);
        setSuccessMsg('Product saved! Add another.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        router.push('/admin/products');
      }
    } catch (err) {
      console.error('Save failed:', err);
      setErrors({ save: 'Failed to save product. Please try again.' });
    }
    setSaving(false);
  }, [client, form, variants, validate, router]);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
        <button onClick={() => router.push('/admin/products')} className="text-sm text-gray-600 hover:text-gray-800">← Back</button>
      </div>

      {successMsg && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium">{successMsg}</div>}
      {errors.save && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{errors.save}</div>}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="Product Name *" error={errors.name}>
            <input
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              onBlur={handleNameBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </FormField>
          <FormField label="SKU">
            <input value={form.sku} onChange={e => updateField('sku', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea value={form.description} onChange={e => updateField('description', e.target.value.slice(0, 500))} rows={3} maxLength={500} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <p className="text-xs text-gray-500 mt-1">{form.description.length}/500</p>
        </FormField>
        <FormField label="Category *" error={errors.category}>
          <div className="flex gap-2">
            <select value={form.category} onChange={e => updateField('category', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Select</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <button onClick={() => setShowNewCat(!showNewCat)} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">+ New</button>
          </div>
          {showNewCat && (
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Category name" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={addNewCategory} className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm">Add</button>
              </div>
              <div className="flex items-center gap-2">
                {newCatImage && <img src={newCatImage} alt="" className="w-8 h-8 rounded object-cover" />}
                <label className="text-xs text-blue-600 cursor-pointer hover:underline">
                  <input type="file" accept="image/*" onChange={handleCatImageUpload} className="hidden" />
                  {uploadingCatImage ? 'Uploading...' : '📷 Category image'}
                </label>
              </div>
            </div>
          )}
        </FormField>
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Product Images</h2>
        <div className="flex flex-wrap gap-3">
          {imagePreview.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
            </div>
          ))}
          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {uploadingImage ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            ) : (
              <><span className="text-2xl text-gray-400">+</span><span className="text-xs text-gray-500">Upload</span></>
            )}
          </label>
        </div>
        <FormField label="Or paste image URLs (one per line)">
          <textarea value={form.imageUrls} onChange={e => updateField('imageUrls', e.target.value)} rows={2} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </FormField>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Pricing</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <FormField label="Base Price (৳) *" error={errors.basePrice}>
            <input type="number" value={form.basePrice} onChange={e => updateField('basePrice', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </FormField>
          <FormField label="Sale Price (৳)" error={errors.salePrice}>
            <input type="number" value={form.salePrice} onChange={e => updateField('salePrice', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </FormField>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Discount</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
              {form.salePrice && Number(form.salePrice) < Number(form.basePrice) ? `${Math.round(((Number(form.basePrice) - Number(form.salePrice)) / Number(form.basePrice)) * 100)}% OFF` : 'No discount'}
            </div>
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Variants</h2>
          <button onClick={addVariant} className="text-sm text-blue-500 hover:text-blue-600">+ Add Variant Type</button>
        </div>
        {variants.map((v, vi) => (
          <div key={v.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex gap-3 items-center">
              <input value={v.type} onChange={e => updateVariant(vi, 'type', e.target.value)} placeholder="e.g. Size, Color" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <button onClick={() => removeVariant(vi)} className="text-red-500 text-sm">Remove</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {v.options.map((o, oi) => (
                <span key={oi} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{o}<button onClick={() => removeOption(vi, oi)} className="text-blue-400 hover:text-blue-600">×</button></span>
              ))}
            </div>
            <div className="flex gap-2">
              <input placeholder="Add option" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" onKeyDown={e => { if (e.key === 'Enter') { addOption(vi, (e.target).value); (e.target).value = ''; } }} />
            </div>
          </div>
        ))}
      </div>

      {/* Inventory */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Inventory</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <FormField label="Current Stock"><input type="number" value={form.inventory} onChange={e => updateField('inventory', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></FormField>
          <FormField label="Low Stock Threshold"><input type="number" value={form.lowStockThreshold} onChange={e => updateField('lowStockThreshold', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></FormField>
          <FormField label="Purchase Price (৳)"><input type="number" value={form.purchasePrice} onChange={e => updateField('purchasePrice', e.target.value)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></FormField>
        </div>
        <FormField label="Location/Shelf"><input value={form.location} onChange={e => updateField('location', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></FormField>
      </div>

      {/* SEO */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">SEO & Visibility</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <FormField label="URL Slug"><input value={form.slug} onChange={e => updateField('slug', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></FormField>
          <FormField label="Status">
            <div className="flex gap-4 mt-1">{(['active', 'hidden', 'archived']).map(s => (
              <label key={s} className="flex items-center gap-2 text-sm"><input type="radio" name="status" checked={form.status === s} onChange={() => updateField('status', s)} /><span className="capitalize">{s}</span></label>
            ))}</div>
          </FormField>
        </div>
        <FormField label="Meta Description"><textarea value={form.metaDescription} onChange={e => updateField('metaDescription', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></FormField>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={() => router.push('/admin/products')} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
        <button onClick={() => save(true)} disabled={saving} className="px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50">Save & Add Another</button>
        <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">{saving ? 'Saving...' : 'Save Product'}</button>
      </div>
    </div>
  );
}
