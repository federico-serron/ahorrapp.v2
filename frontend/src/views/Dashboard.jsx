import React, {useState, useEffect} from 'react';
import ToggleTheme from '../components/ToggleTheme';
import { FaHome, FaChartBar, FaUser, FaCog } from "react-icons/fa";

const SunIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.93 19.07 1.41-1.41" /><path d="m17.66 6.34 1.41-1.41" />
  </svg>
);

const MoonIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MenuIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

// --- Componente Principal del Dashboard ---
export default function Dashboard() {
  // Estado para el modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Estado para el menú lateral en móviles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // useEffect para manejar el tema oscuro
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setIsDarkMode(isDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // --- Sub-componentes para mejorar la legibilidad ---

  const Sidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-100 dark:bg-gray-900 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
      <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-800">
        <span className="text-2xl font-bold text-gray-800 dark:text-white">Mi App</span>
      </div>
      <nav className="p-4">
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
  );

  const Header = () => (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div>
        <button className="text-gray-500 dark:text-gray-400 focus:outline-none md:hidden" onClick={toggleSidebar}>
          <MenuIcon className="w-6 h-6" />
        </button>
        <h1 className="hidden md:block text-2xl font-semibold text-gray-800 dark:text-white">Dashboard</h1>
      </div>
      <div className="flex items-center space-x-4">
        <ToggleTheme />
        <div className="relative">
          <img className="h-10 w-10 rounded-full object-cover" src="https://placehold.co/100x100/6366f1/white?text=U" alt="Tu Avatar"/>
        </div>
      </div>
    </header>
  );

  const StatCard = ({ title, value, icon }) => (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <div className="flex flex-col space-y-2">
          <span className="text-gray-500 dark:text-gray-400">{title}</span>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
        </div>
        <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-full">
          {icon}
        </div>
      </div>
    </div>
  );
  
  // -- RENDER PRINCIPAL --
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6">
          {/* Sección de Tarjetas de Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Ingresos Totales" value="$4,520" icon={<FaChartBar className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} />
            <StatCard title="Nuevos Usuarios" value="3,210" icon={<FaUser className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} />
            <StatCard title="Ventas" value="1,850" icon={<FaHome className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} />
            <StatCard title="Rendimiento" value="98.5%" icon={<FaCog className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />} />
          </div>

          {/* Sección de Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Ventas Mensuales</h3>
              {/* Placeholder para un gráfico de barras */}
              <div className="h-64 flex items-end space-x-2 sm:space-x-4">
                <div className="w-1/4 h-[30%] bg-indigo-200 dark:bg-indigo-700 rounded-t-lg"></div>
                <div className="w-1/4 h-[50%] bg-indigo-300 dark:bg-indigo-600 rounded-t-lg"></div>
                <div className="w-1/4 h-[75%] bg-indigo-400 dark:bg-indigo-500 rounded-t-lg"></div>
                <div className="w-1/4 h-[60%] bg-indigo-300 dark:bg-indigo-600 rounded-t-lg"></div>
              </div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Distribución de Usuarios</h3>
              {/* Placeholder para un gráfico circular */}
               <div className="h-64 flex justify-center items-center">
                   <div className="w-48 h-48 rounded-full" style={{background: 'conic-gradient(#a78bfa 40%, #7c3aed 40% 70%, #5b21b6 70%)'}}></div>
               </div>
            </div>
          </div>
          
          {/* Sección de Tabla de Actividades Recientes */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
             <h3 className="text-lg font-semibold p-6">Actividad Reciente</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="p-4 font-medium">Usuario</th>
                      <th className="p-4 font-medium">Acción</th>
                      <th className="p-4 font-medium">Fecha</th>
                      <th className="p-4 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/c4b5fd/3730a3?text=A" alt="Avatar" className="w-8 h-8 rounded-full mr-3"/>Ana López</td>
                      <td className="p-4">Actualizó su perfil</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">Hace 2 minutos</td>
                      <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 dark:bg-green-700 dark:text-green-100 rounded-full">Completado</span></td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/fca5a5/7f1d1d?text=B" alt="Avatar" className="w-8 h-8 rounded-full mr-3"/>Carlos Ruiz</td>
                      <td className="p-4">Subió un nuevo archivo</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">Hace 15 minutos</td>
                      <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 rounded-full">Pendiente</span></td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/93c5fd/1e3a8a?text=C" alt="Avatar" className="w-8 h-8 rounded-full mr-3"/>Beatriz Gil</td>
                      <td className="p-4">Eliminó un usuario</td>
                      <td className="p-4 text-gray-500 dark:text-gray-400">Hace 1 hora</td>
                      <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 dark:bg-red-700 dark:text-red-100 rounded-full">Cancelado</span></td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
}

