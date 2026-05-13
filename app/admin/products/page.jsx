'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, getStatusColor, getStockColor, getStockLabel } from '@/lib/utils';
import Badge from '@/components/shared/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Link from 'next/link';

export default function ProductsPage() {
  const { client } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => { if (client) setProducts(await storage.getProducts(client.id)); };
  useEffect(() => { load(); }, [client]);

  const categories = [...new Set(products.map(p => p.category))];

  let filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (stockFilter === 'in_stock' && p.inventory <= 0) return false;
    if (stockFilter === 'low_stock' && (p.inventory <= 0 || p.inventory > 20)) return false;
    if (stockFilter === 'out_of_stock' && p.inventory > 0) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
    if (sortBy === 'price') return (a.basePrice - b.basePrice) * dir;
    if (sortBy === 'stock') return (a.inventory - b.inventory) * dir;
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
  });

  const handleDelete = async (id) => { if (client) { await storage.deleteProduct(client.id, id); await load(); } };
  const handleDuplicate = async (p) => {
    if (!client) return;
    const dup = { ...p, id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9), name: p.name + ' (Copy)', sku: p.sku + '-COPY', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await storage.addProduct(client.id, dup);
    await load();
  };
  const handleBulkAction = async (action) => {
    if (!client || selected.size === 0) return;
    const prods = await storage.getProducts(client.id);
    selected.forEach(id => {
      const idx = prods.findIndex(p => p.id === id);
      if (idx !== -1) {
        if (action === 'delete') { prods.splice(idx, 1); }
        else { prods[idx].status = action; }
      }
    });
    await storage.saveProducts(client.id, prods);
    setSelected(new Set());
    await load();
  };
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
        <Link href="/admin/products/new" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">+ Add Product</Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All Status</option><option value="active">Active</option><option value="hidden">Hidden</option><option value="archived">Archived</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All Stock</option><option value="in_stock">In Stock</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option>
          </select>
          <select value={`${sortBy}-${sortDir}`} onChange={e => { const [s, d] = e.target.value.split('-'); setSortBy(s); setSortDir(d); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="createdAt-desc">Newest First</option><option value="createdAt-asc">Oldest First</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="price-asc">Price Low-High</option><option value="price-desc">Price High-Low</option><option value="stock-asc">Stock Low-High</option><option value="stock-desc">Stock High-Low</option>
          </select>
        </div>
        {selected.size > 0 && (
          <div className="mt-3 flex items-center gap-3 pt-3 border-t">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <button onClick={() => handleBulkAction('active')} className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200">Activate</button>
            <button onClick={() => handleBulkAction('hidden')} className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200">Hide</button>
            <button onClick={() => handleBulkAction('delete')} className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200">Delete</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b">
              <th className="px-4 py-3"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
              <th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => { const n = new Set(selected); n.has(p.id) ? n.delete(p.id) : n.add(p.id); setSelected(n); }} /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">🛍️</div><span className="font-medium text-gray-900">{p.name}</span></div></td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category}</td>
                  <td className="px-4 py-3">{p.salePrice ? (<><span className="line-through text-gray-400 mr-1">{formatCurrency(p.basePrice)}</span><span className="text-green-600 font-medium">{formatCurrency(p.salePrice)}</span></>) : formatCurrency(p.basePrice)}</td>
                  <td className="px-4 py-3"><Badge label={`${p.inventory} - ${getStockLabel(p.inventory)}`} className={getStockColor(p.inventory)} /></td>
                  <td className="px-4 py-3"><Badge label={p.status} className={getStatusColor(p.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/products/${p.id}/edit`} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Edit</Link>
                      <button onClick={() => handleDuplicate(p)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Dup</button>
                      <button onClick={() => setDeleteId(p.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No products found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) handleDelete(deleteId); }} title="Delete Product" message="Are you sure you want to delete this product? This action cannot be undone." confirmLabel="Delete" />
    </div>
  );
}
