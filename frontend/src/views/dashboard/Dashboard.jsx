import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { FaHome, FaChartBar, FaUser, FaCog } from "react-icons/fa";
import Sidebar from '../../components/dashboard/Sidebar';
import Header from '../../components/dashboard/Header';
import StatCard from '../../components/dashboard/StatCard';
import BarChart from '../../components/dashboard/BarChart';
import CakeChart from '../../components/dashboard/CakeChart';
import ActivitiesList from '../../components/dashboard/ActivitiesList';

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
          <ActivitiesList />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

