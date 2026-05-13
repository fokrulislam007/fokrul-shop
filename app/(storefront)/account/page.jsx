'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { storage } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function AccountPage() {
  const router = useRouter();
  const { customer, logout } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="sf-account-auth">
        <div className="sf-account-auth__icon">
          <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <h1>Sign in to your account</h1>
        <p>Track your orders, save your details, and get personalized offers.</p>
        <Link href="/login" className="sf-account-auth__btn">Sign In</Link>
      </div>
    );
  }

  const statusConfig = {
    pending: { color: '#f59e0b', bg: '#fef3c7' },
    processing: { color: '#3b82f6', bg: '#dbeafe' },
    shipped: { color: '#8b5cf6', bg: '#ede9fe' },
    delivered: { color: '#10b981', bg: '#d1fae5' },
    cancelled: { color: '#ef4444', bg: '#fee2e2' },
  };

  return (
    <div className="sf-account">
      {/* Profile Header */}
      <div className="sf-account__hero">
        <div className="sf-account__avatar">
          {customer.photo ? (
            <img src={customer.photo} alt="" />
          ) : (
            <span>{customer.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="sf-account__user-info">
          <h1>{customer.name}</h1>
          <p>{customer.email}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="sf-account__stats">
        <div className="sf-account__stat">
          <div className="sf-account__stat-value">{orders.length}</div>
          <div className="sf-account__stat-label">Total Orders</div>
        </div>
        <div className="sf-account__stat">
          <div className="sf-account__stat-value">{formatCurrency(orders.reduce((s, o) => s + o.total, 0))}</div>
          <div className="sf-account__stat-label">Total Spent</div>
        </div>
        <div className="sf-account__stat">
          <div className="sf-account__stat-value">{orders.filter(o => o.status === 'pending' || o.status === 'processing').length}</div>
          <div className="sf-account__stat-label">Active Orders</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="sf-account__links">
        <Link href="/account/orders" className="sf-account__link-card">
          <span className="sf-account__link-icon">📦</span>
          <span>My Orders</span>
          <span className="sf-account__link-arrow">→</span>
        </Link>
        <Link href="/wishlist" className="sf-account__link-card">
          <span className="sf-account__link-icon">♡</span>
          <span>Wishlist</span>
          <span className="sf-account__link-arrow">→</span>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="sf-account__recent">
        <div className="sf-account__recent-header">
          <h2>Recent Orders</h2>
          {orders.length > 0 && <Link href="/account/orders">View All →</Link>}
        </div>

        {loading ? (
          <div className="sf-page-loading">
            <div className="sf-page-loading__spinner" />
          </div>
        ) : orders.length > 0 ? (
          <div className="sf-account__order-list">
            {orders.slice(0, 5).map(order => {
              const sc = statusConfig[order.status] || statusConfig.pending;
              return (
                <div key={order.id} className="sf-account__order-item">
                  <div className="sf-account__order-top">
                    <span className="sf-account__order-num">#{order.orderNumber || order.id.slice(-8).toUpperCase()}</span>
                    <span className="sf-account__order-status" style={{ color: sc.color, background: sc.bg }}>{order.status}</span>
                  </div>
                  <div className="sf-account__order-bottom">
                    <span>{formatDate(order.createdAt)} • {order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    <span className="sf-account__order-total">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="sf-account__empty">
            <span>📦</span>
            <p>No orders yet</p>
            <Link href="/products" className="sf-account__empty-btn">Browse Products</Link>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button onClick={() => { logout(); router.push('/'); }} className="sf-account__signout">Sign Out</button>
    </div>
  );
}
