const { onCall, HttpsError }   = require("firebase-functions/v2/https");
const { onDocumentCreated }    = require("firebase-functions/v2/firestore");
const { defineSecret }         = require("firebase-functions/params");
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
const FROM_EMAIL = "Urban বাংলা <onboarding@resend.dev>";

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

/* ════════════════════════════════════════════════════
   1. Stripe — create payment intent
════════════════════════════════════════════════════ */
exports.createPaymentIntent = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to make a payment.");
    }
    const { amount } = request.data;
    if (!amount || typeof amount !== "number" || amount <= 0) {
      throw new HttpsError("invalid-argument", "A valid positive amount is required.");
    }
    const stripe = new Stripe(stripeSecretKey.value(), { apiVersion: "2023-10-16" });
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: "bdt",
      metadata: { userId: request.auth.uid },
    });
    return { clientSecret: paymentIntent.client_secret };
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
    const userSnap = await db.doc(`users/${userId}`).get();
    const user     = userSnap.data();
    const email    = user?.email;
    const name     = user?.name || "Customer";

    if (!email) return; // no email to send to

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
