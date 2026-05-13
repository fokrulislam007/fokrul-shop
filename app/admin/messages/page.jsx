'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatDate, getStatusColor, generateId } from '@/lib/utils';
import Badge from '@/components/shared/Badge';

export default function MessagesPage() {
  const { client } = useAuth();
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConv, setSelectedConv] = useState(null);
  const [reply, setReply] = useState('');

  const load = async () => { if (client) setMessages(await storage.getMessages(client.id)); };
  useEffect(() => { load(); }, [client]);

  const channelColors = { website: 'bg-blue-100 text-blue-700', facebook: 'bg-indigo-100 text-indigo-700', whatsapp: 'bg-green-100 text-green-700', email: 'bg-gray-100 text-gray-700' };

  const filtered = messages.filter(m => {
    if (search && !m.customerName.toLowerCase().includes(search.toLowerCase()) && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    if (channelFilter !== 'all' && m.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  // Group by conversation
  const conversations = new Map();
  filtered.forEach(m => {
    const msgs = conversations.get(m.conversationId) || [];
    msgs.push(m);
    conversations.set(m.conversationId, msgs);
  });

  const selectedMessages = selectedConv ? conversations.get(selectedConv) || [] : [];
  const selectedCustomer = selectedMessages[0]?.customerName;

  const toggleRead = async (id) => {
    if (!client) return;
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    const all = await storage.getMessages(client.id);
    const m = all.find(x => x.id === id);
    if (m) { m.status = m.status === 'unread' ? 'read' : 'unread'; m.readAt = m.status === 'read' ? new Date().toISOString() : undefined; await storage.saveMessages(client.id, all); load(); }
  };

  const sendReply = async () => {
    if (!client || !selectedConv || !reply.trim()) return;
    const firstMsg = selectedMessages[0];
    const msg = { id: generateId(), clientId: client.id, customerId: firstMsg?.customerId, customerName: firstMsg?.customerName || 'Unknown', channel: firstMsg?.channel || 'website', direction: 'outgoing', content: reply.trim(), status: 'replied', tags: [], conversationId: selectedConv, createdAt: new Date().toISOString() };
    await storage.addMessage(client.id, msg);
    // Mark incoming messages as replied
    const all = await storage.getMessages(client.id);
    all.forEach(m => { if (m.conversationId === selectedConv && m.direction === 'incoming' && m.status !== 'archived') { m.status = 'replied'; m.repliedAt = new Date().toISOString(); } });
    await storage.saveMessages(client.id, all);
    setReply(''); load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Message Inbox</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">All Channels</option><option value="website">Website</option><option value="facebook">Facebook</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="all">All Status</option><option value="unread">Unread</option><option value="read">Read</option><option value="replied">Replied</option></select>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 min-h-[500px]">
        {/* Message List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y overflow-y-auto max-h-[600px]">
            {Array.from(conversations.entries()).map(([convId, msgs]) => {
              const latest = msgs[0];
              const unread = msgs.some(m => m.status === 'unread');
              return (
                <button key={convId} onClick={() => { setSelectedConv(convId); msgs.filter(m => m.status === 'unread').forEach(m => toggleRead(m.id)); }} className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedConv === convId ? 'bg-blue-50' : ''} ${unread ? 'bg-yellow-50' : ''}`}>
                  <div className="flex justify-between"><span className={`text-sm ${unread ? 'font-bold' : 'font-medium'}`}>{latest.customerName}</span><span className="text-xs text-gray-400">{formatDate(latest.createdAt)}</span></div>
                  <div className="flex items-center gap-2 mt-1"><Badge label={latest.channel} className={channelColors[latest.channel]} /><Badge label={latest.status} className={getStatusColor(latest.status)} /></div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{latest.content}</p>
                </button>
              );
            })}
            {conversations.size === 0 && <div className="p-8 text-center text-gray-400">No messages</div>}
          </div>
        </div>

        {/* Thread View */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 flex flex-col">
          {selectedConv ? (
            <>
              <div className="px-4 py-3 border-b"><h3 className="font-semibold">{selectedCustomer}</h3></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[450px]">
                {[...selectedMessages].reverse().map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${m.direction === 'outgoing' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${m.direction === 'outgoing' ? 'text-blue-100' : 'text-gray-400'}`}>{formatDate(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply..." className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" onKeyDown={e => { if (e.key === 'Enter') sendReply(); }} />
                  <button onClick={sendReply} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">Send</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">Select a conversation</div>
          )}
        </div>
      </div>
    </div>
  );
}
