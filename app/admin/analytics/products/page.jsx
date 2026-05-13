'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProductPerformancePage() {
  const { client } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sortBy, setSortBy] = useState('revenue');

  useEffect(() => { const _run = async () => {
    if (!client) return;
    setProducts(await storage.getProducts(client.id));
    setOrders(await storage.getOrders(client.id));
  }; _run(); }, [client]);

  // Top selling products
  const productStats = products.map(p => {
    const orderItems = orders.flatMap(o => o.items).filter(i => i.productId === p.id);
    const unitsSold = orderItems.reduce((s, i) => s + i.quantity, 0);
    const revenue = orderItems.reduce((s, i) => s + i.total, 0);
    const convRate = p.views > 0 ? ((p.purchaseCount / p.views) * 100).toFixed(1) : '0.0';
    const lastSaleOrder = orders.filter(o => o.items.some(i => i.productId === p.id)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const daysSinceLastSale = lastSaleOrder ? Math.floor((Date.now() - new Date(lastSaleOrder.createdAt).getTime()) / 86400000) : 999;
    return { ...p, unitsSold, revenue, convRate, daysSinceLastSale };
  });

  const topProducts = [...productStats].sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : b.unitsSold - a.unitsSold).slice(0, 10);
  const maxTopRev = Math.max(...topProducts.map(p => p.revenue), 1);
  const maxTopUnits = Math.max(...topProducts.map(p => p.unitsSold), 1);

  // Slow moving
  const slowMoving = [...productStats].filter(p => p.daysSinceLastSale > 7 && p.status === 'active').sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);

  // All products metrics
  const allMetrics = [...productStats].sort((a, b) => b.revenue - a.revenue);

  // Stock turnover
  const totalCOGS = orders.reduce((s, o) => {
    return s + o.items.reduce((is, item) => {
      const prod = products.find(p => p.id === item.productId);
      return is + (prod?.purchasePrice || 0) * item.quantity;
    }, 0);
  }, 0);
  const avgInventoryValue = products.reduce((s, p) => s + (p.purchasePrice || 0) * p.inventory, 0) || 1;
  const turnoverRatio = avgInventoryValue > 0 ? (totalCOGS / avgInventoryValue).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Product Performance</h1>

      {/* Top Selling Products */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Top Selling Products</h3>
          <div className="flex gap-1">
            <button onClick={() => setSortBy('revenue')} className={`px-3 py-1 text-xs rounded-full ${sortBy === 'revenue' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>By Revenue</button>
            <button onClick={() => setSortBy('units')} className={`px-3 py-1 text-xs rounded-full ${sortBy === 'units' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>By Units</button>
          </div>
        </div>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">🛍️</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{p.name}</div>
                <div className="h-2 bg-gray-100 rounded-full mt-1">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${((sortBy === 'revenue' ? p.revenue : p.unitsSold) / (sortBy === 'revenue' ? maxTopRev : maxTopUnits)) * 100}%` }} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{sortBy === 'revenue' ? formatCurrency(p.revenue) : `${p.unitsSold} units`}</div>
                <div className="text-xs text-gray-400">{sortBy === 'revenue' ? `${p.unitsSold} units` : formatCurrency(p.revenue)}</div>
              </div>
            </div>
          ))}
          {topProducts.length === 0 && <p className="text-sm text-gray-400">No sales data</p>}
        </div>
      </div>

      {/* Product Metrics Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold">Product Metrics</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 border-b">
              <th className="px-4 py-3">Product</th><th className="px-4 py-3">Views</th><th className="px-4 py-3">Add to Cart</th><th className="px-4 py-3">Purchases</th><th className="px-4 py-3">Conv. Rate</th><th className="px-4 py-3">Revenue</th>
            </tr></thead>
            <tbody>
              {allMetrics.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.views}</td>
                  <td className="px-4 py-3 text-gray-500">{p.addToCartCount}</td>
                  <td className="px-4 py-3 text-gray-500">{p.purchaseCount}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${Number(p.convRate) > 5 ? 'bg-green-100 text-green-700' : Number(p.convRate) > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{p.convRate}%</span></td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Slow Moving Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">⚠️ Slow Moving Products</h3>
          {slowMoving.length > 0 ? (
            <div className="space-y-3">
              {slowMoving.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-400">Last sale: {p.daysSinceLastSale < 999 ? `${p.daysSinceLastSale} days ago` : 'Never'} • Stock: {p.inventory}</div>
                  </div>
                  <div className="flex gap-1">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Discount</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Promote</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">All products are selling well!</p>}
        </div>

        {/* Stock Turnover */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Stock Turnover Analysis</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center"><div className="text-3xl font-bold text-blue-700">{turnoverRatio}</div><div className="text-xs text-blue-600 mt-1">Turnover Ratio</div></div>
            <div className="p-4 bg-purple-50 rounded-xl text-center"><div className="text-3xl font-bold text-purple-700">{formatCurrency(avgInventoryValue)}</div><div className="text-xs text-purple-600 mt-1">Inventory Value</div></div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase">High Turnover</h4>
            {[...productStats].filter(p => p.unitsSold > 0).sort((a, b) => (b.unitsSold / Math.max(b.inventory, 1)) - (a.unitsSold / Math.max(a.inventory, 1))).slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{p.name}</span>
                <span className="text-green-600 font-medium">{(p.unitsSold / Math.max(p.inventory, 1)).toFixed(1)}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
