'use client';
import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { useCart } from '@/hooks/useCart';
import { formatCurrency, calculateDiscountPercent } from '@/lib/utils';
import { AccordionSections } from '@/components/storefront/ProductDetailSections';
import {
  ChevronLeft, ChevronRight, Heart, Star, ChevronDown, ChevronUp,
  Truck, MessageSquare, Flag
} from 'lucide-react';

export default function ProductDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [activeImg, setActiveImg] = useState(0);
  const [openSections, setOpenSections] = useState(['details']);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistedRelated, setWishlistedRelated] = useState({});
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const thumbnailRef = useRef(null);
  const [thumbScrollPos, setThumbScrollPos] = useState(0);

  const toggleSection = (s) =>
    setOpenSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // Load wishlist from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
    setWishlisted(wl.includes(id));
    const relMap = {};
    wl.forEach(pid => { relMap[pid] = true; });
    setWishlistedRelated(relMap);
  }, [id]);

  const toggleWishlist = (productId) => {
    const wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const idx = wl.indexOf(productId);
    if (idx !== -1) wl.splice(idx, 1);
    else wl.push(productId);
    localStorage.setItem('wishlist', JSON.stringify(wl));

    if (productId === id) setWishlisted(!wishlisted);
    setWishlistedRelated(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const cid = await storage.getCartClientId();
      if (!cid) { setLoading(false); return; }
      const p = await storage.getProduct(cid, id);
      if (p) {
        setProduct(p);
        await storage.updateProduct(cid, id, { views: p.views + 1 });
        const defaults = {};
        p.variants.forEach(v => { if (v.options.length > 0) defaults[v.type] = v.options[0]; });
        setSelectedVariants(defaults);

        // Fetch global discount
        const discountSettings = await storage.getSettings(cid, 'discount');
        if (discountSettings?.globalPercent) setGlobalDiscount(discountSettings.globalPercent);

        // Fetch all products for related sort
        const allProds = await storage.getProducts(cid);
        const active = allProds.filter(x => x.status === 'active' && x.id !== p.id);

        // Sort: same category first, then by views desc, then in-stock first
        active.sort((a, b) => {
          const aCat = a.category === p.category ? 0 : 1;
          const bCat = b.category === p.category ? 0 : 1;
          if (aCat !== bCat) return aCat - bCat;
          const viewDiff = (b.views || 0) - (a.views || 0);
          if (viewDiff !== 0) return viewDiff;
          const aStock = (a.inventory || 0) > 0 ? 1 : 0;
          const bStock = (b.inventory || 0) > 0 ? 1 : 0;
          return bStock - aStock;
        });

        setRelated(active); // Show ALL related, not just 6
      }
      setLoading(false);
    };
    run();
  }, [id]);

  // Loading state
  if (loading) return (
    <div className="sf-pdp-loading">
      <div className="sf-pdp-loading__spinner" />
      <p>Loading product…</p>
    </div>
  );

  if (!product) return (
    <div className="sf-pdp-loading">
      <p>Product not found</p>
      <Link href="/products" className="sf-pdp-loading__link">Browse Products</Link>
    </div>
  );

  // Real discount logic — only show when admin sets salePrice or global discount
  const hasProductDiscount = product.salePrice && product.salePrice < product.basePrice;
  const hasGlobalDiscount = globalDiscount > 0;
  const hasDiscount = hasProductDiscount || hasGlobalDiscount;

  let actualPrice = product.basePrice;
  let originalPrice = product.basePrice;
  let discountPercent = 0;

  if (hasProductDiscount) {
    actualPrice = product.salePrice;
    originalPrice = product.basePrice;
    discountPercent = calculateDiscountPercent(product.basePrice, product.salePrice);
  } else if (hasGlobalDiscount) {
    actualPrice = Math.round(product.basePrice * (1 - globalDiscount / 100));
    originalPrice = product.basePrice;
    discountPercent = globalDiscount;
  }

  const images = product.images.length > 0 ? product.images : [];
  const hasImages = images.length > 0;

  const handleAdd = async () => {
    addItem({ productId: product.id, productName: product.name, image: product.images[0], price: actualPrice, quantity, variant: selectedVariants });
    const cid = await storage.getCartClientId();
    if (cid) await storage.updateProduct(cid, product.id, { addToCartCount: product.addToCartCount + 1 });
    setAdded(true);
    setTimeout(() => { router.push('/cart'); }, 1500);
  };

  const navImg = (dir) => { if (hasImages) setActiveImg(p => (p + dir + images.length) % images.length); };

  // Thumbnail scroll
  const scrollThumbnails = (dir) => {
    if (!thumbnailRef.current) return;
    const el = thumbnailRef.current;
    const amount = 80;
    el.scrollBy({ top: dir * amount, behavior: 'smooth' });
  };

  // Get real price for related products
  const getRelatedPrice = (p) => {
    if (p.salePrice && p.salePrice < p.basePrice) return p.salePrice;
    if (hasGlobalDiscount) return Math.round(p.basePrice * (1 - globalDiscount / 100));
    return p.basePrice;
  };

  const getRelatedOriginal = (p) => {
    if ((p.salePrice && p.salePrice < p.basePrice) || hasGlobalDiscount) return p.basePrice;
    return null;
  };

  return (
    <div className="sf-pdp">
      <div className="sf-pdp__container">
        {/* Header */}
        <header className="sf-pdp__header">
          <Link href="/products" className="sf-pdp__back">
            <ChevronLeft className="sf-pdp__back-icon" />Back to products
          </Link>
        </header>

        {/* Main Product Grid */}
        <main className="sf-pdp__main">
          {/* LEFT: Gallery */}
          <div className="sf-pdp__gallery-wrapper">
            <div className="sf-pdp__gallery">
              {/* Thumbnails — Alibaba style with scroll buttons */}
              {hasImages && images.length > 1 && (
                <div className="sf-pdp__thumbs-container">
                  <button className="sf-pdp__thumbs-scroll sf-pdp__thumbs-scroll--up" onClick={() => scrollThumbnails(-1)} aria-label="Scroll up">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <div className="sf-pdp__thumbs" ref={thumbnailRef}>
                    {images.map((img, idx) => (
                      <button key={idx} onClick={() => setActiveImg(idx)}
                        className={`sf-pdp__thumb ${activeImg === idx ? 'sf-pdp__thumb--active' : ''}`}>
                        <img src={img} alt={`Thumbnail ${idx}`} />
                      </button>
                    ))}
                  </div>
                  <button className="sf-pdp__thumbs-scroll sf-pdp__thumbs-scroll--down" onClick={() => scrollThumbnails(1)} aria-label="Scroll down">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Main Image */}
              <div className="sf-pdp__main-image">
                {product.purchaseCount > 3 && (
                  <div className="sf-pdp__badge-bestseller">
                    <Star className="w-3.5 h-3.5" />
                    <span>Bestseller</span>
                  </div>
                )}
                <button onClick={() => toggleWishlist(id)} className="sf-pdp__wishlist-btn" aria-label="Toggle wishlist">
                  <Heart className={`w-5 h-5 ${wishlisted ? 'sf-pdp__wishlist-icon--active' : ''}`} />
                </button>
                <div className="sf-pdp__image-display">
                  {hasImages ? <img src={images[activeImg]} alt={product.name} /> : <span className="sf-pdp__no-image">🛍️</span>}
                </div>
                {hasImages && images.length > 1 && (
                  <div className="sf-pdp__image-nav">
                    <button onClick={() => navImg(-1)} className="sf-pdp__image-nav-btn" aria-label="Previous image">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => navImg(1)} className="sf-pdp__image-nav-btn" aria-label="Next image">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <aside className="sf-pdp__info">
            <div className="sf-pdp__info-section">
              {/* Price — only show discount when admin set it */}
              <div className="sf-pdp__price-block">
                <span className="sf-pdp__price">{formatCurrency(actualPrice)}</span>
                {hasDiscount && (
                  <>
                    <span className="sf-pdp__price-original">{formatCurrency(originalPrice)}</span>
                    <span className="sf-pdp__discount-badge">{discountPercent}% off</span>
                  </>
                )}
              </div>
              <p className="sf-pdp__vat">VAT included (where applicable)</p>
            </div>

            {/* Title + Stars */}
            <div className="sf-pdp__title-section">
              <h1 className="sf-pdp__product-title">{product.name}</h1>
              <p className="sf-pdp__product-category">{product.category}</p>
              <div className="sf-pdp__stars">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-sf-primary fill-sf-primary" />)}</div>
            </div>

            {/* Returns */}
            <div className="sf-pdp__returns">
              <Truck className="w-5 h-5" /><span>Returns &amp; exchanges accepted</span>
            </div>

            {/* Variants + Quantity + Add to Cart */}
            <div className="sf-pdp__options">
              {product.variants.map(v => (
                <div key={v.id} className="sf-pdp__variant">
                  <label>{v.type}</label>
                  <div className="sf-pdp__select-wrapper">
                    <select value={selectedVariants[v.type] || ''} onChange={e => setSelectedVariants({ ...selectedVariants, [v.type]: e.target.value })}>
                      {v.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <ChevronDown className="sf-pdp__select-icon" />
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="sf-pdp__variant">
                <label>Quantity</label>
                <div className="sf-pdp__select-wrapper">
                  <select value={quantity} onChange={e => setQuantity(Number(e.target.value))}>
                    {Array.from({ length: Math.min(product.inventory || 10, 10) }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <ChevronDown className="sf-pdp__select-icon" />
                </div>
              </div>

              {/* Add to Cart Button */}
              <button onClick={handleAdd} disabled={product.inventory === 0 || added}
                className={`sf-pdp__add-btn ${added ? 'sf-pdp__add-btn--added' : product.inventory === 0 ? 'sf-pdp__add-btn--disabled' : ''}`}
                style={added ? { animation: 'cart-celebrate 0.6s ease-out' } : {}}
              >
                {added ? (
                  <span className="sf-pdp__add-btn-content">
                    <span className="sf-pdp__add-check" style={{ animation: 'cart-check-pop 0.4s ease-out' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span>Added to Cart!</span>
                  </span>
                ) : (
                  product.inventory === 0 ? 'Out of Stock' : `Add to cart — ${formatCurrency(actualPrice * quantity)}`
                )}
              </button>
            </div>

            {/* Collapsible Accordion — only Item Details */}
            <AccordionSections openSections={openSections} toggleSection={toggleSection} description={product.description} category={product.category} sku={product.sku} />

            {/* Report */}
            <button className="sf-pdp__report-btn">
              <Flag className="w-4 h-4" />Report this item
            </button>
          </aside>
        </main>

        {/* Similar Products — show ALL filtered */}
        {related.length > 0 && (
          <section className="sf-pdp__related">
            <div className="sf-pdp__related-header">
              <h2 className="sf-pdp__related-title">You may also like</h2>
              <Link href="/products" className="sf-pdp__related-link">See more</Link>
            </div>
            <div className="sf-pdp__related-grid">
              {related.map(p => {
                const rPrice = getRelatedPrice(p);
                const rOriginal = getRelatedOriginal(p);
                return (
                  <div key={p.id} className="sf-pdp__related-card">
                    <Link href={`/products/${p.id}`} className="sf-pdp__related-card-link">
                      <div className="sf-pdp__related-card-img">
                        {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <div className="sf-pdp__related-card-placeholder">🛍️</div>}
                      </div>
                    </Link>
                    <button
                      className={`sf-pdp__related-wishlist ${wishlistedRelated[p.id] ? 'sf-pdp__related-wishlist--active' : ''}`}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p.id); }}
                      aria-label="Toggle wishlist"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <Link href={`/products/${p.id}`} className="sf-pdp__related-card-name">{p.name}</Link>
                    <div className="sf-pdp__related-card-price">
                      <span className="sf-pdp__related-card-current">{formatCurrency(rPrice)}</span>
                      {rOriginal && <span className="sf-pdp__related-card-original">{formatCurrency(rOriginal)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Cart celebration animation keyframes */}
      <style jsx global>{`
        @keyframes cart-celebrate {
          0% { transform: scale(1); }
          30% { transform: scale(1.08); }
          60% { transform: scale(0.97); }
          100% { transform: scale(1.05); }
        }
        @keyframes cart-check-pop {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.3) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
