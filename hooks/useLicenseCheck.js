'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Simple license check — reads `_ggly_license/status` from Firestore.
 * If paused or expired → isBlocked = true.
 * No cache, no localStorage, just a direct Firestore read every time.
 */
export function useLicenseCheck() {
  const [isBlocked, setIsBlocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const snap = await getDoc(doc(db, '_ggly_license', 'status'));

        if (cancelled) return;

        if (!snap.exists()) {
          // No license doc — not managed, allow access
          setIsBlocked(false);
          setIsLoading(false);
          return;
        }

        const data = snap.data();
        const paused = data.paused === true;
        const phone = data.contactPhone || '';

        // Check expiry
        let expired = false;
        if (data.expiryDate) {
          expired = new Date(data.expiryDate) < new Date();
        }

        setContactPhone(phone);
        setIsBlocked(paused || expired);
      } catch (err) {
        console.error('[License] Check failed:', err);
        // On error, block access
        setIsBlocked(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return { isBlocked, isLoading, contactPhone };
}
