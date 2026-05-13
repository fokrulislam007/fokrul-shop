'use client';
import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';

export function useCart() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const init = async () => {
      const cid = await storage.getCartClientId();
      setClientId(cid);
      if (cid) {
        const cartItems = await storage.getCartItems(cid);
        setItems(cartItems);
      }
      setLoaded(true);
    };
    init();
  }, []);

  const save = useCallback(async (newItems) => {
    setItems(newItems);
    if (clientId) await storage.saveCartItems(clientId, newItems);
  }, [clientId]);

  const addItem = useCallback(async (item) => {
    let cid = clientId;
    if (!cid) { cid = await storage.getCartClientId(); setClientId(cid); }
    const current = cid ? await storage.getCartItems(cid) : [];
    const vk = item.variant ? JSON.stringify(item.variant) : '';
    const idx = current.findIndex(i => i.productId === item.productId && (i.variant ? JSON.stringify(i.variant) : '') === vk);
    if (idx !== -1) current[idx].quantity += item.quantity;
    else current.push(item);
    await save(current);
  }, [clientId, save]);

  const removeItem = useCallback(async (productId, variant) => {
    const cid = clientId || await storage.getCartClientId();
    const current = cid ? await storage.getCartItems(cid) : [];
    const vk = variant ? JSON.stringify(variant) : '';
    const filtered = current.filter(i => !(i.productId === productId && (i.variant ? JSON.stringify(i.variant) : '') === vk));
    await save(filtered);
  }, [clientId, save]);

  const updateQuantity = useCallback(async (productId, quantity, variant) => {
    const cid = clientId || await storage.getCartClientId();
    const current = cid ? await storage.getCartItems(cid) : [];
    const vk = variant ? JSON.stringify(variant) : '';
    const idx = current.findIndex(i => i.productId === productId && (i.variant ? JSON.stringify(i.variant) : '') === vk);
    if (idx !== -1) { if (quantity <= 0) current.splice(idx, 1); else current[idx].quantity = quantity; }
    await save(current);
  }, [clientId, save]);

  const clearCart = useCallback(async () => { setItems([]); if (clientId) await storage.clearCartItems(clientId); }, [clientId]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, loaded };
}
