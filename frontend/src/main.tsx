import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { SystemStatusProvider } from './contexts/SystemStatusContext';
import AppRouter from './router/AppRouter';
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <SystemStatusProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </SystemStatusProvider>
    </UserProvider>
  </React.StrictMode>
);
