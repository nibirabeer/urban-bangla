import React, { useState, useEffect, useRef } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  ChevronLeft, ChevronRight, ShoppingCart, Check, ArrowRight,
  Shirt, Flag as FlagIcon, Crown, Layers, Scissors, Gem,
  LayoutGrid, X,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import { getSizesForCategory, getSizeUnit, CUSTOM_SIZE, CUSTOM_STOCK_SENTINEL } from "../constants/sizes";

/* Returns the stock quantity for a given size:
   - null  → no stock tracking or custom/unlimited (treat as unlimited)
   - 0     → sold out
   - n > 0 → n units available */
const getStock = (item, size) => {
  if (!item.stock) return null;
  const v = item.stock[size];
  if (v === undefined) return null;
  if (v === CUSTOM_STOCK_SENTINEL) return null; // Custom = unlimited
  return v;
};
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
  const [items, setItems]         = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [imgIdx, setImgIdx]       = useState(0);
  const [size, setSize]           = useState("");
  const [qty, setQty]             = useState(1);
  const [cat, setCat]             = useState("All");
  const [addedMsg,    setAddedMsg]    = useState("");
  const [sizeErr,     setSizeErr]     = useState(false);
  const [customW,     setCustomW]     = useState("");
  const [customH,     setCustomH]     = useState("");
  const [customUnit,  setCustomUnit]  = useState("ft");
  const [customErr,   setCustomErr]   = useState(false);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const sheetRef = useRef(null);
  const { addItem, openCart, loading: cartLoading } = useCart();
  const navigate = useNavigate();
  const auth = getAuth();

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

  // Lock background scroll when sheet is open on mobile
  useEffect(() => {
    if (sheetOpen && window.innerWidth < 900) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const filtered = cat === "All" ? items : items.filter(i => i.category === cat);

  const selectItem = (item) => {
    setSelected(item); setImgIdx(0);
    setSize(""); setQty(1);
    setAddedMsg(""); setSizeErr(false);
    setCustomW(""); setCustomH(""); setCustomErr(false);
    setSheetOpen(true);
    // scroll sheet to top when a new product is picked
    if (sheetRef.current) sheetRef.current.scrollTop = 0;
  };

  const closeSheet = () => { setSheetOpen(false); };

  const photos = selected
    ? (selected.photoURLs?.length ? selected.photoURLs : (selected.photoURL ? [selected.photoURL] : []))
    : [];

  // Max qty user can order — null = unlimited, 0 = sold out, n = limit
  // Custom sizes are always unlimited (made to order)
  const maxQty = (size && size !== CUSTOM_SIZE) ? getStock(selected, size) : null;

  const handleAddToCart = async () => {
    if (!size) { setSizeErr(true); return; }

    // Validate custom dimensions
    if (size === CUSTOM_SIZE) {
      const w = parseFloat(customW);
      const h = parseFloat(customH);
      if (!w || !h || w <= 0 || h <= 0) { setCustomErr(true); return; }
    }

    if (!auth.currentUser) { navigate("/login"); return; }
    const stock = getStock(selected, size);
    if (stock !== null && stock === 0) { setSizeErr(true); return; }

    setSizeErr(false); setCustomErr(false);

    // Build the final size string: "Custom: 6×9 ft" or just the size key
    const actualSize = size === CUSTOM_SIZE
      ? `Custom: ${customW}×${customH} ${customUnit}`
      : size;

    const safeQty = stock !== null ? Math.min(qty, stock) : qty;
    await addItem(selected, actualSize, safeQty);
    setAddedMsg("Added!");
    setTimeout(() => { setAddedMsg(""); openCart(); }, 600);
  };

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

      {/* Backdrop — mobile only, sits behind the sheet */}
      {sheetOpen && (
        <div className="db-sheet-backdrop" onClick={closeSheet} aria-hidden="true" />
      )}

      <div className="db-layout">
        {/* Product grid */}
        <div className="db-grid">
          {filtered.length === 0 ? (
            <p className="db-empty">No items in this category yet.</p>
          ) : filtered.map(item => {
            // Check if all configured sizes are sold out
            const allOut = item.stock &&
              Object.keys(item.stock).length > 0 &&
              Object.values(item.stock).every(v => v === 0);

            return (
              <div
                key={item.id}
                className={`db-item-card ${selected?.id === item.id ? "selected" : ""} ${allOut ? "db-item-card-out" : ""}`}
                onClick={() => selectItem(item)}
              >
                <div className="db-item-img-wrap">
                  <img src={item.photoURL} alt={item.name} className="db-item-img" />
                  {item.tag && <span className="db-item-tag">{item.tag}</span>}
                  {item.pinned && <span className="db-item-pin">Featured</span>}
                  {allOut && <div className="db-item-out-overlay">Out of Stock</div>}
                  {!allOut && (
                    <div className="db-item-hover-overlay">
                      <span className="db-item-hover-label">Select Size →</span>
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

        {/* Detail panel — sticky on desktop, bottom sheet on mobile */}
        <div className={`db-panel ${sheetOpen ? "open" : ""}`} ref={sheetRef}>
          {/* Mobile-only: drag handle + close button */}
          <div className="db-sheet-bar">
            <div className="db-sheet-handle" />
            <button className="db-sheet-close-btn" onClick={closeSheet} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {selected ? (
            <>
              {/* ── Scrollable content ── */}
              <div className="db-sheet-scroll">
                {/* Carousel */}
                <div className="db-carousel">
                  <div className="db-carousel-main">
                    <img key={imgIdx} src={photos[imgIdx]} alt={selected.name} className="db-carousel-img" />
                    {photos.length > 1 && (
                      <>
                        <button className="db-carousel-arrow db-carousel-arrow-left" onClick={() => setImgIdx(i => i - 1)} disabled={imgIdx === 0}>
                          <ChevronLeft size={20} />
                        </button>
                        <button className="db-carousel-arrow db-carousel-arrow-right" onClick={() => setImgIdx(i => i + 1)} disabled={imgIdx === photos.length - 1}>
                          <ChevronRight size={20} />
                        </button>
                        <div className="db-carousel-counter">{imgIdx + 1} / {photos.length}</div>
                      </>
                    )}
                  </div>
                  {photos.length > 1 && (
                    <div className="db-thumbs">
                      {photos.map((url, i) => (
                        <button key={i} className={`db-thumb ${i === imgIdx ? "active" : ""}`} onClick={() => setImgIdx(i)}>
                          <img src={url} alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <h2 className="db-panel-name">{selected.name}</h2>
                <p className="db-panel-cat">{selected.category}</p>
                <p className="db-panel-price"><span>৳</span>{selected.price}</p>

                <div className="db-panel-sec">
                  <div className="db-size-label-row">
                    <label className="db-panel-label" style={{ color: sizeErr ? "var(--red)" : undefined }}>
                      {sizeErr ? "Please select an available size" : "Select Size"}
                    </label>
                    {getSizeUnit(selected.category) && (
                      <span className="db-size-unit">
                        in {getSizeUnit(selected.category) === "ft" ? "feet" : "inches"}
                      </span>
                    )}
                  </div>
                  <div className="db-sizes">
                    {(selected.sizes?.length ? selected.sizes : getSizesForCategory(selected.category)).map(s => {
                      const stock    = getStock(selected, s);
                      const soldOut  = stock !== null && stock === 0;
                      const lowStock = stock !== null && stock > 0 && stock <= 3;
                      const isCustom = s === CUSTOM_SIZE;
                      return (
                        <button
                          key={s}
                          disabled={soldOut}
                          className={[
                            "db-size-btn",
                            size === s    ? "active"    : "",
                            soldOut       ? "sold-out"  : "",
                            lowStock      ? "low-stock" : "",
                            isCustom      ? "db-size-custom" : "",
                            sizeErr && !size && !soldOut ? "db-size-btn-err" : "",
                          ].join(" ").trim()}
                          onClick={() => {
                            if (!soldOut) {
                              setSize(s); setSizeErr(false); setCustomErr(false); setQty(1);
                            }
                          }}
                        >
                          <span className="db-size-label">{s}</span>
                          {soldOut  && <span className="db-size-sub">Sold out</span>}
                          {lowStock && <span className="db-size-sub">{stock} left</span>}
                        </button>
                      );
                    })}
                  </div>

                  {size === CUSTOM_SIZE && (
                    <div className={`db-custom-size-box ${customErr ? "err" : ""}`}>
                      <p className="db-custom-size-title">Enter your custom dimensions</p>
                      <div className="db-custom-size-inputs">
                        <input
                          className="db-custom-input"
                          type="number" min="0.1" step="0.1"
                          placeholder="Width"
                          value={customW}
                          onChange={e => { setCustomW(e.target.value); setCustomErr(false); }}
                        />
                        <span className="db-custom-sep">×</span>
                        <input
                          className="db-custom-input"
                          type="number" min="0.1" step="0.1"
                          placeholder="Height"
                          value={customH}
                          onChange={e => { setCustomH(e.target.value); setCustomErr(false); }}
                        />
                        <select
                          className="db-custom-unit"
                          value={customUnit}
                          onChange={e => setCustomUnit(e.target.value)}
                        >
                          <option value="ft">ft</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                      {customErr && (
                        <p className="db-custom-err">Please enter valid width and height.</p>
                      )}
                      <p className="db-custom-note">
                        Custom sizes are made to order. We'll confirm the final price before processing.
                      </p>
                    </div>
                  )}
                </div>

                <div className="db-panel-sec">
                  <label className="db-panel-label">Quantity</label>
                  <div className="db-qty">
                    <button className="db-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                    <span className="db-qty-val">{qty}</span>
                    <button
                      className="db-qty-btn"
                      disabled={maxQty !== null && qty >= maxQty}
                      onClick={() => setQty(q => maxQty !== null ? Math.min(q + 1, maxQty) : q + 1)}
                    >+</button>
                  </div>
                  {maxQty !== null && maxQty > 0 && (
                    <p className="db-stock-note">
                      {maxQty <= 3
                        ? <span className="db-stock-low">Only {maxQty} left in stock!</span>
                        : <span className="db-stock-ok">{maxQty} in stock</span>
                      }
                    </p>
                  )}
                </div>

                <div className="db-total-row">
                  <span>Total</span>
                  <span className="db-total-val"><span>৳</span>{Math.round(selected.price * qty)}</span>
                </div>
              </div>{/* end db-sheet-scroll */}

              {/* ── Sticky action footer ── */}
              <div className="db-sheet-actions">
                {addedMsg && (
                  <div className="db-added-msg">
                    <Check size={15} /> {addedMsg}
                  </div>
                )}
                <button className="db-order-btn" onClick={handleAddToCart} disabled={cartLoading}>
                  <ShoppingCart size={17} />
                  {cartLoading ? "Adding..." : "Add to Cart"}
                </button>
                <button className="db-checkout-shortcut" onClick={() => navigate("/cart")}>
                  View Cart &amp; Checkout <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="db-sheet-scroll">
              <div className="db-panel-empty">
                <p>Select an item to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
