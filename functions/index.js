const { onCall, HttpsError }              = require("firebase-functions/v2/https");
const { onDocumentCreated,
        onDocumentUpdated }               = require("firebase-functions/v2/firestore");
const { defineSecret }                    = require("firebase-functions/params");
const { initializeApp }        = require("firebase-admin/app");
const { getFirestore }         = require("firebase-admin/firestore");
const Stripe                   = require("stripe");
const { Resend }               = require("resend");

initializeApp();

/* ─── secrets ─────────────────────────────────────────────────── */
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const resendApiKey    = defineSecret("RESEND_API_KEY");

/* ─── config ──────────────────────────────────────────────────── */
// Set this to your verified Resend sender domain.
// During testing you can use: onboarding@resend.dev
// Production: verify your domain at resend.com, then use e.g. orders@urbanbangla.com
const FROM_EMAIL = "Urban বাংলা <orders@urbanbangla.store>";

const COURIER_URLS = {
  Steadfast:     "https://steadfast.com.bd/track/",
  RedX:          "https://redx.com.bd/track/",
  Pathao:        "https://pathao.com/bn/tracking/",
  Sundarban:     "http://sundarbancourier.com/tracking/?code=",
  "SA Porisheba": null,
  Aramex:        "https://www.aramex.com/track-shipments/details?ShipmentNumber=",
};

const formatPaymentMethod = (m = "") => {
  if (m === "bkash") return "bKash";
  if (m === "nagad") return "Nagad";
  if (m === "cod")   return "Cash on Delivery";
  if (m === "card")  return "Card Payment";
  return m || "—";
};

/* ─── email templates ─────────────────────────────────────────── */
const emailWrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F5F2EC;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <!-- header -->
    <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid #1e1e1e;margin-bottom:28px;">
      <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:4px;color:#F5F2EC;">URBAN বাংলা</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#555;letter-spacing:1px;text-transform:uppercase;">Bangladesh Street Fashion</p>
    </div>

    ${content}

    <!-- footer -->
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1e1e1e;text-align:center;font-size:12px;color:#444;">
      <p style="margin:0 0 4px;">Urban বাংলা · Dhaka, Bangladesh</p>
      <p style="margin:0;">Questions? Reply to this email or contact our support.</p>
    </div>
  </div>
