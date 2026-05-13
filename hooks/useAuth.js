'use client';
import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

const SESSION_KEY = 'auth_session';

export function useAuth() {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') { setLoading(false); return; }
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        const found = await storage.getClient(sessionId);
        if (found) setClient(found);
      }
      setLoading(false);
    };
    init();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !localStorage.getItem(SESSION_KEY)) {
        const clients = await storage.getClients();
        const found = clients.find(c => c.email === user.email);
        if (found) {
          localStorage.setItem(SESSION_KEY, found.id);
          setClient(found);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const clients = await storage.getClients();
    const found = clients.find(c => c.email === email && c.password === password);
    if (!found) return { success: false, error: 'Invalid email or password' };
    localStorage.setItem(SESSION_KEY, found.id);
    setClient(found);
    return { success: true };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email || '';
      const clients = await storage.getClients();
      const existing = clients.find(c => c.email === email);

      if (existing) {
        localStorage.setItem(SESSION_KEY, existing.id);
        setClient(existing);
        return { success: true };
      }

      const now = new Date().toISOString();
      const businessName = user.displayName || 'My Store';
      const newClient = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        email,
        password: '',
        businessName,
        subdomain: businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        plan: 'free',
        status: 'active',
        logo: user.photoURL || undefined,
        createdAt: now, updatedAt: now,
      };
      await storage.addClient(newClient);
      localStorage.setItem(SESSION_KEY, newClient.id);
      setClient(newClient);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Google sign-in failed';
      console.error('Google sign-in error:', error);
      return { success: false, error: msg };
    }
  }, []);

  const signup = useCallback(async (email, password, businessName) => {
    const clients = await storage.getClients();
    if (clients.find(c => c.email === email)) return { success: false, error: 'Email already exists' };
    const now = new Date().toISOString();
    const newClient = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      email, password, businessName,
      subdomain: businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      plan: 'free', status: 'active',
      createdAt: now, updatedAt: now,
    };
    await storage.addClient(newClient);
    localStorage.setItem(SESSION_KEY, newClient.id);
    setClient(newClient);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setClient(null);
    try { await firebaseSignOut(auth); } catch { /* ignore */ }
  }, []);

  const updateClient = useCallback(async (updates) => {
    if (!client) return;
    await storage.updateClientDoc(client.id, updates);
    const refreshed = await storage.getClient(client.id);
    if (refreshed) setClient(refreshed);
  }, [client]);

  return { client, loading, login, loginWithGoogle, signup, logout, updateClient };
}
