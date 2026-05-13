'use client';
import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { generateId } from '@/lib/utils';

const CUSTOMER_SESSION_KEY = 'customer_session';

export function useCustomerAuth() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (typeof window === 'undefined') { setLoading(false); return; }
      const sessionData = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (sessionData) {
        try {
          setCustomer(JSON.parse(sessionData));
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    init();
  }, []);

  const saveCustomerSession = useCallback(async (customerUser) => {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customerUser));
    setCustomer(customerUser);
    setShowLoginModal(false);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email || '';
      const name = user.displayName || 'Customer';
      const photo = user.photoURL || undefined;

      const cid = await storage.getCartClientId();
      if (!cid) return { success: false, error: 'Store not configured' };

      const customers = await storage.getCustomers(cid);
      const existing = customers.find(c => c.email === email);

      let customerUser;

      if (existing) {
        customerUser = {
          id: existing.id, name: existing.name,
          email: existing.email || email, phone: existing.phone || '', photo,
        };
      } else {
        const newCustomer = {
          id: generateId(), clientId: cid, name, phone: '', email,
          addresses: [], totalOrders: 0, totalSpent: 0,
          loyaltyPoints: 0, loyaltyHistory: [],
          tags: ['Google Sign-In'],
          notes: `Signed up via Google on ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await storage.addCustomer(cid, newCustomer);
        customerUser = { id: newCustomer.id, name, email, phone: '', photo };
      }

      await saveCustomerSession(customerUser);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in failed';
      console.error('Customer Google sign-in error:', error);
      return { success: false, error: msg };
    }
  }, [saveCustomerSession]);

  const signupWithEmail = useCallback(async (name, email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });

      const cid = await storage.getCartClientId();
      if (!cid) return { success: false, error: 'Store not configured' };

      const newCustomer = {
        id: generateId(), clientId: cid, name, phone: '', email,
        addresses: [], totalOrders: 0, totalSpent: 0,
        loyaltyPoints: 0, loyaltyHistory: [],
        tags: ['Email Sign-Up'],
        notes: `Signed up via email on ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await storage.addCustomer(cid, newCustomer);
      await saveCustomerSession({ id: newCustomer.id, name, email, phone: '' });
      return { success: true };
    } catch (error) {
      let msg = 'Sign-up failed';
      if (error?.code === 'auth/email-already-in-use') msg = 'This email is already registered';
      else if (error?.code === 'auth/weak-password') msg = 'Password must be at least 6 characters';
      else if (error?.code === 'auth/invalid-email') msg = 'Invalid email address';
      else if (error instanceof Error) msg = error.message;
      return { success: false, error: msg };
    }
  }, [saveCustomerSession]);

  const loginWithEmail = useCallback(async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const cid = await storage.getCartClientId();
      if (!cid) return { success: false, error: 'Store not configured' };

      const customers = await storage.getCustomers(cid);
      const existing = customers.find(c => c.email === user.email);

      if (existing) {
        await saveCustomerSession({
          id: existing.id, name: existing.name,
          email: existing.email, phone: existing.phone || '',
        });
      } else {
        const newCustomer = {
          id: generateId(), clientId: cid,
          name: user.displayName || 'Customer', phone: '', email: user.email || '',
          addresses: [], totalOrders: 0, totalSpent: 0,
          loyaltyPoints: 0, loyaltyHistory: [], tags: ['Email Sign-In'],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await storage.addCustomer(cid, newCustomer);
        await saveCustomerSession({ id: newCustomer.id, name: newCustomer.name, email: newCustomer.email, phone: '' });
      }
      return { success: true };
    } catch (error) {
      let msg = 'Sign-in failed';
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      else if (error?.code === 'auth/invalid-email') msg = 'Invalid email address';
      else if (error instanceof Error) msg = error.message;
      return { success: false, error: msg };
    }
  }, [saveCustomerSession]);

  const logout = useCallback(async () => {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    setCustomer(null);
    try { await firebaseSignOut(auth); } catch { /* ignore */ }
  }, []);

  return {
    customer, loading,
    loginWithGoogle, loginWithEmail, signupWithEmail,
    logout, showLoginModal, setShowLoginModal,
  };
}
