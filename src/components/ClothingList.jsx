import React, { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Shirt, Flag as FlagIcon, Crown, Layers, Scissors, Gem, LayoutGrid, Truck, ShieldCheck, RefreshCw, BadgeCheck } from "lucide-react";
import "../styles/ClothingList.css";

const TRUST = [
  { icon: <Truck size={18} />,       label: "Home Delivery",  sub: "Across Bangladesh" },
  { icon: <ShieldCheck size={18} />, label: "Secure Payment", sub: "100% protected" },
  { icon: <RefreshCw size={18} />,   label: "Easy Returns",   sub: "7-day policy" },
  { icon: <BadgeCheck size={18} />,  label: "100% Authentic", sub: "Genuine products" },
];

const CATEGORIES = [
  { key: "All",         label: "All",         icon: <LayoutGrid size={14}/> },
  { key: "Jersey",      label: "Jerseys",      icon: <Shirt      size={14}/> },
  { key: "Flag",        label: "Flags",        icon: <FlagIcon   size={14}/> },
  { key: "Cap",         label: "Caps",         icon: <Crown      size={14}/> },
  { key: "T-Shirt",     label: "T-Shirts",     icon: <Shirt      size={14}/> },
  { key: "Hoodie",      label: "Hoodies",      icon: <Layers     size={14}/> },
  { key: "Trouser",     label: "Trousers",     icon: <Scissors   size={14}/> },
  { key: "Accessories", label: "Accessories",  icon: <Gem        size={14}/> },
];

const ClothingList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const snap = await getDocs(collection(db, "clothing"));
        const displayed = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((i) => i.display);
        setItems(displayed);
      } catch (e) {
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filtered = activeCat === "All" ? items : items.filter((i) => i.category === activeCat);

  if (loading) return (
    <div className="cl-loading">
      <div className="cloth-loader" />
    </div>
  );

  if (error) return <div className="cl-error">{error}</div>;

  return (
    <div className="cl-page">

      {/* ── Hero ── */}
      <div className="cl-hero">
        <div className="cl-hero-bg" />
        <div className="cl-hero-content">
          <div className="cl-hero-eyebrow">
            <span>Bangladesh Street Fashion</span>
          </div>
          <h1 className="cl-hero-title">
            <span className="cl-hero-line-1">URBAN</span>
            <span className="cl-hero-line-2">বাংলা</span>
          </h1>
          <p className="cl-hero-sub">
            Jerseys · Flags · Streetwear · Everything in one place
          </p>
          <div className="cl-hero-ctas">
            <button className="cl-hero-cta" onClick={() => navigate("/login")}>
              <span>Shop Now</span>
              <span>→</span>
            </button>
            <button className="cl-hero-cta-sec" onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* ── Trust strip ── */}
      <div className="cl-trust-strip">
        {TRUST.map(t => (
          <div key={t.label} className="cl-trust-item">
            <div className="cl-trust-icon">{t.icon}</div>
            <div>
              <p className="cl-trust-label">{t.label}</p>
              <p className="cl-trust-sub">{t.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Product browser ── */}
      <div className="cl-body">
        {/* Category filters */}
        <div className="cl-filters">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`cl-filter-btn ${activeCat === c.key ? "active" : ""}`}
              onClick={() => setActiveCat(c.key)}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>

        {/* Section header */}
        {filtered.length > 0 && (
          <div className="cl-section-head">
            <div>
              <h2 className="cl-section-title">
                {activeCat === "All" ? "All Products" : activeCat + "s"}
              </h2>
              <p className="cl-section-count">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <button className="cl-sign-in-cta" onClick={() => navigate("/login")}>
              Sign in to buy →
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="cl-empty">
            <p>No items in this category yet — check back soon.</p>
          </div>
        ) : (
          <div className="cl-grid">
            {filtered.map((item) => {
              const salePercent = item.originalPrice > 0 && item.originalPrice > item.price
                ? Math.round((item.originalPrice - item.price) / item.originalPrice * 100)
                : 0;
              return (
              <div key={item.id} className="cl-card" onClick={() => navigate(`/product/${item.id}`)}>
                <div className="cl-card-img-wrap">
                  <img src={item.photoURL} alt={item.name} className="cl-card-img" />
                  {salePercent > 0
                    ? <span className="cl-badge cl-badge-sale">SALE</span>
                    : item.tag && <span className={`cl-badge cl-badge-${item.tag.toLowerCase()}`}>{item.tag}</span>
                  }
                  <div className="cl-card-overlay">
                    <span>Sign in to buy</span>
                  </div>
                </div>
                <div className="cl-card-body">
                  <p className="cl-card-cat">{item.category}</p>
                  <h3 className="cl-card-name">{item.name}</h3>
                  <div className="cl-card-sizes">
                    {(item.sizes || []).slice(0, 5).map((s) => (
                      <span key={s} className="cl-size-chip">{s}</span>
                    ))}
                    {(item.sizes || []).length > 5 && (
                      <span className="cl-size-chip cl-size-more">+{item.sizes.length - 5}</span>
                    )}
                  </div>
                  <div className="cl-card-footer">
                    <div className="cl-price-col">
                      {salePercent > 0 && (
                        <span className="cl-original-price">৳{item.originalPrice}</span>
                      )}
                      <div className="cl-price-row">
                        <div className="cl-price-wrap">
                          <span className="cl-currency">৳</span>
                          <span className="cl-price">{item.price}</span>
                        </div>
                        {salePercent > 0 && (
                          <span className="cl-sale-pct">-{salePercent}%</span>
                        )}
                      </div>
                    </div>
                    <button className="cl-buy-btn" onClick={(e) => { e.stopPropagation(); navigate(`/product/${item.id}`); }}>
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClothingList;
