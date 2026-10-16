import React from 'react';
import { useStore } from './context/StoreContext';
import { useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { MobileBottomNav } from './components/MobileBottomNav';

// Pages
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetails } from './pages/ProductDetails';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { OrderTracking } from './pages/OrderTracking';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Profile } from './pages/Profile';
import { AuthModal } from './components/AuthModal';
import { ShoppingPages } from './pages/ShoppingPages';

export const App: React.FC = () => {
  const { currentTab } = useStore();
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50  text-slate-900  font-cairo antialiased selection:bg-amber-500 selection:text-black overflow-x-clip max-w-full w-full ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* 1. Main Navigation Bar */}
      {currentTab !== 'admin' && <Navbar />}

      {/* 2. Main Page Views */}
      <main className="flex-1">
        {currentTab === 'home' && <Home />}
        {currentTab === 'catalog' && <Catalog />}
        {currentTab === 'wishlist' && <Catalog mode="wishlist" />}
        {currentTab === 'deals' && <Catalog mode="deals" />}
        {currentTab === 'recent' && <Catalog mode="recent" />}
        {(['brands', 'finder', 'help', 'contact', 'bundles'] as const).map(mode => currentTab === mode && <ShoppingPages key={mode} mode={mode} />)}
        {currentTab === 'product' && <ProductDetails />}
        {currentTab === 'cart' && <Catalog />}
        {currentTab === 'checkout' && <Checkout />}
        {currentTab === 'order-success' && <OrderSuccess />}
        {currentTab === 'track-order' && <OrderTracking />}
        {currentTab === 'profile' && <Profile />}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      {/* 3. Global Drawers & Modals */}
      <CartDrawer />
      <QuickViewModal />
      <AuthModal />

      {/* 4. WhatsApp Floating Assistant Button */}
      {currentTab !== 'admin' && <WhatsAppFloatingButton />}

      {/* 5. Mobile Bottom Dock */}
      {currentTab !== 'admin' && <MobileBottomNav />}

      {/* 6. Enterprise Footer */}
      {currentTab !== 'admin' && <Footer />}
    </div>
  );
};
