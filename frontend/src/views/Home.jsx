import React from 'react';

// Importar componentes
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

// Importar vistas
import HomeView from './HomeView';
import PaymentMethodsView from './PaymentMethodsView';
import ContactView from './ContactView';

// Componente Principal: App
// Función para obtener el tema inicial
const getInitialTheme = () => {
  // Verificar si estamos en el navegador
  if (typeof window !== 'undefined') {
    // Intentar obtener el tema guardado
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    // Usar la preferencia del sistema si no hay tema guardado
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  // Valor por defecto para renderizado del lado del servidor
  return 'light';
};

export default function Home() {
  const [theme, setTheme] = React.useState(getInitialTheme);
  const [view, setView] = React.useState('home');
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);
  const [isSignupOpen, setIsSignupOpen] = React.useState(false);

  // Efecto para manejar cambios en la preferencia de tema del sistema
  React.useEffect(() => {
    const handleSystemThemeChange = (e) => {
      // Solo actualizar si no hay un tema guardado en localStorage
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    // Configurar el listener para cambios en la preferencia del sistema
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);

    // Limpiar el listener al desmontar
    return () => darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Aplicar el tema cuando cambie
  React.useEffect(() => {
    const root = window.document.documentElement;
    
    // Asegurarse de que solo hay una clase de tema a la vez
    root.classList.remove('light', 'dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
    
    // Guardar preferencia
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      return newTheme;
    });
  };

  // Manejadores de eventos para los modales
  const handleLoginClick = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };
  
  const handleSignupClick = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };
  
  const handleSwitchToSignup = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const handleSwitchToLogin = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  // Renderizar la vista actual
  const renderView = () => {
    switch(view) {
      case 'home':
        return <HomeView onSignupClick={handleSignupClick} />;
      case 'payments':
        return <PaymentMethodsView />;
      case 'contact':
        return <ContactView />;
      default:
        return <HomeView onSignupClick={handleSignupClick} />;
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900`}>
      {/* Barra de navegación */}
      <Navbar 
        setView={setView}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      {/* Contenido principal */}
      <main className="flex-grow">
        {renderView()}
      </main>
      
      {/* Pie de página */}
      <Footer />
      
      {/* Modales */}
      <LoginModal 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToSignup={handleSwitchToSignup}
      />
      
      <SignupModal 
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
}
