'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';

const DEFAULT_SHIPPING = {
  mode: 'flat', // 'flat' or 'tiered'
  flatRate: 60,
  tiers: [
    { minQty: 1, maxQty: 5, cost: 60 },
    { minQty: 6, maxQty: 10, cost: 100 },
  ],
};

export default function ShippingSettingsPage() {
  const { client } = useAuth();
  const [config, setConfig] = useState(DEFAULT_SHIPPING);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!client) return;
    storage.getSettings(client.id, 'shipping').then(data => {
      if (data) setConfig({ ...DEFAULT_SHIPPING, ...data });
    });
  }, [client]);

  const addTier = () => {
    const lastTier = config.tiers[config.tiers.length - 1];
    const nextMin = lastTier ? lastTier.maxQty + 1 : 1;
    setConfig({
      ...config,
      tiers: [...config.tiers, { minQty: nextMin, maxQty: nextMin + 4, cost: 0 }],
    });
  };

  const removeTier = (idx) => {
    setConfig({ ...config, tiers: config.tiers.filter((_, i) => i !== idx) });
  };

  const updateTier = (idx, field, value) => {
    const tiers = [...config.tiers];
    tiers[idx] = { ...tiers[idx], [field]: Number(value) };
    setConfig({ ...config, tiers });
  };

  const save = async () => {
    if (!client) return;
    setSaving(true);
    await storage.saveSettings(client.id, 'shipping', config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Shipping Settings</h1>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved successfully</span>}
      </div>

      {/* Mode selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Shipping Cost Mode</h2>
        <div className="flex gap-4">
          <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.mode === 'flat' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input
              type="radio"
              name="mode"
              value="flat"
              checked={config.mode === 'flat'}
              onChange={() => setConfig({ ...config, mode: 'flat' })}
              className="sr-only"
            />
            <div className="font-semibold text-gray-900 mb-1">Flat Rate</div>
            <p className="text-sm text-gray-500">Same shipping cost for any quantity</p>
          </label>
          <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${config.mode === 'tiered' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input
              type="radio"
              name="mode"
              value="tiered"
              checked={config.mode === 'tiered'}
              onChange={() => setConfig({ ...config, mode: 'tiered' })}
              className="sr-only"
            />
            <div className="font-semibold text-gray-900 mb-1">Tiered by Quantity</div>
            <p className="text-sm text-gray-500">Different costs based on item quantity ranges</p>
          </label>
        </div>
      </div>

      {/* Flat rate config */}
      {config.mode === 'flat' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Flat Shipping Rate</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipping cost (for any order)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">৳</span>
              <input
                type="number"
                min="0"
                value={config.flatRate}
                onChange={e => setConfig({ ...config, flatRate: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
            <strong>Example:</strong> Customer orders 5 items → Shipping = ৳{config.flatRate}
          </div>
        </div>
      )}

      {/* Tiered config */}
      {config.mode === 'tiered' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Quantity-Based Tiers</h2>
            <button
              onClick={addTier}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Tier
            </button>
          </div>

          <div className="space-y-3">
            {config.tiers.map((tier, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-500 whitespace-nowrap">Items</span>
                  <input
                    type="number"
                    min="1"
                    value={tier.minQty}
                    onChange={e => updateTier(idx, 'minQty', e.target.value)}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-sm text-gray-400">to</span>
                  <input
                    type="number"
                    min="1"
                    value={tier.maxQty}
                    onChange={e => updateTier(idx, 'maxQty', e.target.value)}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <span className="text-sm text-gray-500">=</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={tier.cost}
                    onChange={e => updateTier(idx, 'cost', e.target.value)}
                    className="w-24 pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                {config.tiers.length > 1 && (
                  <button
                    onClick={() => removeTier(idx)}
                    className="text-red-500 hover:text-red-700 text-sm p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700 space-y-1">
            <strong>Preview:</strong>
            {config.tiers.map((tier, i) => (
              <div key={i}>
                {tier.minQty}–{tier.maxQty} items → ৳{tier.cost}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Shipping Settings'}
        </button>
      </div>
    </div>
  );
}
