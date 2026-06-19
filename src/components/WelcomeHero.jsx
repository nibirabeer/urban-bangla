import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  Truck, ShieldCheck, RefreshCw, BadgeCheck, ArrowRight,
  Shirt, Flag as FlagIcon, Crown, Layers, Scissors, Gem,
} from "lucide-react";
import "../styles/WelcomeHero.css";

const DEFAULT_PROMO = {
  active: true,
  eyebrow: "Limited Time",
  title: "Free Delivery on Every Order",
  subtitle: "No minimum. No conditions. Just fast fashion, faster delivery.",
  buttonText: "Shop the Collection",
};

const CATEGORIES = [
  { key: "Jersey",      label: "Jerseys",     color: "#006A4E", light: "rgba(0,106,78,0.15)",    icon: <Shirt    size={18}/> },
  { key: "Flag",        label: "Flags",       color: "#F42A41", light: "rgba(244,42,65,0.12)",   icon: <FlagIcon size={18}/> },
  { key: "Cap",         label: "Caps",        color: "#A07840", light: "rgba(160,120,64,0.15)",  icon: <Crown    size={18}/> },
  { key: "T-Shirt",     label: "T-Shirts",    color: "#4d9fff", light: "rgba(77,159,255,0.12)",  icon: <Shirt    size={18}/> },
  { key: "Hoodie",      label: "Hoodies",     color: "#9b7ff5", light: "rgba(155,127,245,0.12)", icon: <Layers   size={18}/> },
  { key: "Trouser",     label: "Trousers",    color: "#5a6e8c", light: "rgba(90,110,140,0.15)",  icon: <Scissors size={18}/> },
  { key: "Accessories", label: "Accessories", color: "#C9A96E", light: "rgba(201,169,110,0.12)", icon: <Gem      size={18}/> },
];

const TRUST = [
  { icon: <Truck size={20} />,       label: "Home Delivery",    sub: "On all orders" },
  { icon: <ShieldCheck size={20} />, label: "Secure Payment",   sub: "100% protected" },
  { icon: <RefreshCw size={20} />,   label: "Easy Returns",     sub: "7-day policy" },
  { icon: <BadgeCheck size={20} />,  label: "100% Authentic",   sub: "Genuine products" },
];

