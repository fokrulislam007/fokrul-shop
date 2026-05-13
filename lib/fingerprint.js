// ============================================
// Canvas Fingerprinting — Anonymous User ID
// ============================================

/** Generate a stable fingerprint hash from canvas + browser signals */
export function generateFingerprint() {
  if (typeof window === 'undefined') return 'ssr';

  try {
    const components = [];

    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '11pt Arial';
      ctx.fillText('Cwm fjordbank', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18pt Arial';
      ctx.fillText('Cwm fjordbank', 4, 45);
      components.push(canvas.toDataURL());
    }

    // Browser signals
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(screen.width + 'x' + screen.height);
    components.push(screen.colorDepth.toString());
    components.push(new Date().getTimezoneOffset().toString());
    components.push(navigator.hardwareConcurrency?.toString() || '0');

    // WebGL renderer
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
        }
      }
    } catch { /* ignore */ }

    // Hash all components
    const raw = components.join('|||');
    return hashString(raw);
  } catch {
    // Fallback: random ID stored in localStorage
    return getFallbackId();
  }
}

/** Simple string hash (FNV-1a) */
function hashString(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return 'fp_' + hash.toString(36);
}

/** Fallback: use localStorage for ID if canvas is blocked */
function getFallbackId() {
  const key = 'visitor_fp';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'fb_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(key, id);
  }
  return id;
}

/** Get or create a stable visitor identity */
export function getVisitorId() {
  if (typeof window === 'undefined') return { fingerprintId: 'ssr', visitorName: 'SSR', isAnonymous: true };

  const fpId = generateFingerprint();

  // Check if we have a stored visitor number for this fingerprint
  const storageKey = `visitor_${fpId}`;
  let visitorData = localStorage.getItem(storageKey);

  if (!visitorData) {
    // Assign a new "Window Shopper" number
    const countKey = 'visitor_count';
    const count = parseInt(localStorage.getItem(countKey) || '0') + 1;
    localStorage.setItem(countKey, count.toString());
    const data = { name: `Window Shopper ${count}`, num: count };
    localStorage.setItem(storageKey, JSON.stringify(data));
    visitorData = JSON.stringify(data);
  }

  const parsed = JSON.parse(visitorData);
  return { fingerprintId: fpId, visitorName: parsed.name, isAnonymous: true };
}
