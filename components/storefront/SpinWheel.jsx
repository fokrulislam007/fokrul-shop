'use client';
import { useState, useEffect } from 'react';

const PRIZES = [
  { label: '10% OFF', discount: 10, color: '#ef4444' },
  { label: '5% OFF', discount: 5, color: '#f97316' },
  { label: 'Free Ship', discount: 0, color: '#22c55e' },
  { label: '15% OFF', discount: 15, color: '#8b5cf6' },
  { label: 'Try Again', discount: 0, color: '#6b7280' },
  { label: '20% OFF', discount: 20, color: '#3b82f6' },
];

export default function SpinWheel() {
  const [show, setShow] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const played = sessionStorage.getItem('spin_played');
    if (played) return;
    const timer = setTimeout(() => setShow(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !show) return null;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const idx = Math.floor(Math.random() * PRIZES.length);
    const segAngle = 360 / PRIZES.length;
    const targetAngle = 360 * 5 + (360 - idx * segAngle - segAngle / 2);
    setRotation(targetAngle);
    setTimeout(() => {
      setResult(PRIZES[idx]);
      setSpinning(false);
      sessionStorage.setItem('spin_played', '1');
      if (PRIZES[idx].discount > 0) sessionStorage.setItem('spin_discount', String(PRIZES[idx].discount));
    }, 4000);
  };

  const close = () => { setDismissed(true); setShow(false); };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={close} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center z-10 animate-slide-in-bottom">
        <button onClick={close} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        {!result ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">🎰 Spin to Win!</h2>
            <p className="text-sm text-gray-500 mb-4">Try your luck for a special discount</p>
            <div className="relative w-56 h-56 mx-auto mb-4">
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-gray-900" />
              {/* Wheel */}
              <div className="w-full h-full rounded-full border-4 border-gray-200 overflow-hidden transition-transform duration-[4000ms] ease-out" style={{ transform: `rotate(${rotation}deg)` }}>
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {PRIZES.map((p, i) => {
                    const angle = (360 / PRIZES.length) * Math.PI / 180;
                    const startAngle = i * angle - Math.PI / 2;
                    const endAngle = startAngle + angle;
                    const x1 = 100 + 100 * Math.cos(startAngle);
                    const y1 = 100 + 100 * Math.sin(startAngle);
                    const x2 = 100 + 100 * Math.cos(endAngle);
                    const y2 = 100 + 100 * Math.sin(endAngle);
                    const midAngle = startAngle + angle / 2;
                    const textX = 100 + 60 * Math.cos(midAngle);
                    const textY = 100 + 60 * Math.sin(midAngle);
                    const textRotation = (midAngle * 180 / Math.PI) + 90;
                    return (
                      <g key={i}>
                        <path d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`} fill={p.color} />
                        <text x={textX} y={textY} fill="white" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textRotation},${textX},${textY})`}>{p.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            <button onClick={spin} disabled={spinning} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg disabled:opacity-50 hover:opacity-90 transition-opacity">
              {spinning ? '🎰 Spinning...' : '🎰 SPIN NOW!'}
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">{result.discount > 0 ? '🎉' : '😔'}</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{result.discount > 0 ? 'You Won!' : 'Almost!'}</h2>
            <div className="text-4xl font-bold mb-4" style={{ color: result.color }}>{result.label}</div>
            {result.discount > 0 && <p className="text-sm text-gray-500 mb-4">Your discount will be applied at checkout</p>}
            <button onClick={close} className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800">{result.discount > 0 ? 'Shop Now! →' : 'Close'}</button>
          </>
        )}
      </div>
    </div>
  );
}
