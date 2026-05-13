import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, query, where
} from 'firebase/firestore';

// ============================================
// Helper: get all docs from a subcollection
// ============================================
async function getAll(path) {
  const snap = await getDocs(collection(db, path));
  return snap.docs.map(d => ({ ...d.data() }));
}

async function getClientCol(clientId, col) {
  return getAll(`clients/${clientId}/${col}`);
}

async function setItem(clientId, col, item) {
  await setDoc(doc(db, `clients/${clientId}/${col}`, item.id), item);
}

async function patchItem(clientId, col, id, updates) {
  await updateDoc(doc(db, `clients/${clientId}/${col}`, id), updates);
}

async function removeItem(clientId, col, id) {
  await deleteDoc(doc(db, `clients/${clientId}/${col}`, id));
}

async function saveAll(clientId, col, items) {
  const existing = await getDocs(collection(db, `clients/${clientId}/${col}`));
  const batch1 = writeBatch(db);
  existing.docs.forEach(d => batch1.delete(d.ref));
  await batch1.commit();
  for (let i = 0; i < items.length; i += 500) {
    const batch = writeBatch(db);
    items.slice(i, i + 500).forEach(item => {
      batch.set(doc(db, `clients/${clientId}/${col}`, item.id), item);
    });
    await batch.commit();
  }
}

function getSessionId() {
  if (typeof window === 'undefined') return 'ssr';
  let sid = localStorage.getItem('session_id');
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('session_id', sid);
  }
  return sid;
}

