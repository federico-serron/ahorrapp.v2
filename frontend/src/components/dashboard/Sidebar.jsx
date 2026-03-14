import React, { useContext } from 'react';
import { FiHome, FiList, FiBarChart2, FiSettings, FiLogOut, FiDollarSign } from 'react-icons/fi';
import { Context } from '../../js/store/appContext';

const navItems = [
  { id: 'inicio', label: 'Inicio', icon: FiHome },
  { id: 'transacciones', label: 'Transacciones', icon: FiList },
  { id: 'analiticas', label: 'Analíticas', icon: FiBarChart2 },
  { id: 'configuracion', label: 'Configuración', icon: FiSettings },
];

const Sidebar = ({ isSidebarOpen, activeTab, setActiveTab }) => {
  const { actions } = useContext(Context);

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-20 w-56
      bg-white dark:bg-gray-950
      border-r border-gray-100 dark:border-gray-800
      flex flex-col
      transform transition-transform duration-300 ease-in-out
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 bg-emerald-500 dark:bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <FiDollarSign className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm tracking-tight">Finanzas</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left
              ${activeTab === id
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-teal-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900'
              }
            `}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => actions.logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <FiLogOut className="w-4 h-4 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
