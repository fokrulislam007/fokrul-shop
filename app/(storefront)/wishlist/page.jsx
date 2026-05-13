'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';

export default function WishlistPage() {
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlist(wl);
      if (wl.length === 0) { setLoading(false); return; }

      const cid = await storage.getCartClientId();
      if (!cid) { setLoading(false); return; }

      const allProds = await storage.getProducts(cid);
      const wishProducts = allProds.filter(p => wl.includes(p.id));
      setProducts(wishProducts);
      setLoading(false);
    };
    load();
  }, []);

  const removeFromWishlist = (productId) => {
    const wl = wishlist.filter(id => id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(wl));
    setWishlist(wl);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  if (loading) {
    return (
      <div className="sf-page-loading">
        <div className="sf-page-loading__spinner" />
        <p>Loading wishlist…</p>
      </div>
    );
  }

  return (
    <div className="sf-wishlist">
      <h1 className="sf-wishlist__title">My Wishlist</h1>
      <p className="sf-wishlist__count">{products.length} item{products.length !== 1 ? 's' : ''} saved</p>

      {products.length === 0 ? (
        <div className="sf-wishlist__empty">
          <span className="sf-wishlist__empty-icon">♡</span>
          <h2>Your wishlist is empty</h2>
          <p>Save items you love and come back to them later</p>
          <Link href="/products" className="sf-wishlist__empty-btn">Browse Products</Link>
        </div>
      ) : (
        <div className="sf-wishlist__grid">
          {products.map(p => (
            <div key={p.id} className="sf-wishlist__card">
              <Link href={`/products/${p.id}`} className="sf-wishlist__card-link">
                <div className="sf-wishlist__card-img">
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <span>🛍️</span>}
                </div>
              </Link>
              <button
                className="sf-wishlist__card-remove"
                onClick={() => removeFromWishlist(p.id)}
                aria-label="Remove from wishlist"
              >
                ✕
              </button>
              <div className="sf-wishlist__card-info">
                <Link href={`/products/${p.id}`} className="sf-wishlist__card-name">{p.name}</Link>
                <p className="sf-wishlist__card-category">{p.category}</p>
                <div className="sf-wishlist__card-price">
                  {p.salePrice ? (
                    <>
                      <span className="sf-wishlist__card-sale">{formatCurrency(p.salePrice)}</span>
                      <span className="sf-wishlist__card-original">{formatCurrency(p.basePrice)}</span>
                    </>
                  ) : (
                    <span className="sf-wishlist__card-sale">{formatCurrency(p.basePrice)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