const WelcomeHero = () => {
  const navigate = useNavigate();
  const [newArrivals, setNewArrivals] = useState([]);
  const [featured, setFeatured]       = useState([]);
  const [promoBanner, setPromoBanner] = useState(DEFAULT_PROMO);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [clothingSnap, configSnap] = await Promise.all([
          getDocs(collection(db, "clothing")),
          getDoc(doc(db, "config", "store")),
        ]);

        const items = clothingSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.display);
        setNewArrivals(items.slice(-6).reverse());
        const feat = items.filter(i => i.tag === "Bestseller" || i.tag === "New");
        setFeatured(feat.length ? feat.slice(0, 4) : items.slice(0, 4));

        if (configSnap.exists() && configSnap.data().promoBanner) {
          setPromoBanner({ ...DEFAULT_PROMO, ...configSnap.data().promoBanner });
        }
      } catch (e) { console.error(e); }
    };
    fetch_();
  }, []);

  return (
    <div className="wh-page">

      {/* ── Hero ── */}
      <section className="wh-hero-section">
        <div className="wh-hero-bg" />
        <div className="wh-hero-inner">
          <div className="wh-hero-content">
            <div className="wh-tag">Welcome back</div>
            <h1 className="wh-title">
              Bangladesh's<br />
              Boldest <span className="wh-title-accent">Street</span><br />
              Fashion
            </h1>
            <p className="wh-sub">
              Jerseys, flags, and everyday streetwear — curated for you, delivered fast.
            </p>
            <div className="wh-ctas">
              <button className="wh-btn-main" onClick={() => navigate("/dashboard")}>
                Shop Now <ArrowRight size={16} />
              </button>
              <button className="wh-btn-sec" onClick={() => navigate("/orders")}>
                My Orders
              </button>
            </div>
          </div>

          <div className="wh-hero-visual">
            <div className="wh-hero-card wh-hero-card-1">
              <div className="wh-hero-card-bar" style={{ background: "var(--green)" }} />
              <p>New Jerseys</p>
              <span>Just dropped</span>
            </div>
            <div className="wh-hero-blob">
              <div className="wh-blob-circle">
                <div className="wh-blob-red-disc" />
              </div>
            </div>
            <div className="wh-hero-card wh-hero-card-2">
              <div className="wh-hero-card-bar" style={{ background: "var(--gold)" }} />
              <p>Streetwear</p>
              <span>New collection</span>
            </div>
            <div className="wh-hero-card wh-hero-card-3">
              <div className="wh-hero-card-bar" style={{ background: "var(--red)" }} />
              <p>Flags</p>
              <span>In stock now</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="wh-trust-strip">
        <div className="wh-inner">
          {TRUST.map(t => (
            <div key={t.label} className="wh-trust-item">
              <div className="wh-trust-icon">{t.icon}</div>
              <div>
                <p className="wh-trust-label">{t.label}</p>
                <p className="wh-trust-sub">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Shop by Category ── */}
      <section className="wh-section">
        <div className="wh-inner">
          <div className="wh-section-head">
            <div>
              <h2 className="wh-section-title">Shop by Category</h2>
              <p className="wh-section-sub">Find exactly what you're looking for</p>
            </div>
            <button className="wh-link-btn" onClick={() => navigate("/dashboard")}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div className="wh-cat-grid">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                className="wh-cat-tile"
                style={{ "--cat-color": c.color, "--cat-light": c.light }}
                onClick={() => navigate("/dashboard")}
              >
                <span className="wh-cat-tile-icon">{c.icon}</span>
                <span className="wh-cat-tile-label">{c.label}</span>
                <span className="wh-cat-tile-arrow"><ArrowRight size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured / Bestsellers ── */}
      {featured.length > 0 && (
        <section className="wh-section wh-section-dark">
          <div className="wh-inner">
            <div className="wh-section-head">
              <div>
                <h2 className="wh-section-title">Featured Picks</h2>
                <p className="wh-section-sub">Hand-picked just for you</p>
              </div>
              <button className="wh-link-btn" onClick={() => navigate("/dashboard")}>
                See All <ArrowRight size={14} />
              </button>
            </div>
            <div className="wh-products-grid">
              {featured.map(item => (
                <div key={item.id} className="wh-product-card" onClick={() => navigate(`/product/${item.id}`)}>
                  <div className="wh-product-img-wrap">
                    <img src={item.photoURL} alt={item.name} className="wh-product-img" />
                    {item.tag && <span className={`wh-product-tag wh-product-tag-${item.tag.toLowerCase()}`}>{item.tag}</span>}
                  </div>
                  <div className="wh-product-info">
                    <p className="wh-product-cat">{item.category}</p>
                    <h3 className="wh-product-name">{item.name}</h3>
                    <div className="wh-product-footer">
                      <span className="wh-product-price">৳{item.price}</span>
                      <button className="wh-product-btn" onClick={e => { e.stopPropagation(); navigate(`/product/${item.id}`); }}>
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Promo Banner — controlled by admin ── */}
      {promoBanner.active && (
        <section className="wh-promo-banner">
          <div className="wh-inner wh-promo-inner">
            <div className="wh-promo-text">
              {promoBanner.eyebrow && <span className="wh-promo-eyebrow">{promoBanner.eyebrow}</span>}
              <h2 className="wh-promo-title">{promoBanner.title}</h2>
              {promoBanner.subtitle && <p className="wh-promo-sub">{promoBanner.subtitle}</p>}
            </div>
            <button className="wh-btn-main wh-promo-cta" onClick={() => navigate("/dashboard")}>
              {promoBanner.buttonText} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ── New Arrivals ── */}
      {newArrivals.length > 0 && (
        <section className="wh-section">
          <div className="wh-inner">
            <div className="wh-section-head">
              <div>
                <h2 className="wh-section-title">New Arrivals</h2>
                <p className="wh-section-sub">Fresh stock, just added</p>
              </div>
              <button className="wh-link-btn" onClick={() => navigate("/dashboard")}>
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="wh-products-grid">
              {newArrivals.map(item => (
                <div key={item.id} className="wh-product-card" onClick={() => navigate(`/product/${item.id}`)}>
                  <div className="wh-product-img-wrap">
                    <img src={item.photoURL} alt={item.name} className="wh-product-img" />
                    {item.tag && <span className={`wh-product-tag wh-product-tag-${item.tag.toLowerCase()}`}>{item.tag}</span>}
                  </div>
                  <div className="wh-product-info">
                    <p className="wh-product-cat">{item.category}</p>
                    <h3 className="wh-product-name">{item.name}</h3>
                    <div className="wh-product-footer">
                      <span className="wh-product-price">৳{item.price}</span>
                      <button className="wh-product-btn" onClick={e => { e.stopPropagation(); navigate(`/product/${item.id}`); }}>
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
};

export default WelcomeHero;
