'use client';
import { useState, useEffect, useRef } from 'react';
import { storage } from '@/lib/storage';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [autoResponses, setAutoResponses] = useState([]);
  const storeName = 'Demo Store';
  const messagesEnd = useRef(null);

  useEffect(() => {
    const _run = async () => {
      const cid = await storage.getCartClientId();
      if (!cid) return;
      const allResponses = await storage.getAutoResponses(cid);
      setAutoResponses(allResponses.filter(r => r.isActive));
    }; _run();
  }, []);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getResponse = (text) => {
    const lower = text.toLowerCase();
    for (const ar of autoResponses) {
      if (lower.includes(ar.trigger.toLowerCase())) {
        return ar.response.replace('{business_name}', storeName).replace('{customer_name}', 'there');
      }
    }
    // Default responses
    if (lower.includes('hello') || lower.includes('hi')) return `Hello! Welcome to ${storeName}. How can I help you today? 😊`;
    if (lower.includes('price') || lower.includes('cost')) return 'Please check our product pages for the latest prices. We also have great discounts!';
    if (lower.includes('order') || lower.includes('track')) return 'You can track your order by contacting us on WhatsApp with your order number.';
    if (lower.includes('thank')) return 'You\'re welcome! Is there anything else I can help with? 😊';
    return `Thanks for your message! For detailed inquiries, please reach out via WhatsApp. We typically respond within an hour during business hours.`;
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: getResponse(userMsg) }]);
    }, 800);
  };

  const quickReplies = ['What\'s the delivery time?', 'Do you offer COD?', 'What\'s your return policy?'];

  return (
    <>
      {/* Chat Button */}
      {/* <button onClick={() => { setOpen(!open); if (messages.length === 0) setMessages([{ from: 'bot', text: `Hi! 👋 Welcome to ${storeName}. How can I help you today?` }]); }}
        className="fixed bottom-4 right-4 z-[100] w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center">
        {open ? <span className="text-xl">✕</span> : <span className="text-2xl">💬</span>}
      </button> */}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-[100] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[500px] animate-slide-in-bottom">
          <div className="px-4 py-3 bg-blue-600 text-white rounded-t-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">💬</div>
            <div><div className="font-semibold text-sm">{storeName}</div><div className="text-xs text-blue-200 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> Online</div></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${m.from === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.text}</div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {/* Quick Replies */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1">
              {quickReplies.map(q => (
                <button key={q} onClick={() => { setInput(q); setTimeout(() => { setMessages(prev => [...prev, { from: 'user', text: q }]); setTimeout(() => setMessages(prev => [...prev, { from: 'bot', text: getResponse(q) }]), 800); }, 100); setInput(''); }}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors">{q}</button>
              ))}
            </div>
          )}

          <div className="px-4 py-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Type a message..." className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <button onClick={send} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Send</button>
          </div>
        </div>
      )}
    </>
  );
}