// ============================================
// STORAGE — Async Firestore-backed
// ============================================
export const storage = {
  getClients: async () => getAll('clients'),
  saveClients: async (clients) => {
    const batch = writeBatch(db);
    const snap = await getDocs(collection(db, 'clients'));
    snap.docs.forEach(d => batch.delete(d.ref));
    clients.forEach(c => batch.set(doc(db, 'clients', c.id), c));
    await batch.commit();
  },
  getClient: async (id) => {
    const snap = await getDoc(doc(db, 'clients', id));
    return snap.exists() ? snap.data() : undefined;
  },
  addClient: async (client) => { await setDoc(doc(db, 'clients', client.id), client); },
  updateClientDoc: async (id, updates) => {
    await updateDoc(doc(db, 'clients', id), { ...updates, updatedAt: new Date().toISOString() });
  },

  getProducts: async (clientId) => getClientCol(clientId, 'products'),
  saveProducts: async (clientId, p) => { await saveAll(clientId, 'products', p); },
  getProduct: async (clientId, id) => {
    const snap = await getDoc(doc(db, `clients/${clientId}/products`, id));
    return snap.exists() ? snap.data() : undefined;
  },
  addProduct: async (clientId, p) => { await setItem(clientId, 'products', p); },
  updateProduct: async (clientId, id, u) => {
    await patchItem(clientId, 'products', id, { ...u, updatedAt: new Date().toISOString() });
  },
  deleteProduct: async (clientId, id) => { await removeItem(clientId, 'products', id); },

  getCategories: async (clientId) => getClientCol(clientId, 'categories'),
  saveCategories: async (clientId, c) => { await saveAll(clientId, 'categories', c); },
  addCategory: async (clientId, c) => { await setItem(clientId, 'categories', c); },
  updateCategory: async (clientId, id, u) => { await patchItem(clientId, 'categories', id, u); },
  deleteCategory: async (clientId, id) => { await removeItem(clientId, 'categories', id); },

  getOrders: async (clientId) => getClientCol(clientId, 'orders'),
  saveOrders: async (clientId, o) => { await saveAll(clientId, 'orders', o); },
  getOrder: async (clientId, id) => {
    const snap = await getDoc(doc(db, `clients/${clientId}/orders`, id));
    return snap.exists() ? snap.data() : undefined;
  },
  addOrder: async (clientId, o) => { await setItem(clientId, 'orders', o); },
  updateOrder: async (clientId, id, u) => {
    await patchItem(clientId, 'orders', id, { ...u, updatedAt: new Date().toISOString() });
  },

  getCustomers: async (clientId) => getClientCol(clientId, 'customers'),
  saveCustomers: async (clientId, c) => { await saveAll(clientId, 'customers', c); },
  addCustomer: async (clientId, c) => { await setItem(clientId, 'customers', c); },
  updateCustomer: async (clientId, id, u) => {
    await patchItem(clientId, 'customers', id, { ...u, updatedAt: new Date().toISOString() });
  },

  getLeads: async (clientId) => getClientCol(clientId, 'leads'),
  saveLeads: async (clientId, l) => { await saveAll(clientId, 'leads', l); },
  addLead: async (clientId, l) => { await setItem(clientId, 'leads', l); },
  updateLead: async (clientId, id, u) => { await patchItem(clientId, 'leads', id, u); },

  getMessages: async (clientId) => getClientCol(clientId, 'messages'),
  saveMessages: async (clientId, m) => { await saveAll(clientId, 'messages', m); },
  addMessage: async (clientId, m) => { await setItem(clientId, 'messages', m); },
  markMessageRead: async (clientId, id) => {
    await patchItem(clientId, 'messages', id, { status: 'read', readAt: new Date().toISOString() });
  },

  getAutoResponses: async (clientId) => getClientCol(clientId, 'autoResponses'),
  saveAutoResponses: async (clientId, a) => { await saveAll(clientId, 'autoResponses', a); },
  addAutoResponse: async (clientId, a) => { await setItem(clientId, 'autoResponses', a); },

  getSuppliers: async (clientId) => getClientCol(clientId, 'suppliers'),
  saveSuppliers: async (clientId, s) => { await saveAll(clientId, 'suppliers', s); },
  addSupplier: async (clientId, s) => { await setItem(clientId, 'suppliers', s); },
  updateSupplier: async (clientId, id, u) => { await patchItem(clientId, 'suppliers', id, u); },
  deleteSupplier: async (clientId, id) => { await removeItem(clientId, 'suppliers', id); },

  getInventory: async (clientId) => getClientCol(clientId, 'inventory'),
  saveInventory: async (clientId, inv) => { await saveAll(clientId, 'inventory', inv); },
  addInventoryItem: async (clientId, item) => { await setItem(clientId, 'inventory', item); },
  updateInventoryItem: async (clientId, id, u) => {
    await patchItem(clientId, 'inventory', id, { ...u, updatedAt: new Date().toISOString() });
  },

  getAccountingEntries: async (clientId) => getClientCol(clientId, 'accounting'),
  saveAccountingEntries: async (clientId, e) => { await saveAll(clientId, 'accounting', e); },
  addAccountingEntry: async (clientId, e) => { await setItem(clientId, 'accounting', e); },
  deleteAccountingEntry: async (clientId, id) => { await removeItem(clientId, 'accounting', id); },

  getDeliveryTrackings: async (clientId) => getClientCol(clientId, 'delivery'),
  saveDeliveryTrackings: async (clientId, d) => { await saveAll(clientId, 'delivery', d); },
  addDeliveryTracking: async (clientId, d) => { await setItem(clientId, 'delivery', d); },
  updateDeliveryTracking: async (clientId, id, u) => {
    await patchItem(clientId, 'delivery', id, { ...u, updatedAt: new Date().toISOString() });
  },

  getReviews: async (clientId) => getClientCol(clientId, 'reviews'),
  saveReviews: async (clientId, r) => { await saveAll(clientId, 'reviews', r); },
  addReview: async (clientId, r) => { await setItem(clientId, 'reviews', r); },

  getCartItems: async (clientId) => {
    const sid = getSessionId();
    const snap = await getDoc(doc(db, `clients/${clientId}/carts`, sid));
    return snap.exists() ? (snap.data().items || []) : [];
  },
  saveCartItems: async (clientId, items) => {
    const sid = getSessionId();
    await setDoc(doc(db, `clients/${clientId}/carts`, sid), { items, updatedAt: new Date().toISOString() });
  },
  clearCartItems: async (clientId) => {
    const sid = getSessionId();
    await deleteDoc(doc(db, `clients/${clientId}/carts`, sid));
  },

  getCartClientId: async () => {
    const snap = await getDoc(doc(db, 'storefrontConfig', 'default'));
    return snap.exists() ? (snap.data().clientId || '') : '';
  },
  setCartClientId: async (id) => {
    await setDoc(doc(db, 'storefrontConfig', 'default'), { clientId: id });
  },

  getSpinShown: async (clientId) => {
    const sid = getSessionId();
    const snap = await getDoc(doc(db, `clients/${clientId}/spinWheel`, sid));
    return snap.exists() ? (snap.data().played || false) : false;
  },
  setSpinShown: async (clientId) => {
    const sid = getSessionId();
    await setDoc(doc(db, `clients/${clientId}/spinWheel`, sid), { played: true, timestamp: new Date().toISOString() }, { merge: true });
  },
  getSpinDiscount: async (clientId) => {
    const sid = getSessionId();
    const snap = await getDoc(doc(db, `clients/${clientId}/spinWheel`, sid));
    if (!snap.exists()) return null;
    return snap.data().discountData || null;
  },
  setSpinDiscount: async (clientId, d) => {
    const sid = getSessionId();
    await setDoc(doc(db, `clients/${clientId}/spinWheel`, sid), { discountData: d, played: true }, { merge: true });
  },
  clearSpinDiscount: async (clientId) => {
    const sid = getSessionId();
    await setDoc(doc(db, `clients/${clientId}/spinWheel`, sid), { discountData: null }, { merge: true });
  },

  getSettings: async (clientId, key) => {
    const snap = await getDoc(doc(db, `clients/${clientId}/settings`, key));
    return snap.exists() ? snap.data() : null;
  },
  saveSettings: async (clientId, key, data) => {
    await setDoc(doc(db, `clients/${clientId}/settings`, key), { ...data, updatedAt: new Date().toISOString() });
  },

  getHomepageHero: async (clientId) => {
    const snap = await getDoc(doc(db, `clients/${clientId}/homepage`, 'hero'));
    return snap.exists() ? snap.data() : null;
  },
  saveHomepageHero: async (clientId, data) => {
    await setDoc(doc(db, `clients/${clientId}/homepage`, 'hero'), { ...data, updatedAt: new Date().toISOString() });
  },

  clearAll: async () => { /* No-op for Firestore */ },
  exportAll: async () => {
    const clients = await getAll('clients');
    const data = { clients };
    for (const c of clients) {
      data[`products_${c.id}`] = await getClientCol(c.id, 'products');
      data[`orders_${c.id}`] = await getClientCol(c.id, 'orders');
    }
    return JSON.stringify(data, null, 2);
  },
  importAll: async (_json) => { /* Not implemented for Firestore */ },
};
