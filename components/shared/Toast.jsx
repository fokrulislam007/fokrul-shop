'use client';

const icons = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};
const colors = {
  success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500', warning: 'bg-yellow-500',
};

export default function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`animate-toast-in flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${colors[t.type]}`}>
          <span className="text-lg font-bold">{icons[t.type]}</span>
          <span className="flex-1 text-sm">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="opacity-70 hover:opacity-100 text-lg">×</button>
        </div>
      ))}
    </div>
  );
}
