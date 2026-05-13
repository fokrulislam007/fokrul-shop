'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useLicenseCheck } from '@/hooks/useLicenseCheck';
import { seedData } from '@/lib/seed';
import { storage } from '@/lib/storage';
import ToastContainer from '@/components/shared/Toast';
import LicenseBlockOverlay from '@/components/shared/LicenseBlockOverlay';

const nav = [
  { label: '📊 Dashboard', href: '/admin', exact: true },
  { label: '🏠 Homepage', href: '/admin/homepage', exact: true },
  {
    label: '🛍️ Products', href: '/admin/products', children: [
      { label: 'All Products', href: '/admin/products' },
      { label: 'Add Product', href: '/admin/products/new' },
      { label: 'Categories', href: '/admin/products/categories' },
    ]
  },
  {
    label: '📦 Orders', href: '/admin/orders', children: [
      { label: 'All Orders', href: '/admin/orders' },
      { label: 'Pending', href: '/admin/orders/pending' },
      { label: 'Shipping', href: '/admin/orders/shipping' },
    ]
  },
  { label: '👥 All Customers', href: '/admin/customers', exact: true }, // temporary
  // They are commented out because, Inshallah, we plan to work on them in the future — not only because we lacked time to build all these features, but because they are not an immediate priority right now.
  // {
  //   label: '👥 Customers', href: '/admin/customers', children: [
  //     { label: 'All Customers', href: '/admin/customers' },
  //     { label: 'Lead Tracker', href: '/admin/customers/leads' },
  //     { label: 'Sessions', href: '/admin/customers/sessions' },
  //   ]
  // },
  // { label: '💬 Messages', href: '/admin/messages', children: [
  //   { label: 'Inbox', href: '/admin/messages' },
  //   { label: 'Auto-Responses', href: '/admin/messages/auto-responses' },
  //   { label: 'Conversations', href: '/admin/messages/conversations' },
  // ]},
  // { label: '📈 Analytics', href: '/admin/analytics/sales', children: [
  //   { label: 'Sales', href: '/admin/analytics/sales' },
  //   { label: 'Revenue', href: '/admin/analytics/revenue' },
  //   { label: 'Products', href: '/admin/analytics/products' },
  // ]},
  // { label: '⚙️ Operations', href: '/admin/operations/inventory', children: [
  //   { label: 'Inventory', href: '/admin/operations/inventory' },
  //   { label: 'Suppliers', href: '/admin/operations/suppliers' },
  //   { label: 'Accounting', href: '/admin/operations/accounting' },
  // ]},
];

export default function AdminLayout({ children }) {
  const { client, loading, logout } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const { isBlocked, isLoading: licenseLoading, contactPhone } = useLicenseCheck();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('data_seeded')) {
      seedData().catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!loading && !client) router.push('/auth/login');
    // Sync storefront to show this admin's products
    if (client) {
      storage.setCartClientId(client.id).catch(console.error);
    }
  }, [client, loading, router]);

  if (loading || !client) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" /></div>;

  const isActive = (href, exact) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link href="/admin" className="text-lg font-bold text-blue-600 truncate">{client.businessName}</Link>
          <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {nav.map(item => (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button onClick={() => setExpanded(expanded === item.label ? null : item.label)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <span>{item.label}</span>
                    <span className="text-xs">{expanded === item.label ? '▼' : '▶'}</span>
                  </button>
                  {(expanded === item.label || isActive(item.href)) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map(child => (
                        <Link key={child.href} href={child.href} onClick={() => setSidebarOpen(false)} className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${pathname === child.href ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{child.label}</Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link href={item.href} onClick={() => setSidebarOpen(false)} className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href, item.exact) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>{item.label}</Link>
              )}
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3 space-y-2">
          <Link href="/" target="_blank" className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">🌐 View Store</Link>
          <button onClick={() => { logout(); router.push('/auth/login'); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">🚪 Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="text-sm text-gray-500 hidden sm:block">{client.email}</div>
          <button onClick={() => addToast('Welcome!', 'info')} className="text-sm text-blue-500 hover:text-blue-600">🔔</button>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {isBlocked && <LicenseBlockOverlay contactPhone={contactPhone} />}
    </div>
  );
}
