'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate, generateId, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/utils';
import Modal from '@/components/shared/Modal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Badge from '@/components/shared/Badge';

export default function AccountingPage() {
  const { client } = useAuth();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ type:'income',category:'Sales',amount:'',description:'',paymentMethod:'cash',date:new Date().toISOString().split('T')[0] });

  const load = async () => { if(client) setEntries(await storage.getAccountingEntries(client.id)); };
  useEffect(() => { load(); },[client]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(),now.getMonth(),1);
  const monthEntries = entries.filter(e => new Date(e.date) >= startOfMonth);
  const monthIncome = monthEntries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const monthExpense = monthEntries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const monthRefund = monthEntries.filter(e=>e.type==='refund').reduce((s,e)=>s+e.amount,0);
  const netProfit = monthIncome - monthExpense - monthRefund;

  const filtered = entries.filter(e => {
    if(search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    if(typeFilter!=='all' && e.type!==typeFilter) return false;
    if(catFilter!=='all' && e.category!==catFilter) return false;
    return true;
  });

  const categories = [...new Set(entries.map(e=>e.category))];
  const typeColors = { income:'bg-green-100 text-green-700', expense:'bg-red-100 text-red-700', refund:'bg-orange-100 text-orange-700' };
  const getCats = () => { if(form.type==='income') return INCOME_CATEGORIES; if(form.type==='refund') return ['Customer Refund']; return EXPENSE_CATEGORIES; };

  const save = async () => {
    if(!client||!form.amount||!form.description.trim()) return;
    const entry = { id:generateId(),clientId:client.id,type:form.type,category:form.category,amount:Number(form.amount),description:form.description.trim(),paymentMethod:form.paymentMethod,date:form.date,createdAt:new Date().toISOString() };
    await storage.addAccountingEntry(client.id,entry);
    setShowForm(false); setForm({type:'income',category:'Sales',amount:'',description:'',paymentMethod:'cash',date:new Date().toISOString().split('T')[0]}); load();
  };

  const handleDelete = async (id) => { if(client) { await storage.deleteAccountingEntry(client.id,id); load(); } };

  const exportCSV = () => {
    const rows = ['Date,Type,Category,Amount,Description,Method'];
    filtered.forEach(e => rows.push(`${e.date},${e.type},${e.category},${e.amount},"${e.description}",${e.paymentMethod}`));
    const blob = new Blob([rows.join('\n')],{type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='accounting.csv'; a.click();
  };

  // Tax Report
  const yearStart = new Date(now.getFullYear(),0,1);
  const yearEntries = entries.filter(e => new Date(e.date)>=yearStart);
  const yearIncome = yearEntries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const yearExpense = yearEntries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Accounting & Books</h1>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">📥 Export</button>
          <button onClick={()=>setShowForm(true)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">+ Add Transaction</button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4"><div className="text-xs text-green-600">Income (Month)</div><div className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(monthIncome)}</div></div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4"><div className="text-xs text-red-600">Expenses (Month)</div><div className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(monthExpense)}</div></div>
        <div className={`${netProfit>=0?'bg-blue-50 border-blue-200':'bg-red-50 border-red-200'} rounded-xl border p-4`}><div className={`text-xs ${netProfit>=0?'text-blue-600':'text-red-600'}`}>Net Profit</div><div className={`text-2xl font-bold mt-1 ${netProfit>=0?'text-blue-700':'text-red-700'}`}>{formatCurrency(netProfit)}</div></div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4"><div className="text-xs text-purple-600">Year Income</div><div className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(yearIncome)}</div></div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description..." className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option><option value="refund">Refund</option></select>
        <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">All Categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{filtered.map(e=>(
            <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-500">{formatDate(e.date)}</td>
              <td className="px-4 py-3"><Badge label={e.type} className={typeColors[e.type]} /></td>
              <td className="px-4 py-3 text-gray-500">{e.category}</td>
              <td className="px-4 py-3">{e.description}</td>
              <td className={`px-4 py-3 font-medium ${e.type==='income'?'text-green-600':'text-red-600'}`}>{e.type==='income'?'+':'-'}{formatCurrency(e.amount)}</td>
              <td className="px-4 py-3 text-gray-500 uppercase text-xs">{e.paymentMethod}</td>
              <td className="px-4 py-3"><button onClick={()=>setDeleteId(e.id)} className="text-xs text-red-600 hover:underline">Delete</button></td>
            </tr>
          ))}{filtered.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No transactions</td></tr>}</tbody></table>
      </div></div>

      {/* Tax Summary */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Tax Report Summary (This Year)</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div><div className="text-gray-500">Total Income</div><div className="text-lg font-bold text-green-700">{formatCurrency(yearIncome)}</div></div>
          <div><div className="text-gray-500">Total Expenses</div><div className="text-lg font-bold text-red-700">{formatCurrency(yearExpense)}</div></div>
          <div><div className="text-gray-500">Net</div><div className={`text-lg font-bold ${yearIncome-yearExpense>=0?'text-blue-700':'text-red-700'}`}>{formatCurrency(yearIncome-yearExpense)}</div></div>
        </div>
      </div>

      {/* Add Transaction */}
      <Modal isOpen={showForm} onClose={()=>setShowForm(false)} title="Add Transaction" size="md">
        <div className="space-y-4">
          <div><label className="text-sm text-gray-600">Type</label><div className="flex gap-3 mt-1">{(['income','expense','refund']).map(t=><label key={t} className="flex items-center gap-2 text-sm"><input type="radio" checked={form.type===t} onChange={()=>setForm({...form,type:t,category:t==='income'?'Sales':t==='refund'?'Customer Refund':'Advertising'})} /><span className="capitalize">{t}</span></label>)}</div></div>
          <div><label className="text-sm text-gray-600">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">{getCats().map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-600">Amount (৳)</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-sm text-gray-600">Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div><label className="text-sm text-gray-600">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="text-sm text-gray-600">Payment Method</label><select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank</option></select></div>
          <div className="flex justify-end gap-3"><button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button><button onClick={save} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg">Save</button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={()=>{if(deleteId)handleDelete(deleteId);}} title="Delete Transaction" message="Delete this entry?" />
    </div>
  );
}
