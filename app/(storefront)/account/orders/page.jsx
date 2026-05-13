'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OrdersPage() {
  const router = useRouter();
  const { customer } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const loadOrders = useCallback(async () => {
    if (!customer) { setLoading(false); return; }
    try {
      const cid = await storage.getCartClientId();
      if (!cid) return;
      const allOrders = await storage.getOrders(cid);
      const myOrders = allOrders.filter(o =>
        o.customerEmail === customer.email ||
        (customer.phone && o.customerPhone === customer.phone)
      );
      setOrders(myOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Load orders error:', err);
    }
    setLoading(false);
  }, [customer]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  if (!customer) {
    return (
      <div className="sf-orders-auth">
        <span className="sf-orders-auth__icon">📦</span>
        <h1>Sign in to view your orders</h1>
        <p>Track your orders and view order history</p>
        <Link href="/login" className="sf-orders-auth__btn">Sign In</Link>
      </div>
    );
  }

  const statusConfig = {
    pending: { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
    processing: { color: '#3b82f6', bg: '#dbeafe', label: 'Processing' },
    shipped: { color: '#8b5cf6', bg: '#ede9fe', label: 'Shipped' },
    delivered: { color: '#10b981', bg: '#d1fae5', label: 'Delivered' },
    cancelled: { color: '#ef4444', bg: '#fee2e2', label: 'Cancelled' },
  };

  if (loading) {
    return (
      <div className="sf-page-loading">
        <div className="sf-page-loading__spinner" />
        <p>Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="sf-orders">
      <div className="sf-orders__header">
        <h1 className="sf-orders__title">My Orders</h1>
        <Link href="/account" className="sf-orders__back">← Back to Account</Link>
      </div>

      {orders.length === 0 ? (
        <div className="sf-orders__empty">
          <span>📦</span>
          <h2>No orders yet</h2>
          <p>Start shopping to see your orders here!</p>
          <Link href="/products" className="sf-orders__empty-btn">Browse Products</Link>
        </div>
      ) : (
        <div className="sf-orders__list">
          {orders.map(order => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="sf-orders__card">
                <button className="sf-orders__card-header" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                  <div className="sf-orders__card-main">
                    <span className="sf-orders__order-num">#{order.orderNumber || order.id.slice(-8).toUpperCase()}</span>
                    <span className="sf-orders__status" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
                  </div>
                  <div className="sf-orders__card-meta">
                    <span>{formatDate(order.createdAt)}</span>
                    <span className="sf-orders__card-total">{formatCurrency(order.total)}</span>
                  </div>
                  <span className={`sf-orders__expand ${isExpanded ? 'sf-orders__expand--open' : ''}`}>▾</span>
                </button>
                {isExpanded && (
                  <div className="sf-orders__card-details">
                    <div className="sf-orders__items">
                      {order.items.map((item, i) => (
                        <div key={i} className="sf-orders__item">
                          <span className="sf-orders__item-name">{item.productName}</span>
                          <span className="sf-orders__item-qty">×{item.quantity}</span>
                          <span className="sf-orders__item-price">{formatCurrency(item.total || item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="sf-orders__summary">
                      <div><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                      <div><span>Shipping</span><span>{formatCurrency(order.shippingCost)}</span></div>
                      <div className="sf-orders__summary-total"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                    </div>
                    {order.shippingAddress && (
                      <div className="sf-orders__address">
                        <strong>Delivery:</strong> {order.shippingAddress}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
