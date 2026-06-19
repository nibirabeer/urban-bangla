import React, { useState, useEffect, useRef } from "react";
import { db } from "../services/firebase";
import {
  collection, getDocs, addDoc, updateDoc, doc, deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Pin, Package, BarChart2, Search, AlertTriangle,
  TrendingDown, CheckCircle, XCircle, Edit3, Ruler,
} from "lucide-react";
import "../styles/ClothingManagement.css";
import {
  getSizesForCategory, getSizeFieldLabel, getSizeUnit,
  CUSTOM_SIZE, CUSTOM_STOCK_SENTINEL,
} from "../constants/sizes";

const CATEGORIES = ["Jersey", "Flag", "Cap", "T-Shirt", "Hoodie", "Trouser", "Accessories"];
const TAGS       = ["", "New", "Sale", "Limited", "WC", "Bestseller"];
const CAT_LABELS = {
  Jersey:"Jersey", Flag:"Flag", Cap:"Cap",
  "T-Shirt":"T-Shirt", Hoodie:"Hoodie", Trouser:"Trouser", Accessories:"Accessories",
};

const empty = { name: "", price: "", originalPrice: "", category: "", stock: {}, tag: "", photos: [] };

/* ─── pure helpers ────────────────────────────────────────────── */
const stockStatus = (stock) => {
  if (!stock || Object.keys(stock).length === 0) return "none";
  const vals = Object.values(stock);
  // -1 = custom/MTO, treat as "in stock" (unlimited)
  const trackable = vals.filter(v => v !== CUSTOM_STOCK_SENTINEL);
  if (trackable.length === 0) return "ok"; // all custom
  if (trackable.every(v => v === 0))        return "out";
  if (trackable.some(v => v > 0 && v <= 3)) return "low";
  return "ok";
};
const totalStock = (stock) =>
  Object.values(stock || {}).reduce((s, v) => v === CUSTOM_STOCK_SENTINEL ? s : s + (v || 0), 0);

