import React from 'react';
import { LinkedinIcon } from './Icons';

const Footer = () => (
  <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
    <div className="mx-auto w-full max-w-screen-xl p-4 py-2 lg:py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">© 2024 <a href="#" className="hover:underline">React/Flask Boilerplate™</a>. Todos los derechos reservados.</span>
        <div className="flex mt-4 sm:justify-center sm:mt-0 items-center space-x-5">
          <a href="mailto:contacto@boilerplate.com" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
            contacto@boilerplate.com
          </a>
          <a href="#" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <LinkedinIcon className="w-5 h-5" />
            <span className="sr-only">LinkedIn</span>
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
