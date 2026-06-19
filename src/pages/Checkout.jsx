import React, { useEffect, useState, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { MapPin, CheckCircle, ArrowLeft, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "../services/firebase";
import app from "../services/firebase";
import { useCart } from "../context/CartContext";
import "../styles/Checkout.css";

const PAYMENT_ICONS = {
  bkash: { label: "bKash",               color: "#E2136E", bg: "rgba(226,19,110,0.1)",  border: "rgba(226,19,110,0.3)"  },
  nagad: { label: "Nagad",               color: "#F6821F", bg: "rgba(246,130,31,0.1)",  border: "rgba(246,130,31,0.3)"  },
  cod:   { label: "Cash on Delivery",    color: "var(--green)", bg: "rgba(0,106,78,0.1)", border: "rgba(0,106,78,0.3)"  },
  card:  { label: "Credit / Debit Card", color: "#5469D4", bg: "rgba(84,105,212,0.1)",  border: "rgba(84,105,212,0.3)"  },
};

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#F5F2EC",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "14px",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#555" },
      iconColor: "#999",
    },
    invalid: { color: "#F4422A", iconColor: "#F4422A" },
  },
};

/* ── Stripe card section – must live inside <Elements> ── */
const CardSection = forwardRef((_, ref) => {
  const stripe   = useStripe();
  const elements = useElements();

  useImperativeHandle(ref, () => ({
    confirmPayment: async (clientSecret) => {
      const card = elements?.getElement(CardElement);
      if (!stripe || !card) return { error: { message: "Card not ready. Please try again." } };
      return stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
    },
  }), [stripe, elements]);

  return (
    <div className="co-card-element-wrap">
      <CardElement options={CARD_ELEMENT_OPTIONS} />
    </div>
  );
});

CardSection.displayName = "CardSection";

