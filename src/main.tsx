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

initPwa(import.meta.env.PROD);

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
