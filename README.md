# 📱 JOE Store — Enterprise E-Commerce Platform

<p align="center">
  <img src="public/logo.png" alt="JOE Store Logo" width="120" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(245, 158, 11, 0.3);" />
</p>

<p align="center">
  <strong>A premium, modern e-commerce platform and certified pre-owned smartphone hub.</strong><br>
  Built with React 18, TypeScript, Tailwind CSS, multi-theme customization, bulk Excel catalog management, and automated WhatsApp notifications.
</p>

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture--structure">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-vercel-deployment">Deployment</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://joe-store-2026.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/🌐_Live_Store-joe--store--2026.vercel.app-F59E0B?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 🌟 Overview

**JOE Store** is a production-ready, full-featured retail and certified pre-owned smartphone web application crafted with high-end aesthetics inspired by Apple, Noon, and Amazon. 

Engineered specifically for electronics retail and certified device sales (iPhone pre-owned units with certified battery health 85%–97%), it pairs a lightning-fast client experience with deep back-office control: Excel catalog bulk-importing, custom theme switching, live order tracking, and seamless WhatsApp automation for receipts and dispatch alerts.

---

## 🚀 Key Features

### 1. 🎨 Luxury Aesthetics & Dynamic Multi-Theme Engine
- **Triple Colorway Engine**:
  - 👑 **Royal Gold** (Default): Iconic midnight obsidian with champagne metallic accents.
  - ⚡ **Titanium Blue**: Inspired by iPhone Pro natural titanium finishes.
  - 🌿 **Emerald Tech**: Futuristic cyber-emerald palette.
- **Flawless Light & Dark Modes**: Clean luxury silver/white mode and deep obsidian dark mode, completely reactive with zero color collisions.
- **Hero Slider Customizer**: Admin-controllable hero banner carousel with responsive touch gestures, custom badges, and instant discount highlights.
- **Glassmorphism & Micro-animations**: Subtle backdrop blurs, glow highlights, active state scales, and celebratory confetti upon purchase.

### 2. 📱 Certified Pre-Owned Apple Device Hub
- Tailored section for certified pre-owned devices.
- **Certified Battery Health Transparency**: Explicit battery percentages displayed on every device (85%–97%).
- **Digital Warranty Cards**: Detailed warranty and inspection certificates stamped with serial numbers and exchange guarantees.

### 3. 🌐 Full Bilingual & Bidirectional Engine (Arabic RTL / English LTR)
- Instant one-click language toggle between **العربية (RTL)** and **English (LTR)**.
- Precision typography pairing: Google Fonts **Cairo** for Arabic and **Outfit** for English numbers and headers.
- Persistent language state across client sessions.

### 4. 📦 Advanced Catalog Management (Manual & Bulk Excel Import/Export)
- **Interactive Admin Modal**: Add and modify products with image URLs, stock, storage sizes, colors, battery health, and warranty terms.
- **Bulk Excel / CSV Sync**:
  - One-click template download (`JOE_Store_Products_Template.xlsx`).
  - Drag-and-drop file upload with live field parsing and client-side validation.
  - Pre-commit interactive preview table before importing into live state.
- **Catalog Export**: Export complete live inventory to Excel at any time.
- **One-Click Duplication**: Duplicate existing products to quickly list variations in storage and colors.

### 5. 💬 Automated WhatsApp Notification Integration
- Connected to the `whatsapp-pro-automation` API for real-time customer messaging.
- Triggers automatic SMS/WhatsApp alerts for:
  1. **Order Placed**: Complete digital invoice with product list, shipping address, and order ID.
  2. **Payment Confirmation**: Instant verification for digital wallet & InstaPay transfers.
  3. **Dispatched to Courier**: Courier name and tracking bill-of-lading.
  4. **Out for Delivery**: Notification when courier is arriving.
  5. **Order Delivered**: Device delivery congratulations with warranty activation link.
  6. **Automated Review Request**: Feedback survey sent post-delivery.
- Floating WhatsApp quick-chat widget for direct customer support.

### 6. 💳 Localized Payment Methods & Shipping Calculator
- **Cash on Delivery (COD)**: Allows device inspection before payment.
- **InstaPay Instant Transfer**: Official handle and reference validation.
- **Vodafone Cash & Mobile Wallets**: Direct merchant wallet payments with transaction proof.
- **Bank Cards**: Visa / MasterCard integration ready.
- **Dynamic Egypt Shipping Rates**: Automated calculation covering all Egyptian governorates with same-day express delivery in Mansoura.

