import React from 'react'
import ToggleTheme from '../../components/ToggleTheme';


const Header = ({ toggleSidebar }) => {
    const MenuIcon = (props) => (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
    );
    return (
        <header className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div>
                <button className="text-gray-500 dark:text-gray-400 focus:outline-none md:hidden" onClick={toggleSidebar}>
                    <MenuIcon className="w-6 h-6" />
                </button>
                <h1 className="hidden md:block text-2xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
                <ToggleTheme />
                <div className="relative">
                    <img className="h-10 w-10 rounded-full object-cover" src="https://placehold.co/100x100/6366f1/white?text=U" alt="Tu Avatar" />
                </div>
            </div>
        </header>
    )
}

export default Header;
