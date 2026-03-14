import React, { useState, useEffect, useCallback } from 'react';
import { SunIcon, MoonIcon } from './Icons';

// Función para aplicar el tema al documento
const applyTheme = (theme) => {
    if (typeof window !== 'undefined' && theme) {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        root.style.colorScheme = theme;
        localStorage.setItem('theme', theme);
    }
};

export const useTheme = () => {
    const [theme, setTheme] = useState('light');
    const [mounted, setMounted] = useState(false);

    // Inicializar el tema al montar el componente
    useEffect(() => {
        // Obtener el tema guardado o usar la preferencia del sistema
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        
        setTheme(initialTheme);
        applyTheme(initialTheme);
        setMounted(true);

        // Escuchar cambios en la preferencia del sistema (solo si no hay tema guardado)
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme);
                applyTheme(newTheme);
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Actualizar el tema cuando cambie
    useEffect(() => {
        if (mounted) {
            applyTheme(theme);
        }
    }, [theme, mounted]);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, []);

    return { theme, toggleTheme };
};

export const ToggleTheme = ({ className = '', iconSize = 'w-5 h-5' }) => {
    const { theme, toggleTheme } = useTheme();

    // Si el componente aún no está montado, renderizar un placeholder
    if (!theme) {
        return (
            <div className={`p-2 ${className}`}>
                <div className={`${iconSize} bg-transparent`} />
            </div>
        );
    }

    return (
        <button 
            type="button"
            onClick={toggleTheme} 
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${className}`}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            {theme === 'dark' ? (
                <SunIcon className={`${iconSize} text-yellow-400`} />
            ) : (
                <MoonIcon className={`${iconSize} text-gray-700 dark:text-gray-300`} />
            )}
        </button>
    );
};

// Componente predeterminado para compatibilidad con importaciones existentes
export default ToggleTheme;
