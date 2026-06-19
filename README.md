# URBAN বাংলা

Bangladesh's street fashion e-commerce store. Jerseys, flags, caps, and everyday streetwear — built for fast ordering and delivery across Bangladesh.

![URBAN বাংলা](public/urban-bangla-logo.png)

---

## Features

### Storefront
- Editorial product grid with category filters, image hover-swap, size previews
- Sale pricing — original price (crossed out), sale price, and discount % badge
- Promotion banners with bold red sale highlights
- Product detail page with image gallery, size/stock selection, quantity picker
- Animated scroll-to-top button
- Light / Dark / System theme switcher

### Auth & User
- Google Sign-in + email/password authentication
- Protected routes for logged-in users
- User profile — edit name, avatar, password, saved addresses
- Mobile-first bottom tab navigation

### Cart & Checkout
- Persistent cart synced to Firestore per user
- Cart drawer with live item count
- Checkout with multiple payment methods:
  - **Stripe** card payments
  - **bKash** mobile banking
  - **Nagad** mobile banking
  - **Cash on Delivery**
- Order confirmation with live status timeline (Pending → Processing → Shipped → Delivered)
- Courier tracking integration (Steadfast, RedX, Pathao, Sundarban)

### Admin Panel
- **Product Management** — add/edit products with photos, sizes, stock, sale pricing, tags, live toggle
- **Order Management** — update order status, add tracking numbers
- **User Management** — view users, toggle admin roles
- **Store Settings** — manage payment methods, promotion banners, popup banners, theme preview

### Design System
- Custom CSS variable system with full dark/light theme support
- `URBAN` (white) + `বাংলা` (gold) brand color used consistently everywhere
- Minimal cloth/shirt shape page loader on all loading states
- Letter-drop preloader animation on first load
- Editorial boxy grid aesthetic

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, plain CSS |
| Auth | Firebase Authentication |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Functions | Firebase Cloud Functions |
| Payments | Stripe |
| Emails | Resend |
| Hosting | Vercel (frontend) + Firebase (backend) |

---

## Getting Started

```bash
npm install
npm run dev
```

Create a `.env.local` with your Firebase and Stripe config:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

## Deploy

```bash
npm run build          # builds frontend → dist/
firebase deploy        # deploys Cloud Functions
# push to GitHub → Vercel auto-deploys frontend
```

---

## Project Structure

```
src/
├── components/       # Navbar, Cart, Admin panels, Preloader, ScrollToTop
├── context/          # ThemeContext, CartContext
├── pages/            # Home, Dashboard (Shop), ProductPage, Orders, Profile, etc.
├── services/         # Firebase config
└── styles/           # Per-component CSS files
```

---

Built by [Md Abidur Rahman Mridha](https://github.com/mdabidurrahmanmridha)
