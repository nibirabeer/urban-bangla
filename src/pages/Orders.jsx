import React, { useState, useEffect } from "react";
import { db, auth } from "../services/firebase";
import { collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Package, Truck, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";
import "../styles/Orders.css";

const COURIER_URLS = {
  Steadfast:     "https://steadfast.com.bd/track/",
  RedX:          "https://redx.com.bd/track/",
  Pathao:        "https://pathao.com/bn/tracking/",
  Sundarban:     "http://sundarbancourier.com/tracking/?code=",
  Aramex:        "https://www.aramex.com/track-shipments/details?ShipmentNumber=",
};

/* Ordered steps in the delivery journey */
const STEPS = [
  { key: "Processing",        label: "Order Placed",       icon: Package },
  { key: "Packed",            label: "Packed",             icon: Package },
  { key: "Shipped",           label: "Shipped",            icon: Truck },
  { key: "Out for Delivery",  label: "Out for Delivery",   icon: Truck },
  { key: "Delivered",         label: "Delivered",          icon: CheckCircle },
];

const STATUS_COLORS = {
  Processing:        { color: "#C9A96E", bg: "rgba(201,169,110,0.1)" },
  Packed:            { color: "#4d9fff", bg: "rgba(77,159,255,0.1)" },
  Shipped:           { color: "#00e5aa", bg: "rgba(0,229,170,0.1)" },
  "Out for Delivery":{ color: "#00b8ff", bg: "rgba(0,184,255,0.1)" },
  Delivered:         { color: "#4dffa6", bg: "rgba(77,255,166,0.1)" },
  Cancelled:         { color: "#F42A41", bg: "rgba(244,42,65,0.1)" },
};

const StatusTimeline = ({ status }) => {
  if (status === "Cancelled") return null;
  const currentIdx = STEPS.findIndex(s => s.key === status);
  const activeIdx  = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="ord-timeline">
      {STEPS.map((step, i) => {
        const done    = i <= activeIdx;
        const active  = i === activeIdx;
        const Icon    = step.icon;
        return (
          <div key={step.key} className={`ord-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
            <div className="ord-step-icon-wrap">
              <Icon size={14}/>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`ord-step-line ${i < activeIdx ? "done" : ""}`} />
            )}
            <span className="ord-step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const Orders = () => {
  const [orders,   setOrders]   = useState([]);
  const [userName, setUserName] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      try {
        const userRef  = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setUserName(userSnap.data().name || "");
        const snap = await getDocs(collection(userRef, "orders"));
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));
        setOrders(sorted);
      } catch (e) {
        console.error(e);
        setError("Failed to load orders. Please refresh.");
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "orders", orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { alert("Failed to cancel order. Please try again."); }
  };

  if (loading) return (
    <div className="ord-loading">
      <div className="cloth-loader" />
    </div>
  );

  if (error) return (
    <div className="ord-page">
      <p style={{ color: "var(--red)", padding: "40px 0" }}>{error}</p>
    </div>
  );

  return (
    <div className="ord-page">
      <div className="ord-header">
        <h1 className="ord-title">My <span>Orders</span></h1>
        {userName && <p className="ord-welcome">Hey, {userName}</p>}
      </div>

      {orders.length === 0 ? (
        <div className="ord-empty">
          <p>No orders yet — time to shop!</p>
          <a href="/dashboard" className="ord-shop-link">Shop Now</a>
        </div>
      ) : (
        <div className="ord-list">
          {orders.map(order => {
            const st        = STATUS_COLORS[order.status] || STATUS_COLORS.Processing;
            const canCancel = order.status === "Processing";
            const tracking  = order.tracking;
            const trackUrl  = tracking?.code && COURIER_URLS[tracking.courier]
              ? `${COURIER_URLS[tracking.courier]}${tracking.code}`
              : null;

            /* Multi-item orders */
            const displayItems = order.items?.length
              ? order.items
              : [{ name: order.itemName, photoURL: order.itemPhotoURL, category: order.category, size: order.size, quantity: order.quantity }];

            const mainPhoto = displayItems[0]?.photoURL || order.itemPhotoURL;
            const mainName  = displayItems[0]?.name     || order.itemName;

            return (
              <div key={order.id} className="ord-card">

                {/* Top: image + name + status */}
                <div className="ord-card-head">
                  <div className="ord-card-img-wrap">
                    {mainPhoto
                      ? <img src={mainPhoto} alt={mainName} className="ord-card-img"/>
                      : <div className="ord-card-img-placeholder"/>
                    }
                    {displayItems.length > 1 && (
                      <span className="ord-more-badge">+{displayItems.length - 1}</span>
                    )}
                  </div>

                  <div className="ord-card-summary">
                    <p className="ord-cat">{displayItems[0]?.category || order.category}</p>
                    <h2 className="ord-name">
                      {mainName}
                      {displayItems.length > 1 && ` + ${displayItems.length - 1} more`}
                    </h2>
                    <div className="ord-meta">
                      <div className="ord-meta-item">
                        <span>Size</span><strong>{displayItems[0]?.size || order.size}</strong>
                      </div>
                      <div className="ord-meta-item">
                        <span>Qty</span>
                        <strong>{order.quantity || displayItems.reduce((s,i)=>s+(i.quantity||1),0)}</strong>
                      </div>
                      <div className="ord-meta-item">
                        <span>Total</span><strong>৳{Math.round(order.totalPrice || 0)}</strong>
                      </div>
                      {order.orderedAt && (
                        <div className="ord-meta-item">
                          <span>Date</span>
                          <strong>{new Date(order.orderedAt).toLocaleDateString("en-GB")}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className="ord-status-pill"
                    style={{ color: st.color, background: st.bg, borderColor: st.color + "44" }}
                  >
                    {order.status || "Processing"}
                  </span>
                </div>

                {/* Status timeline */}
                {order.status !== "Cancelled" && (
                  <StatusTimeline status={order.status || "Processing"}/>
                )}

                {/* Tracking info — shown once admin adds it */}
                {tracking?.code && (
                  <div className="ord-tracking-box">
                    <div className="ord-tracking-header">
                      <Truck size={14}/> Tracking Information
                    </div>
                    <div className="ord-tracking-row">
                      <div className="ord-tracking-detail">
                        <span className="ord-tracking-label">Courier</span>
                        <strong className="ord-tracking-val">{tracking.courier}</strong>
                      </div>
                      <div className="ord-tracking-detail">
                        <span className="ord-tracking-label">Tracking No.</span>
                        <strong className="ord-tracking-code">{tracking.code}</strong>
                      </div>
                    </div>
                    {trackUrl && (
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ord-track-btn"
                      >
                        <Truck size={14}/> Track My Package
                        <ExternalLink size={12}/>
                      </a>
                    )}
                    {!trackUrl && (
                      <p className="ord-track-manual">
                        Visit <strong>{tracking.courier}</strong>'s website and enter tracking number: <strong>{tracking.code}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Cancel button */}
                {canCancel && (
                  <button className="ord-cancel-btn" onClick={() => handleCancel(order.id)}>
                    Cancel Order
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;
