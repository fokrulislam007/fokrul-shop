'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils';
import './storefront-home.css';

export default function StorefrontHome() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hero, setHero] = useState(null);
  const { addItem } = useCart();
  const [added, setAdded] = useState(null);

  useEffect(() => {
    const _run = async () => {
      const cid = await storage.getCartClientId();
      if (!cid) return;

      // Fetch all data in parallel
      const [allProds, cats, heroData] = await Promise.all([
        storage.getProducts(cid),
        storage.getCategories(cid),
        storage.getHomepageHero(cid),
      ]);

      // Sort: views desc (most clicked first), then in-stock first
      const active = allProds
        .filter(p => p.status === 'active')
        .sort((a, b) => {
          // Primary: views descending
          const viewDiff = (b.views || 0) - (a.views || 0);
          if (viewDiff !== 0) return viewDiff;
          // Secondary: in-stock first
          const aStock = (a.inventory || 0) > 0 ? 1 : 0;
          const bStock = (b.inventory || 0) > 0 ? 1 : 0;
          return bStock - aStock;
        });

      setProducts(active);
      setCategories(cats.sort((a, b) => a.displayOrder - b.displayOrder));
      if (heroData) setHero(heroData);
    };
    _run();
  }, []);

  const handleAdd = (p) => {
    addItem({ productId: p.id, productName: p.name, image: p.images[0], price: p.salePrice || p.basePrice, quantity: 1 });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 1500);
  };

  // Split products: best 5, next 3, remaining
  const best5 = products.slice(0, 5);
  const next3 = products.slice(5, 8);
  const remaining = products.slice(8);

  // Hero defaults
  const h = hero || {};
  const heroLeftHeading = h.leftHeading || 'Quick, creative gifts for Mom';
  const heroLeftCta = h.leftCta || 'Shop for downloads';
  const heroLeftCtaLink = h.leftCtaLink || '/products';
  const heroLeftImage = h.leftImage || '';
  const heroRightTitle = h.rightTitle || "Rising sellers you'll want to get to know";
  const heroRightLinkText = h.rightLinkText || 'Shop now';
  const heroRightLinkHref = h.rightLinkHref || '/products';
  const heroRightImage = h.rightImage || '';

  return (
    <div className="etsy-home">

      {/* ===== HERO SECTION ===== */}
      <section className="hero" aria-label="Featured promotions">
        <div className="hero__inner">
          <div className="hero__grid">

            {/* Left panel */}
            <article className="hero__left">
              <div className="hero__left-content">
                <h1 className="hero__heading">{heroLeftHeading}</h1>
                <Link href={heroLeftCtaLink} className="hero__cta">{heroLeftCta}</Link>
              </div>
              <div className="hero__left-img">
                {heroLeftImage ? (
                  <img src={heroLeftImage} alt={heroLeftHeading} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #e8d5a8 0%, #d4b88a 50%, #c9a472 100%)' }} />
                )}
              </div>
            </article>

            {/* Right panel */}
            <article className="hero__right" style={heroRightImage ? { backgroundImage: `url(${heroRightImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
              <div className="hero__right-content">
                <h2 className="hero__right-title">{heroRightTitle}</h2>
                <Link href={heroRightLinkHref} className="hero__right-link">{heroRightLinkText}</Link>
              </div>
            </article>

          </div>
        </div>
      </section>

      {/* ===== FEATURED CATEGORIES ===== */}
      {categories.length > 0 && (
        <section className="featured-interests" aria-labelledby="featured-heading">
          <div className="featured-interests__inner">
            <h2 className="section-heading" id="featured-heading">Jump into featured interests</h2>
            <div className="interests-scroll">
              <ul className="interests-grid">
                {categories.map((cat, i) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?cat=${encodeURIComponent(cat.name)}`}
                      className={`interest-card${i === 0 ? ' interest-card--selected' : ''}`}
                      aria-label={`${cat.name} - abc`}
                    >
                      <div
                        className="interest-card__image"
                        style={cat.image ? { backgroundImage: `url(${cat.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                      />
                      <div className="interest-card__footer">
                        <div className="interest-card__name">{cat.name}</div>
                        <div className="interest-card__sub">See more</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ===== BEST 5 PRODUCTS ===== */}
      {best5.length > 0 && (
        <section className="spring-section" aria-labelledby="spring-heading">
          <div className="spring-section__inner">
            <h2 className="section-heading" id="spring-heading">Discover our best</h2>
            <ul className="spring-grid">
              {best5.map(p => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}`} className="spring-card" aria-label={p.name}>
                    <div
                      className="spring-card__image"
                      style={p.images?.[0] && p.images[0] !== '/placeholder-product.svg'
                        ? { backgroundImage: `url(${p.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', background: undefined }
                        : { background: '#c8cac5' }
                      }
                    />
                    <div className="spring-card__label">{p.name}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ===== NEXT 3 PRODUCTS ===== */}
      {next3.length > 0 && (
        <section className="eid-section" aria-labelledby="eid-heading">
          <div className="eid-section__inner">
            <div className="eid-section__left">
              <h2 className="eid-section__title" id="eid-heading">Special pieces</h2>
              <Link href="/products" className="eid-section__btn">Get inspired</Link>
            </div>
            <div className="eid-section__right">
              <ul className="eid-cards-grid">
                {next3.map(p => (
                  <li key={p.id}>
                    <Link href={`/products/${p.id}`} className="eid-card" aria-label={p.name}>
                      <div
                        className="eid-card__bg"
                        style={p.images?.[0] && p.images[0] !== '/placeholder-product.svg'
                          ? { backgroundImage: `url(${p.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                          : { background: '#888' }
                        }
                      />
                      <div className="eid-card__label">{p.name}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ===== REMAINING PRODUCTS ===== */}
      {remaining.length > 0 && (
        <section className="products-section" aria-label="Featured products">
          <div className="products-section__inner">
            <ul className="products-grid">
              {remaining.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/products/${p.id}`}
                    className={`product-card product-card--${(i % 6) + 1}`}
                    aria-label={`${p.name} – ${formatCurrency(p.salePrice || p.basePrice)}`}
                  >
                    <div
                      className="product-card__bg"
                      style={p.images?.[0] && p.images[0] !== '/placeholder-product.svg'
                        ? { backgroundImage: `url(${p.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : {}
                      }
                    />
                    <div className="product-card__price">
                      {p.salePrice && (
                        <span className="product-card__price-original">
                          {formatCurrency(p.basePrice)}
                        </span>
                      )}
                      {formatCurrency(p.salePrice || p.basePrice)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

    </div>
  );
}
