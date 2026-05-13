'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';

export default function OrdersPage() {
  const { client } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [viewOrder, setViewOrder] = useState(null);

  const load = async () => { if (client) setOrders(await storage.getOrders(client.id)); };
  useEffect(() => { load(); }, [client]);

  const filtered = orders.filter(o => {
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase()) && !o.customerName.toLowerCase().includes(search.toLowerCase()) && !o.customerPhone.includes(search)) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
    if (methodFilter !== 'all' && o.paymentMethod !== methodFilter) return false;
    return true;
  });

  const updateStatus = async (id, status) => {
    if (!client) return;
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const history = [...(order.statusHistory || []), { status, timestamp: new Date().toISOString() }];
    await storage.updateOrder(client.id, id, { status, statusHistory: history });
    await load();
  };

  const markPaid = async (id) => {
    if (!client) return;
    await storage.updateOrder(client.id, id, { paymentStatus: 'paid' });
    await load();
  };

  const exportCSV = () => {
    const headers = 'Order,Customer,Phone,Date,Items,Total,Payment,Status\n';
    const rows = filtered.map(o => `${o.orderNumber},${o.customerName},${o.customerPhone},${formatDate(o.createdAt)},${o.items.length},${o.total},${o.paymentMethod},${o.status}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">📥 Export CSV</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order, customer, phone..." className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="returned">Returned</option></select>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="all">All Payment</option><option value="pending">Unpaid</option><option value="paid">Paid</option><option value="failed">Failed</option></select>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="all">All Methods</option><option value="cod">COD</option><option value="bkash">bKash</option><option value="nagad">Nagad</option></select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3"><div>{o.customerName}</div><div className="text-xs text-gray-400">{o.customerPhone}</div></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">{o.items.length}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(o.total)}</td>
                  <td className="px-4 py-3"><Badge label={o.paymentStatus} className={getStatusColor(o.paymentStatus)} /><div className="text-xs text-gray-400 mt-1 uppercase">{o.paymentMethod}</div></td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${getStatusColor(o.status)}`}>
                      {['pending','processing','shipped','delivered','returned'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setViewOrder(o)} className="text-xs text-blue-600 hover:underline">View</button>
                      {o.paymentStatus === 'pending' && <button onClick={() => markPaid(o.id)} className="text-xs text-green-600 hover:underline ml-2">Pay</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder?.orderNumber || ''}`} size="lg">
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><h4 className="text-sm font-medium text-gray-500 mb-1">Customer</h4><p className="font-medium">{viewOrder.customerName}</p><p className="text-sm text-gray-500">{viewOrder.customerPhone}</p><p className="text-sm text-gray-500">{viewOrder.shippingAddress}, {viewOrder.city}</p></div>
              <div><h4 className="text-sm font-medium text-gray-500 mb-1">Order Info</h4><div className="flex gap-2"><Badge label={viewOrder.status} className={getStatusColor(viewOrder.status)} /><Badge label={viewOrder.paymentStatus} className={getStatusColor(viewOrder.paymentStatus)} /></div><p className="text-sm text-gray-500 mt-1">Method: {viewOrder.paymentMethod.toUpperCase()}</p><p className="text-sm text-gray-500">Date: {formatDate(viewOrder.createdAt)}</p></div>
            </div>
            <div><h4 className="text-sm font-medium text-gray-500 mb-2">Items</h4>
              <table className="w-full text-sm"><thead><tr className="border-b text-gray-500"><th className="text-left py-1">Product</th><th className="text-left py-1">Variant</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Total</th></tr></thead>
                <tbody>{viewOrder.items.map((item, i) => (<tr key={i} className="border-b border-gray-50"><td className="py-2">{item.productName}</td><td className="py-2 text-gray-400">{item.variant ? Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(', ') : '-'}</td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">{formatCurrency(item.price)}</td><td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="border-t pt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(viewOrder.subtotal)}</span></div>{viewOrder.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-green-600">-{formatCurrency(viewOrder.discount)}</span></div>}<div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{viewOrder.shippingCost === 0 ? 'FREE' : formatCurrency(viewOrder.shippingCost)}</span></div><div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>{formatCurrency(viewOrder.total)}</span></div></div>
            {viewOrder.statusHistory && viewOrder.statusHistory.length > 0 && (
              <div><h4 className="text-sm font-medium text-gray-500 mb-2">Status History</h4>
                <div className="space-y-2">{viewOrder.statusHistory.map((h, i) => (<div key={i} className="flex items-center gap-3 text-sm"><Badge label={h.status} className={getStatusColor(h.status)} /><span className="text-gray-400">{formatDate(h.timestamp)}</span></div>))}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
