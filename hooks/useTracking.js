'use client';
import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { getVisitorId } from '@/lib/fingerprint';
import { storage } from '@/lib/storage';

/**
 * useTracking — tracks visitor behavior on the storefront.
 */
export function useTracking() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());
  const pageStartTime = useRef(Date.now());
  const isInitialized = useRef(false);

  const sendBehavioralData = useCallback(async (event) => {
    try {
      const visitor = getVisitorId();
      await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprintId: visitor.fingerprintId,
          visitorName: visitor.visitorName,
          event,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch { /* fail silently */ }
  }, []);

  const updateLead = useCallback(async () => {
    try {
      const visitor = getVisitorId();
      const cid = await storage.getCartClientId();
      if (!cid) return;

      const leads = await storage.getLeads(cid);
      const existing = leads.find(l => l.sessionId === visitor.fingerprintId);

      const now = new Date().toISOString();
      const timeOnSite = Math.floor((Date.now() - startTime.current) / 1000);

      if (existing) {
        const updates = {
          lastVisit: now,
          totalVisits: existing.totalVisits + 1,
          timeOnSite: existing.timeOnSite + timeOnSite,
          pagesViewed: [...new Set([...existing.pagesViewed, pathname])],
        };

        const productMatch = pathname.match(/\/products\/([^/]+)$/);
        if (productMatch) {
          updates.productsViewed = [...new Set([...existing.productsViewed, productMatch[1]])];
        }

        await storage.updateLead(cid, existing.id, updates);
      } else {
        const newLead = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          clientId: cid,
          sessionId: visitor.fingerprintId,
          name: visitor.isAnonymous ? visitor.visitorName : undefined,
          firstVisit: now,
          lastVisit: now,
          totalVisits: 1,
          pagesViewed: [pathname],
          productsViewed: [],
          timeOnSite,
          cartAbandoned: false,
          abandonedCartValue: 0,
          abandonedCartItems: [],
          leadStatus: 'cold',
          tags: [],
          sessionRecordings: [],
          createdAt: now,
          updatedAt: now,
        };
        await storage.addLead(cid, newLead);
      }
    } catch (err) {
      console.error('Tracking error:', err);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      startTime.current = Date.now();
    }
    pageStartTime.current = Date.now();

    sendBehavioralData({ type: 'pageview', page: pathname });

    return () => {
      const duration = Math.floor((Date.now() - pageStartTime.current) / 1000);
      sendBehavioralData({
        type: 'page_duration',
        page: pathname,
        data: { duration },
      });
    };
  }, [pathname, sendBehavioralData]);

  useEffect(() => {
    const timer = setTimeout(() => updateLead(), 2000);
    return () => clearTimeout(timer);
  }, [updateLead]);

  useEffect(() => {
    const handleUnload = async () => {
      try {
        const cid = await storage.getCartClientId();
        if (!cid) return;
        const cartItems = await storage.getCartItems(cid);
        if (cartItems.length > 0) {
          const visitor = getVisitorId();
          const leads = await storage.getLeads(cid);
          const lead = leads.find(l => l.sessionId === visitor.fingerprintId);
          if (lead) {
            const cartValue = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
            await storage.updateLead(cid, lead.id, {
              cartAbandoned: true,
              abandonedCartValue: cartValue,
              abandonedCartItems: cartItems.map(i => ({
                productId: i.productId,
                productName: i.productName,
                quantity: i.quantity,
                price: i.price,
              })),
              leadStatus: 'hot',
            });
          }
        }
      } catch { /* fail silently on unload */ }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return { sendBehavioralData };
}
