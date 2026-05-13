'use client';
import { useState, useEffect } from 'react';

const NAMES = ['Rahim','Fatima','Kamal','Nadia','Arif','Sonia','Imran','Tasnim','Hasan','Priya'];
const CITIES = ['Dhaka','Chittagong','Sylhet','Rajshahi','Khulna','Barisal'];

export default function Notifications({ productName }) {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showNotif = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const actions = [`just purchased ${productName}`, `added ${productName} to cart`, `is viewing ${productName}`];
      const action = actions[Math.floor(Math.random() * actions.length)];
      setNotification({ name, city, action });
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };

    const initialDelay = setTimeout(showNotif, 5000);
    const interval = setInterval(showNotif, 20000 + Math.random() * 15000);
    return () => { clearTimeout(initialDelay); clearInterval(interval); };
  }, [productName]);

  if (!notification || !visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-xs animate-slide-in-bottom">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">👤</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900"><strong>{notification.name}</strong> from {notification.city}</p>
          <p className="text-xs text-gray-500 mt-0.5">{notification.action}</p>
          <p className="text-xs text-gray-400 mt-1">Just now</p>
        </div>
        <button onClick={() => setVisible(false)} className="text-gray-300 hover:text-gray-500 text-sm">&times;</button>
      </div>
    </div>
  );
}