</body>
</html>`;

const buildOrderConfirmationEmail = (order, userName) => {
  const items = order.items?.length
    ? order.items
    : [{ name: order.itemName, category: order.category, size: order.size, quantity: order.quantity }];

  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:14px;color:#F5F2EC;">
        ${i.name || "Product"}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:13px;color:#888;text-align:center;">
        Size: ${i.size || "—"} &nbsp;×&nbsp; Qty: ${i.quantity || 1}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:14px;font-weight:700;color:#C9A96E;text-align:right;">
        ৳${Math.round((i.price || 0) * (i.quantity || 1))}
      </td>
    </tr>`).join("");

  const addr = order.address;
  const addrLine = addr
    ? [addr.street, addr.city, addr.district, addr.postalCode].filter(Boolean).join(", ")
    : "—";

  const date = order.orderedAt
    ? new Date(order.orderedAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })
    : "—";

  return emailWrap(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:12px;">✅</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F5F2EC;">Order Confirmed!</h2>
      <p style="margin:0;font-size:15px;color:#666;">Thank you, ${userName}! We've received your order.</p>
    </div>

    <!-- meta row -->
    <div style="background:#141414;border:1px solid #1e1e1e;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#555;text-transform:uppercase;letter-spacing:1px;">Order Date</td>
          <td style="text-align:right;font-size:13px;font-weight:600;color:#F5F2EC;">${date}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#555;text-transform:uppercase;letter-spacing:1px;padding-top:10px;">Payment</td>
          <td style="text-align:right;font-size:13px;font-weight:600;color:#F5F2EC;padding-top:10px;">${formatPaymentMethod(order.paymentMethod)}</td>
        </tr>
      </table>
    </div>

    <!-- items -->
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin:0 0 8px;">Items</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${itemsHtml}
      <tr>
        <td colspan="2" style="padding-top:12px;font-size:13px;color:#888;font-weight:600;">Total</td>
        <td style="padding-top:12px;font-size:18px;font-weight:800;color:#F5F2EC;text-align:right;">৳${Math.round(order.totalPrice || 0)}</td>
      </tr>
    </table>

    <!-- address -->
    <div style="background:#141414;border:1px solid #1e1e1e;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin:0 0 6px;">Delivery Address</p>
      <p style="margin:0;font-size:14px;color:#F5F2EC;">${addrLine}</p>
    </div>

    <p style="text-align:center;font-size:14px;color:#666;margin:0;">
      We'll send you a tracking update once your order is shipped. 🚚
    </p>`);
};

const buildDeliveryUpdateEmail = (order, userName) => {
  const tracking  = order.tracking || {};
  const courier   = tracking.courier || "Courier";
  const code      = tracking.code   || "—";
  const trackUrl  = COURIER_URLS[courier] ? `${COURIER_URLS[courier]}${code}` : null;
  const status    = order.status || "Shipped";

  const statusIcon = {
    Shipped:          "🚚",
    "Out for Delivery": "🏃",
    Delivered:        "✅",
  }[status] || "📦";

  return emailWrap(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:12px;">${statusIcon}</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F5F2EC;">
        ${status === "Delivered" ? "Order Delivered!" : "Your Order is on the Way!"}
      </h2>
      <p style="margin:0;font-size:15px;color:#666;">Hi ${userName}, here's your delivery update.</p>
    </div>

    <!-- status badge -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;background:#006A4E;color:#fff;font-size:13px;font-weight:700;
        letter-spacing:1px;text-transform:uppercase;padding:8px 20px;border-radius:100px;">
        ${status}
      </span>
    </div>

    <!-- tracking box -->
    <div style="background:#141414;border:1px solid #1e1e1e;border-radius:10px;padding:20px;margin-bottom:20px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin:0 0 14px;">Tracking Information</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#888;padding-bottom:10px;">Courier</td>
          <td style="text-align:right;font-size:14px;font-weight:700;color:#F5F2EC;padding-bottom:10px;">${courier}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#888;">Tracking Number</td>
          <td style="text-align:right;font-size:16px;font-weight:800;color:#C9A96E;letter-spacing:1px;">${code}</td>
        </tr>
      </table>
    </div>

    ${trackUrl ? `
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${trackUrl}" target="_blank"
        style="display:inline-block;background:#006A4E;color:#fff;font-size:15px;font-weight:700;
          text-decoration:none;padding:14px 36px;border-radius:10px;">
        Track My Package →
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#444;">
        or copy: ${trackUrl}
      </p>
    </div>` : ""}

    <p style="text-align:center;font-size:13px;color:#555;margin:0;">
      Questions about your delivery? Reply to this email — we're happy to help.
    </p>`);
};

const buildCancelledEmail = (order, userName) => {
  const items = order.items?.length
    ? order.items
    : [{ name: order.itemName, size: order.size, quantity: order.quantity, price: order.totalPrice }];

  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:14px;color:#F5F2EC;">${i.name || "Product"}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;font-size:13px;color:#888;text-align:right;">
        Size: ${i.size || "—"} × Qty: ${i.quantity || 1}
      </td>
    </tr>`).join("");

  return emailWrap(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:12px;">❌</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F5F2EC;">Order Cancelled</h2>
      <p style="margin:0;font-size:15px;color:#666;">Hi ${userName}, your order has been cancelled.</p>
    </div>

    <div style="background:#141414;border:1px solid #2a1a1a;border-radius:10px;padding:20px;margin-bottom:20px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin:0 0 12px;">Cancelled Items</p>
      <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
      <p style="margin:14px 0 0;font-size:16px;font-weight:800;color:#F5F2EC;text-align:right;">Total: ৳${Math.round(order.totalPrice || 0)}</p>
    </div>

    <div style="background:rgba(244,42,65,0.07);border:1px solid rgba(244,42,65,0.2);border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.6;">
        If you paid online, your refund will be processed within <strong style="color:#F5F2EC;">3–5 business days</strong>.
        If you have any questions, please reply to this email.
      </p>
    </div>

    <p style="text-align:center;font-size:14px;color:#555;margin:0;">
      We're sorry for the inconvenience. Shop again at <strong style="color:#F5F2EC;">Urban বাংলা</strong> anytime.
    </p>`);
};

