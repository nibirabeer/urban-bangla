import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ChevronLeft, ChevronRight, ShoppingCart, Check, ArrowLeft } from "lucide-react";
import { useCart } from "../context/CartContext";
import { getSizesForCategory, getSizeUnit, CUSTOM_SIZE, CUSTOM_STOCK_SENTINEL } from "../constants/sizes";
import "../styles/ProductPage.css";

const getStock = (item, size) => {
  if (!item.stock) return null;
  const v = item.stock[size];
  if (v === undefined) return null;
  if (v === CUSTOM_STOCK_SENTINEL) return null;
  return v;
};

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [customUnit, setCustomUnit] = useState("ft");
  const [customErr, setCustomErr] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");
  const touchStartX = useRef(null);
  const { addItem, openCart, loading: cartLoading } = useCart();

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const snap = await getDoc(doc(db, "clothing", id));
        if (!snap.exists() || !snap.data().display) { setNotFound(true); return; }
        setItem({ id: snap.id, ...snap.data() });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [id]);

  const photos = item
    ? (item.photoURLs?.length ? item.photoURLs : (item.photoURL ? [item.photoURL] : []))
    : [];

  const maxQty = (size && size !== CUSTOM_SIZE) ? getStock(item, size) : null;

  const handleAddToCart = async () => {
    if (!size) { setSizeErr(true); return; }
    if (size === CUSTOM_SIZE) {
      const w = parseFloat(customW);
      const h = parseFloat(customH);
      if (!w || !h || w <= 0 || h <= 0) { setCustomErr(true); return; }
    }
    if (!auth.currentUser) { navigate("/login"); return; }
    const stock = getStock(item, size);
    if (stock !== null && stock === 0) { setSizeErr(true); return; }
    setSizeErr(false); setCustomErr(false);
    const actualSize = size === CUSTOM_SIZE
      ? `Custom: ${customW}×${customH} ${customUnit}`
      : size;
    const safeQty = stock !== null ? Math.min(qty, stock) : qty;
    await addItem(item, actualSize, safeQty);
    setAddedMsg("Added!");
    setTimeout(() => { setAddedMsg(""); openCart(); }, 600);
  };

  if (loading) return (
    <div className="pp-loading">
      <div className="pp-spinner" />
      <p>Loading product...</p>
    </div>
  );

  if (notFound) return (
    <div className="pp-notfound">
      <p>Product not found.</p>
      <button className="pp-back-btn" onClick={() => navigate("/dashboard")}>← Back to Shop</button>
    </div>
  );

  const allOut = item.stock &&
    Object.keys(item.stock).length > 0 &&
    Object.values(item.stock).every(v => v === 0);

  return (
    <div className="pp-page">
      <div className="pp-inner">
        <button className="pp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="pp-layout">
          {/* ── Gallery ── */}
          <div className="pp-gallery">
            <div
              className="pp-main-img-wrap"
              onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                if (touchStartX.current === null) return;
                const delta = touchStartX.current - e.changedTouches[0].clientX;
                if (delta > 40 && imgIdx < photos.length - 1) setImgIdx(i => i + 1);
                if (delta < -40 && imgIdx > 0) setImgIdx(i => i - 1);
                touchStartX.current = null;
              }}
            >
              <img src={photos[imgIdx]} alt={item.name} className="pp-main-img" />
              {item.tag && <span className={`pp-badge pp-badge-${item.tag.toLowerCase()}`}>{item.tag}</span>}
              {allOut && <div className="pp-out-overlay">Out of Stock</div>}
              {photos.length > 1 && (
                <>
                  <button className="pp-arrow pp-arrow-l" onClick={() => setImgIdx(i => i - 1)} disabled={imgIdx === 0}>
                    <ChevronLeft size={20} />
                  </button>
                  <button className="pp-arrow pp-arrow-r" onClick={() => setImgIdx(i => i + 1)} disabled={imgIdx === photos.length - 1}>
                    <ChevronRight size={20} />
                  </button>
                  <div className="pp-img-counter">{imgIdx + 1} / {photos.length}</div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="pp-thumbs">
                {photos.map((url, i) => (
                  <button key={i} className={`pp-thumb ${i === imgIdx ? "active" : ""}`} onClick={() => setImgIdx(i)}>
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="pp-info">
            <p className="pp-cat">{item.category}</p>
            <h1 className="pp-name">{item.name}</h1>
            <p className="pp-price"><span className="pp-currency">৳</span>{item.price}</p>

            {!allOut && (
              <>
                {/* Sizes */}
                <div className="pp-section">
                  <div className="pp-size-label-row">
                    <label className="pp-label" style={{ color: sizeErr ? "var(--red)" : undefined }}>
                      {sizeErr ? "Please select an available size" : "Select Size"}
                    </label>
                    {getSizeUnit(item.category) && (
                      <span className="pp-size-unit">
                        in {getSizeUnit(item.category) === "ft" ? "feet" : "inches"}
                      </span>
                    )}
                  </div>
                  <div className="pp-sizes">
                    {(item.sizes?.length ? item.sizes : getSizesForCategory(item.category)).map(s => {
                      const stock = getStock(item, s);
                      const soldOut = stock !== null && stock === 0;
                      const lowStock = stock !== null && stock > 0 && stock <= 3;
                      return (
                        <button
                          key={s}
                          disabled={soldOut}
                          className={[
                            "pp-size-btn",
                            size === s ? "active" : "",
                            soldOut ? "sold-out" : "",
                            lowStock ? "low-stock" : "",
                            s === CUSTOM_SIZE ? "pp-size-custom" : "",
                            sizeErr && !size && !soldOut ? "pp-size-btn-err" : "",
                          ].join(" ").trim()}
                          onClick={() => { if (!soldOut) { setSize(s); setSizeErr(false); setCustomErr(false); setQty(1); } }}
                        >
                          <span className="pp-size-label">{s}</span>
                          {soldOut && <span className="pp-size-sub">Sold out</span>}
                          {lowStock && <span className="pp-size-sub">{stock} left</span>}
                        </button>
                      );
                    })}
                  </div>

                  {size === CUSTOM_SIZE && (
                    <div className={`pp-custom-box ${customErr ? "err" : ""}`}>
                      <p className="pp-custom-title">Enter your custom dimensions</p>
                      <div className="pp-custom-inputs">
                        <input className="pp-custom-input" type="number" min="0.1" step="0.1" placeholder="Width"
                          value={customW} onChange={e => { setCustomW(e.target.value); setCustomErr(false); }} />
                        <span className="pp-custom-sep">×</span>
                        <input className="pp-custom-input" type="number" min="0.1" step="0.1" placeholder="Height"
                          value={customH} onChange={e => { setCustomH(e.target.value); setCustomErr(false); }} />
                        <select className="pp-custom-unit" value={customUnit} onChange={e => setCustomUnit(e.target.value)}>
                          <option value="ft">ft</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                      {customErr && <p className="pp-custom-err">Please enter valid width and height.</p>}
                      <p className="pp-custom-note">
                        Custom sizes are made to order. We'll confirm the final price before processing.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div className="pp-section">
                  <label className="pp-label">Quantity</label>
                  <div className="pp-qty">
                    <button className="pp-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                    <span className="pp-qty-val">{qty}</span>
                    <button
                      className="pp-qty-btn"
                      disabled={maxQty !== null && qty >= maxQty}
                      onClick={() => setQty(q => maxQty !== null ? Math.min(q + 1, maxQty) : q + 1)}
                    >+</button>
                  </div>
                  {maxQty !== null && maxQty > 0 && (
                    <p className="pp-stock-note">
                      {maxQty <= 3
                        ? <span className="pp-stock-low">Only {maxQty} left in stock!</span>
                        : <span className="pp-stock-ok">{maxQty} in stock</span>}
                    </p>
                  )}
                </div>

                <div className="pp-total-row">
                  <span>Total</span>
                  <span className="pp-total-val"><span>৳</span>{Math.round(item.price * qty)}</span>
                </div>

                {addedMsg && (
                  <div className="pp-added-msg">
                    <Check size={15} /> {addedMsg}
                  </div>
                )}

                <button className="pp-add-btn" onClick={handleAddToCart} disabled={cartLoading}>
                  <ShoppingCart size={17} />
                  {cartLoading ? "Adding..." : "Add to Cart"}
                </button>
              </>
            )}

            {allOut && (
              <div className="pp-out-msg">This product is currently out of stock.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
