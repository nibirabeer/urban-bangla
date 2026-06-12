# URBAN বাংলা

Bangladesh's street fashion destination. Jerseys, flags, and everyday streetwear — built for fast ordering and delivery across Bangladesh.

## Stack

- **Frontend** — React 19, Vite, plain CSS
- **Backend** — Firebase (Auth, Firestore, Cloud Functions)
- **Payments** — Stripe
- **Emails** — Resend
- **Hosting** — Vercel (frontend) + Firebase Functions (backend)

## Features

- Google Sign-in + email/password auth
- Product catalog with category filters, size selection, stock tracking
- Cart synced to Firestore per user
- Checkout with Stripe card payments, bKash, Nagad, and Cash on Delivery
- Order tracking with courier integration (Steadfast, RedX, Pathao, Sundarban)
- Automated order confirmation and delivery update emails
- Admin panel — product management, order management, user management, store settings
- Light / dark / system theme

## Getting Started

```bash
npm install
npm run dev
```

Set up a `.env.local` with your Firebase config if you're running a local copy.

## Deploy

```bash
npm run build          # frontend → dist/
firebase deploy        # functions
```
