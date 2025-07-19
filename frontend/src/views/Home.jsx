import React, { useContext, useEffect } from 'react'
import { Context } from '../js/store/appContext.jsx';

import { useState } from 'react';

function Home() {
  const { store, actions } = useContext(Context);

  useEffect(() => {
    const getMsgDemo = async () => {
      const msg = await actions.demoFunction();
      if (!msg) {
        store.demoMsg = "Error fetching message";
        return false;
      }
    };
    getMsgDemo();
  }, []);

  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 bg-blue-600 text-white shadow z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <a className="text-white text-xl font-bold tracking-tight" href="#">Flask + React Boilerplate</a>
          <button
            className="lg:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Toggle navigation"
            onClick={() => setNavOpen(!navOpen)}
          >
            {navOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
          <div className="hidden lg:flex space-x-8">
            <a className=" text-white hover:underline underline-offset-4 font-semibold transition" href="#home">Home</a>
            <a className=" text-white hover:underline underline-offset-4 font-semibold transition" href="#features">Features</a>
            <a className=" text-white hover:underline underline-offset-4 font-semibold transition" href="#api">API Demo</a>
          </div>
        </div>
        {/* Mobile menu */}
        {navOpen && (
          <div className="lg:hidden bg-blue-700">
            <div className="flex flex-col items-center space-y-2 py-4">
              <a className="block w-full text-center py-2 hover:bg-blue-800 transition" href="#home" onClick={() => setNavOpen(false)}>Home</a>
              <a className="block w-full text-center py-2 hover:bg-blue-800 transition" href="#features" onClick={() => setNavOpen(false)}>Features</a>
              <a className="block w-full text-center py-2 hover:bg-blue-800 transition" href="#api" onClick={() => setNavOpen(false)}>API Demo</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center pt-20">
        <div className="max-w-3xl mx-auto text-center py-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Welcome to Your Flask + React App</h1>
          <p className="text-lg md:text-xl mb-6 text-gray-700">
            A modern, scalable full-stack application boilerplate
          </p>
          <div className="flex justify-center gap-4">
            <a href="#features" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition">Get Started</a>
            <a href="#api" className="px-6 py-3 border border-gray-400 text-gray-700 rounded-lg font-semibold text-lg hover:bg-gray-100 transition">API Demo</a>
          </div>
        </div>
      </main>

      {/* API Demo Section */}
      <section id="api" className="pb-12">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">API Demo</h2>
          <p className="text-lg mb-4">Test the backend API connection:</p>
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded px-6 py-4 mb-4 w-4/5 mx-auto">
            <strong>API Response:</strong> {store.demoMsg || 'Click the button to test'}
          </div>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded font-semibold shadow hover:bg-blue-700 transition"
            onClick={() => actions.demoFunction()}
          >
            Test API Connection
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-center text-2xl font-bold mb-10">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
              <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <h5 className="font-semibold text-lg mb-2">Fast Development</h5>
              <p className="text-gray-500 text-center">Quick setup with modern development tools and hot-reloading</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
              <svg className="w-12 h-12 text-green-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm0 0v4m0 4h.01" /></svg>
              <h5 className="font-semibold text-lg mb-2">Secure</h5>
              <p className="text-gray-500 text-center">Built-in authentication and security best practices</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
              <svg className="w-12 h-12 text-cyan-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582c1.14 0 2.14.8 2.37 1.92l.86 4.3a2.375 2.375 0 002.37 1.92h2.536a2.375 2.375 0 002.37-1.92l.86-4.3A2.375 2.375 0 0019.418 9H20V4" /></svg>
              <h5 className="font-semibold text-lg mb-2">Scalable</h5>
              <p className="text-gray-500 text-center">Modular architecture ready for growth</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="m-0">
            &copy; {new Date().getFullYear()} Made with ❤️ by Federico Serron. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;