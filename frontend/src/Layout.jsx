import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Home from './views/Home';
import Dashboard from './views/dashboard/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import injectContext from './js/store/appContext.jsx';
import NotFound from './views/NotFound.jsx';

import './index.css';

const Layout = () => {
    const basename = import.meta.env.VITE_BASENAME || "";
  return (
    <div>
        <BrowserRouter basename={basename}>
            <Routes>
                <Route exact path='/' element={<Home/>} />
                
                {/* Protected Dashboard */}
                <Route path='/dashboard' element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }>
                  <Route path='analitics' element={<Dashboard />} />
                  <Route path='users' element={<Dashboard />} />
                  <Route path='settings' element={<Dashboard />} />
                </Route>

                <Route path='*' element={<NotFound/>} />
            </Routes>
        </BrowserRouter>
        <Toaster />
    </div>
  )
}

export default injectContext(Layout);