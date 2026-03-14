import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from './views/dashboard/Dashboard';
import injectContext from './js/store/appContext.jsx';
import NotFound from './views/NotFound.jsx';
import PayPalSuccess from './views/payment/paypal/Success';
import PayPalCancel from './views/payment/paypal/Cancel';
import './index.css';

const Layout = () => {
  const basename = import.meta.env.VITE_BASENAME || "";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path='/' element={<Navigate to="/dashboard" replace />} />
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path="/paypal/success" element={<PayPalSuccess />} />
          <Route path="/paypal/cancel" element={<PayPalCancel />} />
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
};

export default injectContext(Layout);
