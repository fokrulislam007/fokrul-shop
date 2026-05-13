'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Badge from '@/components/shared/Badge';

export default function PendingOrdersPage() {
  const { client } = useAuth();
  const [orders, setOrders] = useState([]);

  const load = async () => { if (client) { const all = await storage.getOrders(client.id); setOrders(all.filter(o => o.status === 'pending')); } };
  useEffect(() => { load(); }, [client]);
  useEffect(() => { const t = setInterval(() => { load(); }, 30000); return () => clearInterval(t); }, [client]);

  const process = async (id) => {
    if (!client) return;
    const order = orders.find(o => o.id === id);
    if (!order) return;
    await storage.updateOrder(client.id, id, { status: 'processing', statusHistory: [...(order.statusHistory || []), { status: 'processing', timestamp: new Date().toISOString() }] });
    await load();
  };

  const addNote = async (id, note) => {
    if (!client) return;
    await storage.updateOrder(client.id, id, { notes: note });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pending Orders</h1>
        <span className="text-sm text-gray-500">Auto-refreshes every 30s</span>
      </div>
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><span className="text-4xl">🎉</span><h3 className="text-lg font-semibold mt-4">No Pending Orders</h3><p className="text-gray-500 mt-1">All orders have been processed</p></div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><span className="font-bold">{o.orderNumber}</span><Badge label="Pending" className={getStatusColor('pending')} /></div>
                  <p className="text-sm text-gray-600 mt-1">{o.customerName} • {o.customerPhone}</p>
                  <p className="text-sm text-gray-400">{o.shippingAddress}, {o.city}</p>
                  <p className="text-sm text-gray-400 mt-1">{formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{formatCurrency(o.total)}</p>
                  <p className="text-xs text-gray-400 uppercase">{o.paymentMethod}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => process(o.id)} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600">Process ✓</button>
                    <a href={`tel:${o.customerPhone}`} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">📞 Call</a>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Items: {o.items.map(i => `${i.productName} ×${i.quantity}`).join(', ')}</div>
                <input defaultValue={o.notes || ''} onBlur={e => addNote(o.id, e.target.value)} placeholder="Add note..." className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
