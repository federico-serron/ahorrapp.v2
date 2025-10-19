import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaChartBar, FaUser, FaCog } from "react-icons/fa";


const Sidebar = ({isSidebarOpen}) => {
  return (

        <aside className={`fixed inset-y-0 left-0 z-10 w-64 bg-gray-100 dark:bg-gray-900 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>

          <nav className="p-4 mt-20">
            <a href="#" className="flex items-center px-4 py-2 text-gray-700 bg-gray-200 dark:bg-gray-800 dark:text-gray-200 rounded-lg">
              <FaHome className="w-5 h-5" />
              <span className="ml-3">Dashboard</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2 mt-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
              <FaChartBar className="w-5 h-5" />
              <span className="ml-3">Analíticas</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2 mt-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
              <FaUser className="w-5 h-5" />
              <span className="ml-3">Usuarios</span>
            </a>
            <a href="#" className="flex items-center px-4 py-2 mt-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
              <FaCog className="w-5 h-5" />
              <span className="ml-3">Configuración</span>
            </a>
          </nav>
        </aside>

  )
}
export default Sidebar;