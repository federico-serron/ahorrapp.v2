import React, { useState, useContext } from 'react';
import { Context } from '../js/store/appContext';
import { useAuth } from '../hooks/useAuth';
import ToggleTheme from './ToggleTheme';

const Navbar = ({ setView, onLoginClick, onSignupClick }) => {
  const { actions, store } = useContext(Context);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  const navLinks = [
    { name: 'Inicio', view: 'home' },
    { name: 'Métodos de Pago', view: 'payments' },
    { name: 'Contacto', view: 'contact' },
  ];

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md fixed w-full z-20 top-0 left-0 border-b border-gray-200 dark:border-gray-600">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-2">
        <a href="#" onClick={() => setView('home')} className="flex items-center space-x-3">
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">React & Flask ❤️ Fede Serron</span>
        </a>
        <div className="flex md:order-2 space-x-3 md:space-x-4 items-center">
          {!isAuthenticated ? (
                        <><button onClick={onLoginClick} className="hidden md:block text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:focus:ring-gray-800 transition-colors">
              Iniciar Sesión
            </button>
            <button onClick={onSignupClick} className="hidden md:block text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors">
                Registrarse
              </button></>
          ) : (
            <button onClick={actions.logout} className="hidden md:block text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors">
                Cerrar Sesión
              </button>
          )}

            <ToggleTheme className="ml-2" />
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} type="button" className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-sticky" aria-expanded={isMenuOpen}>
                <span className="sr-only">Open main menu</span>
                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15"/>
                </svg>
            </button>
        </div>
        <div className={`items-center justify-between w-full md:flex md:w-auto md:order-1 ${isMenuOpen ? 'block' : 'hidden'}`} id="navbar-sticky">
          <ul className="flex flex-col p2 md:p-0 mt-4 font-medium bg-gray-50 md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-transparent dark:bg-gray-800 md:dark:bg-transparent dark:border-gray-700">
            {navLinks.map(link => (
              <li key={link.name}>
                <a href="#" onClick={() => { setView(link.view); setIsMenuOpen(false); }} className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700 transition-colors">
                  {link.name}
                </a>
              </li>
            ))}
             <li className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <a href="#" onClick={() => { onLoginClick(); setIsMenuOpen(false); }} className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">Iniciar Sesión</a>
            </li>
            <li className="md:hidden">
                <a href="#" onClick={() => { onSignupClick(); setIsMenuOpen(false); }} className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">Registrarse</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
