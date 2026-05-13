'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import Modal from '@/components/shared/Modal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

export default function SuppliersPage() {
  const { client } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [form, setForm] = useState({ name:'',contactPerson:'',phone:'',email:'',address:'',paymentTerms:'',notes:'' });
  const [payForm, setPayForm] = useState({ amount:'',method:'cash',note:'' });

  const load = async () => { if(client) setSuppliers(await storage.getSuppliers(client.id)); };
  useEffect(() => { load(); },[client]);

  const filtered = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search));

  const openEdit = async (s) => { setEditId(s.id); setForm({name:s.name,contactPerson:s.contactPerson||'',phone:s.phone,email:s.email||'',address:s.address||'',paymentTerms:s.paymentTerms||'',notes:s.notes}); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm({name:'',contactPerson:'',phone:'',email:'',address:'',paymentTerms:'',notes:''}); };

  const save = async () => {
    if(!client||!form.name.trim()||!form.phone.trim()) return;
    if(editId) { await storage.updateSupplier(client.id,editId,{name:form.name.trim(),contactPerson:form.contactPerson,phone:form.phone,email:form.email,address:form.address,paymentTerms:form.paymentTerms,notes:form.notes}); }
    else { await storage.addSupplier(client.id,{id:generateId(),clientId:client.id,name:form.name.trim(),contactPerson:form.contactPerson,phone:form.phone,email:form.email,address:form.address,paymentTerms:form.paymentTerms,totalPurchases:0,totalPaid:0,outstandingDebt:0,suppliedProducts:[],payments:[],purchaseHistory:[],notes:form.notes,createdAt:new Date().toISOString()}); }
    closeForm(); load();
  };

  const recordPayment = async () => {
    if(!client||!payModal||!payForm.amount) return;
    const s = suppliers.find(x=>x.id===payModal);
    if(!s) return;
    const amt = Number(payForm.amount);
    const payment = {id:generateId(),amount:amt,date:new Date().toISOString(),method:payForm.method,note:payForm.note||undefined};
    await storage.updateSupplier(client.id,payModal,{totalPaid:s.totalPaid+amt,outstandingDebt:Math.max(0,s.outstandingDebt-amt),payments:[...s.payments,payment]});
    setPayModal(null); setPayForm({amount:'',method:'cash',note:''}); load();
  };

  const handleDelete = async (id) => { if(client) { await storage.deleteSupplier(client.id,id); load(); } };
  const viewSupplier = suppliers.find(s=>s.id===viewId);

  const debtColor = (d) => d===0?'text-green-600':d<10000?'text-yellow-600':'text-red-600';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <button onClick={()=>{closeForm();setShowForm(true);}} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">+ Add Supplier</button>
      </div>
      <div className="bg-white rounded-xl border p-4"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
      <div className="bg-white rounded-xl border overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Purchases</th><th className="px-4 py-3">Debt</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{filtered.map(s=>(
            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{s.name}</td>
              <td className="px-4 py-3 text-gray-500">{s.contactPerson||'—'}</td>
              <td className="px-4 py-3 text-gray-500">{s.phone}</td>
              <td className="px-4 py-3">{formatCurrency(s.totalPurchases)}</td>
              <td className={`px-4 py-3 font-medium ${debtColor(s.outstandingDebt)}`}>{formatCurrency(s.outstandingDebt)}</td>
              <td className="px-4 py-3"><button onClick={()=>setViewId(s.id)} className="text-xs text-blue-600 hover:underline mr-2">View</button><button onClick={()=>openEdit(s)} className="text-xs text-gray-600 hover:underline mr-2">Edit</button><button onClick={()=>setPayModal(s.id)} className="text-xs text-green-600 hover:underline mr-2">Pay</button><button onClick={()=>setDeleteId(s.id)} className="text-xs text-red-600 hover:underline">Del</button></td>
            </tr>
          ))}{filtered.length===0&&<tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No suppliers</td></tr>}</tbody></table>
      </div></div>

      {/* Add/Edit Form */}
      <Modal isOpen={showForm} onClose={closeForm} title={editId?'Edit Supplier':'Add Supplier'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm text-gray-600">Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-sm text-gray-600">Contact Person</label><input value={form.contactPerson} onChange={e=>setForm({...form,contactPerson:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-sm text-gray-600">Phone *</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-sm text-gray-600">Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          </div>
          <div><label className="text-sm text-gray-600">Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="text-sm text-gray-600">Payment Terms</label><input value={form.paymentTerms} onChange={e=>setForm({...form,paymentTerms:e.target.value})} placeholder="e.g. Net 30" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="text-sm text-gray-600">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="flex justify-end gap-3"><button onClick={closeForm} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button><button onClick={save} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg">Save</button></div>
        </div>
      </Modal>

      {/* Supplier Details */}
      <Modal isOpen={!!viewSupplier} onClose={()=>setViewId(null)} title={viewSupplier?.name||''} size="lg">
        {viewSupplier&&<div className="space-y-4">
          <div className="grid grid-cols-3 gap-4"><div className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500">Total Purchases</div><div className="font-bold">{formatCurrency(viewSupplier.totalPurchases)}</div></div><div className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500">Total Paid</div><div className="font-bold">{formatCurrency(viewSupplier.totalPaid)}</div></div><div className="p-3 bg-gray-50 rounded-lg"><div className="text-xs text-gray-500">Outstanding</div><div className={`font-bold ${debtColor(viewSupplier.outstandingDebt)}`}>{formatCurrency(viewSupplier.outstandingDebt)}</div></div></div>
          <div><div className="text-sm text-gray-500">Phone: {viewSupplier.phone}</div>{viewSupplier.email&&<div className="text-sm text-gray-500">Email: {viewSupplier.email}</div>}{viewSupplier.address&&<div className="text-sm text-gray-500">Address: {viewSupplier.address}</div>}</div>
          {viewSupplier.payments.length>0&&<div><h4 className="text-sm font-medium mb-2">Payment History</h4><table className="w-full text-sm"><thead><tr className="border-b text-gray-500"><th className="text-left py-1">Date</th><th className="text-right py-1">Amount</th><th className="text-left py-1">Method</th><th className="text-left py-1">Note</th></tr></thead><tbody>{viewSupplier.payments.map(p=><tr key={p.id} className="border-b border-gray-50"><td className="py-2 text-gray-400">{formatDate(p.date)}</td><td className="py-2 text-right font-medium text-green-600">{formatCurrency(p.amount)}</td><td className="py-2 capitalize">{p.method.replace('_',' ')}</td><td className="py-2 text-gray-400">{p.note||'—'}</td></tr>)}</tbody></table></div>}
        </div>}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={!!payModal} onClose={()=>setPayModal(null)} title="Record Payment" size="sm">
        <div className="space-y-4">
          {payModal&&<div className="p-3 bg-gray-50 rounded-lg"><div className="text-sm font-medium">{suppliers.find(s=>s.id===payModal)?.name}</div><div className="text-xs text-gray-400">Debt: {formatCurrency(suppliers.find(s=>s.id===payModal)?.outstandingDebt||0)}</div></div>}
          <div><label className="text-sm text-gray-600">Amount</label><input type="number" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="text-sm text-gray-600">Method</label><select value={payForm.method} onChange={e=>setPayForm({...payForm,method:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="cash">Cash</option><option value="bank_transfer">Bank</option><option value="bkash">bKash</option><option value="nagad">Nagad</option></select></div>
          <div><label className="text-sm text-gray-600">Note</label><input value={payForm.note} onChange={e=>setPayForm({...payForm,note:e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="flex justify-end gap-3"><button onClick={()=>setPayModal(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button><button onClick={recordPayment} className="px-4 py-2 text-sm text-white bg-green-500 rounded-lg">Record</button></div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={()=>{if(deleteId)handleDelete(deleteId);}} title="Delete Supplier" message="Are you sure?" />
    </div>
  );
}
