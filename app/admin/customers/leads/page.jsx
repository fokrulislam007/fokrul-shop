'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate, getStatusColor, generateId } from '@/lib/utils';
import Badge from '@/components/shared/Badge';

export default function LeadsPage() {
  const { client } = useAuth();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [converting, setConverting] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (client) setLeads(await storage.getLeads(client.id));
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    if (search && !(l.name || '').toLowerCase().includes(search.toLowerCase()) && !(l.phone || '').includes(search) && !(l.email || '').includes(search)) return false;
    if (statusFilter !== 'all' && l.leadStatus !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: leads.length,
    hot: leads.filter(l => l.leadStatus === 'hot').length,
    warm: leads.filter(l => l.leadStatus === 'warm').length,
    cold: leads.filter(l => l.leadStatus === 'cold').length,
    converted: leads.filter(l => l.leadStatus === 'converted').length,
  };
  const convRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;
  const abandonedCarts = leads.filter(l => l.cartAbandoned && l.leadStatus !== 'converted');
  const abandonedValue = abandonedCarts.reduce((s, l) => s + l.abandonedCartValue, 0);

  const updateStatus = async (id, status) => {
    if (client) {
      await storage.updateLead(client.id, id, { leadStatus: status });
      load();
    }
  };

  const convertToCustomer = async (lead) => {
    if (!client) return;
    setConverting(lead.id);
    setError('');
    try {
      // Check if customer already exists with same phone/email
      const customers = await storage.getCustomers(client.id);
      const existing = customers.find(c =>
        (lead.phone && c.phone === lead.phone) ||
        (lead.email && c.email === lead.email)
      );

      if (existing) {
        // Merge lead data into existing customer
        await storage.updateCustomer(client.id, existing.id, {
          tags: [...new Set([...existing.tags, 'From Lead'])],
          notes: (existing.notes || '') + `\nMerged from lead on ${new Date().toLocaleDateString()}. Visits: ${lead.totalVisits}, Pages: ${lead.pagesViewed.length}`,
        });
      } else {
        // Create new customer from lead
        const newCustomer = {
          id: generateId(),
          clientId: client.id,
          name: lead.name || 'Unknown',
          phone: lead.phone || '',
          email: lead.email,
          addresses: lead.location ? [{
            id: generateId(),
            address: lead.location,
            city: 'Dhaka',
            isDefault: true,
          }] : [],
          totalOrders: 0,
          totalSpent: 0,
          loyaltyPoints: 0,
          loyaltyHistory: [],
          tags: ['From Lead'],
          notes: `Converted from lead. Visits: ${lead.totalVisits}, Time: ${Math.round(lead.timeOnSite / 60)}min, Products viewed: ${lead.productsViewed.length}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await storage.addCustomer(client.id, newCustomer);
      }

      // Mark lead as converted
      await storage.updateLead(client.id, lead.id, {
        leadStatus: 'converted',
        updatedAt: new Date().toISOString(),
      });

      await load();
    } catch (err) {
      console.error('Convert error:', err);
      setError('Failed to convert lead. Please try again.');
    }
    setConverting(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Lead Tracker</h1>

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <p className="text-lg font-semibold">
          You have <span className="text-2xl font-bold">{stats.hot}</span> hot leads and{' '}
          <span className="text-2xl font-bold">{abandonedCarts.length}</span> abandoned carts worth{' '}
          <span className="text-2xl font-bold">{formatCurrency(abandonedValue)}</span>
        </p>
        <p className="text-blue-200 text-sm mt-1">
          {stats.total} total leads • {convRate}% conversion rate • {stats.warm} warm leads
        </p>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50 border-gray-200' },
          { label: 'Hot 🔥', value: stats.hot, color: 'bg-red-50 border-red-200' },
          { label: 'Warm', value: stats.warm, color: 'bg-orange-50 border-orange-200' },
          { label: 'Cold', value: stats.cold, color: 'bg-blue-50 border-blue-200' },
          { label: 'Conversion', value: `${convRate}%`, color: 'bg-green-50 border-green-200' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl border p-4`}>
            <div className="text-xs text-gray-600 font-medium">{s.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email..." className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="all">All Status</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="converted">Converted</option>
        </select>
        <button onClick={load} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">🔄 Refresh</button>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filtered.map(l => (
          <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}>
              <div>
                <div className="font-medium text-gray-900">{l.name || l.phone || l.email || 'Anonymous Visitor'}</div>
                <div className="text-xs text-gray-600">
                  {l.phone && `${l.phone} • `}Last: {formatDate(l.lastVisit)} • {l.totalVisits} visit{l.totalVisits !== 1 ? 's' : ''} • {Math.round(l.timeOnSite / 60)}min on site
                </div>
              </div>
              <div className="flex items-center gap-3">
                {l.cartAbandoned && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                    🛒 {formatCurrency(l.abandonedCartValue)}
                  </span>
                )}
                <Badge label={l.leadStatus} className={getStatusColor(l.leadStatus)} />
                <select
                  value={l.leadStatus}
                  onChange={e => { e.stopPropagation(); updateStatus(l.id, e.target.value); }}
                  onClick={e => e.stopPropagation()}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
            </div>
            {expandedId === l.id && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="grid md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-600 font-medium">Pages viewed:</span> <span className="text-gray-900">{l.pagesViewed.length}</span></div>
                  <div><span className="text-gray-600 font-medium">Products viewed:</span> <span className="text-gray-900">{l.productsViewed.length}</span></div>
                  <div><span className="text-gray-600 font-medium">Time on site:</span> <span className="text-gray-900">{Math.round(l.timeOnSite / 60)}min</span></div>
                  <div><span className="text-gray-600 font-medium">First visit:</span> <span className="text-gray-900">{formatDate(l.firstVisit)}</span></div>
                </div>

                {/* Browsing Sequence */}
                {l.pagesViewed.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Browsing Sequence</h4>
                    <div className="flex flex-wrap items-center gap-1">
                      {l.pagesViewed.map((p, i) => (
                        <span key={i} className="inline-flex items-center">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{p}</span>
                          {i < l.pagesViewed.length - 1 && <span className="text-gray-400 mx-1">→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abandoned Cart Details */}
                {l.cartAbandoned && l.abandonedCartItems.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-yellow-800 mb-2">🛒 Abandoned Cart — {formatCurrency(l.abandonedCartValue)}</h4>
                    {l.abandonedCartItems.map((item, i) => (
                      <div key={i} className="text-sm text-yellow-900">
                        {item.productName} ×{item.quantity} = {formatCurrency(item.price * item.quantity)}
                      </div>
                    ))}
                  </div>
                )}

                {l.tags.length > 0 && (
                  <div className="flex gap-1">
                    {l.tags.map(t => <span key={t} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{t}</span>)}
                  </div>
                )}

                {/* Convert Button */}
                {l.leadStatus !== 'converted' && (
                  <button
                    onClick={() => convertToCustomer(l)}
                    disabled={converting === l.id}
                    className="text-xs bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {converting === l.id ? 'Converting...' : '✓ Convert to Customer'}
                  </button>
                )}
                {l.leadStatus === 'converted' && (
                  <span className="text-xs text-green-600 font-medium">✅ Already converted to customer</span>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No leads found. Leads are automatically created when visitors browse your store.
          </div>
        )}
      </div>
    </div>
  );
}
