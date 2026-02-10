/**
 * REACT APP ENTRY POINT
 * 
 * This file starts the React application.
 * It wraps the app with necessary providers:
 * - BrowserRouter: Enables routing
 * - AuthProvider: Manages user authentication state
 * - OfflineProvider: Handles online/offline status
 * - ErrorBoundary: Catches and displays errors gracefully
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <OfflineProvider>
            <App />
          </OfflineProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