const buildStatusUpdateEmail = (order, userName) => {
  const status = order.status;

  const statusConfig = {
    Packed:             { icon: "📦", title: "Your Order is Being Packed",        msg: "Great news! We're packing your items and getting them ready for shipment." },
    Shipped:            { icon: "🚚", title: "Your Order Has Been Shipped",        msg: "Your order is on its way! You'll receive tracking info shortly." },
    "Out for Delivery": { icon: "🏃", title: "Out for Delivery!",                 msg: "Your order is out for delivery today. Keep an eye out for the courier!" },
    Delivered:          { icon: "✅", title: "Order Delivered!",                  msg: "Your order has been delivered. We hope you love it!" },
  };

  const cfg = statusConfig[status] || { icon: "📋", title: `Order Update: ${status}`, msg: "Your order status has been updated." };

  const tracking = order.tracking;
  const trackUrl = tracking?.courier && tracking?.code && COURIER_URLS[tracking.courier]
    ? `${COURIER_URLS[tracking.courier]}${tracking.code}`
    : null;

  return emailWrap(`
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:12px;">${cfg.icon}</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F5F2EC;">${cfg.title}</h2>
      <p style="margin:0;font-size:15px;color:#666;">Hi ${userName}, ${cfg.msg}</p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;background:#006A4E;color:#fff;font-size:13px;font-weight:700;
        letter-spacing:1px;text-transform:uppercase;padding:8px 20px;border-radius:100px;">
        ${status}
      </span>
    </div>

    ${tracking?.code ? `
    <div style="background:#141414;border:1px solid #1e1e1e;border-radius:10px;padding:20px;margin-bottom:20px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin:0 0 14px;">Tracking</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#888;padding-bottom:10px;">Courier</td>
          <td style="text-align:right;font-size:14px;font-weight:700;color:#F5F2EC;padding-bottom:10px;">${tracking.courier}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#888;">Tracking Number</td>
          <td style="text-align:right;font-size:16px;font-weight:800;color:#C9A96E;letter-spacing:1px;">${tracking.code}</td>
        </tr>
      </table>
    </div>
    ${trackUrl ? `<div style="text-align:center;margin-bottom:24px;">
      <a href="${trackUrl}" target="_blank"
        style="display:inline-block;background:#006A4E;color:#fff;font-size:15px;font-weight:700;
          text-decoration:none;padding:14px 36px;border-radius:10px;">
        Track My Package →
      </a>
    </div>` : ""}` : ""}

    <p style="text-align:center;font-size:13px;color:#555;margin:0;">
      Questions? Just reply to this email — we're here to help.
    </p>`);
};

/* ════════════════════════════════════════════════════
   1. Stripe — create payment intent
      Price is calculated SERVER-SIDE from Firestore to
      prevent client-side price manipulation.
════════════════════════════════════════════════════ */
exports.createPaymentIntent = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to make a payment.");
    }

    const { items } = request.data; // [{ itemId, size, quantity }]
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpsError("invalid-argument", "Cart items are required.");
    }

    // Calculate total from Firestore prices — never trust the client's price
    const db = getFirestore();
    let calculatedTotal = 0;
    for (const item of items) {
      if (!item.itemId || !item.quantity || item.quantity < 1) {
        throw new HttpsError("invalid-argument", "Each item must have itemId and quantity.");
      }
      const snap = await db.doc(`clothing/${item.itemId}`).get();
      if (!snap.exists) throw new HttpsError("not-found", `Item ${item.itemId} not found.`);
      const data = snap.data();
      if (!data.display) throw new HttpsError("failed-precondition", `Item ${item.itemId} is not available.`);
      calculatedTotal += (data.price || 0) * item.quantity;
    }

    if (calculatedTotal < 1) {
      throw new HttpsError("invalid-argument", "Order total is too low.");
    }

    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2023-10-16" });
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(calculatedTotal * 100),
      currency: "bdt",
      metadata: { userId: request.auth.uid },
    });
    return { clientSecret: paymentIntent.client_secret, amount: calculatedTotal };
  }
);

