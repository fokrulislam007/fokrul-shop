'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, generateId, getStockColor, getStockLabel } from '@/lib/utils';
import Modal from '@/components/shared/Modal';

export default function InventoryPage() {
  const { client } = useAuth();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [adjustModal, setAdjustModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [adjType, setAdjType] = useState('purchase');
  const [adjQty, setAdjQty] = useState('');
  const [adjNote, setAdjNote] = useState('');

  const load = async () => { if (!client) return; setProducts(await storage.getProducts(client.id)); setInventory(await storage.getInventory(client.id)); };
  useEffect(() => { load(); }, [client]);

  const totalValue = products.reduce((s, p) => s + (p.purchasePrice || 0) * p.inventory, 0);
  const lowStockCount = products.filter(p => p.inventory > 0 && p.inventory <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter(p => p.inventory === 0).length;

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'low' && p.inventory > p.lowStockThreshold) return false;
    if (filter === 'out' && p.inventory > 0) return false;
    return true;
  });

  const getInvItem = (pid) => inventory.find(i => i.productId === pid);

  const handleAdjust = async () => {
    if (!client || !adjustModal || !adjQty) return;
    const isNeg = ['sale','damage','theft'].includes(adjType);
    const change = isNeg ? -Math.abs(Number(adjQty)) : Math.abs(Number(adjQty));
    const newStock = Math.max(0, adjustModal.inventory + change);
    await storage.updateProduct(client.id, adjustModal.id, { inventory: newStock });
    let inv = getInvItem(adjustModal.id);
    if (!inv) {
      inv = { id: generateId(), clientId: client.id, productId: adjustModal.id, productName: adjustModal.name, currentStock: newStock, reorderPoint: adjustModal.lowStockThreshold, reorderQuantity: 50, purchasePrice: adjustModal.purchasePrice || 0, location: adjustModal.location, stockHistory: [], lowStockAlert: newStock <= adjustModal.lowStockThreshold, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await storage.addInventoryItem(client.id, inv);
    }
    const entry = { id: generateId(), type: adjType, quantity: change, runningBalance: newStock, date: new Date().toISOString(), note: adjNote || undefined };
    await storage.updateInventoryItem(client.id, inv.id, { currentStock: newStock, stockHistory: [...inv.stockHistory, entry], lowStockAlert: newStock <= adjustModal.lowStockThreshold });
    setAdjustModal(null); setAdjQty(''); setAdjNote(''); setAdjType('purchase'); load();
  };

  const reorderProducts = products.filter(p => p.inventory > 0 && p.inventory <= p.lowStockThreshold);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500">Total Products</div><div className="text-2xl font-bold mt-1">{products.length}</div></div>
        <div className="bg-white rounded-xl border p-4"><div className="text-xs text-gray-500">Stock Value</div><div className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</div></div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4"><div className="text-xs text-yellow-600">Low Stock</div><div className="text-2xl font-bold text-yellow-700 mt-1">{lowStockCount}</div></div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4"><div className="text-xs text-red-600">Out of Stock</div><div className="text-2xl font-bold text-red-700 mt-1">{outOfStockCount}</div></div>
      </div>
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">All</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">Product</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Reorder</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{filtered.map(p => (
            <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${p.inventory === 0 ? 'bg-red-50/50' : p.inventory <= p.lowStockThreshold ? 'bg-yellow-50/50' : ''}`}>
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockColor(p.inventory)}`}>{p.inventory} — {getStockLabel(p.inventory)}</span></td>
              <td className="px-4 py-3 text-gray-500">{p.lowStockThreshold}</td>
              <td className="px-4 py-3 text-gray-500">{p.purchasePrice ? formatCurrency(p.purchasePrice) : '—'}</td>
              <td className="px-4 py-3 font-medium">{formatCurrency((p.purchasePrice||0)*p.inventory)}</td>
              <td className="px-4 py-3 text-gray-500">{p.location||'—'}</td>
              <td className="px-4 py-3"><button onClick={()=>setAdjustModal(p)} className="text-xs text-blue-600 hover:underline mr-2">Adjust</button><button onClick={()=>setHistoryModal(p)} className="text-xs text-gray-500 hover:underline">History</button></td>
            </tr>
          ))}{filtered.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No products</td></tr>}</tbody></table>
      </div></div>
      {reorderProducts.length > 0 && <div className="bg-white rounded-xl border p-6"><h3 className="font-semibold mb-4">⚠️ Reorder Alerts</h3><div className="space-y-2">{reorderProducts.map(p=><div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50"><div><span className="font-medium text-sm">{p.name}</span><span className="text-xs text-gray-400 ml-2">Stock: {p.inventory}</span></div><button onClick={()=>setAdjustModal(p)} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg">Restock</button></div>)}</div></div>}
      <Modal isOpen={!!adjustModal} onClose={()=>setAdjustModal(null)} title="Stock Adjustment" size="sm">
        {adjustModal&&<div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg"><div className="text-sm font-medium">{adjustModal.name}</div><div className="text-xs text-gray-400">Current: {adjustModal.inventory}</div></div>
          <div><label className="text-sm text-gray-600">Type</label><select value={adjType} onChange={e=>setAdjType(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="purchase">Purchase</option><option value="sale">Sale</option><option value="damage">Damage</option><option value="theft">Theft</option><option value="return">Return</option><option value="manual_correction">Manual</option></select></div>
          <div><label className="text-sm text-gray-600">Quantity</label><input type="number" value={adjQty} onChange={e=>setAdjQty(e.target.value)} min="1" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          {adjQty&&<div className="text-sm">New stock: <b>{Math.max(0,adjustModal.inventory+(['sale','damage','theft'].includes(adjType)?-Number(adjQty):Number(adjQty)))}</b></div>}
          <div><label className="text-sm text-gray-600">Note</label><textarea value={adjNote} onChange={e=>setAdjNote(e.target.value)} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="flex justify-end gap-3"><button onClick={()=>setAdjustModal(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button><button onClick={handleAdjust} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg">Save</button></div>
        </div>}
      </Modal>
      <Modal isOpen={!!historyModal} onClose={()=>setHistoryModal(null)} title={`History — ${historyModal?.name||''}`} size="lg">
        {historyModal&&(()=>{const inv=getInvItem(historyModal.id);const h=inv?.stockHistory||[];return h.length>0?<table className="w-full text-sm"><thead><tr className="border-b text-gray-500"><th className="text-left py-2">Date</th><th className="text-left py-2">Type</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Balance</th><th className="text-left py-2">Note</th></tr></thead><tbody>{h.slice().reverse().map(e=><tr key={e.id} className="border-b border-gray-50"><td className="py-2 text-gray-400">{new Date(e.date).toLocaleDateString()}</td><td className="py-2 capitalize">{e.type.replace('_',' ')}</td><td className={`py-2 text-right font-medium ${e.quantity>=0?'text-green-600':'text-red-600'}`}>{e.quantity>0?'+':''}{e.quantity}</td><td className="py-2 text-right">{e.runningBalance}</td><td className="py-2 text-gray-400">{e.note||'—'}</td></tr>)}</tbody></table>:<p className="text-center text-gray-400 py-8">No history</p>;})()}
      </Modal>
    </div>
  );
}
