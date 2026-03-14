import React from 'react';
import { FiMenu } from 'react-icons/fi';
import { ToggleTheme } from '../ToggleTheme';

const Header = ({ toggleSidebar, title, userName }) => {
  const initial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ToggleTheme />
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-emerald-600 dark:text-teal-400">{initial}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
