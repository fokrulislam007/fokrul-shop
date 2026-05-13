'use client';
import { useEffect, useRef, useCallback } from 'react';
import { getVisitorId } from '@/lib/fingerprint';

/**
 * useSessionRecorder — Records user sessions using rrweb.
 */
export function useSessionRecorder() {
  const sessionId = useRef('');
  const eventBuffer = useRef([]);
  const stopFn = useRef(null);
  const flushTimer = useRef(null);
  const isRecording = useRef(false);

  const flush = useCallback(async () => {
    if (eventBuffer.current.length === 0) return;

    const events = [...eventBuffer.current];
    eventBuffer.current = [];

    try {
      const visitor = getVisitorId();
      const payload = {
        sessionId: sessionId.current,
        fingerprintId: visitor.fingerprintId,
        userId: visitor.visitorName,
        events,
        metadata: {
          userAgent: navigator.userAgent,
          screenWidth: screen.width,
          screenHeight: screen.height,
          deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          browser: getBrowserName(),
          startUrl: window.location.href,
        },
      };

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error('Session flush failed:', res.status, await res.text());
        eventBuffer.current = [...events, ...eventBuffer.current];
      }
    } catch (err) {
      eventBuffer.current = [...events, ...eventBuffer.current];
      console.error('Session flush error:', err);
    }
  }, []);

  useEffect(() => {
    if (isRecording.current) return;

    sessionId.current = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

    let mounted = true;

    const startRecording = async () => {
      try {
        const rrwebModule = await import('rrweb');

        if (!mounted) return;

        const recordFn = rrwebModule.record || rrwebModule.default?.record;

        if (!recordFn) {
          console.error('rrweb record function not found. Module keys:', Object.keys(rrwebModule));
          return;
        }

        isRecording.current = true;

        stopFn.current = recordFn({
          emit(event) {
            eventBuffer.current.push(event);
            if (eventBuffer.current.length >= 50) {
              flush();
            }
          },
          maskAllInputs: true,
          sampling: {
            mousemove: true,
            mouseInteraction: true,
            scroll: 150,
            input: 'last',
          },
        }) || null;

        flushTimer.current = setInterval(flush, 10000);
        setTimeout(flush, 5000);

      } catch (err) {
        console.error('rrweb initialization error:', err);
      }
    };

    startRecording();

    const handleUnload = () => {
      if (eventBuffer.current.length > 0) {
        const visitor = getVisitorId();
        const data = JSON.stringify({
          sessionId: sessionId.current,
          fingerprintId: visitor.fingerprintId,
          userId: visitor.visitorName,
          events: eventBuffer.current,
          metadata: {
            userAgent: navigator.userAgent,
            deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          },
        });
        navigator.sendBeacon('/api/sessions', new Blob([data], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleUnload);
      if (stopFn.current) {
        stopFn.current();
        stopFn.current = null;
      }
      if (flushTimer.current) {
        clearInterval(flushTimer.current);
        flushTimer.current = null;
      }
      isRecording.current = false;
      flush();
    };
  }, [flush]);
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Other';
}