### 7. 🔐 User Account & Order Tracking Hub
- Instant guest browsing; authentication only required during checkout.
- **Customer Dashboard**:
  - Order history with live milestone tracking (Received ➔ Confirmed ➔ Shipping ➔ Delivered).
  - Saved multi-address notebook.
  - Certified digital warranty cards.
  - Direct order lookup by tracking code without logging in.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18.3** | Component-driven UI runtime |
| **TypeScript 5.7** | Strict static typing and code reliability |
| **Vite 6.1** | Lightning-fast development & optimized ES production bundles |
| **Tailwind CSS 3.4** | Utility-first responsive design and custom design token system |
| **Lucide React** | Ultra-crisp iconography |
| **XLSX (SheetJS)** | Client-side spreadsheet parsing and Excel export |
| **Canvas Confetti** | Delightful micro-interaction on order success |
| **Vercel** | Edge CDN deployment and asset caching |

---

## 📁 Architecture & Structure

```
joe-store/
├── public/                 # Static assets, logos, and web manifest
├── src/
│   ├── components/         # Reusable presentation components
│   │   ├── Navbar.tsx      # Main navigation, search bar, language/theme selectors
│   │   ├── Footer.tsx      # Policy modals, store locations, verified social links
│   │   ├── JoeStoreLogo.tsx# Responsive branded SVG logo
│   │   ├── ProductCard.tsx # Glassmorphic product showcase card
│   │   ├── CartDrawer.tsx  # Slide-over shopping cart with live subtotal
│   │   ├── AuthModal.tsx   # Sign-in & registration modal
│   │   └── ...
│   ├── context/            # React Context state management
│   │   ├── StoreContext.tsx# Products, cart, orders, and persistent theme settings
│   │   ├── LanguageContext.tsx # Localization and RTL/LTR direction controller
│   │   └── AuthContext.tsx # User session and authentication state
│   ├── data/               # Seed data, governorates list, and mock products
│   ├── pages/              # Application views
│   │   ├── Home.tsx        # Dynamic hero slider, pre-owned highlights, flash sales
│   │   ├── Catalog.tsx     # Filterable product grid with category pills
│   │   ├── Checkout.tsx    # Multi-step checkout with governorate shipping calculation
│   │   ├── OrderTracking.tsx# Live order status and tracking milestones
│   │   ├── Profile.tsx     # User profile, past orders, and digital warranties
│   │   └── admin/          # Comprehensive back-office dashboard
│   ├── types/              # TypeScript interfaces and domain models
│   ├── utils/              # Helper functions (WhatsApp service, Excel parser)
│   ├── App.tsx             # Root route switcher and layout wrapper
│   └── main.tsx            # Application entry point
├── push_to_github.bat      # One-click Windows script to push updates to GitHub
├── vercel.json             # Vercel SPA rewrites and asset caching rules
└── vite.config.ts          # Vite build optimizations & chunk splitting
```

---

## ⚡ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/joe-store.git
   cd joe-store
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   The application will run locally at `http://localhost:5174/`.

4. **Build for production**:
   ```bash
   npm run build
   ```
   The optimized production bundle will be generated in `dist/`.

---

## 🚀 Vercel Deployment

This project is pre-configured for seamless deployment to **Vercel**:

1. Push your repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com/) and click **"Add New Project"**.
3. Import your `joe-store` repository.
4. Vercel automatically detects Vite:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **Deploy**.

> 💡 The included [`vercel.json`](file:///c:/Users/abdol/OneDrive/Desktop/task/joe-store/vercel.json) automatically handles single-page application (SPA) routing redirects to `/index.html` and sets long-term cache headers for assets.

---

## 🔄 Automated GitHub Push Script

For rapid iteration, a dedicated Windows batch utility is included:
- **`push_to_github.bat`**: Double-click or run from terminal:
  ```cmd
  push_to_github.bat "Your commit message"
  ```
  This automatically stages all changes, creates a commit, and pushes to the `main` branch, triggering an automatic redeployment on Vercel.

---

## 📄 License

This project is proprietary and developed for **JOE Store (Mansoura, Egypt)**. All rights reserved.
