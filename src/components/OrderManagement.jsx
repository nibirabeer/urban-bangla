import React, { useState, useEffect } from "react";
import { db } from "../services/firebase";
import app from "../services/firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Truck, Mail, CheckCircle, ExternalLink } from "lucide-react";
import "../styles/OrderManagement.css";

const STATUSES         = ["Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["pending", "verified", "rejected"];
const COURIERS         = ["Steadfast", "RedX", "Pathao", "Sundarban", "SA Porisheba", "Aramex", "Other"];

const COURIER_URLS = {
  Steadfast:     "https://steadfast.com.bd/track/",
  RedX:          "https://redx.com.bd/track/",
  Pathao:        "https://pathao.com/bn/tracking/",
  Sundarban:     "http://sundarbancourier.com/tracking/?code=",
  Aramex:        "https://www.aramex.com/track-shipments/details?ShipmentNumber=",
};

const formatPaymentMethod = (method = "") => {
  if (method === "bkash") return "bKash";
  if (method === "nagad") return "Nagad";
  if (method === "cod")   return "Cash on Delivery";
  if (method === "card")  return "Card";
  return method || "—";
};

const OrderManagement = () => {
  const [orders,           setOrders]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [editingId,        setEditingId]        = useState(null);
  const [editStatus,       setEditStatus]       = useState("Processing");
  const [paymentEditingId, setPaymentEditingId] = useState(null);
  const [editPaymentStatus,setEditPaymentStatus]= useState("pending");

  /* tracking state */
  const [trackingEditId,  setTrackingEditId]  = useState(null); // orderId being edited
  const [trackCourier,    setTrackCourier]    = useState("Steadfast");
  const [trackCode,       setTrackCode]       = useState("");
  const [savingTrack,     setSavingTrack]     = useState(false);
  const [emailingId,      setEmailingId]      = useState(null);  // orderId
  const [emailSuccess,    setEmailSuccess]    = useState(null);  // orderId
  const [emailError,      setEmailError]      = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        let all = [];
        for (const uDoc of usersSnap.docs) {
          const uid = uDoc.id;
          const d   = uDoc.data();
          const snap = await getDocs(collection(db, `users/${uid}/orders`));
          all = [
            ...all,
            ...snap.docs.map(od => ({
              id: od.id, userId: uid,
              userName:  d.name || d.displayName || d.email || "Unknown",
              userEmail: d.email || "",
              ...od.data(),
            })),
          ];
        }
        all.sort((a, b) => new Date(b.orderedAt || 0) - new Date(a.orderedAt || 0));
        setOrders(all);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchOrders();
  }, []);

  const updateOrder = async (userId, orderId, data) => {
    await updateDoc(doc(db, `users/${userId}/orders`, orderId), data);
    setOrders(prev => prev.map(o =>
      o.id === orderId && o.userId === userId ? { ...o, ...data } : o
    ));
  };

  const handleDelete = async (userId, orderId) => {
    if (!window.confirm("Delete this order?")) return;
    await deleteDoc(doc(db, `users/${userId}/orders`, orderId));
    setOrders(prev => prev.filter(o => !(o.id === orderId && o.userId === userId)));
  };

  const handleStatusUpdate = async (userId, orderId) => {
    await updateOrder(userId, orderId, { status: editStatus });
    setEditingId(null);
  };

  const handlePaymentStatusUpdate = async (userId, orderId) => {
    await updateOrder(userId, orderId, {
      paymentStatus: editPaymentStatus,
      paymentVerifiedAt: editPaymentStatus === "verified" ? new Date().toISOString() : null,
    });
    setPaymentEditingId(null);
  };

  /* ── Tracking: save to Firestore ── */
  const openTrackingEdit = (order) => {
    setTrackingEditId(order.id);
    setTrackCourier(order.tracking?.courier || "Steadfast");
    setTrackCode(order.tracking?.code || "");
    setEmailError("");
  };

  const handleSaveTracking = async (order) => {
    if (!trackCode.trim()) return;
    setSavingTrack(true);
    try {
      await updateOrder(order.userId, order.id, {
        tracking: {
          courier:    trackCourier,
          code:       trackCode.trim(),
          updatedAt:  new Date().toISOString(),
          notified:   order.tracking?.notified || false,
          notifiedAt: order.tracking?.notifiedAt || null,
        },
        // auto-advance status if still Processing or Packed
        status: ["Processing", "Packed"].includes(order.status) ? "Shipped" : order.status,
      });
      setTrackingEditId(null);
    } finally { setSavingTrack(false); }
  };

  /* ── Tracking: send email via Cloud Function ── */
  const handleSendEmail = async (order) => {
    setEmailingId(order.id);
    setEmailError("");
    try {
      const fns = getFunctions(app);
      const sendDeliveryUpdate = httpsCallable(fns, "sendDeliveryUpdate");
      await sendDeliveryUpdate({ userId: order.userId, orderId: order.id });
      // Reflect notified flag locally
      setOrders(prev => prev.map(o =>
        o.id === order.id
          ? { ...o, tracking: { ...o.tracking, notified: true, notifiedAt: new Date().toISOString() } }
          : o
      ));
      setEmailSuccess(order.id);
      setTimeout(() => setEmailSuccess(null), 4000);
    } catch (e) {
      setEmailError(e.message || "Failed to send email.");
    } finally { setEmailingId(null); }
  };

  const renderItems = (order) => {
    const items = order.items?.length
      ? order.items
      : [{ name: order.itemName, photoURL: order.itemPhotoURL, category: order.category, size: order.size, quantity: order.quantity, price: order.totalPrice }];
    return items.map((item, i) => (
      <div key={`${order.id}-${i}`} className="om-product-line">
        <img src={item.photoURL || order.itemPhotoURL} alt={item.name} className="om-product-img" />
        <div>
          <h4 className="om-name">{item.name || "Product"}</h4>
          <p className="om-product-meta">
            {item.category && <span>{item.category}</span>}
            {item.size && <span>Size: <b>{item.size}</b></span>}
            <span>Qty: <b>{item.quantity || 1}</b></span>
            {item.price && <span>৳{Math.round(item.price)}</span>}
          </p>
        </div>
      </div>
    ));
  };

  if (loading) return <div className="om-loading">Loading orders…</div>;

  return (
    <div className="om-container">
      <h2 className="om-title">All Orders</h2>
      {orders.length === 0 ? (
        <p className="om-empty">No orders yet.</p>
      ) : (
        <div className="om-list">
          {orders.map(order => {
            const tracking    = order.tracking;
            const trackUrl    = tracking?.code && COURIER_URLS[tracking.courier]
              ? `${COURIER_URLS[tracking.courier]}${tracking.code}`
              : null;

            return (
              <div key={`${order.userId}-${order.id}`} className="om-card">
                <div className="om-details">

                  {/* Header row */}
                  <div className="om-row">
                    <div>
                      <p className="om-user">
                        {order.userName}{order.userEmail ? ` (${order.userEmail})` : ""}
                      </p>
                      {order.orderedAt && (
                        <p className="om-user om-date">
                          {new Date(order.orderedAt).toLocaleString("en-GB")}
                        </p>
                      )}
                    </div>
                    <div className="om-badges">
                      <span className="om-status">{order.status || "Processing"}</span>
                      <span className={`om-payment-badge om-payment-${order.paymentStatus || "pending"}`}>
                        {order.paymentStatus || "pending"}
                      </span>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="om-products">{renderItems(order)}</div>

                  {/* Meta */}
                  <div className="om-meta">
                    <span>Total: <b>৳{Math.round(order.totalPrice || 0)}</b></span>
                    <span>Payment: <b>{formatPaymentMethod(order.paymentMethod)}</b></span>
                    {order.transactionId && <span>TXN: <b>{order.transactionId}</b></span>}
                    {order.address && (
                      <span>
                        Address: <b>{[order.address.street, order.address.city, order.address.district].filter(Boolean).join(", ")}</b>
                      </span>
                    )}
                  </div>

                  {/* ── Tracking section ── */}
                  <div className="om-tracking-section">
                    <div className="om-tracking-label">
                      <Truck size={13}/> Tracking
                      {tracking?.notified && (
                        <span className="om-notified-badge">
                          <Mail size={10}/> Email sent
                        </span>
                      )}
                    </div>

                    {trackingEditId === order.id ? (
                      /* edit form */
                      <div className="om-track-form">
                        <select
                          className="om-select om-track-select"
                          value={trackCourier}
                          onChange={e => setTrackCourier(e.target.value)}
                        >
                          {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                          className="om-select om-track-input"
                          placeholder="Tracking code e.g. STD-1234567"
                          value={trackCode}
                          onChange={e => setTrackCode(e.target.value)}
                        />
                        <button
                          className="om-save"
                          disabled={!trackCode.trim() || savingTrack}
                          onClick={() => handleSaveTracking(order)}
                        >
                          {savingTrack ? "Saving…" : "Save"}
                        </button>
                        <button className="om-cancel" onClick={() => setTrackingEditId(null)}>Cancel</button>
                      </div>
                    ) : tracking?.code ? (
                      /* tracking info display */
                      <div className="om-track-info">
                        <div className="om-track-row">
                          <span className="om-track-courier">{tracking.courier}</span>
                          <span className="om-track-code">{tracking.code}</span>
                          {trackUrl && (
                            <a href={trackUrl} target="_blank" rel="noreferrer" className="om-track-link">
                              <ExternalLink size={12}/> Track
                            </a>
                          )}
                        </div>
                        <button className="om-track-edit-btn" onClick={() => openTrackingEdit(order)}>
                          Edit
                        </button>
                      </div>
                    ) : (
                      /* no tracking yet */
                      <button className="om-add-track-btn" onClick={() => openTrackingEdit(order)}>
                        + Add Tracking Code
                      </button>
                    )}

                    {/* Send email button — only if tracking code exists */}
                    {tracking?.code && trackingEditId !== order.id && (
                      <div className="om-email-row">
                        {emailSuccess === order.id ? (
                          <span className="om-email-sent">
                            <CheckCircle size={13}/> Email sent to {order.userEmail}
                          </span>
                        ) : (
                          <button
                            className="om-email-btn"
                            disabled={emailingId === order.id}
                            onClick={() => handleSendEmail(order)}
                          >
                            <Mail size={13}/>
                            {emailingId === order.id
                              ? "Sending…"
                              : tracking.notified
                              ? "Resend Update Email"
                              : "Send Update Email"
                            }
                          </button>
                        )}
                        {emailError && emailingId === null && (
                          <p className="om-email-error">{emailError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Action buttons ── */}
                  {editingId === order.id ? (
                    <div className="om-edit-row">
                      <select className="om-select" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                      <button className="om-save" onClick={() => handleStatusUpdate(order.userId, order.id)}>Save</button>
                      <button className="om-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : paymentEditingId === order.id ? (
                    <div className="om-edit-row">
                      <select className="om-select" value={editPaymentStatus} onChange={e => setEditPaymentStatus(e.target.value)}>
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="om-save" onClick={() => handlePaymentStatusUpdate(order.userId, order.id)}>Save</button>
                      <button className="om-cancel" onClick={() => setPaymentEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="om-actions">
                      <button className="om-edit-btn" onClick={() => { setEditingId(order.id); setEditStatus(order.status || "Processing"); }}>
                        Update Status
                      </button>
                      <button className="om-pay-btn" onClick={() => { setPaymentEditingId(order.id); setEditPaymentStatus(order.paymentStatus || "pending"); }}>
                        Verify Payment
                      </button>
                      <button className="om-del-btn" onClick={() => handleDelete(order.userId, order.id)}>Delete</button>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
