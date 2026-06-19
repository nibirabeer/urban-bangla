import React, { useState, useEffect } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  ArrowRight,
  Shirt, Flag as FlagIcon, Crown, Layers, Scissors, Gem,
  LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
const CATS = [
  { key: "All",         label: "All",         icon: <LayoutGrid size={14}/> },
  { key: "Jersey",      label: "Jerseys",      icon: <Shirt      size={14}/> },
  { key: "Flag",        label: "Flags",        icon: <FlagIcon   size={14}/> },
  { key: "Cap",         label: "Caps",         icon: <Crown      size={14}/> },
  { key: "T-Shirt",     label: "T-Shirts",     icon: <Shirt      size={14}/> },
  { key: "Hoodie",      label: "Hoodies",      icon: <Layers     size={14}/> },
  { key: "Trouser",     label: "Trousers",     icon: <Scissors   size={14}/> },
  { key: "Accessories", label: "Accessories",  icon: <Gem        size={14}/> },
];

const Dashboard = () => {
  const [items, setItems]           = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [cat, setCat]               = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const [snap, configSnap] = await Promise.all([
          getDocs(collection(db, "clothing")),
          getDoc(doc(db, "config", "store")),
        ]);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.display);
        const pinned   = all.filter(i => i.pinned);
        const unpinned = all.filter(i => !i.pinned);
        setItems([...pinned, ...unpinned]);
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          setPromotions((cfg.promotions || []).filter(p => p.active));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch_();
  }, []);

  const filtered = cat === "All" ? items : items.filter(i => i.category === cat);

  if (loading) return (
    <div className="db-loading">
      <div className="db-spinner" />
      <p>Loading products...</p>
    </div>
  );

  return (
    <div className="db-page">
      <div className="db-header">
        <h1 className="db-title">Shop <span>Collection</span></h1>
        <div className="db-cats">
          {CATS.map(c => (
            <button key={c.key} className={`db-cat-btn ${cat === c.key ? "active" : ""}`} onClick={() => setCat(c.key)}>
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {promotions.length > 0 && (
        <div className="db-promos">
          {promotions.map(p => (
            <div key={p.id} className={`db-promo-banner db-promo-${p.theme}`}>
              {p.badge && <span className="db-promo-badge">{p.badge}</span>}
              <span className="db-promo-title">{p.title}</span>
              <ArrowRight size={14} className="db-promo-arrow" />
            </div>
          ))}
        </div>
      )}

      <div className="db-grid">
        {filtered.length === 0 ? (
          <p className="db-empty">No items in this category yet.</p>
        ) : filtered.map(item => {
          const allOut = item.stock &&
            Object.keys(item.stock).length > 0 &&
            Object.values(item.stock).every(v => v === 0);

          return (
            <div
              key={item.id}
              className={`db-item-card ${allOut ? "db-item-card-out" : ""}`}
              onClick={() => navigate(`/product/${item.id}`)}
            >
              <div className="db-item-img-wrap">
                <img src={item.photoURL} alt={item.name} className="db-item-img" />
                {item.tag && <span className="db-item-tag">{item.tag}</span>}
                {item.pinned && <span className="db-item-pin">Featured</span>}
                {allOut && <div className="db-item-out-overlay">Out of Stock</div>}
                {!allOut && (
                  <div className="db-item-hover-overlay">
                    <span className="db-item-hover-label">View Product →</span>
                  </div>
                )}
              </div>
              <div className="db-item-info">
                <p className="db-item-cat">{item.category}</p>
                <h3 className="db-item-name">{item.name}</h3>
                <div className="db-item-footer">
                  <p className="db-item-price"><span>৳</span>{item.price}</p>
                  {item.sizes?.length > 0 && !allOut && (
                    <div className="db-item-sizes-preview">
                      {item.sizes.slice(0, 4).map(s => (
                        <span key={s} className="db-item-size-dot">{s}</span>
                      ))}
                      {item.sizes.length > 4 && (
                        <span className="db-item-size-dot">+{item.sizes.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