/* ─── SizeStockPicker ──────────────────────────────────────────── */
const SizeStockPicker = ({ stock, onChange, category }) => {
  const sizes   = getSizesForCategory(category);
  const unit    = getSizeUnit(category);

  if (!category) {
    return (
      <div className="cm-size-no-cat">
        Select a category above to see available sizes.
      </div>
    );
  }

  const toggle = (s) => {
    if (s in stock) { const n = { ...stock }; delete n[s]; onChange(n); }
    // Custom size uses sentinel -1 (unlimited/made-to-order)
    else if (s === CUSTOM_SIZE) onChange({ ...stock, [s]: CUSTOM_STOCK_SENTINEL });
    else onChange({ ...stock, [s]: 0 });
  };
  const setQty = (s, raw) =>
    onChange({ ...stock, [s]: Math.max(0, parseInt(raw) || 0) });

  return (
    <div>
      {unit && (
        <div className="cm-size-unit-badge">
          <Ruler size={11}/> Sizes in <strong>{unit === "ft" ? "feet (ft)" : "inches (in)"}</strong>
        </div>
      )}
      <div className="cm-stock-picker">
        {sizes.map(s => {
          const on  = s in stock;
          const qty = on ? stock[s] : null;
          const isCustom = s === CUSTOM_SIZE;
          return (
            <div key={s} className={`cm-stock-tile ${on ? "on" : ""} ${isCustom ? "custom" : ""}`}>
              <button type="button" className="cm-stock-toggle" onClick={() => toggle(s)}>
                {isCustom ? "Custom" : s}
              </button>
              {/* Custom size: show MTO badge, no qty input */}
              {on && isCustom && (
                <span className="cm-custom-mto-badge">Made to Order</span>
              )}
              {/* Regular sizes: qty input */}
              {on && !isCustom && (
                <input
                  type="number" className="cm-stock-qty"
                  value={qty} min="0"
                  onChange={e => setQty(s, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  aria-label={`${s} quantity`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Image uploader ───────────────────────────────────────────── */
const ImageUploader = ({ previews, onAdd, onRemove }) => (
  <div className="cm-img-uploader">
    {previews.map((src, i) => (
      <div key={i} className="cm-img-thumb">
        <img src={src} alt="" />
        <button type="button" className="cm-img-remove" onClick={() => onRemove(i)}>✕</button>
        {i === 0 && <span className="cm-img-primary-label">Main</span>}
      </div>
    ))}
    <label className="cm-img-add">
      <input type="file" accept="image/*" multiple hidden onChange={onAdd} />
      <span className="cm-img-add-icon">+</span>
      <span className="cm-img-add-label">Add photos</span>
    </label>
  </div>
);

/* ─── Modal ────────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children }) => (
  <div className="cm-overlay">
    <div className="cm-modal">
      <div className="cm-modal-header">
        <h3 className="cm-modal-title">{title}</h3>
        <button className="cm-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="cm-modal-body">{children}</div>
    </div>
  </div>
);
const Field = ({ label, children }) => (
  <div className="cm-field">
    <label className="cm-field-label">{label}</label>
    {children}
  </div>
);

/* ─── Inline stock number cell ─────────────────────────────────── */
const InlineQty = ({ itemId, size, qty, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(String(qty));
  const inputRef = useRef(null);

  const open = () => { setVal(String(qty)); setEditing(true); };
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  const commit = () => {
    const n = Math.max(0, parseInt(val) || 0);
    onSave(itemId, size, n);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  // Custom/MTO sizes are not editable — unlimited by definition
  if (qty === CUSTOM_STOCK_SENTINEL) {
    return <span className="inv-qty-mto">∞ MTO</span>;
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="inv-inline-input"
        type="number" min="0" value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
        onClick={e => e.stopPropagation()}
      />
    );
  }

  const cls = qty === 0 ? "out" : qty <= 3 ? "low" : "ok";
  return (
    <button className={`inv-qty-pill inv-qty-${cls}`} onClick={open} title="Click to edit">
      {qty}
    </button>
  );
};

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
const ClothingManagement = () => {
  const [items,    setItems]    = useState([]);
  const [newItem,  setNewItem]  = useState(empty);
  const [newPreviews, setNewPreviews] = useState([]);
  const [newFiles,    setNewFiles]    = useState([]);

  const [updatedItem,        setUpdatedItem]        = useState({ ...empty, display: false, photoURLs: [] });
  const [editPreviews,       setEditPreviews]       = useState([]);
  const [editNewFiles,       setEditNewFiles]       = useState([]);
  const [editRemovedIndexes, setEditRemovedIndexes] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [addOpen,   setAddOpen]   = useState(false);
  const [editOpen,  setEditOpen]  = useState(false);
  const [filterCat, setFilterCat] = useState("All");
  const [view,      setView]      = useState("products"); // "products" | "inventory"

  /* inventory-specific state */
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("all");  // all | ok | low | out
  const [invCat,    setInvCat]    = useState("All");

  const storage = getStorage();

  const fetchItems = async () => {
    const snap = await getDocs(collection(db, "clothing"));
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };
  useEffect(() => { fetchItems(); }, []);

  /* ── upload helpers ─────────────────────────────────────────── */
  const uploadFile = async (file) => {
    const r = ref(storage, `clothing/${Date.now()}_${file.name}`);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  };
  const uploadAll = (files) => Promise.all(files.map(uploadFile));

  /* ── image preview handlers ─────────────────────────────────── */
  const handleNewPhotos = (e) => {
    const files = Array.from(e.target.files);
    setNewFiles(p => [...p, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setNewPreviews(p => [...p, ev.target.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const handleRemoveNewPreview = (i) => {
    setNewPreviews(p => p.filter((_, idx) => idx !== i));
    setNewFiles(p => p.filter((_, idx) => idx !== i));
  };
  const handleEditPhotos = (e) => {
    const files = Array.from(e.target.files);
    setEditNewFiles(p => [...p, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setEditPreviews(p => [...p, ev.target.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const handleRemoveEditPreview = (i) => {
    const exist = (updatedItem.photoURLs || []).length;
    if (i < exist) setEditRemovedIndexes(p => [...p, i]);
    else           setEditNewFiles(p => p.filter((_, idx) => idx !== i - exist));
    setEditPreviews(p => p.filter((_, idx) => idx !== i));
  };

  /* ── add ────────────────────────────────────────────────────── */
  const handleAdd = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) {
      setError("Name, price, and category are required."); return;
    }
    if (newFiles.length === 0) { setError("Please add at least one photo."); return; }
    setLoading(true); setError("");
    try {
      const photoURLs = await uploadAll(newFiles);
      await addDoc(collection(db, "clothing"), {
        name: newItem.name, price: Number(newItem.price),
        originalPrice: Number(newItem.originalPrice) || 0,
        category: newItem.category, sizes: Object.keys(newItem.stock),
        stock: newItem.stock, tag: newItem.tag,
        photoURL: photoURLs[0], photoURLs, display: false, createdAt: new Date(),
      });
      setAddOpen(false); setNewItem(empty); setNewFiles([]); setNewPreviews([]);
      fetchItems();
    } catch { setError("Failed to add item."); }
    finally  { setLoading(false); }
  };

  /* ── update ─────────────────────────────────────────────────── */
  const handleUpdate = async () => {
    if (!updatedItem.name || !updatedItem.price) {
      setError("Name and price are required."); return;
    }
    setLoading(true); setError("");
    try {
      const keptURLs  = (updatedItem.photoURLs || []).filter((_, i) => !editRemovedIndexes.includes(i));
      const newURLs   = await uploadAll(editNewFiles);
      const photoURLs = [...keptURLs, ...newURLs];
      if (photoURLs.length === 0) { setError("At least one photo is required."); return; }
      await updateDoc(doc(db, "clothing", editingId), {
        name: updatedItem.name, price: Number(updatedItem.price),
        originalPrice: Number(updatedItem.originalPrice) || 0,
        category: updatedItem.category, sizes: Object.keys(updatedItem.stock),
        stock: updatedItem.stock, tag: updatedItem.tag,
        photoURL: photoURLs[0], photoURLs, display: updatedItem.display,
      });
      setEditOpen(false); setEditNewFiles([]); setEditRemovedIndexes([]);
      fetchItems();
    } catch { setError("Failed to update item."); }
    finally  { setLoading(false); }
  };

  /* ── inline stock save ──────────────────────────────────────── */
  const handleInlineStockSave = async (itemId, size, newQty) => {
    await updateDoc(doc(db, "clothing", itemId), { [`stock.${size}`]: newQty });
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, stock: { ...i.stock, [size]: newQty } } : i
    ));
  };

  /* ── pin / delete ───────────────────────────────────────────── */
  const handlePin = async (item) => {
    const pinned = !item.pinned;
    await updateDoc(doc(db, "clothing", item.id), { pinned });
    setItems(p => p.map(i => i.id === item.id ? { ...i, pinned } : i));
  };
  const handleRemove = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    await deleteDoc(doc(db, "clothing", id));
    setItems(p => p.filter(i => i.id !== id));
  };

  /* ── category change helpers ────────────────────────────────── */
  /* When category changes, keep only sizes that exist in the new category.
     E.g. switching from T-Shirt (S/M/L) to Flag (2×3ft/3×5ft) clears incompatible sizes. */
  const changeNewItemCategory = (cat) => {
    const validSizes = getSizesForCategory(cat);
    const filteredStock = Object.fromEntries(
      Object.entries(newItem.stock).filter(([s]) => validSizes.includes(s))
    );
    setNewItem({ ...newItem, category: cat, stock: filteredStock });
  };

  const changeEditCategory = (cat) => {
    const validSizes = getSizesForCategory(cat);
    const filteredStock = Object.fromEntries(
      Object.entries(updatedItem.stock || {}).filter(([s]) => validSizes.includes(s))
    );
    setUpdatedItem({ ...updatedItem, category: cat, stock: filteredStock });
  };

  /* ── open edit modal ────────────────────────────────────────── */
  const openEdit = (item) => {
    setEditingId(item.id);
    const urls  = item.photoURLs || (item.photoURL ? [item.photoURL] : []);
    const stock = item.stock || (item.sizes || []).reduce((a, s) => ({ ...a, [s]: 0 }), {});
    setUpdatedItem({ ...item, photoURLs: urls, stock });
    setEditPreviews(urls); setEditNewFiles([]); setEditRemovedIndexes([]);
    setError(""); setEditOpen(true);
  };

  /* ── derived values ─────────────────────────────────────────── */
  const mainPhoto  = (item) => item.photoURLs?.[0] || item.photoURL || "";
  const displayed  = filterCat === "All" ? items : items.filter(i => i.category === filterCat);

  /* inventory KPIs */
  const totalUnits = items.reduce((s, i) => s + totalStock(i.stock), 0);
  const lowCount   = items.filter(i => stockStatus(i.stock) === "low").length;
  const outCount   = items.filter(i => stockStatus(i.stock) === "out").length;

  /* inventory filtered + sorted list */
  const invItems = items
    .filter(i => !invSearch || i.name.toLowerCase().includes(invSearch.toLowerCase()))
    .filter(i => invCat === "All" || i.category === invCat)
    .filter(i => {
      const s = stockStatus(i.stock);
      if (invStatus === "ok")  return s === "ok";
      if (invStatus === "low") return s === "low";
      if (invStatus === "out") return s === "out";
      return true;
    })
    .sort((a, b) => {
      const rank = { out: 0, low: 1, ok: 2, none: 3 };
      return (rank[stockStatus(a.stock)] ?? 3) - (rank[stockStatus(b.stock)] ?? 3);
    });

  /* bar chart constants */
  const BAR_MAX_SCALE = 20; // 20 units = 100% bar height
  const BAR_PX       = 52; // px max bar height

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="cm-container">

      {/* ── Top bar ── */}
      <div className="cm-topbar">
        <div className="cm-topbar-left">
          <h2 className="cm-title">Products</h2>
          <span className="cm-count">{items.length} items</span>
        </div>
        <div className="cm-topbar-right">
          <div className="cm-view-toggle">
            <button className={`cm-view-btn ${view === "products"  ? "active" : ""}`} onClick={() => setView("products")}>
              <Package size={13}/> Products
            </button>
            <button className={`cm-view-btn ${view === "inventory" ? "active" : ""}`} onClick={() => setView("inventory")}>
              <BarChart2 size={13}/> Inventory
            </button>
          </div>
          {view === "products" && (
            <>
              <select className="cm-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="All">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="cm-add-btn" onClick={() => { setError(""); setAddOpen(true); }}>+ Add item</button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          INVENTORY VIEW
      ══════════════════════════════════════════════════════ */}
      {view === "inventory" && (
        <div className="inv-page">

          {/* KPI row */}
          <div className="inv-kpis">
            <div className="inv-kpi">
              <div className="inv-kpi-icon inv-kpi-icon-neutral"><Package size={18}/></div>
              <div className="inv-kpi-body">
                <span className="inv-kpi-val">{items.length}</span>
                <span className="inv-kpi-label">Total Products</span>
              </div>
            </div>
            <div className="inv-kpi">
              <div className="inv-kpi-icon inv-kpi-icon-green"><CheckCircle size={18}/></div>
              <div className="inv-kpi-body">
                <span className="inv-kpi-val">{totalUnits}</span>
                <span className="inv-kpi-label">Units in Stock</span>
              </div>
            </div>
            <div className="inv-kpi">
              <div className="inv-kpi-icon inv-kpi-icon-gold"><TrendingDown size={18}/></div>
              <div className="inv-kpi-body">
                <span className="inv-kpi-val inv-kpi-val-gold">{lowCount}</span>
                <span className="inv-kpi-label">Low Stock Items</span>
              </div>
            </div>
            <div className="inv-kpi">
              <div className="inv-kpi-icon inv-kpi-icon-red"><XCircle size={18}/></div>
              <div className="inv-kpi-body">
                <span className="inv-kpi-val inv-kpi-val-red">{outCount}</span>
                <span className="inv-kpi-label">Out of Stock</span>
              </div>
            </div>
          </div>

          {/* Toolbar: search + status tabs + category */}
          <div className="inv-toolbar">
            <div className="inv-search-wrap">
              <Search size={14} className="inv-search-icon"/>
              <input
                className="inv-search-input"
                placeholder="Search products…"
                value={invSearch}
                onChange={e => setInvSearch(e.target.value)}
              />
            </div>

            <div className="inv-status-tabs">
              {[
                { key: "all", label: "All",        count: items.length },
                { key: "ok",  label: "In Stock",   count: items.filter(i => stockStatus(i.stock) === "ok").length },
                { key: "low", label: "Low Stock",  count: lowCount },
                { key: "out", label: "Out of Stock", count: outCount },
              ].map(t => (
                <button
                  key={t.key}
                  className={`inv-status-tab ${invStatus === t.key ? "active" : ""} inv-status-tab-${t.key}`}
                  onClick={() => setInvStatus(t.key)}
                >
                  {t.label}
                  <span className="inv-tab-count">{t.count}</span>
                </button>
              ))}
            </div>

            <select className="inv-cat-select" value={invCat} onChange={e => setInvCat(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Column headers */}
          <div className="inv-header-row">
            <span>Product</span>
            <span>Stock by Size <span className="inv-edit-hint">(click number to edit)</span></span>
            <span>Total</span>
            <span>Status</span>
            <span></span>
          </div>

          {/* Product rows */}
          <div className="inv-list">
            {invItems.length === 0 ? (
              <div className="inv-empty">No products match your filters.</div>
            ) : invItems.map(item => {
              const stock    = item.stock || {};
              const entries  = Object.entries(stock);
              const total    = totalStock(stock);
              const status   = stockStatus(stock);
              const maxInItem = Math.max(1, ...Object.values(stock));

              return (
                <div key={item.id} className={`inv-row inv-row-${status}`}>

                  {/* Product info */}
                  <div className="inv-product">
                    <div className="inv-product-img-wrap">
                      {mainPhoto(item)
                        ? <img src={mainPhoto(item)} alt={item.name} className="inv-product-img"/>
                        : <div className="inv-product-img-placeholder"/>
                      }
                      <span className={`inv-live-dot ${item.display ? "live" : ""}`} title={item.display ? "Live" : "Hidden"}/>
                    </div>
                    <div className="inv-product-text">
                      <h4 className="inv-product-name">{item.name}</h4>
                      <div className="inv-product-meta">
                        <span className="inv-product-cat">{item.category}</span>
                        {getSizeUnit(item.category) && (
                          <span className="inv-size-unit-tag">
                            <Ruler size={9}/> {getSizeUnit(item.category)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bar chart + inline editing */}
                  <div className="inv-chart-wrap">
                    {entries.length === 0 ? (
                      <span className="inv-no-stock-label">No stock configured — click Edit</span>
                    ) : (
                      <div className="inv-chart">
                        {entries.map(([size, qty]) => {
                          const isMTO = qty === CUSTOM_STOCK_SENTINEL;
                          const fillH = isMTO ? BAR_PX : qty === 0 ? 0 : Math.max(3, (Math.min(qty, BAR_MAX_SCALE) / BAR_MAX_SCALE) * BAR_PX);
                          const cls   = isMTO ? "mto" : qty === 0 ? "out" : qty <= 3 ? "low" : "ok";
                          return (
                            <div key={size} className="inv-bar-col">
                              {/* Alert icon for low/out */}
                              <div className="inv-bar-alert">
                                {!isMTO && qty === 0 && <XCircle size={9} className="inv-icon-out"/>}
                                {!isMTO && qty > 0 && qty <= 3 && <AlertTriangle size={9} className="inv-icon-low"/>}
                              </div>
                              {/* Bar track */}
                              <div className="inv-bar-track">
                                <div
                                  className={`inv-bar-fill inv-bar-${cls}`}
                                  style={{ height: `${fillH}px` }}
                                />
                              </div>
                              {/* Size label */}
                              <span className="inv-bar-size">{size}</span>
                              {/* Qty or MTO */}
                              <InlineQty
                                itemId={item.id}
                                size={size}
                                qty={qty}
                                onSave={handleInlineStockSave}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Total units */}
                  <div className="inv-total-col">
                    <span className="inv-total-num">{total}</span>
                    <span className="inv-total-sub">units</span>
                  </div>

                  {/* Status badge */}
                  <div className="inv-status-col">
                    {status === "ok"   && <span className="inv-badge inv-badge-ok"><CheckCircle size={11}/> In Stock</span>}
                    {status === "low"  && <span className="inv-badge inv-badge-low"><AlertTriangle size={11}/> Low Stock</span>}
                    {status === "out"  && <span className="inv-badge inv-badge-out"><XCircle size={11}/> Out of Stock</span>}
                    {status === "none" && <span className="inv-badge inv-badge-none">Not Tracked</span>}
                  </div>

                  {/* Edit button */}
                  <div className="inv-actions-col">
                    <button className="inv-edit-btn" onClick={() => openEdit(item)}>
                      <Edit3 size={13}/> Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PRODUCTS VIEW
      ══════════════════════════════════════════════════════ */}
      {view === "products" && (
        displayed.length === 0 ? (
          <div className="cm-empty">No products yet — add your first item.</div>
        ) : (
          <div className="cm-grid">
            {displayed.map(item => {
              const imgCount = (item.photoURLs || []).length || (item.photoURL ? 1 : 0);
              const status   = stockStatus(item.stock);
              return (
                <div key={item.id} className="cm-card">
                  <div className="cm-card-img-wrap">
                    {mainPhoto(item)
                      ? <img src={mainPhoto(item)} alt={item.name} className="cm-card-img"/>
                      : <div className="cm-card-img-placeholder">No image</div>
                    }
                    <span className={`cm-live-badge ${item.display ? "live" : "hidden"}`}>
                      {item.display ? "Live" : "Hidden"}
                    </span>
                    {item.pinned && <span className="cm-pinned-badge"><Pin size={10}/> Pinned</span>}
                    {imgCount > 1 && <span className="cm-img-count">+{imgCount - 1} more</span>}
                    {item.tag    && <span className="cm-tag-badge">{item.tag}</span>}
                  </div>
                  <div className="cm-card-info">
                    <p className="cm-card-cat">{item.category}</p>
                    <h4 className="cm-card-name">{item.name}</h4>
                    <p className="cm-card-price">৳{item.price}</p>
                    {item.stock && Object.keys(item.stock).length > 0 ? (
                      <>
                        {status === "out" && <span className="cm-stock-badge out">Out of stock</span>}
                        {status === "low" && <span className="cm-stock-badge low"><AlertTriangle size={9}/> Low stock</span>}
                        {status === "ok"  && <span className="cm-stock-badge ok">In stock · {totalStock(item.stock)} units</span>}
                        <div className="cm-stock-chips">
                          {Object.entries(item.stock).map(([s, q]) => (
                            <span key={s} className={`cm-stock-chip ${q === 0 ? "zero" : q <= 3 ? "low" : "ok"}`}>
                              {s}: {q}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="cm-card-sizes">
                        {(item.sizes || []).map(s => <span key={s} className="cm-sz">{s}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="cm-card-actions">
                    <button className={`cm-pin-btn ${item.pinned ? "pinned" : ""}`} onClick={() => handlePin(item)} title={item.pinned ? "Unpin" : "Pin"}>
                      <Pin size={13}/>
                    </button>
                    <button className="cm-edit-btn" onClick={() => openEdit(item)}>Edit</button>
                    <button className="cm-del-btn"  onClick={() => handleRemove(item.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ══ ADD MODAL ══ */}
      {addOpen && (
        <Modal title="Add new item" onClose={() => setAddOpen(false)}>
          <div className="cm-form-grid">
            <Field label="Product name">
              <input className="cm-input" placeholder="e.g. Bangladesh Jersey 2026"
                value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })}/>
            </Field>
            <Field label="Sale Price (৳)">
              <input className="cm-input" type="number" placeholder="e.g. 900"
                value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })}/>
            </Field>
            <Field label="Original Price (৳)" hint="optional — set to show discount %">
              <input className="cm-input" type="number" placeholder="e.g. 1200 (leave blank if no sale)"
                value={newItem.originalPrice} onChange={e => setNewItem({ ...newItem, originalPrice: e.target.value })}/>
            </Field>
            <Field label="Category">
              <select className="cm-input" value={newItem.category} onChange={e => changeNewItemCategory(e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Tag">
              <select className="cm-input" value={newItem.tag} onChange={e => setNewItem({ ...newItem, tag: e.target.value })}>
                <option value="">No tag</option>
                {TAGS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label={getSizeFieldLabel(newItem.category)}>
            <SizeStockPicker
              stock={newItem.stock}
              onChange={s => setNewItem({ ...newItem, stock: s })}
              category={newItem.category}
            />
          </Field>
          <Field label="Product photos">
            <p className="cm-img-hint">First image is the main display photo.</p>
            <ImageUploader previews={newPreviews} onAdd={handleNewPhotos} onRemove={handleRemoveNewPreview}/>
          </Field>
          {error && <p className="cm-error">{error}</p>}
          <div className="cm-modal-footer">
            <button className="cm-btn-sec" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="cm-btn-primary" onClick={handleAdd} disabled={loading}>
              {loading ? "Uploading…" : "Add item"}
            </button>
          </div>
        </Modal>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editOpen && (
        <Modal title="Edit item" onClose={() => setEditOpen(false)}>
          <div className="cm-form-grid">
            <Field label="Product name">
              <input className="cm-input" value={updatedItem.name}
                onChange={e => setUpdatedItem({ ...updatedItem, name: e.target.value })}/>
            </Field>
            <Field label="Sale Price (৳)">
              <input className="cm-input" type="number" value={updatedItem.price}
                onChange={e => setUpdatedItem({ ...updatedItem, price: e.target.value })}/>
            </Field>
            <Field label="Original Price (৳)" hint="optional — set to show discount %">
              <input className="cm-input" type="number" value={updatedItem.originalPrice || ""}
                placeholder="Leave blank if no sale"
                onChange={e => setUpdatedItem({ ...updatedItem, originalPrice: e.target.value })}/>
            </Field>
            <Field label="Category">
              <select className="cm-input" value={updatedItem.category}
                onChange={e => changeEditCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Tag">
              <select className="cm-input" value={updatedItem.tag || ""}
                onChange={e => setUpdatedItem({ ...updatedItem, tag: e.target.value })}>
                <option value="">No tag</option>
                {TAGS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label={getSizeFieldLabel(updatedItem.category)}>
            <SizeStockPicker
              stock={updatedItem.stock || {}}
              onChange={s => setUpdatedItem({ ...updatedItem, stock: s })}
              category={updatedItem.category}
            />
          </Field>
          <Field label="Product photos">
            <p className="cm-img-hint">First image is the main photo. Click ✕ to remove.</p>
            <ImageUploader previews={editPreviews} onAdd={handleEditPhotos} onRemove={handleRemoveEditPreview}/>
          </Field>
          <label className="cm-check-label">
            <input type="checkbox" checked={updatedItem.display}
              onChange={e => setUpdatedItem({ ...updatedItem, display: e.target.checked })}/>
            <span>Display on website</span>
          </label>
          {error && <p className="cm-error">{error}</p>}
          <div className="cm-modal-footer">
            <button className="cm-btn-sec" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="cm-btn-primary" onClick={handleUpdate} disabled={loading}>
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClothingManagement;
