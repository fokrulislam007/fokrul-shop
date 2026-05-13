import { storage } from './storage';
import { generateId } from './utils';

export async function seedData() {
  if (typeof window !== 'undefined' && localStorage.getItem('data_seeded')) return;

  const clients = await storage.getClients();
  if (clients.length > 0) {
    if (typeof window !== 'undefined') localStorage.setItem('data_seeded', '1');
    return;
  }

  const now = new Date().toISOString();
  const cid = generateId();
  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

  const client = {
    id: cid, email: 'demo@example.com', password: 'demo123', businessName: 'Demo Store', subdomain: 'demo-store', plan: 'pro', status: 'active',
    createdAt: now, updatedAt: now,
  };
  await storage.addClient(client);

  const cats = [
    { id: generateId(), clientId: cid, name: 'Clothing', displayOrder: 1, createdAt: now },
    { id: generateId(), clientId: cid, name: 'Shoes', displayOrder: 2, createdAt: now },
    { id: generateId(), clientId: cid, name: 'Accessories', displayOrder: 3, createdAt: now },
    { id: generateId(), clientId: cid, name: 'Electronics', displayOrder: 4, createdAt: now },
  ];
  await storage.saveCategories(cid, cats);

  const pids = Array.from({ length: 10 }, () => generateId());
  const products = [
    { id: pids[0], clientId: cid, name: 'Classic T-Shirt', sku: 'CTS-1001', description: 'Comfortable cotton t-shirt perfect for everyday wear.', category: 'Clothing', basePrice: 599, salePrice: 449, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Size', options: ['S','M','L','XL'] }, { id: generateId(), type: 'Color', options: ['White','Black','Navy'] }], inventory: 45, lowStockThreshold: 10, purchasePrice: 250, slug: 'classic-t-shirt', status: 'active', views: 120, addToCartCount: 35, purchaseCount: 18, location: 'Shelf A1', createdAt: daysAgo(30), updatedAt: now },
    { id: pids[1], clientId: cid, name: 'Blue Jeans', sku: 'BLJ-1002', description: 'Premium denim jeans with a modern slim fit.', category: 'Clothing', basePrice: 1299, salePrice: 999, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Size', options: ['28','30','32','34','36'] }], inventory: 30, lowStockThreshold: 8, purchasePrice: 600, slug: 'blue-jeans', status: 'active', views: 95, addToCartCount: 28, purchaseCount: 15, location: 'Shelf A2', createdAt: daysAgo(28), updatedAt: now },
    { id: pids[2], clientId: cid, name: 'Running Shoes', sku: 'RNS-1003', description: 'Lightweight running shoes with superior cushioning.', category: 'Shoes', basePrice: 2499, salePrice: 1899, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Size', options: ['7','8','9','10','11'] }], inventory: 15, lowStockThreshold: 5, purchasePrice: 1200, slug: 'running-shoes', status: 'active', views: 200, addToCartCount: 45, purchaseCount: 22, location: 'Shelf B1', createdAt: daysAgo(25), updatedAt: now },
    { id: pids[3], clientId: cid, name: 'Leather Wallet', sku: 'LTW-1004', description: 'Genuine leather wallet with multiple card slots.', category: 'Accessories', basePrice: 799, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Color', options: ['Brown','Black'] }], inventory: 50, lowStockThreshold: 10, purchasePrice: 350, slug: 'leather-wallet', status: 'active', views: 80, addToCartCount: 20, purchaseCount: 12, location: 'Shelf C1', createdAt: daysAgo(20), updatedAt: now },
    { id: pids[4], clientId: cid, name: 'Summer Dress', sku: 'SMD-1005', description: 'Light and breezy summer dress with floral patterns.', category: 'Clothing', basePrice: 899, salePrice: 699, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Size', options: ['S','M','L'] }], inventory: 8, lowStockThreshold: 5, purchasePrice: 400, slug: 'summer-dress', status: 'active', views: 150, addToCartCount: 40, purchaseCount: 20, location: 'Shelf A3', createdAt: daysAgo(18), updatedAt: now },
    { id: pids[5], clientId: cid, name: 'Sports Watch', sku: 'SPW-1006', description: 'Water-resistant digital sports watch.', category: 'Accessories', basePrice: 1599, salePrice: 1199, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Color', options: ['Black','Silver','Blue'] }], inventory: 3, lowStockThreshold: 5, purchasePrice: 700, slug: 'sports-watch', status: 'active', views: 180, addToCartCount: 50, purchaseCount: 25, location: 'Shelf C2', createdAt: daysAgo(15), updatedAt: now },
    { id: pids[6], clientId: cid, name: 'Canvas Backpack', sku: 'CNB-1007', description: 'Durable canvas backpack with laptop compartment.', category: 'Accessories', basePrice: 999, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Color', options: ['Gray','Green','Blue'] }], inventory: 22, lowStockThreshold: 8, purchasePrice: 450, slug: 'canvas-backpack', status: 'active', views: 70, addToCartCount: 18, purchaseCount: 10, location: 'Shelf C3', createdAt: daysAgo(12), updatedAt: now },
    { id: pids[7], clientId: cid, name: 'Formal Shirt', sku: 'FMS-1008', description: 'Classic formal shirt with premium cotton fabric.', category: 'Clothing', basePrice: 999, salePrice: 799, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Size', options: ['S','M','L','XL'] }, { id: generateId(), type: 'Color', options: ['White','Light Blue','Pink'] }], inventory: 35, lowStockThreshold: 10, purchasePrice: 450, slug: 'formal-shirt', status: 'active', views: 60, addToCartCount: 15, purchaseCount: 8, location: 'Shelf A4', createdAt: daysAgo(10), updatedAt: now },
    { id: pids[8], clientId: cid, name: 'Wireless Earbuds', sku: 'WEB-1009', description: 'True wireless earbuds with noise cancellation.', category: 'Electronics', basePrice: 1999, salePrice: 1499, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Color', options: ['Black','White'] }], inventory: 0, lowStockThreshold: 5, purchasePrice: 800, slug: 'wireless-earbuds', status: 'active', views: 250, addToCartCount: 60, purchaseCount: 30, location: 'Shelf D1', createdAt: daysAgo(8), updatedAt: now },
    { id: pids[9], clientId: cid, name: 'Sunglasses', sku: 'SNG-1010', description: 'UV-protected polarized sunglasses.', category: 'Accessories', basePrice: 499, images: ['/placeholder-product.svg'], variants: [{ id: generateId(), type: 'Style', options: ['Aviator','Wayfarer','Round'] }], inventory: 40, lowStockThreshold: 10, purchasePrice: 200, slug: 'sunglasses', status: 'active', views: 90, addToCartCount: 22, purchaseCount: 14, location: 'Shelf C4', createdAt: daysAgo(5), updatedAt: now },
  ];
  await storage.saveProducts(cid, products);

  const custIds = [generateId(), generateId(), generateId()];
  const customers = [
    { id: custIds[0], clientId: cid, name: 'Rahim Ahmed', phone: '01712345678', email: 'rahim@email.com', addresses: [{ id: generateId(), address: '123 Dhanmondi, Road 5', city: 'Dhaka', isDefault: true }], totalOrders: 3, totalSpent: 3500, loyaltyPoints: 50, loyaltyHistory: [{ id: generateId(), points: 50, reason: 'Purchase reward', date: daysAgo(5) }], tags: ['VIP'], notes: 'Loyal customer', createdAt: daysAgo(30), updatedAt: now },
    { id: custIds[1], clientId: cid, name: 'Fatima Begum', phone: '01898765432', email: 'fatima@email.com', addresses: [{ id: generateId(), address: '45 Gulshan Avenue', city: 'Dhaka', isDefault: true }], totalOrders: 2, totalSpent: 2200, loyaltyPoints: 30, loyaltyHistory: [{ id: generateId(), points: 30, reason: 'Purchase reward', date: daysAgo(10) }], tags: ['Regular'], createdAt: daysAgo(20), updatedAt: now },
    { id: custIds[2], clientId: cid, name: 'Kamal Hossain', phone: '01555123456', email: 'kamal@email.com', addresses: [{ id: generateId(), address: '78 Agrabad C/A', city: 'Chittagong', isDefault: true }], totalOrders: 1, totalSpent: 999, loyaltyPoints: 10, loyaltyHistory: [{ id: generateId(), points: 10, reason: 'First purchase', date: daysAgo(3) }], tags: [], createdAt: daysAgo(10), updatedAt: now },
  ];
  await storage.saveCustomers(cid, customers);

  const orders = [
    { id: generateId(), clientId: cid, orderNumber: 'ORD-10001', customerId: custIds[0], customerName: 'Rahim Ahmed', customerPhone: '01712345678', shippingAddress: '123 Dhanmondi, Road 5', city: 'Dhaka', items: [{ productId: pids[0], productName: 'Classic T-Shirt', variant: { Size: 'M', Color: 'White' }, quantity: 2, price: 449, total: 898 }], subtotal: 898, discount: 0, shippingCost: 60, total: 958, paymentMethod: 'cod', paymentStatus: 'pending', status: 'pending', statusHistory: [{ status: 'pending', timestamp: daysAgo(1) }], createdAt: daysAgo(1), updatedAt: now },
    { id: generateId(), clientId: cid, orderNumber: 'ORD-10002', customerId: custIds[0], customerName: 'Rahim Ahmed', customerPhone: '01712345678', shippingAddress: '123 Dhanmondi, Road 5', city: 'Dhaka', items: [{ productId: pids[2], productName: 'Running Shoes', variant: { Size: '9' }, quantity: 1, price: 1899, total: 1899 }], subtotal: 1899, discount: 100, shippingCost: 0, total: 1799, paymentMethod: 'bkash', paymentStatus: 'paid', status: 'processing', statusHistory: [{ status: 'pending', timestamp: daysAgo(3) }, { status: 'processing', timestamp: daysAgo(2) }], createdAt: daysAgo(3), updatedAt: now },
    { id: generateId(), clientId: cid, orderNumber: 'ORD-10003', customerId: custIds[1], customerName: 'Fatima Begum', customerPhone: '01898765432', shippingAddress: '45 Gulshan Avenue', city: 'Dhaka', items: [{ productId: pids[4], productName: 'Summer Dress', variant: { Size: 'M' }, quantity: 1, price: 699, total: 699 }, { productId: pids[3], productName: 'Leather Wallet', quantity: 1, price: 799, total: 799 }], subtotal: 1498, discount: 0, shippingCost: 0, total: 1498, paymentMethod: 'nagad', paymentStatus: 'paid', status: 'processing', statusHistory: [{ status: 'pending', timestamp: daysAgo(5) }, { status: 'processing', timestamp: daysAgo(4) }], createdAt: daysAgo(5), updatedAt: now },
    { id: generateId(), clientId: cid, orderNumber: 'ORD-10004', customerId: custIds[1], customerName: 'Fatima Begum', customerPhone: '01898765432', shippingAddress: '45 Gulshan Avenue', city: 'Dhaka', items: [{ productId: pids[5], productName: 'Sports Watch', variant: { Color: 'Black' }, quantity: 1, price: 1199, total: 1199 }], subtotal: 1199, discount: 50, shippingCost: 60, total: 1209, paymentMethod: 'cod', paymentStatus: 'paid', status: 'shipped', statusHistory: [{ status: 'pending', timestamp: daysAgo(7) }, { status: 'processing', timestamp: daysAgo(6) }, { status: 'shipped', timestamp: daysAgo(4) }], createdAt: daysAgo(7), updatedAt: now },
    { id: generateId(), clientId: cid, orderNumber: 'ORD-10005', customerId: custIds[2], customerName: 'Kamal Hossain', customerPhone: '01555123456', shippingAddress: '78 Agrabad C/A', city: 'Chittagong', items: [{ productId: pids[1], productName: 'Blue Jeans', variant: { Size: '32' }, quantity: 1, price: 999, total: 999 }], subtotal: 999, discount: 0, shippingCost: 60, total: 1059, paymentMethod: 'cod', paymentStatus: 'paid', status: 'delivered', statusHistory: [{ status: 'pending', timestamp: daysAgo(14) }, { status: 'processing', timestamp: daysAgo(13) }, { status: 'shipped', timestamp: daysAgo(11) }, { status: 'delivered', timestamp: daysAgo(9) }], createdAt: daysAgo(14), updatedAt: now },
  ];
  await storage.saveOrders(cid, orders);

  const leads = [
    { id: generateId(), clientId: cid, sessionId: 'sess-001', name: 'Nadia Islam', phone: '01611111111', firstVisit: daysAgo(2), lastVisit: daysAgo(0), totalVisits: 5, pagesViewed: ['/', '/products', '/products/running-shoes'], productsViewed: [pids[2], pids[5], pids[0]], timeOnSite: 1200, cartAbandoned: true, abandonedCartValue: 1899, abandonedCartItems: [{ productId: pids[2], productName: 'Running Shoes', quantity: 1, price: 1899 }], leadStatus: 'hot', tags: ['Ready to Buy'], sessionRecordings: [], createdAt: daysAgo(2), updatedAt: now },
    { id: generateId(), clientId: cid, sessionId: 'sess-002', name: 'Arif Rahman', phone: '01722222222', firstVisit: daysAgo(3), lastVisit: daysAgo(1), totalVisits: 4, pagesViewed: ['/', '/products', '/products/blue-jeans'], productsViewed: [pids[1], pids[7]], timeOnSite: 900, cartAbandoned: true, abandonedCartValue: 999, abandonedCartItems: [{ productId: pids[1], productName: 'Blue Jeans', quantity: 1, price: 999 }], leadStatus: 'hot', tags: ['Price Negotiation'], sessionRecordings: [], createdAt: daysAgo(3), updatedAt: now },
    { id: generateId(), clientId: cid, sessionId: 'sess-003', phone: '01833333333', firstVisit: daysAgo(4), lastVisit: daysAgo(2), totalVisits: 2, pagesViewed: ['/', '/products'], productsViewed: [pids[0]], timeOnSite: 300, cartAbandoned: false, abandonedCartValue: 0, abandonedCartItems: [], leadStatus: 'warm', tags: [], sessionRecordings: [], createdAt: daysAgo(4), updatedAt: now },
    { id: generateId(), clientId: cid, sessionId: 'sess-004', firstVisit: daysAgo(5), lastVisit: daysAgo(3), totalVisits: 2, pagesViewed: ['/', '/products/leather-wallet'], productsViewed: [pids[3]], timeOnSite: 180, cartAbandoned: false, abandonedCartValue: 0, abandonedCartItems: [], leadStatus: 'warm', tags: [], sessionRecordings: [], createdAt: daysAgo(5), updatedAt: now },
    { id: generateId(), clientId: cid, sessionId: 'sess-005', firstVisit: daysAgo(6), lastVisit: daysAgo(6), totalVisits: 1, pagesViewed: ['/'], productsViewed: [], timeOnSite: 30, cartAbandoned: false, abandonedCartValue: 0, abandonedCartItems: [], leadStatus: 'cold', tags: [], sessionRecordings: [], createdAt: daysAgo(6), updatedAt: now },
  ];
  await storage.saveLeads(cid, leads);

  const convId1 = generateId(), convId2 = generateId();
  const messages = [
    { id: generateId(), clientId: cid, customerId: custIds[0], customerName: 'Rahim Ahmed', channel: 'whatsapp', direction: 'incoming', content: 'Hi, do you have the Classic T-Shirt in XL size?', status: 'unread', tags: [], conversationId: convId1, createdAt: daysAgo(0) },
    { id: generateId(), clientId: cid, customerName: 'Nadia Islam', leadId: leads[0].id, channel: 'facebook', direction: 'incoming', content: 'What is the delivery charge to Dhaka?', status: 'unread', tags: [], conversationId: convId2, createdAt: daysAgo(1) },
    { id: generateId(), clientId: cid, customerName: 'Unknown Visitor', channel: 'website', direction: 'incoming', content: 'Do you offer Cash on Delivery?', status: 'read', tags: [], conversationId: generateId(), readAt: daysAgo(0), createdAt: daysAgo(2) },
  ];
  await storage.saveMessages(cid, messages);

  const autoResponses = [
    { id: generateId(), clientId: cid, trigger: 'cod', response: 'Yes, we offer Cash on Delivery (COD) throughout Bangladesh!', isActive: true, timesUsed: 12, createdAt: now },
    { id: generateId(), clientId: cid, trigger: 'delivery time', response: 'Orders are typically delivered within 3-5 business days.', isActive: true, timesUsed: 8, createdAt: now },
    { id: generateId(), clientId: cid, trigger: 'return', response: 'We accept returns within 7 days of delivery.', isActive: true, timesUsed: 5, createdAt: now },
    { id: generateId(), clientId: cid, trigger: 'size', response: 'Please let me know which product you are interested in!', isActive: true, timesUsed: 15, createdAt: now },
  ];
  await storage.saveAutoResponses(cid, autoResponses);

  const supIds = [generateId(), generateId()];
  const suppliers = [
    { id: supIds[0], clientId: cid, name: 'BD Textiles Ltd', contactPerson: 'Mr. Hasan', phone: '01911111111', email: 'bdtextiles@email.com', address: 'Mirpur DOHS, Dhaka', paymentTerms: 'Net 30 days', totalPurchases: 50000, totalPaid: 35000, outstandingDebt: 15000, suppliedProducts: [pids[0], pids[1], pids[4], pids[7]], payments: [{ id: generateId(), amount: 20000, date: daysAgo(20), method: 'bank_transfer', note: 'Partial payment' }, { id: generateId(), amount: 15000, date: daysAgo(5), method: 'bkash', note: 'Monthly payment' }], purchaseHistory: [{ id: generateId(), amount: 30000, date: daysAgo(30), note: 'Initial stock' }, { id: generateId(), amount: 20000, date: daysAgo(10), note: 'Restock' }], notes: 'Reliable supplier', createdAt: daysAgo(60) },
    { id: supIds[1], clientId: cid, name: 'Footwear Hub', contactPerson: 'Ms. Sultana', phone: '01822222222', email: 'footwearhub@email.com', address: 'Uttara Sector 7, Dhaka', totalPurchases: 25000, totalPaid: 25000, outstandingDebt: 0, suppliedProducts: [pids[2]], payments: [{ id: generateId(), amount: 25000, date: daysAgo(15), method: 'bank_transfer' }], purchaseHistory: [{ id: generateId(), amount: 25000, date: daysAgo(25), note: 'Shoes order' }], notes: 'Good quality shoes', createdAt: daysAgo(45) },
  ];
  await storage.saveSuppliers(cid, suppliers);

  const entries = [
    { id: generateId(), clientId: cid, type: 'income', category: 'Sales', amount: 958, description: 'Order ORD-10001', relatedOrderId: orders[0].id, paymentMethod: 'cod', date: daysAgo(1), createdAt: daysAgo(1) },
    { id: generateId(), clientId: cid, type: 'income', category: 'Sales', amount: 1799, description: 'Order ORD-10002', relatedOrderId: orders[1].id, paymentMethod: 'bkash', date: daysAgo(3), createdAt: daysAgo(3) },
    { id: generateId(), clientId: cid, type: 'income', category: 'Sales', amount: 1498, description: 'Order ORD-10003', relatedOrderId: orders[2].id, paymentMethod: 'nagad', date: daysAgo(5), createdAt: daysAgo(5) },
    { id: generateId(), clientId: cid, type: 'income', category: 'Sales', amount: 1209, description: 'Order ORD-10004', relatedOrderId: orders[3].id, paymentMethod: 'cod', date: daysAgo(7), createdAt: daysAgo(7) },
    { id: generateId(), clientId: cid, type: 'income', category: 'Sales', amount: 1059, description: 'Order ORD-10005', relatedOrderId: orders[4].id, paymentMethod: 'cod', date: daysAgo(14), createdAt: daysAgo(14) },
    { id: generateId(), clientId: cid, type: 'expense', category: 'Advertising', amount: 2000, description: 'Facebook Ads', paymentMethod: 'bkash', date: daysAgo(10), createdAt: daysAgo(10) },
    { id: generateId(), clientId: cid, type: 'expense', category: 'Courier', amount: 500, description: 'Pathao delivery charges', paymentMethod: 'cash', date: daysAgo(5), createdAt: daysAgo(5) },
    { id: generateId(), clientId: cid, type: 'expense', category: 'Supplies', amount: 300, description: 'Packaging materials', paymentMethod: 'cash', date: daysAgo(8), createdAt: daysAgo(8) },
  ];
  await storage.saveAccountingEntries(cid, entries);

  await storage.setCartClientId(cid);
  if (typeof window !== 'undefined') localStorage.setItem('data_seeded', '1');
}