/* ════════════════════════════════════════════════════
   2. Order confirmation email — Firestore trigger
      Fires automatically every time a new order doc is created.
════════════════════════════════════════════════════ */
exports.onOrderCreated = onDocumentCreated(
  { document: "users/{userId}/orders/{orderId}", secrets: [resendApiKey] },
  async (event) => {
    const order  = event.data.data();
    const userId = event.params.userId;

    if (!order) return;

    const db = getFirestore();

    // ── Deduct stock server-side (Firestore rules block client writes to clothing) ──
    const orderItems = order.items?.length
      ? order.items
      : (order.itemId ? [{ itemId: order.itemId, size: order.size, quantity: order.quantity || 1 }] : []);

    for (const item of orderItems) {
      if (!item.itemId) continue;
      if (typeof item.size === "string" && item.size.startsWith("Custom")) continue;
      try {
        await db.runTransaction(async (tx) => {
          const ref  = db.doc(`clothing/${item.itemId}`);
          const snap = await tx.get(ref);
          if (!snap.exists) return;
          const stock = snap.data().stock;
          if (!stock || !(item.size in stock)) return;
          const current = stock[item.size] ?? 0;
          if (current === -1) return; // unlimited/MTO
          tx.update(ref, { [`stock.${item.size}`]: Math.max(0, current - (item.quantity || 1)) });
        });
      } catch (e) {
        console.error("Stock deduction failed for", item.itemId, item.size, e);
      }
    }

    // ── Send order confirmation email ──
    const userSnap = await db.doc(`users/${userId}`).get();
    const user     = userSnap.data();
    const email    = user?.email;
    const name     = user?.name || "Customer";

    if (!email) return;

    try {
      const resend = new Resend(resendApiKey.value());
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      email,
        subject: `✅ Order Confirmed — Urban বাংলা`,
        html:    buildOrderConfirmationEmail(order, name),
      });
      console.log(`Confirmation email sent to ${email}`);
    } catch (err) {
      console.error("Failed to send order confirmation:", err);
    }
  }
);

/* ════════════════════════════════════════════════════
   3. Delivery update email — callable by admin
      Admin saves tracking info to Firestore first,
      then calls this to email the customer.
════════════════════════════════════════════════════ */
exports.sendDeliveryUpdate = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    // Verify caller is admin
    const db        = getFirestore();
    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    const caller     = callerSnap.data();
    if (caller?.role !== "admin" && caller?.admin !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { userId, orderId } = request.data;
    if (!userId || !orderId) {
      throw new HttpsError("invalid-argument", "userId and orderId are required.");
    }

    const orderSnap = await db.doc(`users/${userId}/orders/${orderId}`).get();
    if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found.");
    const order = orderSnap.data();

    if (!order.tracking?.code) {
      throw new HttpsError("failed-precondition", "Save a tracking code before sending the email.");
    }

    const userSnap = await db.doc(`users/${userId}`).get();
    const user     = userSnap.data();
    const email    = user?.email;
    const name     = user?.name || "Customer";

    if (!email) throw new HttpsError("failed-precondition", "Customer has no email address.");

    const resend = new Resend(resendApiKey.value());
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      email,
      subject: `🚚 Delivery Update — Tracking: ${order.tracking.code} — Urban বাংলা`,
      html:    buildDeliveryUpdateEmail(order, name),
    });

    // Mark as notified
    await db.doc(`users/${userId}/orders/${orderId}`).update({
      "tracking.notified": true,
      "tracking.notifiedAt": new Date().toISOString(),
    });

    console.log(`Delivery update sent to ${email} for order ${orderId}`);
    return { success: true };
  }
);

/* ════════════════════════════════════════════════════
   4. Order status change emails — Firestore trigger
      Fires when an order doc is updated.
      Sends the right email based on the new status.
════════════════════════════════════════════════════ */
exports.onOrderStatusChanged = onDocumentUpdated(
  { document: "users/{userId}/orders/{orderId}", secrets: [resendApiKey] },
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    const userId = event.params.userId;

    if (!before || !after) return;

    const prevStatus = before.status;
    const newStatus  = after.status;

    // Only act when status actually changed
    if (prevStatus === newStatus) return;

    const EMAIL_STATUSES = ["Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
    if (!EMAIL_STATUSES.includes(newStatus)) return;

    const db       = getFirestore();
    const userSnap = await db.doc(`users/${userId}`).get();
    const user     = userSnap.data();
    const email    = user?.email;
    const name     = user?.name || "Customer";

    if (!email) return;

    let subject, html;

    if (newStatus === "Cancelled") {
      subject = `❌ Order Cancelled — Urban বাংলা`;
      html    = buildCancelledEmail(after, name);
    } else {
      subject = `${
        newStatus === "Delivered" ? "✅" :
        newStatus === "Out for Delivery" ? "🏃" :
        newStatus === "Shipped" ? "🚚" : "📦"
      } ${newStatus} — Urban বাংলা`;
      html = buildStatusUpdateEmail(after, name);
    }

    try {
      const resend = new Resend(resendApiKey.value());
      await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html });
      console.log(`Status email (${newStatus}) sent to ${email} for order ${event.params.orderId}`);
    } catch (err) {
      console.error("Failed to send status update email:", err);
    }
  }
);
