'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';

export default function SalesAnalyticsPage() {
  const { client } = useAuth();
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('30');

  useEffect(() => { const _run = async () => {
    if (!client) return;
    setOrders(await storage.getOrders(client.id));
    setLeads(await storage.getLeads(client.id));
    setProducts(await storage.getProducts(client.id));
  }; _run(); }, [client]);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayRev = orders.filter(o => new Date(o.createdAt) >= today).reduce((s, o) => s + o.total, 0);
  const weekRev = orders.filter(o => new Date(o.createdAt) >= startOfWeek).reduce((s, o) => s + o.total, 0);
  const monthRev = orders.filter(o => new Date(o.createdAt) >= startOfMonth).reduce((s, o) => s + o.total, 0);
  const allTimeRev = orders.reduce((s, o) => s + o.total, 0);

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevMonthRev = orders.filter(o => { const d = new Date(o.createdAt); return d >= prevMonth && d <= prevMonthEnd; }).reduce((s, o) => s + o.total, 0);
  const monthChange = prevMonthRev > 0 ? Math.round(((monthRev - prevMonthRev) / prevMonthRev) * 100) : monthRev > 0 ? 100 : 0;

  // Revenue chart data
  const days = Number(period);
  const chartData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = new Date(Date.now() - (Math.min(days, 30) - 1 - i) * 86400000);
    const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString());
    return { date: d, label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), rev: dayOrders.reduce((s, o) => s + o.total, 0) };
  });
  const maxChartRev = Math.max(...chartData.map(d => d.rev), 1);

  // Revenue by category
  const catRevenue = orders.flatMap(o => o.items).reduce((acc, item) => {
    const cat = item.productName.split(' ')[0] || 'Other';
    acc[cat] = (acc[cat] || 0) + item.total;
    return acc;
  }, {});
  // Group by product category from actual products
  const productCatRevenue = {};
  if (client) {
    orders.forEach(o => {
      o.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod?.category || 'Other';
        productCatRevenue[cat] = (productCatRevenue[cat] || 0) + item.total;
      });
    });
  }
  const catEntries = Object.entries(productCatRevenue).sort((a, b) => b[1] - a[1]);
  const totalCatRev = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const catColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];

  // Revenue by payment method
  const methodRevenue = orders.reduce((acc, o) => { acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total; return acc; }, {});
  const methodEntries = Object.entries(methodRevenue).sort((a, b) => b[1] - a[1]);
  const maxMethodRev = Math.max(...methodEntries.map(([, v]) => v), 1);
  const methodLabels = { cod: 'Cash on Delivery', bkash: 'bKash', nagad: 'Nagad', bank: 'Bank Transfer' };

  // Order analytics
  const totalOrders = orders.length;
  const aov = totalOrders > 0 ? Math.round(allTimeRev / totalOrders) : 0;
  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  const statusColors = { pending: 'bg-gray-400', processing: 'bg-blue-500', shipped: 'bg-purple-500', delivered: 'bg-green-500', returned: 'bg-red-500' };

  // Conversion metrics
  const totalVisitors = leads.length + orders.map(o => o.customerId).filter((v, i, a) => a.indexOf(v) === i).length;
  const conversionRate = totalVisitors > 0 ? ((totalOrders / totalVisitors) * 100).toFixed(1) : '0.0';
  const cartAbandonment = leads.length > 0 ? Math.round((leads.filter(l => l.cartAbandoned).length / leads.length) * 100) : 0;

  // Revenue by city
  const cityRevenue = orders.reduce((acc, o) => { acc[o.city] = (acc[o.city] || 0) + o.total; return acc; }, {});
  const cityEntries = Object.entries(cityRevenue).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCityRev = Math.max(...cityEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Today', value: todayRev, icon: '📅' },
          { label: 'This Week', value: weekRev, icon: '📊' },
          { label: 'This Month', value: monthRev, icon: '📈', change: monthChange },
          { label: 'All Time', value: allTimeRev, icon: '💰' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{c.icon}</span><span className="text-xs text-gray-500">{c.label}</span></div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(c.value)}</div>
            {c.change !== undefined && <div className={`text-xs mt-1 font-medium ${c.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.change >= 0 ? '↑' : '↓'} {Math.abs(c.change)}% vs last month</div>}
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
          <div className="flex gap-1">
            {[{ v: '7', l: '7 Days' }, { v: '30', l: '30 Days' }, { v: '90', l: '3 Months' }, { v: '365', l: 'Year' }].map(p => (
              <button key={p.v} onClick={() => setPeriod(p.v)} className={`px-3 py-1 text-xs rounded-full ${period === p.v ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.l}</button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-1 h-48">
          {chartData.map((d, i) => {
            const h = Math.max((d.rev / maxChartRev) * 100, 2);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{formatCurrency(d.rev)}</div>
                <div className="w-full bg-blue-100 rounded-t" style={{ height: `${h}%` }}>
                  <div className="w-full h-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity" />
                </div>
                {chartData.length <= 14 && <div className="text-[10px] text-gray-400 truncate w-full text-center">{d.label}</div>}
              </div>
            );
          })}
        </div>
        {chartData.length > 14 && <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>{chartData[0]?.label}</span><span>{chartData[chartData.length - 1]?.label}</span></div>}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          <div className="space-y-3">
            {catEntries.map(([cat, rev], i) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{cat}</span><span className="font-medium">{formatCurrency(rev)} ({Math.round((rev / totalCatRev) * 100)}%)</span></div>
                <div className="h-3 bg-gray-100 rounded-full"><div className={`h-3 rounded-full ${catColors[i % catColors.length]}`} style={{ width: `${(rev / totalCatRev) * 100}%` }} /></div>
              </div>
            ))}
            {catEntries.length === 0 && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by Payment Method</h3>
          <div className="space-y-3">
            {methodEntries.map(([method, rev]) => (
              <div key={method}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{methodLabels[method] || method}</span><span className="font-medium">{formatCurrency(rev)}</span></div>
                <div className="h-3 bg-gray-100 rounded-full"><div className="h-3 bg-indigo-500 rounded-full" style={{ width: `${(rev / maxMethodRev) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Analytics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Order Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total Orders</span><span className="font-bold text-lg">{totalOrders}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Avg Order Value</span><span className="font-bold text-lg">{formatCurrency(aov)}</span></div>
            <hr />
            {['pending', 'processing', 'shipped', 'delivered', 'returned'].map(s => {
              const c = statusCounts[s] || 0;
              const pct = totalOrders > 0 ? (c / totalOrders) * 100 : 0;
              return (
                <div key={s}>
                  <div className="flex justify-between text-sm mb-1"><span className="capitalize text-gray-600">{s}</span><span>{c}</span></div>
                  <div className="h-2 bg-gray-100 rounded-full"><div className={`h-2 rounded-full ${statusColors[s]}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Conversion Metrics</h3>
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-xl"><div className="text-3xl font-bold text-green-700">{conversionRate}%</div><div className="text-xs text-green-600 mt-1">Conversion Rate</div></div>
            <div className="text-center p-4 bg-red-50 rounded-xl"><div className="text-3xl font-bold text-red-700">{cartAbandonment}%</div><div className="text-xs text-red-600 mt-1">Cart Abandonment</div></div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{totalVisitors}</div><div className="text-xs text-gray-500">Visitors</div></div>
              <div className="p-3 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{totalOrders}</div><div className="text-xs text-gray-500">Orders</div></div>
            </div>
          </div>
        </div>

        {/* Revenue by City */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue by City</h3>
          <div className="space-y-3">
            {cityEntries.map(([city, rev]) => (
              <div key={city}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{city}</span><span className="font-medium">{formatCurrency(rev)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-teal-500 rounded-full" style={{ width: `${(rev / maxCityRev) * 100}%` }} /></div>
              </div>
            ))}
            {cityEntries.length === 0 && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
