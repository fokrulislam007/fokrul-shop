'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import Modal from '@/components/shared/Modal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

export default function CategoriesPage() {
  const { client } = useAuth();
  const [categories, setCategories] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => { if (client) { const cats = await storage.getCategories(client.id); setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder)); } };
  useEffect(() => { load(); }, [client]);

  const productCounts = async () => {
    if (!client) return {};
    const prods = await storage.getProducts(client.id);
    return prods.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {});
  };
  const [counts, setCounts] = useState({});
  useEffect(() => { productCounts().then(setCounts); }, [client, categories]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setImage(data.url);
    } catch (err) { console.error('Upload failed:', err); }
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!client || !name.trim()) return;
    await storage.addCategory(client.id, { id: generateId(), clientId: client.id, name: name.trim(), image: image || '', displayOrder: categories.length + 1, createdAt: new Date().toISOString() });
    setName(''); setImage(''); setShowAdd(false); await load();
  };

  const handleEdit = async () => {
    if (!client || !editId || !name.trim()) return;
    const oldCat = categories.find(c => c.id === editId);
    await storage.updateCategory(client.id, editId, { name: name.trim(), image: image || '' });
    // Update products with old category name
    if (oldCat && oldCat.name !== name.trim()) {
      const prods = await storage.getProducts(client.id);
      prods.forEach(p => { if (p.category === oldCat.name) p.category = name.trim(); });
      await storage.saveProducts(client.id, prods);
    }
    setName(''); setImage(''); setEditId(null); await load();
  };

  const handleDelete = async (id) => {
    if (!client) return;
    await storage.deleteCategory(client.id, id);
    await load();
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setName(c.name);
    setImage(c.image || '');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button onClick={() => { setName(''); setImage(''); setShowAdd(true); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">+ Add Category</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">#</th><th className="px-4 py-3">Image</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">—</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{counts[c.name] || 0}</td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(c)} className="text-blue-600 text-xs mr-3 hover:underline">Edit</button>
                  <button onClick={() => setDeleteId(c.id)} className="text-red-600 text-xs hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No categories yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Category" size="sm">
        <div className="space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
            <div className="flex items-center gap-3">
              {image ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={image} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImage('')} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
                </div>
              ) : null}
              <label className="px-3 py-2 bg-gray-100 rounded-lg text-sm cursor-pointer hover:bg-gray-200 transition-colors">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {uploading ? 'Uploading...' : '📷 Upload Image'}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600">Add</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editId} onClose={() => setEditId(null)} title="Edit Category" size="sm">
        <div className="space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleEdit(); }} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Image</label>
            <div className="flex items-center gap-3">
              {image ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={image} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImage('')} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
                </div>
              ) : null}
              <label className="px-3 py-2 bg-gray-100 rounded-lg text-sm cursor-pointer hover:bg-gray-200 transition-colors">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {uploading ? 'Uploading...' : '📷 Upload Image'}
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleEdit} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600">Save</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) handleDelete(deleteId); }} title="Delete Category" message={`Are you sure? ${counts[categories.find(c => c.id === deleteId)?.name || ''] || 0} products use this category.`} confirmLabel="Delete" />
    </div>
  );
}
