'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { storage } from '@/lib/storage';
import { useCart } from '@/hooks/useCart';
import { formatCurrency, calculateDiscountPercent } from '@/lib/utils';

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="sf-page-loading">
        <div className="sf-page-loading__spinner" />
        <p>Loading products…</p>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const { addItem } = useCart();
  const [added, setAdded] = useState(null);

  // Read search query from URL (from navbar search)
  const searchQuery = searchParams.get('q') || '';
  const catParam = searchParams.get('cat') || '';

  useEffect(() => {
    const _run = async () => {
      setLoading(true);
      const cid = await storage.getCartClientId();
      if (!cid) { setLoading(false); return; }
      const allProds = await storage.getProducts(cid);
      setProducts(allProds.filter(p => p.status === 'active'));
      setCategories(await storage.getCategories(cid));
      if (catParam) setCategory(catParam);
      setLoading(false);
    };
    _run();
  }, [searchParams, catParam]);

  // Filter products
  let filtered = products.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (category !== 'all' && p.category !== category) return false;
    return true;
  });

  switch (sort) {
    case 'price_low': filtered.sort((a, b) => (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice)); break;
    case 'price_high': filtered.sort((a, b) => (b.salePrice || b.basePrice) - (a.salePrice || a.basePrice)); break;
    case 'popular': filtered.sort((a, b) => b.purchaseCount - a.purchaseCount); break;
    default: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const handleAdd = (p) => {
    addItem({ productId: p.id, productName: p.name, image: p.images[0], price: p.salePrice || p.basePrice, quantity: 1 });
    setAdded(p.id); setTimeout(() => setAdded(null), 1500);
  };

  if (loading) {
    return (
      <div className="sf-page-loading">
        <div className="sf-page-loading__spinner" />
        <p>Loading products…</p>
      </div>
    );
  }

  return (
    <div className="sf-products">
      <h1 className="sf-products__title">
        {searchQuery ? `Search: "${searchQuery}"` : 'All Products'}
      </h1>

      {/* Filters — no search input (navbar has it) */}
      <div className="sf-products__filters">
        <select value={category} onChange={e => setCategory(e.target.value)} className="sf-products__filter-select">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="sf-products__filter-select">
          <option value="newest">Newest</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="sf-products__grid">
          {filtered.map(p => {
            const discount = p.salePrice ? calculateDiscountPercent(p.basePrice, p.salePrice) : 0;
            return (
              <div key={p.id} className="sf-products__card">
                <Link href={`/products/${p.id}`} className="sf-products__card-img-link">
                  <div className="sf-products__card-img">
                    {p.images?.[0] && p.images[0] !== '/placeholder-product.svg' ? (
                      <img src={p.images[0]} alt={p.name} />
                    ) : (
                      <span className="sf-products__card-placeholder">🛍️</span>
                    )}
                  </div>
                  {discount > 0 && <span className="sf-products__card-badge">{discount}% OFF</span>}
                  {p.inventory === 0 && <span className="sf-products__card-badge sf-products__card-badge--sold">Sold Out</span>}
                  {p.inventory > 0 && p.inventory <= 5 && <span className="sf-products__card-badge sf-products__card-badge--low">Only {p.inventory} left!</span>}
                </Link>
                <div className="sf-products__card-body">
                  <Link href={`/products/${p.id}`} className="sf-products__card-name">{p.name}</Link>
                  {/* <p className="sf-products__card-category">{p.category}</p> */}
                  <div className="sf-products__card-prices">
                    {p.salePrice ? (
                      <>
                        <span className="sf-products__card-price sf-products__card-price--original">{formatCurrency(p.basePrice)}</span>
                        <span className="sf-products__card-price sf-products__card-price--sale">{formatCurrency(p.salePrice)}</span>
                      </>
                    ) : (
                      <span className="sf-products__card-price">{formatCurrency(p.basePrice)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleAdd(p)}
                    disabled={p.inventory === 0}
                    className={`sf-products__card-btn ${added === p.id ? 'sf-products__card-btn--added' : ''}`}
                  >
                    {added === p.id ? '✓ Added!' : p.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sf-products__empty">
          <span>🔍</span>
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}
