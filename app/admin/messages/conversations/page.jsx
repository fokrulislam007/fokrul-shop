'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatDate } from '@/lib/utils';

export default function ConversationsPage() {
  const { client } = useAuth();
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedConv, setSelectedConv] = useState(null);

  useEffect(() => { const _run = async () => { if (client) setMessages(await storage.getMessages(client.id)); }; _run(); }, [client]);

  // Group by customer
  const customers = new Map();
  messages.forEach(m => {
    const key = m.customerId || m.conversationId;
    const existing = customers.get(key);
    if (existing) { existing.messages.push(m); if (new Date(m.createdAt) > new Date(existing.lastDate)) existing.lastDate = m.createdAt; }
    else customers.set(key, { name: m.customerName, messages: [m], lastDate: m.createdAt });
  });

  const customerList = Array.from(customers.entries()).filter(([, v]) => !search || v.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => new Date(b[1].lastDate).getTime() - new Date(a[1].lastDate).getTime());
  const selected = selectedConv ? customers.get(selectedConv) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customer Conversations</h1>
      <div className="grid lg:grid-cols-5 gap-6 min-h-[500px]">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..." className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div className="divide-y overflow-y-auto max-h-[500px]">
            {customerList.map(([key, data]) => (
              <button key={key} onClick={() => setSelectedConv(key)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedConv === key ? 'bg-blue-50' : ''}`}>
                <div className="flex justify-between"><span className="font-medium text-sm">{data.name}</span><span className="text-xs text-gray-400">{formatDate(data.lastDate)}</span></div>
                <div className="text-xs text-gray-500 mt-1">{data.messages.length} messages</div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 flex flex-col">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold">{selected.name}</h3>
                <div className="text-xs text-gray-400 mt-1">{selected.messages.length} messages • First: {formatDate(selected.messages[selected.messages.length - 1].createdAt)} • Sent: {selected.messages.filter(m => m.direction === 'incoming').length} / Received: {selected.messages.filter(m => m.direction === 'outgoing').length}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
                {[...selected.messages].reverse().map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${m.direction === 'outgoing' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${m.direction === 'outgoing' ? 'text-blue-100' : 'text-gray-400'}`}>{formatDate(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="flex-1 flex items-center justify-center text-gray-400">Select a customer</div>}
        </div>
      </div>
    </div>
  );
}
