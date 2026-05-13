'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { generateId, formatCurrency, formatDate, getStatusColor, COURIER_SERVICES } from '@/lib/utils';
import Badge from '@/components/shared/Badge';

export default function TrackingPage() {
  const { client } = useAuth();
  const [orders, setOrders] = useState([]);
  const [trackings, setTrackings] = useState([]);
  const [form, setForm] = useState({ orderId: '', courier: 'pathao', trackingNumber: '', deliveryBoyName: '', deliveryBoyPhone: '', estimatedDate: '', deliveryCharge: '60' });

  const load = async () => {
    if (!client) return;
    setOrders(await storage.getOrders(client.id));
    setTrackings(await storage.getDeliveryTrackings(client.id));
  };
  useEffect(() => { load(); }, [client]);

  const processingOrders = orders.filter(o => o.status === 'processing');

  const assign = async () => {
    if (!client || !form.orderId) return;
    const order = orders.find(o => o.id === form.orderId);
    if (!order) return;
    const tracking = {
      id: generateId(), clientId: client.id, orderId: form.orderId, orderNumber: order.orderNumber, customerName: order.customerName,
      courierService: form.courier, trackingNumber: form.trackingNumber || `TRK-${Date.now()}`,
      deliveryBoyName: form.deliveryBoyName, deliveryBoyPhone: form.deliveryBoyPhone,
      status: 'pending', statusHistory: [{ status: 'pending', timestamp: new Date().toISOString(), note: 'Courier assigned' }],
      estimatedDeliveryDate: form.estimatedDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      codAmount: order.paymentMethod === 'cod' ? order.total : 0, codCollected: false, codRemittedToClient: false,
      deliveryCharge: Number(form.deliveryCharge) || 60, courierPaid: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await storage.addDeliveryTracking(client.id, tracking);
    await storage.updateOrder(client.id, form.orderId, { status: 'shipped', statusHistory: [...(order.statusHistory || []), { status: 'shipped', timestamp: new Date().toISOString() }] });
    setForm({ orderId: '', courier: 'pathao', trackingNumber: '', deliveryBoyName: '', deliveryBoyPhone: '', estimatedDate: '', deliveryCharge: '60' });
    await load();
  };

  const updateTrackingStatus = async (id, status) => {
    if (!client) return;
    const t = trackings.find(x => x.id === id);
    if (!t) return;
    const history = [...t.statusHistory, { status, timestamp: new Date().toISOString() }];
    await storage.updateDeliveryTracking(client.id, id, { status, statusHistory: history, ...(status === 'delivered' ? { actualDeliveryDate: new Date().toISOString() } : {}) });
    if (status === 'delivered') await storage.updateOrder(client.id, t.orderId, { status: 'delivered', statusHistory: [...((orders.find(o => o.id === t.orderId)?.statusHistory) || []), { status: 'delivered', timestamp: new Date().toISOString() }] });
    await load();
  };

  const toggleCOD = async (id, field) => {
    if (!client) return;
    const t = trackings.find(x => x.id === id);
    if (!t) return;
    const update = { [field]: !t[field] };
    if (field === 'codCollected') update.codCollectedDate = !t.codCollected ? new Date().toISOString() : undefined;
    if (field === 'codRemittedToClient') update.codRemittanceDate = !t.codRemittedToClient ? new Date().toISOString() : undefined;
    await storage.updateDeliveryTracking(client.id, id, update);
    await load();
  };

  const codPending = trackings.filter(t => t.codAmount > 0 && !t.codCollected);
  const codCollected = trackings.filter(t => t.codAmount > 0 && t.codCollected && !t.codRemittedToClient);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>

      {/* Assign Courier */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Assign Courier</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="block text-sm text-gray-600 mb-1">Order</label><select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select order</option>{processingOrders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} - {o.customerName}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">Courier</label><select value={form.courier} onChange={e => setForm({ ...form, courier: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">{COURIER_SERVICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">Tracking #</label><input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Auto-generated" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">Delivery Boy</label><input value={form.deliveryBoyName} onChange={e => setForm({ ...form, deliveryBoyName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">Phone</label><input value={form.deliveryBoyPhone} onChange={e => setForm({ ...form, deliveryBoyPhone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">Est. Delivery</label><input type="date" value={form.estimatedDate} onChange={e => setForm({ ...form, estimatedDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        </div>
        <button onClick={assign} disabled={!form.orderId} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-300">Assign Courier</button>
      </div>

      {/* Tracking Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Track Deliveries</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Courier</th><th className="px-4 py-3">Tracking</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">COD</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {trackings.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{t.orderNumber}</td>
                  <td className="px-4 py-3">{t.customerName}</td>
                  <td className="px-4 py-3 capitalize">{t.courierService}</td>
                  <td className="px-4 py-3 text-gray-500">{t.trackingNumber}</td>
                  <td className="px-4 py-3"><select value={t.status} onChange={e => updateTrackingStatus(t.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full ${getStatusColor(t.status)}`}>{['pending','picked_up','in_transit','out_for_delivery','delivered','returned'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select></td>
                  <td className="px-4 py-3">{t.codAmount > 0 ? (<div><span className="text-xs">{formatCurrency(t.codAmount)}</span><div className="flex gap-2 mt-1"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.codCollected} onChange={() => toggleCOD(t.id, 'codCollected')} />Coll</label><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.codRemittedToClient} disabled={!t.codCollected} onChange={() => toggleCOD(t.id, 'codRemittedToClient')} />Rem</label></div></div>) : '-'}</td>
                  <td className="px-4 py-3"><span className="text-xs text-gray-400">{formatDate(t.estimatedDeliveryDate)}</span></td>
                </tr>
              ))}
              {trackings.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No deliveries tracked yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* COD Reconciliation */}
      {(codPending.length > 0 || codCollected.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">COD Reconciliation</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg"><div className="text-sm text-yellow-600">Pending Collection</div><div className="text-xl font-bold">{formatCurrency(codPending.reduce((s, t) => s + t.codAmount, 0))}</div></div>
            <div className="p-3 bg-blue-50 rounded-lg"><div className="text-sm text-blue-600">Collected</div><div className="text-xl font-bold">{formatCurrency(codCollected.reduce((s, t) => s + t.codAmount, 0))}</div></div>
            <div className="p-3 bg-green-50 rounded-lg"><div className="text-sm text-green-600">Remitted</div><div className="text-xl font-bold">{formatCurrency(trackings.filter(t => t.codRemittedToClient).reduce((s, t) => s + t.codAmount, 0))}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
