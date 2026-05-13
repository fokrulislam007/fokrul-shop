'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { storage } from '@/lib/storage';
import { formatCurrency, generateId, BD_CITIES } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart, loaded } = useCart();
  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const primaryColor = '#3b82f6';
  const shippingRate = 60;
  const freeThreshold = 1000;

  const enabledPayments = [
    { v: 'cod', l: '💵 Cash on Delivery', d: 'Pay when you receive' },
    { v: 'bkash', l: '📱 bKash', d: 'Send to 01700000000' },
    { v: 'nagad', l: '📱 Nagad', d: 'Send to 01800000000' },
  ];
  const [form, setForm] = useState({ name:'',phone:'',email:'',address:'',city:'Dhaka',notes:'',paymentMethod:'cod' });
  const [errors, setErrors] = useState({});



  const shipping = subtotal >= freeThreshold ? 0 : shippingRate;
  const total = subtotal + shipping;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.phone.trim() || form.phone.length < 11) e.phone = 'Valid phone required';
    if (!form.address.trim()) e.address = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setPlacing(true);
    const cid = await storage.getCartClientId();
    if (!cid) return;

    const now = new Date().toISOString();
    const orderNum = `ORD-${Date.now().toString().slice(-5)}`;
    const custId = generateId();

    // Create customer if not exists
    const allCustomers = await storage.getCustomers(cid);
    const existing = allCustomers.find(c => c.phone === form.phone);
    if (!existing) {
      const cust = { id: custId, clientId: cid, name: form.name, phone: form.phone, email: form.email || undefined, addresses: [{ id: generateId(), address: form.address, city: form.city, isDefault: true }], totalOrders: 1, totalSpent: total, loyaltyPoints: Math.floor(total / 100), loyaltyHistory: [{ id: generateId(), points: Math.floor(total / 100), reason: 'Purchase', date: now }], tags: [], createdAt: now, updatedAt: now };
      await storage.addCustomer(cid, cust);
    } else {
      await storage.updateCustomer(cid, existing.id, { totalOrders: existing.totalOrders + 1, totalSpent: existing.totalSpent + total, loyaltyPoints: existing.loyaltyPoints + Math.floor(total / 100) });
    }

    const order = {
      id: generateId(), clientId: cid, orderNumber: orderNum, customerId: existing?.id || custId,
      customerName: form.name, customerPhone: form.phone, shippingAddress: form.address, city: form.city,
      items: items.map(i => ({ productId: i.productId, productName: i.productName, variant: i.variant, quantity: i.quantity, price: i.price, total: i.price * i.quantity })),
      subtotal, discount: 0, shippingCost: shipping, total, paymentMethod: form.paymentMethod,
      paymentStatus: form.paymentMethod === 'cod' ? 'pending' : 'pending',
      status: 'pending', statusHistory: [{ status: 'pending', timestamp: now }], notes: form.notes || undefined,
      createdAt: now, updatedAt: now,
    };
    await storage.addOrder(cid, order);

    // Update product stats
    for (const i of items) {
      const p = await storage.getProduct(cid, i.productId);
      if (p) await storage.updateProduct(cid, i.productId, { inventory: Math.max(0, p.inventory - i.quantity), purchaseCount: p.purchaseCount + 1 });
    }

    // Add accounting entry
    await storage.addAccountingEntry(cid, { id: generateId(), clientId: cid, type: 'income', category: 'Sales', amount: total, description: `Order ${orderNum}`, relatedOrderId: order.id, paymentMethod: form.paymentMethod, date: now, createdAt: now });

    setOrderId(orderNum);
    clearCart();
    setStep(3);
    setPlacing(false);
  };

  // Wait for cart to load before redirecting — fixes premature redirect bug
  if (!loaded) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
      </div>
    );
  }

  if (items.length === 0 && step !== 3) {
    router.push('/cart');
    return null;
  }

  // Success
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-6" style={{ backgroundColor: primaryColor + '20' }}>✓</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 mb-6">Order <strong>{orderId}</strong> has been placed successfully.</p>
        <div className="bg-gray-50 rounded-xl p-6 text-left text-sm space-y-2 mb-8">
          <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-600 font-medium">Confirmed</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="capitalize">{form.paymentMethod === 'cod' ? 'Cash on Delivery' : form.paymentMethod}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold">{formatCurrency(total)}</span></div>
        </div>
        <button onClick={() => router.push('/products')} className="px-6 py-3 text-white rounded-xl font-semibold" style={{ backgroundColor: primaryColor }}>Continue Shopping</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[{ n: 1, l: 'Information' }, { n: 2, l: 'Confirm' }].map(s => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s.n ? 'text-white' : 'bg-gray-200 text-gray-500'}`} style={step >= s.n ? { backgroundColor: primaryColor } : {}}>{s.n}</div>
            <span className={`text-sm ${step >= s.n ? 'font-medium' : 'text-gray-400'}`}>{s.l}</span>
            {s.n < 2 && <div className="w-12 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-bold text-lg">Delivery Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-600">Full Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
                <div><label className="text-sm text-gray-600">Phone *</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="01XXXXXXXXX" className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />{errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}</div>
              </div>
              <div><label className="text-sm text-gray-600">Email (optional)</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm" /></div>
              <div><label className="text-sm text-gray-600">Address *</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />{errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}</div>
              <div><label className="text-sm text-gray-600">City</label><select value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm">{BD_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-sm text-gray-600">Order Notes (optional)</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Special instructions..." className="w-full mt-1 px-4 py-2.5 border rounded-xl text-sm" /></div>
              <h2 className="font-bold text-lg pt-4">Payment Method</h2>
              <div className="space-y-3">
                {enabledPayments.map(m => (
                  <label key={m.v} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.paymentMethod === m.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="payment" checked={form.paymentMethod === m.v} onChange={() => setForm({...form, paymentMethod: m.v})} className="accent-blue-500" />
                    <div><div className="font-medium text-sm">{m.l}</div><div className="text-xs text-gray-600">{m.d}</div></div>
                  </label>
                ))}
              </div>
              <button onClick={() => { if (validate()) setStep(2); }} className="w-full py-3 text-white rounded-xl font-semibold" style={{ backgroundColor: primaryColor }}>Continue to Review</button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-xl border p-6 space-y-4">
              <h2 className="font-bold text-lg">Review Order</h2>
              <div className="p-4 bg-gray-50 rounded-xl text-sm space-y-1">
                <p><strong>{form.name}</strong> • {form.phone}</p>
                <p className="text-gray-500">{form.address}, {form.city}</p>
                <p className="text-gray-500 capitalize">Payment: {form.paymentMethod === 'cod' ? 'Cash on Delivery' : form.paymentMethod}</p>
              </div>
              <h3 className="font-medium text-sm">Items</h3>
              <div className="space-y-2">
                {items.map(i => (
                  <div key={i.productId} className="flex justify-between text-sm py-2 border-b border-gray-50">
                    <span>{i.productName} × {i.quantity}</span>
                    <span className="font-medium">{formatCurrency(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 rounded-xl text-sm font-medium">← Back</button>
                <button onClick={placeOrder} disabled={placing} className="flex-1 py-3 text-white rounded-xl font-semibold disabled:opacity-50" style={{ backgroundColor: primaryColor }}>{placing ? 'Placing...' : 'Place Order'}</button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-white rounded-xl border p-6 h-fit sticky top-24 space-y-4">
          <h3 className="font-bold">Order Summary</h3>
          <div className="space-y-2 text-sm">
            {items.map(i => <div key={i.productId} className="flex justify-between"><span className="text-gray-500 truncate mr-2">{i.productName} ×{i.quantity}</span><span>{formatCurrency(i.price * i.quantity)}</span></div>)}
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{shipping === 0 ? <span className="text-green-600">FREE</span> : formatCurrency(shipping)}</span></div>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3"><span>Total</span><span>{formatCurrency(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
