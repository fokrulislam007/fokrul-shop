'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import Modal from '@/components/shared/Modal';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

export default function AutoResponsesPage() {
  const { client } = useAuth();
  const [responses, setResponses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');
  const [active, setActive] = useState(true);

  const load = async () => { if (client) setResponses(await storage.getAutoResponses(client.id)); };
  useEffect(() => { load(); }, [client]);

  const save = async () => {
    if (!client || !trigger.trim() || !response.trim()) return;
    if (editId) {
      const all = await storage.getAutoResponses(client.id);
      const idx = all.findIndex(r => r.id === editId);
      if (idx !== -1) { all[idx] = { ...all[idx], trigger: trigger.trim(), response: response.trim(), isActive: active }; await storage.saveAutoResponses(client.id, all); }
    } else {
      await storage.addAutoResponse(client.id, { id: generateId(), clientId: client.id, trigger: trigger.trim(), response: response.trim(), isActive: active, timesUsed: 0, createdAt: new Date().toISOString() });
    }
    closeForm(); load();
  };

  const closeForm = async () => { setShowForm(false); setEditId(null); setTrigger(''); setResponse(''); setActive(true); };
  const openEdit = (r) => { setEditId(r.id); setTrigger(r.trigger); setResponse(r.response); setActive(r.isActive); setShowForm(true); };

  const toggleActive = async (id) => {
    if (!client) return;
    const all = await storage.getAutoResponses(client.id);
    const r = all.find(x => x.id === id);
    if (r) { r.isActive = !r.isActive; await storage.saveAutoResponses(client.id, all); load(); }
  };

  const handleDelete = async (id) => {
    if (!client) return;
    const allResp = await storage.getAutoResponses(client.id);
    const all = allResp.filter(r => r.id !== id);
    await storage.saveAutoResponses(client.id, all);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auto-Responses</h1>
        <button onClick={() => { closeForm(); setShowForm(true); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">+ Add Response</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-gray-500 border-b"><th className="px-4 py-3">Trigger</th><th className="px-4 py-3">Response</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>
            {responses.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">&quot;{r.trigger}&quot;</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.response}</td>
                <td className="px-4 py-3"><button onClick={() => toggleActive(r.id)} className={`px-2 py-1 rounded-full text-xs font-medium ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</button></td>
                <td className="px-4 py-3">{r.timesUsed}×</td>
                <td className="px-4 py-3"><button onClick={() => openEdit(r)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button><button onClick={() => setDeleteId(r.id)} className="text-xs text-red-600 hover:underline">Delete</button></td>
              </tr>
            ))}
            {responses.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No auto-responses yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showForm} onClose={closeForm} title={editId ? 'Edit Auto-Response' : 'Add Auto-Response'} size="md">
        <div className="space-y-4">
          <div><label className="text-sm font-medium text-gray-700">Trigger Keyword</label><input value={trigger} onChange={e => setTrigger(e.target.value)} placeholder='e.g. "price", "COD", "delivery"' className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700">Response</label><textarea value={response} onChange={e => setResponse(e.target.value)} rows={4} placeholder="Response message... Use {customer_name}, {product_name}, {business_name}" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
          {response && <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 mb-1">Preview:</p><p className="text-sm">{response.replace('{customer_name}', 'Rahim').replace('{product_name}', 'Classic T-Shirt').replace('{business_name}', 'Demo Store')}</p></div>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /><span className="text-sm">Active</span></label>
          <div className="flex justify-end gap-3"><button onClick={closeForm} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button><button onClick={save} className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600">Save</button></div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) handleDelete(deleteId); }} title="Delete Auto-Response" message="Are you sure?" />
    </div>
  );
}
