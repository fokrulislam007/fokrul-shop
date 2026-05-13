'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';

export default function RevenueReportsPage() {
  const { client } = useAuth();
  const [orders, setOrders] = useState([]);
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('this_month');

  useEffect(() => { const _run = async () => {
    if (!client) return;
    setOrders(await storage.getOrders(client.id));
    setEntries(await storage.getAccountingEntries(client.id));
    setProducts(await storage.getProducts(client.id));
  }; _run(); }, [client]);

  // Period calculation
  const now = new Date();
  let startDate, endDate;
  switch (period) {
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'this_quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      endDate = now;
      break;
    case 'last_quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      break;
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
    default: // this_month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
  }

  const periodOrders = orders.filter(o => { const d = new Date(o.createdAt); return d >= startDate && d <= endDate; });
  const periodEntries = entries.filter(e => { const d = new Date(e.date); return d >= startDate && d <= endDate; });

  // Revenue
  const totalSalesRevenue = periodOrders.reduce((s, o) => s + o.total, 0);
  const otherIncome = periodEntries.filter(e => e.type === 'income' && e.category !== 'Sales').reduce((s, e) => s + e.amount, 0);
  const totalRevenue = totalSalesRevenue + otherIncome;

  // COGS
  const cogs = periodOrders.reduce((s, o) => {
    return s + o.items.reduce((itemSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      return itemSum + (prod?.purchasePrice || 0) * item.quantity;
    }, 0);
  }, 0);

  const grossProfit = totalRevenue - cogs;

  // Operating Expenses
  const expenses = periodEntries.filter(e => e.type === 'expense');
  const expenseByCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {});
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const refunds = periodEntries.filter(e => e.type === 'refund').reduce((s, e) => s + e.amount, 0);

  const netProfit = grossProfit - totalExpenses - refunds;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const expenseEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const totalExpenseForPct = totalExpenses || 1;
  const expColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-pink-500', 'bg-rose-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-violet-500'];

  // Daily revenue for last 30 days
  const dailyRevenue = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    const rev = orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0);
    return { label: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }), rev };
  });
  const maxDaily = Math.max(...dailyRevenue.map(d => d.rev), 1);

  // Monthly revenue for last 12 months
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const rev = orders.filter(o => { const od = new Date(o.createdAt); return od >= d && od <= end; }).reduce((s, o) => s + o.total, 0);
    return { label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), rev };
  });
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.rev), 1);

  const exportCSV = () => {
    const rows = ['Date,Type,Category,Amount,Description'];
    periodEntries.forEach(e => rows.push(`${e.date},${e.type},${e.category},${e.amount},"${e.description}"`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `revenue-report-${period}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Revenue Reports</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">📥 Export CSV</button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {[
          { v: 'this_month', l: 'This Month' }, { v: 'last_month', l: 'Last Month' },
          { v: 'this_quarter', l: 'This Quarter' }, { v: 'last_quarter', l: 'Last Quarter' },
          { v: 'this_year', l: 'This Year' },
        ].map(p => (
          <button key={p.v} onClick={() => setPeriod(p.v)} className={`px-4 py-2 rounded-lg text-sm font-medium ${period === p.v ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{p.l}</button>
        ))}
      </div>

      {/* P&L Statement */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
        <div className="space-y-3 text-sm">
          <div className="font-medium text-gray-500 uppercase text-xs">Revenue</div>
          <div className="flex justify-between pl-4"><span className="text-gray-600">Total Sales Revenue</span><span>{formatCurrency(totalSalesRevenue)}</span></div>
          <div className="flex justify-between pl-4"><span className="text-gray-600">Other Income</span><span>{formatCurrency(otherIncome)}</span></div>
          <div className="flex justify-between font-bold border-t pt-2"><span>Total Revenue</span><span className="text-green-700">{formatCurrency(totalRevenue)}</span></div>

          <div className="font-medium text-gray-500 uppercase text-xs pt-2">Cost of Goods Sold</div>
          <div className="flex justify-between pl-4"><span className="text-gray-600">Product Purchase Costs</span><span>{formatCurrency(cogs)}</span></div>
          <div className="flex justify-between font-bold border-t pt-2"><span>Gross Profit</span><span className={grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(grossProfit)}</span></div>

          <div className="font-medium text-gray-500 uppercase text-xs pt-2">Operating Expenses</div>
          {expenseEntries.map(([cat, amount]) => (
            <div key={cat} className="flex justify-between pl-4"><span className="text-gray-600">{cat}</span><span>{formatCurrency(amount)}</span></div>
          ))}
          {refunds > 0 && <div className="flex justify-between pl-4"><span className="text-gray-600">Refunds</span><span>{formatCurrency(refunds)}</span></div>}
          <div className="flex justify-between font-bold border-t pt-2"><span>Total Expenses</span><span className="text-red-700">{formatCurrency(totalExpenses + refunds)}</span></div>

          <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-3">
            <span>Net Profit</span>
            <span className={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(netProfit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Profit Margin</span>
            <span className={`font-medium ${Number(profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitMargin}%</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <div className="space-y-3">
            {expenseEntries.map(([cat, amount], i) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{cat}</span><span className="font-medium">{formatCurrency(amount)} ({Math.round((amount / totalExpenseForPct) * 100)}%)</span></div>
                <div className="h-3 bg-gray-100 rounded-full"><div className={`h-3 rounded-full ${expColors[i % expColors.length]}`} style={{ width: `${(amount / totalExpenseForPct) * 100}%` }} /></div>
              </div>
            ))}
            {expenseEntries.length === 0 && <p className="text-sm text-gray-400">No expenses</p>}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-xl p-4"><div className="text-xs text-green-600">Revenue</div><div className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</div></div>
            <div className="bg-red-50 rounded-xl p-4"><div className="text-xs text-red-600">Expenses</div><div className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses + refunds)}</div></div>
            <div className={`${netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'} rounded-xl p-4`}><div className={`text-xs ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Net Profit</div><div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(netProfit)}</div></div>
            <div className="bg-purple-50 rounded-xl p-4"><div className="text-xs text-purple-600">Margin</div><div className="text-2xl font-bold text-purple-700">{profitMargin}%</div></div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue (Last 30 Days)</h3>
        <div className="flex items-end gap-[2px] h-40">
          {dailyRevenue.map((d, i) => (
            <div key={i} className="flex-1 group relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{d.label}: {formatCurrency(d.rev)}</div>
              <div className="w-full bg-emerald-500 rounded-t opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${Math.max((d.rev / maxDaily) * 100, 2)}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>{dailyRevenue[0]?.label}</span><span>{dailyRevenue[dailyRevenue.length - 1]?.label}</span></div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue (Last 12 Months)</h3>
        <div className="flex items-end gap-2 h-40">
          {monthlyRevenue.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{formatCurrency(m.rev)}</div>
              <div className="w-full bg-violet-500 rounded-t opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${Math.max((m.rev / maxMonthly) * 100, 2)}%` }} />
              <div className="text-[10px] text-gray-400 truncate w-full text-center">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
