'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Badge from '@/components/shared/Badge';

export default function DashboardPage() {
  const { client } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState({ revenue: 0, orderCount: 0, productCount: 0, customerCount: 0, hotLeads: 0, unreadMessages: 0, todayRevenue: 0, yesterdayRevenue: 0, avgOrderValue: 0, cartAbandonment: 0 });

  useEffect(() => {
    if (!client) return;
    const load = async () => {
      const cid = client.id;
      const prods = await storage.getProducts(cid);
      const ords = await storage.getOrders(cid);
      const custs = await storage.getCustomers(cid);
      const leads = await storage.getLeads(cid);
      const msgs = await storage.getMessages(cid);
      setProducts(prods);
      setOrders(ords);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 86400000);

      const monthOrders = ords.filter(o => new Date(o.createdAt) >= new Date(now.getFullYear(), now.getMonth(), 1));
      const revenue = monthOrders.reduce((s, o) => s + o.total, 0);
      const todayOrders = ords.filter(o => new Date(o.createdAt) >= today);
      const yesterdayOrders = ords.filter(o => { const d = new Date(o.createdAt); return d >= yesterday && d < today; });
      const todayRev = todayOrders.reduce((s, o) => s + o.total, 0);
      const yesterdayRev = yesterdayOrders.reduce((s, o) => s + o.total, 0);
      const hotLeads = leads.filter(l => l.leadStatus === 'hot').length;
      const unread = msgs.filter(m => m.status === 'unread').length;
      const aov = ords.length > 0 ? Math.round(revenue / monthOrders.length) : 0;
      const abandoned = leads.filter(l => l.cartAbandoned).length;
      const cartRate = leads.length > 0 ? Math.round((abandoned / leads.length) * 100) : 0;

      setMetrics({ revenue, orderCount: ords.length, productCount: prods.filter(p => p.status === 'active').length, customerCount: custs.length, hotLeads, unreadMessages: unread, todayRevenue: todayRev, yesterdayRevenue: yesterdayRev, avgOrderValue: aov, cartAbandonment: cartRate });
    };
    load().catch(console.error);
  }, [client]);

  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  const lowStock = products.filter(p => p.inventory < p.lowStockThreshold && p.inventory > 0);
  const outOfStock = products.filter(p => p.inventory === 0);
  const recentOrders = orders.slice(0, 10);
  const revChange = metrics.yesterdayRevenue > 0 ? Math.round(((metrics.todayRevenue - metrics.yesterdayRevenue) / metrics.yesterdayRevenue) * 100) : metrics.todayRevenue > 0 ? 100 : 0;

  // Top products by revenue
  const productRevenue = orders.flatMap(o => o.items).reduce((acc, item) => { acc[item.productName] = (acc[item.productName] || 0) + item.total; return acc; }, {});
  const topProducts = Object.entries(productRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxRevenue = topProducts.length > 0 ? topProducts[0][1] : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-sm text-gray-600">Real-time metrics from your store data</p>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Revenue (Month)', value: formatCurrency(metrics.revenue), icon: '💰', color: 'bg-green-50 text-green-700' },
          { label: 'Total Orders', value: metrics.orderCount, icon: '📦', color: 'bg-blue-50 text-blue-700', sub: `${statusCounts.pending || 0} pending` },
          { label: 'Products', value: metrics.productCount, icon: '🛍️', color: 'bg-purple-50 text-purple-700' },
          { label: 'Customers', value: metrics.customerCount, icon: '👥', color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Hot Leads', value: metrics.hotLeads, icon: '🔥', color: 'bg-red-50 text-red-700' },
          // { label: 'Unread Msgs', value: metrics.unreadMessages, icon: '💬', color: 'bg-yellow-50 text-yellow-700' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2"><span className={`text-xs px-2 py-1 rounded-full ${m.color}`}>{m.icon}</span></div>
            <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            <div className="text-xs text-gray-600 mt-1">{m.label}</div>
            {m.sub && <div className="text-xs text-orange-500 mt-1">{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-600">Today vs Yesterday</div>
          <div className="text-xl font-bold">{formatCurrency(metrics.todayRevenue)}</div>
          <div className={`text-sm font-medium ${revChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>{revChange >= 0 ? '↑' : '↓'} {Math.abs(revChange)}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-600">Conversion Rate</div>
          <div className="text-xl font-bold">{metrics.hotLeads > 0 ? Math.round((metrics.orderCount / (metrics.hotLeads + metrics.customerCount)) * 100) : 0}%</div>
          <div className="text-sm text-gray-600">Based on leads → orders</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-600">Avg Order Value</div>
          <div className="text-xl font-bold">{formatCurrency(metrics.avgOrderValue)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-600">Cart Abandonment</div>
          <div className="text-xl font-bold">{metrics.cartAbandonment}%</div>
          <div className="text-sm text-gray-600">From lead tracking</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart (CSS-based bar chart) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-40">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(Date.now() - (6 - i) * 86400000);
              const dayOrders = orders.filter(o => { const d = new Date(o.createdAt); return d.toDateString() === date.toDateString(); });
              const rev = dayOrders.reduce((s, o) => s + o.total, 0);
              const maxRev = Math.max(...Array.from({ length: 7 }, (_, j) => orders.filter(o => new Date(o.createdAt).toDateString() === new Date(Date.now() - (6 - j) * 86400000).toDateString()).reduce((s, o) => s + o.total, 0)), 1);
              const h = Math.max((rev / maxRev) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-500">{formatCurrency(rev)}</div>
                  <div className="w-full bg-blue-100 rounded-t-md relative" style={{ height: `${h}%` }}>
                    <div className="absolute inset-0 bg-blue-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs text-gray-400">{date.toLocaleDateString('en', { weekday: 'short' })}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {['pending', 'processing', 'shipped', 'delivered', 'returned'].map(status => {
              const count = statusCounts[status] || 0;
              const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
              const colors = { pending: 'bg-gray-400', processing: 'bg-blue-500', shipped: 'bg-purple-500', delivered: 'bg-green-500', returned: 'bg-red-500' };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1"><span className="capitalize text-gray-600">{status}</span><span className="font-medium">{count}</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top 5 Products</h3>
          <div className="space-y-3">
            {topProducts.map(([name, rev], i) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 truncate">{i + 1}. {name}</span><span className="font-medium">{formatCurrency(rev)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${(rev / maxRevenue) * 100}%` }} /></div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-gray-400">No sales data yet</p>}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Order</th><th className="pb-2">Customer</th><th className="pb-2">Total</th><th className="pb-2">Status</th><th className="pb-2">Date</th></tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium">{o.orderNumber}</td>
                    <td className="py-2 text-gray-600">{o.customerName}</td>
                    <td className="py-2">{formatCurrency(o.total)}</td>
                    <td className="py-2"><Badge label={o.status} className={getStatusColor(o.status)} /></td>
                    <td className="py-2 text-gray-400">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock & Out of Stock */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">⚠️ Stock Alerts</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {outOfStock.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">Out of Stock ({outOfStock.length})</h4>
                {outOfStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm">{p.name}</span>
                    <Badge label="Out of Stock" className="bg-red-100 text-red-700" />
                  </div>
                ))}
              </div>
            )}
            {lowStock.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-600 mb-2">Low Stock ({lowStock.length})</h4>
                {lowStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-xs text-yellow-600 font-medium">{p.inventory} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
