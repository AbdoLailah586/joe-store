import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './context/StoreContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { StoreErrorBoundary } from './components/StoreErrorBoundary';
import './index.css';
import './storefront.css';
import { initPwa } from './services/pwa';
import { DetailsProvider } from './components/DetailsDialog';
import './details.css';

// Disable offline worker caching and unregister all legacy service workers & caches
initPwa(false);

if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      for (const reg of regs) {
        reg.unregister();
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then(keys => {
      for (const key of keys) {
        caches.delete(key);
      }
    }).catch(() => {});
  }
  if (typeof indexedDB !== 'undefined') {
    try {
      indexedDB.deleteDatabase('joe-store-public-catalog');
    } catch {}
  }
  try {
    const ver = localStorage.getItem('joe_store_catalog_ver');
    if (ver !== 'v11_live_gpt_render_no_stale_cache') {
      localStorage.removeItem('joe_store_products');
      localStorage.setItem('joe_store_catalog_ver', 'v11_live_gpt_render_no_stale_cache');
    }
  } catch {}
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <StoreErrorBoundary>
    <LanguageProvider>
      <AuthProvider>
        <StoreProvider>
          <DetailsProvider><App /></DetailsProvider>
        </StoreProvider>
      </AuthProvider>
    </LanguageProvider>
    </StoreErrorBoundary>
  </React.StrictMode>
);
