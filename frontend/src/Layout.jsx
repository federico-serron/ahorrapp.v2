import React from 'react';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Home from './views/Home';
import injectContext from './js/store/appContext.jsx';
import './index.css';
import NotFound from './views/NotFound.jsx';

const Layout = () => {
    const basename = import.meta.env.VITE_BASENAME || "";
  return (
    <div>
        <BrowserRouter basename={basename}>
            <Routes>
                <Route exact path='/' element={<Home/>} />
                <Route path='*' element={<NotFound/>} />
            </Routes>
        </BrowserRouter>
    </div>
  )
}

export default injectContext(Layout);