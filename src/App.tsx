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
import { PwaStatus } from './components/PwaControls';

export const App: React.FC = () => {
  const { currentTab, isOfflineCatalog } = useStore();
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50  text-slate-900  font-cairo antialiased selection:bg-amber-500 selection:text-black overflow-x-clip max-w-full w-full ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* 1. Main Navigation Bar */}
      {currentTab !== 'admin' && <Navbar />}
      <PwaStatus />

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
        {currentTab === 'admin' && (isOfflineCatalog ? <div className="max-w-xl mx-auto p-8 my-8 bg-white border border-slate-200 rounded-2xl text-center"><h1 className="text-xl font-black">لوحة الإدارة تحتاج اتصالًا بالإنترنت</h1><p className="mt-3 text-slate-600">اتصل بالإنترنت للتحقق من صلاحيات حسابك وعرض البيانات الحالية. يمكنك تصفح الكتالوج المحفوظ من المتجر.</p><a href="/catalog" className="inline-block mt-5 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold">فتح الكتالوج</a></div> : <AdminDashboard />)}
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
