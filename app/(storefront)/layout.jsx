'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { getVisitorId } from '@/lib/fingerprint';

import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/useToast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useTracking } from '@/hooks/useTracking';
import { useSessionRecorder } from '@/hooks/useSessionRecorder';
import ToastContainer from '@/components/shared/Toast';
import Chatbot from '@/components/storefront/Chatbot';
import './storefront-layout.css';
import './storefront-pages.css';
import './storefront-pages-2.css';



export default function StorefrontLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const { toasts, removeToast } = useToast();
  const { customer, logout } = useCustomerAuth();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [navCategories, setNavCategories] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [branding, setBranding] = useState(null);
  const dropdownRef = useRef(null);

  useTracking();
  useSessionRecorder();

  useEffect(() => {
    const fetchData = async () => {
      const cid = await storage.getCartClientId();
      if (!cid) return;
      const [cats, brandingData] = await Promise.all([
        storage.getCategories(cid),
        storage.getSettings(cid, 'branding'),
      ]);
      setNavCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
      if (brandingData) setBranding(brandingData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setMobileMenu(false); setMobileSearchOpen(false); }, [pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  // Render logo (text or image)
  const renderNavbarLogo = () => {
    if (branding?.navbarLogoType === 'image' && branding.navbarLogoImage) {
      return <img src={branding.navbarLogoImage} alt="Store" className="sf-header__logo-img" />;
    }
    return branding?.navbarLogoText || 'Store';
  };

  const renderFooterLogo = () => {
    if (branding?.footerLogoType === 'image' && branding.footerLogoImage) {
      return <img src={branding.footerLogoImage} alt="Store" className="sf-footer-app__logo-img" />;
    }
    return <span className="sf-footer-app__logo-text">{branding?.footerLogoText || '🛍️'}</span>;
  };

  return (
    <div className="sf-layout">

      {/* ===== HEADER ===== */}
      <header className="sf-header" role="banner">
        <div className="sf-header__inner">

          {/* Hamburger (mobile) */}
          <button
            className={`sf-header__hamburger${mobileMenu ? ' sf-header__hamburger--open' : ''}`}
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-expanded={mobileMenu}
            aria-label="Toggle navigation menu"
          >
            <span /><span /><span />
          </button>

          {/* Logo — dynamic from admin */}
          <Link href="/" className="sf-header__logo" aria-label="Homepage">
            {renderNavbarLogo()}
          </Link>

          {/* Search bar — hidden on mobile, shown on desktop */}
          <form className="sf-header__search" role="search" onSubmit={handleSearch}>
            <label htmlFor="sf-search" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              Search for anything
            </label>
            <input
              className="sf-header__search-input"
              id="sf-search"
              type="search"
              placeholder="Search for anything"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search for anything"
            />
            <button className="sf-header__search-btn" type="submit" aria-label="Submit search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </button>
          </form>

          {/* Actions */}
          <nav className="sf-header__actions" aria-label="User actions">

            {/* Mobile search icon */}
            <button className="sf-header__mobile-search-btn" onClick={() => setMobileSearchOpen(!mobileSearchOpen)} aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </button>

            {/* Sign in / Profile */}
            {customer ? (
              <div className="sf-header__profile" ref={dropdownRef}>
                <button
                  className="sf-header__profile-btn"
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  aria-label="Account menu"
                >
                  {customer.photo ? (
                    <img src={customer.photo} alt="" className="sf-header__profile-avatar" />
                  ) : (
                    <span className="sf-header__profile-initial">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {profileDropdown && (
                  <div className="sf-header__dropdown">
                    <div className="sf-header__dropdown-header">
                      <div className="sf-header__dropdown-name">{customer.name}</div>
                      <div className="sf-header__dropdown-email">{customer.email}</div>
                    </div>
                    <Link href="/account" onClick={() => setProfileDropdown(false)} className="sf-header__dropdown-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      My Account
                    </Link>
                    <Link href="/account/orders" onClick={() => setProfileDropdown(false)} className="sf-header__dropdown-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
                      My Orders
                    </Link>
                    <Link href="/wishlist" onClick={() => setProfileDropdown(false)} className="sf-header__dropdown-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      Wishlist
                    </Link>
                    <div className="sf-header__dropdown-divider" />
                    <button onClick={() => { logout(); setProfileDropdown(false); }} className="sf-header__dropdown-item sf-header__dropdown-item--danger">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="sf-header__sign-in">
                Sign in
              </Link>
            )}

            {/* Favorites / Wishlist */}
            <Link href="/wishlist" className="sf-header__icon" aria-label="Wishlist">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="sf-header__icon sf-header__icon--cart" aria-label="Cart">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
              {itemCount > 0 && <span className="sf-header__cart-badge">{itemCount}</span>}
            </Link>

          </nav>
        </div>

        {/* Mobile search bar — slides down */}
        {mobileSearchOpen && (
          <div className="sf-header__mobile-search">
            <form onSubmit={handleSearch} className="sf-header__mobile-search-form">
              <input
                type="search"
                placeholder="Search for anything"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" aria-label="Search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Navigation Overlay */}
      <nav className={`sf-mobile-nav${mobileMenu ? ' sf-mobile-nav--open' : ''}`} aria-label="Main navigation">
        <ul className="sf-mobile-nav__list">
          <li className="sf-mobile-nav__item"><Link href="/">Home</Link></li>
          <li className="sf-mobile-nav__item"><Link href="/products">All Products</Link></li>
          {navCategories.map(cat => (
            <li key={cat.id} className="sf-mobile-nav__item">
              <Link href={`/products?cat=${encodeURIComponent(cat.name)}`}>{cat.name}</Link>
            </li>
          ))}
          <li className="sf-mobile-nav__item"><Link href="/wishlist">♡ Wishlist</Link></li>
          {customer ? (
            <>
              <li className="sf-mobile-nav__item"><Link href="/account">My Account</Link></li>
              <li className="sf-mobile-nav__item"><Link href="/account/orders">My Orders</Link></li>
              <li className="sf-mobile-nav__item">
                <a href="#" onClick={e => { e.preventDefault(); logout(); }} style={{ color: '#c7102f' }}>Sign Out</a>
              </li>
            </>
          ) : (
            <>
              <li className="sf-mobile-nav__item"><Link href="/login">Sign In</Link></li>
              <li className="sf-mobile-nav__item"><Link href="/signup">Create Account</Link></li>
            </>
          )}
        </ul>
      </nav>

      {/* ===== SECONDARY NAV ===== */}
      <nav className="sf-secondary-nav" aria-label="Category navigation">
        <div className="sf-secondary-nav__inner">
          <Link href="/products" className="sf-secondary-nav__item sf-secondary-nav__item--icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
            All Products
          </Link>
          {navCategories.map(cat => (
            <Link key={cat.id} href={`/products?cat=${encodeURIComponent(cat.name)}`} className="sf-secondary-nav__item">
              {cat.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* ===== MAIN CONTENT ===== */}
      <main className="sf-main">{children}</main>

      {/* ===== FOOTER ===== */}
      <footer className="sf-footer" role="contentinfo">

        {/* Newsletter */}
        <div className="sf-newsletter">
          <p className="sf-newsletter__text">
            Get exclusive offers & updates via SMS. Enter your phone number below.
          </p>
          <form className="sf-newsletter__form" action="#" method="post" aria-label="Phone subscription" onSubmit={async (e) => {
            e.preventDefault();
            if (!phoneNumber.trim() || phoneSaved) return;
            try {
              const cid = await storage.getCartClientId();
              if (!cid) return;
              if (customer) {
                const customers = await storage.getCustomers(cid);
                const found = customers.find(c => c.email === customer.email);
                if (found) await storage.updateCustomer(cid, found.id, { phone: phoneNumber.trim() });
              } else {
                const visitor = getVisitorId();
                const leads = await storage.getLeads(cid);
                const lead = leads.find(l => l.sessionId === visitor.fingerprintId);
                if (lead) await storage.updateLead(cid, lead.id, { phone: phoneNumber.trim() });
              }
              setPhoneSaved(true);
              setPhoneNumber('');
              setTimeout(() => setPhoneSaved(false), 4000);
            } catch (err) { console.error('Phone save error:', err); }
          }}>
            <label htmlFor="sf-newsletter-phone" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              Enter your phone number
            </label>
            <input className="sf-newsletter__input" id="sf-newsletter-phone" type="tel" placeholder="01XXXXXXXXX" autoComplete="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            <button className="sf-newsletter__btn" type="submit">{phoneSaved ? '✓ Saved!' : 'Discount'}</button>
          </form>
        </div>

        {/* Footer columns */}
        <div className="sf-footer-content">
          <aside className="sf-footer-app" aria-label="Store info">
            <div className="sf-footer-app__icon">{renderFooterLogo()}</div>
          </aside>

          <nav className="sf-footer-nav" aria-label="Footer navigation">
            <div>
              <h3 className="sf-footer-col__heading">Shop</h3>
              <ul className="sf-footer-col__list">
                <li className="sf-footer-col__item"><Link href="/products">All Products</Link></li>
                {navCategories.slice(0, 5).map(cat => (
                  <li key={cat.id} className="sf-footer-col__item"><Link href={`/products?cat=${encodeURIComponent(cat.name)}`}>{cat.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="sf-footer-col__heading">Account</h3>
              <ul className="sf-footer-col__list">
                <li className="sf-footer-col__item"><Link href="/login">Sign In</Link></li>
                <li className="sf-footer-col__item"><Link href="/signup">Create Account</Link></li>
                <li className="sf-footer-col__item"><Link href="/account">My Account</Link></li>
                <li className="sf-footer-col__item"><Link href="/account/orders">My Orders</Link></li>
                <li className="sf-footer-col__item"><Link href="/wishlist">Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="sf-footer-col__heading">Pages</h3>
              <ul className="sf-footer-col__list">
                <li className="sf-footer-col__item"><Link href="/">Home</Link></li>
                <li className="sf-footer-col__item"><Link href="/products">Products</Link></li>
                <li className="sf-footer-col__item"><Link href="/cart">Cart</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Footer bottom bar */}
        <div className="sf-footer-bottom">
          <div className="sf-footer-bottom__inner">
            <div className="sf-footer-bottom__region">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              Bangladesh &nbsp;|&nbsp; English (US) &nbsp;|&nbsp; ৳ (BDT)
            </div>
            <span className="sf-footer-bottom__copyright">© {new Date().getFullYear()} All Rights Reserved</span>
            <nav className="sf-footer-bottom__links" aria-label="Legal links">
              <a href="#" className="sf-footer-bottom__link">Terms of Use</a>
              <a href="#" className="sf-footer-bottom__link">Privacy</a>
            </nav>
          </div>
        </div>

      </footer>

      {/* Overlays */}
      <Chatbot />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
