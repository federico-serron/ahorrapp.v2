import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { FaHome, FaChartBar, FaUser, FaCog } from "react-icons/fa";
import Sidebar from '../../components/dashboard/Sidebar';
import Header from '../../components/dashboard/Header';
import StatCard from '../../components/dashboard/StatCard';
import BarChart from '../../components/dashboard/BarChart';
import CakeChart from '../..//components/dashboard/CakeChart';

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


  // -- RENDER PRINCIPAL --
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
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
            <BarChart />
            <CakeChart />
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
                    <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/c4b5fd/3730a3?text=A" alt="Avatar" className="w-8 h-8 rounded-full mr-3" />Ana López</td>
                    <td className="p-4">Actualizó su perfil</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">Hace 2 minutos</td>
                    <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 dark:bg-green-700 dark:text-green-100 rounded-full">Completado</span></td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/fca5a5/7f1d1d?text=B" alt="Avatar" className="w-8 h-8 rounded-full mr-3" />Carlos Ruiz</td>
                    <td className="p-4">Subió un nuevo archivo</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">Hace 15 minutos</td>
                    <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 rounded-full">Pendiente</span></td>
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/93c5fd/1e3a8a?text=C" alt="Avatar" className="w-8 h-8 rounded-full mr-3" />Beatriz Gil</td>
                    <td className="p-4">Eliminó un usuario</td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">Hace 1 hora</td>
                    <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 dark:bg-red-700 dark:text-red-100 rounded-full">Cancelado</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

