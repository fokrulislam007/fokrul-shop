'use client';
import { useState, useEffect } from 'react';

export default function StockTicker({ inventory }) {
  const [viewers, setViewers] = useState(0);
  const [recentBuyers, setRecentBuyers] = useState(0);

  useEffect(() => {
    setViewers(Math.floor(Math.random() * 15) + 3);
    setRecentBuyers(Math.floor(Math.random() * 8) + 2);
    const interval = setInterval(() => {
      setViewers(v => Math.max(1, v + Math.floor(Math.random() * 5) - 2));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  if (inventory > 20) return null;

  return (
    <div className="mb-4 space-y-2">
      {inventory > 0 && inventory <= 10 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl animate-pulse">
          <span className="text-red-600 text-sm font-medium">🔥 Only {inventory} left in stock — order soon!</span>
        </div>
      )}
      {inventory > 10 && inventory <= 20 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-orange-600 text-sm font-medium">⚡ Selling fast! Only {inventory} remaining</span>
        </div>
      )}
      <div className="flex flex-wrap gap-4 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
          {viewers} people viewing this
        </span>
        <span>🛒 {recentBuyers} bought in last 24h</span>
      </div>
    </div>
  );
}
