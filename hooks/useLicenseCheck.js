'use client';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const CACHE_KEY = 'ggly_license_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook that checks the site's own Firestore for license/pause status.
 * Reads from `_ggly_license/status` collection.
 * Caches the result in localStorage for 24h to avoid redundant reads.
 *
 * Returns:
 *   isBlocked: true if paused or expired
 *   isLoading: true while checking
 *   contactPhone: phone number from license doc
 */
export function useLicenseCheck() {
  // SECURITY: Start blocked until proven otherwise (fail-closed)
  const [isBlocked, setIsBlocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [contactPhone, setContactPhone] = useState('');

  const checkLicense = useCallback(async () => {
    try {
      // Check cache first
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.checkedAt && (Date.now() - data.checkedAt) < CACHE_TTL) {
              setIsBlocked(data.isBlocked);
              setContactPhone(data.contactPhone || '');
              setIsLoading(false);
              return;
            }
          } catch {
            // Invalid cache, continue to fresh check
          }
        }
      }

      // Fresh check from own Firestore
      let snap;
      try {
        snap = await getDoc(doc(db, '_ggly_license', 'status'));
      } catch (fetchErr) {
        console.error('[Ggly License] Firestore fetch failed:', fetchErr);
        // SECURITY: If we can't reach Firestore, stay blocked
        setIsBlocked(true);
        setContactPhone('');
        setIsLoading(false);
        return;
      }

      if (!snap.exists()) {
        // No license doc = not managed by Ggly Master, allow access
        setIsBlocked(false);
        // Cache the unblocked result
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            isBlocked: false,
            contactPhone: '',
            checkedAt: Date.now(),
          }));
        }
        setIsLoading(false);
        return;
      }

      const data = snap.data();
      const paused = data.paused === true;
      const expiryDate = data.expiryDate || '';
      const phone = data.contactPhone || '';

      // Check if expired
      let expired = false;
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        expired = expiry < new Date();
      }

      const blocked = paused || expired;
      setIsBlocked(blocked);
      setContactPhone(phone);

      // Cache the result
      if (typeof window !== 'undefined') {
        if (blocked) {
          // When blocked, clear cache so next load also checks fresh
          localStorage.removeItem(CACHE_KEY);
        } else {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            isBlocked: false,
            contactPhone: phone,
            checkedAt: Date.now(),
          }));
        }
      }
    } catch (err) {
      console.error('[Ggly License] Check failed:', err);
      // SECURITY: On error, stay blocked (fail-closed)
      setIsBlocked(true);
      setContactPhone('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  return { isBlocked, isLoading, contactPhone };
}