/* ── Main checkout form ── */
const CheckoutForm = ({ user, addresses, paymentConfig, items, total, clearCart }) => {
  const navigate  = useNavigate();
  const cardRef   = useRef(null);

  const [selectedAddr,   setSelectedAddr]   = useState(null);
  const [paymentMethod,  setPaymentMethod]  = useState("");
  const [transactionId,  setTransactionId]  = useState("");
  const [placing,        setPlacing]        = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [error,          setError]          = useState("");

  useEffect(() => {
    const def = addresses.find(a => a.isDefault) || addresses[0] || null;
    setSelectedAddr(def);
  }, [addresses]);

  // Guard: empty cart → go back (but not after a successful order)
  useEffect(() => {
    if (items.length === 0 && !success) navigate("/cart");
  }, [items, success]);

  const availableMethods = [
    paymentConfig.bkash?.active  && { key: "bkash", ...PAYMENT_ICONS.bkash, number: paymentConfig.bkash.number },
    paymentConfig.nagad?.active  && { key: "nagad", ...PAYMENT_ICONS.nagad, number: paymentConfig.nagad.number },
    (paymentConfig.cod?.active !== false) && { key: "cod", ...PAYMENT_ICONS.cod },
    (paymentConfig.stripe?.active && paymentConfig.stripe?.publishableKey) && { key: "card", ...PAYMENT_ICONS.card },
  ].filter(Boolean);

  // Stock deduction is handled server-side in the onOrderCreated Cloud Function.

  const placeOrder = async () => {
    if (!selectedAddr)  { setError("Please select a delivery address."); return; }
    if (!paymentMethod) { setError("Please select a payment method."); return; }
    if (paymentMethod === "bkash" || paymentMethod === "nagad") {
      const txn = transactionId.trim();
      if (!txn) { setError("Please enter your transaction ID."); return; }
      if (!/^[A-Za-z0-9]{8,20}$/.test(txn)) {
        setError("Transaction ID must be 8–20 alphanumeric characters."); return;
      }
    }
    setError(""); setPlacing(true);

    try {
      const orderBase = {
        items: items.map(i => ({
          itemId: i.itemId, name: i.name, photoURL: i.photoURL,
          category: i.category, size: i.size, quantity: i.quantity, price: i.price,
        })),
        itemName:     items[0]?.name     || "",
        itemPhotoURL: items[0]?.photoURL || "",
        category:     items[0]?.category || "",
        size:         items[0]?.size     || "",
        quantity:     items.reduce((s, i) => s + i.quantity, 0),
        totalPrice:   Math.round(total),
        address:      selectedAddr,
        paymentMethod,
        orderedAt:    new Date().toISOString(),
        status:       "Processing",
      };

      if (paymentMethod === "card") {
        // Step 1 – create PaymentIntent via Cloud Function (price calculated server-side)
        const fns = getFunctions(app);
        const createPaymentIntent = httpsCallable(fns, "createPaymentIntent");
        const cartItems = items.map(i => ({ itemId: i.itemId, size: i.size, quantity: i.quantity }));
        const { data: { clientSecret } } = await createPaymentIntent({ items: cartItems });

        // Step 2 – confirm card payment (Stripe handles 3DS, etc.)
        const result = await cardRef.current.confirmPayment(clientSecret);
        if (result.error) {
          setError(result.error.message);
          setPlacing(false);
          return;
        }

        // Step 3 – persist order
        setSuccess(true); // flip first so cart-empty guard doesn't redirect
        await addDoc(collection(db, "users", user.uid, "orders"), {
          ...orderBase,
          transactionId: result.paymentIntent.id,
          paymentIntentId: result.paymentIntent.id,
          paymentStatus: "paid",
        });
      } else {
        setSuccess(true);
        await addDoc(collection(db, "users", user.uid, "orders"), {
          ...orderBase,
          transactionId: transactionId.trim() || "",
          paymentStatus: paymentMethod === "cod" ? "verified" : "pending",
        });
      }

      await clearCart();
    } catch (e) {
      console.error(e);
      setSuccess(false);
      setError(e?.message || "Failed to place order. Please try again.");
    } finally { setPlacing(false); }
  };

  if (success) return (
    <div className="co-page">
      <div className="co-success">
        <div className="co-truck-wrap">
          <div className="co-truck" />
        </div>
        <h2>Order Placed!</h2>
        {paymentMethod === "card" ? (
          <p>Payment successful! Your order is confirmed and will be delivered soon.</p>
        ) : paymentMethod === "cod" ? (
          <p>Your order is confirmed. We'll deliver to your address soon.</p>
        ) : (
          <p>Your order is pending payment verification. We'll confirm it shortly.</p>
        )}
        <div className="co-success-actions">
          <button className="co-btn-primary" onClick={() => navigate("/orders")}>View My Orders</button>
          <button className="co-btn-sec"     onClick={() => navigate("/dashboard")}>Continue Shopping</button>
        </div>
      </div>
    </div>
  );

  const selected = availableMethods.find(m => m.key === paymentMethod);

  return (
    <div className="co-page">
      <div className="co-inner">
        <button className="co-back" onClick={() => navigate("/cart")}>
          <ArrowLeft size={16} /> Back to Cart
        </button>
        <h1 className="co-title">Checkout</h1>

        <div className="co-layout">
          <div className="co-left">

            {/* Delivery Address */}
            <section className="co-section">
              <h2 className="co-section-title"><MapPin size={16} /> Delivery Address</h2>
              {addresses.length === 0 ? (
                <div className="co-no-address">
                  <p>No saved address. <button onClick={() => navigate("/profile")}>Add one in Profile →</button></p>
                </div>
              ) : (
                <div className="co-addr-list">
                  {addresses.map((addr, i) => (
                    <button
                      key={i}
                      className={`co-addr-card ${selectedAddr === addr ? "active" : ""}`}
                      onClick={() => setSelectedAddr(addr)}
                    >
                      <div className="co-addr-top">
                        <span className="co-addr-label">{addr.label}</span>
                        {addr.isDefault && <span className="co-addr-badge">Default</span>}
                        {selectedAddr === addr && <span className="co-addr-check"><CheckCircle size={14} /></span>}
                      </div>
                      <p>{addr.street}</p>
                      <p>{addr.city}{addr.district ? `, ${addr.district}` : ""}{addr.postalCode ? ` ${addr.postalCode}` : ""}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Payment Method */}
            <section className="co-section">
              <h2 className="co-section-title">Payment Method</h2>
              {availableMethods.length === 0 ? (
                <p className="co-muted">No payment methods configured. Contact admin.</p>
              ) : (
                <div className="co-pay-methods">
                  {availableMethods.map(m => (
                    <button
                      key={m.key}
                      className={`co-pay-btn ${paymentMethod === m.key ? "active" : ""}`}
                      style={paymentMethod === m.key ? { "--pm-color": m.color, "--pm-bg": m.bg, "--pm-border": m.border } : {}}
                      onClick={() => { setPaymentMethod(m.key); setTransactionId(""); setError(""); }}
                    >
                      {m.key === "card"
                        ? <CreditCard size={14} style={{ color: m.color, flexShrink: 0 }} />
                        : <span className="co-pay-dot" style={{ background: m.color }} />
                      }
                      <span className="co-pay-label">{m.label}</span>
                      {paymentMethod === m.key && <CheckCircle size={15} className="co-pay-check" />}
                    </button>
                  ))}
                </div>
              )}

              {/* bKash / Nagad instruction */}
              {selected && (selected.key === "bkash" || selected.key === "nagad") && (
                <div className="co-pay-instruction" style={{ "--pm-color": selected.color, "--pm-bg": selected.bg, "--pm-border": selected.border }}>
                  <p className="co-pay-instruction-title">How to pay with {selected.label}</p>
                  <ol>
                    <li>Open your <strong>{selected.label}</strong> app</li>
                    <li>Go to <strong>Send Money</strong></li>
                    <li>Send <strong>৳{Math.round(total)}</strong> to number: <strong className="co-merchant-num">{selected.number || "—"}</strong></li>
                    <li>Copy your <strong>Transaction ID</strong> and paste it below</li>
                  </ol>
                  <div className="co-txn-field">
                    <label>Transaction ID</label>
                    <input
                      className="co-input"
                      placeholder={`e.g. ${selected.key === "bkash" ? "8N7A6K5B4J" : "NAG123456789"}`}
                      value={transactionId}
                      onChange={e => setTransactionId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Stripe card element */}
              {selected?.key === "card" && (
                <div
                  className="co-pay-instruction co-card-section"
                  style={{ "--pm-color": PAYMENT_ICONS.card.color, "--pm-bg": PAYMENT_ICONS.card.bg, "--pm-border": PAYMENT_ICONS.card.border }}
                >
                  <p className="co-pay-instruction-title">
                    <CreditCard size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                    Enter your card details
                  </p>
                  <CardSection ref={cardRef} />
                  <p className="co-card-secure-note">
                    Your payment is encrypted and processed securely by Stripe. We never store your card number.
                  </p>
                </div>
              )}

              {selected?.key === "cod" && (
                <div className="co-cod-note">
                  Pay with cash when your order arrives. Our delivery team will collect the amount.
                </div>
              )}
            </section>
          </div>

          {/* Order Summary */}
          <div className="co-right">
            <div className="co-summary">
              <h2 className="co-summary-title">Order Summary</h2>
              <div className="co-summary-items">
                {items.map(item => (
                  <div key={item.cartId} className="co-summary-item">
                    <div className="co-summary-img">
                      <img src={item.photoURL} alt={item.name} />
                      <span className="co-summary-qty">{item.quantity}</span>
                    </div>
                    <div className="co-summary-info">
                      <p className="co-summary-name">{item.name}</p>
                      <p className="co-summary-meta">Size: {item.size}</p>
                    </div>
                    <p className="co-summary-price">৳{Math.round(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="co-summary-divider" />
              <div className="co-summary-row"><span>Subtotal</span><span>৳{Math.round(total)}</span></div>
              <div className="co-summary-row"><span>Delivery</span><span className="co-free">Free</span></div>
              <div className="co-summary-divider" />
              <div className="co-summary-row co-summary-total">
                <span>Total</span>
                <span className="co-total-val">৳{Math.round(total)}</span>
              </div>

              {error && <p className="co-error">{error}</p>}

              <button className="co-place-btn" onClick={placeOrder} disabled={placing}>
                {placing ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Outer wrapper: loads config, provides Elements context ── */
const Checkout = () => {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();

  const [user,          setUser]          = useState(null);
  const [addresses,     setAddresses]     = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({ bkash: {}, nagad: {}, cod: { active: true }, stripe: {} });
  const [loading,       setLoading]       = useState(true);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUser(u);
      try {
        const [userSnap, configSnap] = await Promise.all([
          getDoc(doc(db, "users", u.uid)),
          getDoc(doc(db, "config", "store")),
        ]);
        if (userSnap.exists())   setAddresses(userSnap.data().addresses || []);
        if (configSnap.exists()) {
          const cfg = configSnap.data().paymentSettings || {};
          setPaymentConfig({
            bkash:  cfg.bkash  || {},
            nagad:  cfg.nagad  || {},
            cod:    cfg.cod    || { active: true },
            stripe: cfg.stripe || {},
          });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    });
    return () => unsub();
  }, []);

  // Load Stripe.js only when a valid publishable key is configured
  const stripePromise = useMemo(() => {
    const key = paymentConfig.stripe?.publishableKey;
    if (key && paymentConfig.stripe?.active) return loadStripe(key);
    return null;
  }, [paymentConfig.stripe?.publishableKey, paymentConfig.stripe?.active]);

  if (loading) return <div className="co-page" style={{ minHeight: "60vh" }} />;

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        user={user}
        addresses={addresses}
        paymentConfig={paymentConfig}
        items={items}
        total={total}
        clearCart={clearCart}
      />
    </Elements>
  );
};

export default Checkout;
