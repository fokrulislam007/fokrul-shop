'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { storage } from '@/lib/storage';
import { formatCurrency, generateId } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, itemCount, clearCart } = useCart();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [errors, setErrors] = useState({});
  const [shippingConfig, setShippingConfig] = useState(null);
  const [loadingShipping, setLoadingShipping] = useState(true);

  // Fetch shipping settings from admin
  useEffect(() => {
    const fetchShipping = async () => {
      const cid = await storage.getCartClientId();
      if (!cid) { setLoadingShipping(false); return; }
      const data = await storage.getSettings(cid, 'shipping');
      setShippingConfig(data || { mode: 'flat', flatRate: 60, tiers: [] });
      setLoadingShipping(false);
    };
    fetchShipping();
  }, []);

  // Calculate shipping based on admin config and quantity
  const calculateShipping = () => {
    if (!shippingConfig) return 0;
    if (shippingConfig.mode === 'flat') return shippingConfig.flatRate || 0;
    // Tiered
    const tiers = shippingConfig.tiers || [];
    const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
    for (const tier of sorted) {
      if (itemCount >= tier.minQty && itemCount <= tier.maxQty) return tier.cost;
    }
    // If quantity exceeds all tiers, use last tier
    if (sorted.length > 0 && itemCount > sorted[sorted.length - 1].maxQty) {
      return sorted[sorted.length - 1].cost;
    }
    return 0;
  };

  const shipping = calculateShipping();
  const total = subtotal + shipping;

  // Order success screen
  if (orderId) {
    return (
      <div className="sf-cart-success">
        <div className="sf-cart-success__icon">✓</div>
        <h1 className="sf-cart-success__title">Order Confirmed!</h1>
        <p className="sf-cart-success__text">Order <strong>{orderId}</strong> has been placed successfully.</p>
        <div className="sf-cart-success__info">
          <div className="sf-cart-success__row"><span>Status</span><span className="sf-cart-success__status">Confirmed</span></div>
          <div className="sf-cart-success__row"><span>Payment</span><span>Cash on Delivery</span></div>
        </div>
        <button onClick={() => router.push('/products')} className="sf-cart-success__btn">Continue Shopping</button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="sf-cart-empty">
        <span className="sf-cart-empty__icon">🛒</span>
        <h1 className="sf-cart-empty__title">Your cart is empty</h1>
        <p className="sf-cart-empty__text">Browse our products and add items to your cart</p>
        <Link href="/products" className="sf-cart-empty__btn">Start Shopping</Link>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!phone.trim() || phone.length < 11) e.phone = 'Valid phone required (11 digits)';
    if (!address.trim()) e.address = 'Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setPlacing(true);

    const cid = await storage.getCartClientId();
    if (!cid) { setPlacing(false); return; }

    const now = new Date().toISOString();
    const orderNum = `ORD-${Date.now().toString().slice(-5)}`;
    const custId = generateId();

    // Create or update customer
    const allCustomers = await storage.getCustomers(cid);
    const existing = allCustomers.find(c => c.phone === phone.trim());
    const customerName = existing?.name || 'Customer';

    if (!existing) {
      const cust = {
        id: custId, clientId: cid, name: customerName, phone: phone.trim(),
        addresses: [{ id: generateId(), address: address.trim(), isDefault: true }],
        totalOrders: 1, totalSpent: total,
        loyaltyPoints: Math.floor(total / 100),
        loyaltyHistory: [{ id: generateId(), points: Math.floor(total / 100), reason: 'Purchase', date: now }],
        tags: [], createdAt: now, updatedAt: now,
      };
      await storage.addCustomer(cid, cust);
    } else {
      await storage.updateCustomer(cid, existing.id, {
        totalOrders: existing.totalOrders + 1,
        totalSpent: existing.totalSpent + total,
        loyaltyPoints: existing.loyaltyPoints + Math.floor(total / 100),
      });
    }

    // Create order
    const order = {
      id: generateId(), clientId: cid, orderNumber: orderNum,
      customerId: existing?.id || custId, customerName: customerName || 'Customer',
      customerPhone: phone.trim(), shippingAddress: address.trim(),
      items: items.map(i => ({
        productId: i.productId, productName: i.productName,
        variant: i.variant || null, quantity: i.quantity, price: i.price,
        total: i.price * i.quantity,
      })),
      subtotal, discount: 0, shippingCost: shipping, total,
      paymentMethod: 'cod', paymentStatus: 'pending', status: 'pending',
      statusHistory: [{ status: 'pending', timestamp: now }],
      notes: '',
      createdAt: now, updatedAt: now,
    };
    await storage.addOrder(cid, order);

    // Update product stats
    for (const i of items) {
      const p = await storage.getProduct(cid, i.productId);
      if (p) await storage.updateProduct(cid, i.productId, {
        inventory: Math.max(0, p.inventory - i.quantity),
        purchaseCount: p.purchaseCount + 1,
      });
    }

    // Add accounting entry
    await storage.addAccountingEntry(cid, {
      id: generateId(), clientId: cid, type: 'income', category: 'Sales',
      amount: total, description: `Order ${orderNum}`, relatedOrderId: order.id,
      paymentMethod: 'cod', date: now, createdAt: now,
    });

    setOrderId(orderNum);
    clearCart();
    setPlacing(false);
  };

  return (
    <div className="sf-cart">
      <h1 className="sf-cart__title">Shopping Cart ({itemCount} items)</h1>
      <div className="sf-cart__grid">
        {/* Items */}
        <div className="sf-cart__items">
          {items.map(item => (
            <div key={`${item.productId}-${JSON.stringify(item.variant)}`} className="sf-cart__item">
              <div className="sf-cart__item-img">
                {item.image ? <img src={item.image} alt={item.productName} /> : <span>🛍️</span>}
              </div>
              <div className="sf-cart__item-info">
                <Link href={`/products/${item.productId}`} className="sf-cart__item-name">{item.productName}</Link>
                {item.variant && <p className="sf-cart__item-variant">{Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(' • ')}</p>}
                <p className="sf-cart__item-price">{formatCurrency(item.price)}</p>
              </div>
              <div className="sf-cart__item-actions">
                <button onClick={() => removeItem(item.productId)} className="sf-cart__item-remove">✕ Remove</button>
                <div className="sf-cart__item-qty">
                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                </div>
                <span className="sf-cart__item-total">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery + Order Summary */}
        <div className="sf-cart__sidebar">
          <div className="sf-cart__order-box">
            <h3 className="sf-cart__order-title">Complete Your Order</h3>

            {/* Phone */}
            <div className="sf-cart__field">
              <label>Phone Number *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="01XXXXXXXXX" />
              {errors.phone && <p className="sf-cart__field-error">{errors.phone}</p>}
            </div>

            {/* Address */}
            <div className="sf-cart__field">
              <label>Delivery Address *</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="Full address with house no., road, area..." />
              {errors.address && <p className="sf-cart__field-error">{errors.address}</p>}
            </div>

            {/* Summary */}
            <div className="sf-cart__summary">
              <div className="sf-cart__summary-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="sf-cart__summary-row">
                <span>Shipping ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                <span>{loadingShipping ? '...' : formatCurrency(shipping)}</span>
              </div>
            </div>
            <div className="sf-cart__total-row"><span>Total</span><span>{formatCurrency(total)}</span></div>

            {/* Cash on Delivery Button */}
            <button
              onClick={placeOrder}
              disabled={placing || loadingShipping}
              className="sf-cart__place-btn"
            >
              {placing ? (
                <><div className="sf-cart__spinner" />Placing Order...</>
              ) : (
                <>💵 Cash on Delivery — {formatCurrency(total)}</>
              )}
            </button>

            <Link href="/products" className="sf-cart__continue-btn">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
