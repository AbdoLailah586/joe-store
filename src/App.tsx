import React, { lazy, Suspense } from 'react';
import { useStore } from './context/StoreContext';
import { useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { QuickViewModal } from './components/QuickViewModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Home } from './pages/Home';
import { AuthModal } from './components/AuthModal';
import { PwaStatus } from './components/PwaControls';
import { CookieBanner } from './components/CookieBanner';
import { PageShellSkeleton } from './components/Skeletons';

const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const ProductDetails = lazy(() => import('./pages/ProductDetails').then(m => ({ default: m.ProductDetails })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess').then(m => ({ default: m.OrderSuccess })));
const OrderTracking = lazy(() => import('./pages/OrderTracking').then(m => ({ default: m.OrderTracking })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const ShoppingPages = lazy(() => import('./pages/ShoppingPages').then(m => ({ default: m.ShoppingPages })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then(m => ({ default: m.PolicyPage })));

export const App: React.FC = () => {
  const { currentTab, isOfflineCatalog } = useStore();
  const { isRTL } = useLanguage();

  return (
    <div className={`${currentTab !== 'admin' ? 'joe-storefront' : ''} min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-cairo antialiased selection:bg-amber-500 selection:text-black overflow-x-clip max-w-full w-full transition-colors ${isRTL ? 'rtl' : 'ltr'}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-amber-500 focus:text-black focus:font-bold focus:shadow-lg"
      >
        تخطي إلى المحتوى الرئيسي
      </a>

      {/* 1. Main Navigation Bar */}
      {currentTab !== 'admin' && <Navbar />}
      <PwaStatus />

      {/* 2. Main Page Views */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageShellSkeleton />}>
          {currentTab === 'home' && <Home />}
          {currentTab === 'catalog' && <Catalog />}
          {currentTab === 'wishlist' && <Catalog mode="wishlist" />}
          {currentTab === 'deals' && <Catalog mode="deals" />}
          {currentTab === 'recent' && <Catalog mode="recent" />}
          {(['brands', 'finder', 'help', 'contact', 'bundles'] as const).map(mode => currentTab === mode && <ShoppingPages key={mode} mode={mode} />)}
          {(['terms', 'privacy', 'refund', 'shipping'] as const).map(policy => currentTab === policy && <PolicyPage key={policy} activePolicy={policy} />)}
          {currentTab === 'product' && <ProductDetails />}
          {currentTab === 'cart' && <Catalog />}
          {currentTab === 'checkout' && <Checkout />}
          {currentTab === 'order-success' && <OrderSuccess />}
          {currentTab === 'track-order' && <OrderTracking />}
          {currentTab === 'profile' && <Profile />}
          {currentTab === 'admin' && (isOfflineCatalog ? <div className="max-w-xl mx-auto p-8 my-8 bg-white border border-slate-200 rounded-2xl text-center"><h1 className="text-xl font-black">لوحة الإدارة تحتاج اتصالًا بالإنترنت</h1><p className="mt-3 text-slate-600">اتصل بالإنترنت للتحقق من صلاحيات حسابك وعرض البيانات الحالية. يمكنك تصفح الكتالوج المحفوظ من المتجر.</p><a href="/catalog" className="inline-block mt-5 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold">فتح الكتالوج</a></div> : <AdminDashboard />)}
        </Suspense>
      </main>

      {/* 3. Global Drawers & Modals */}
      <CartDrawer />
      <QuickViewModal />
      <AuthModal />

      {/* 4. WhatsApp Floating Assistant Button */}
      {currentTab !== 'admin' && <WhatsAppFloatingButton />}

      {/* 5. Mobile Bottom Dock */}
      {currentTab !== 'admin' && <MobileBottomNav />}

      {/* 6. First-Visit Cookie Consent Banner */}
      {currentTab !== 'admin' && <CookieBanner />}

      {/* 7. Enterprise Footer */}
      {currentTab !== 'admin' && <Footer />}
    </div>
  );
};
