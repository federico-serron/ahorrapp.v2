import React, { useState } from 'react';
import { useTheme } from '../components/ToggleTheme';

// Importar componentes
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

// Importar vistas
import HomeView from './HomeView';
import PaymentMethodsView from './PaymentMethodsView';
import ContactView from './ContactView';

const Home = () => {
  const [view, setView] = useState('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const { theme } = useTheme();

  // Manejadores de eventos para los modales
  const handleLoginClick = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
  };
  
  const handleSignupClick = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };
  
  const handleSwitchToSignup = () => {
    setShowLoginModal(false);
    setShowSignupModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignupModal(false);
    setShowLoginModal(true);
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Barra de navegación */}
      <Navbar 
        setView={setView} 
        onLoginClick={() => setShowLoginModal(true)}
        onSignupClick={() => setShowSignupModal(true)}
      />
      
      {/* Contenido principal */}
      <main className="flex-grow">
        {renderView()}
      </main>
      
      {/* Pie de página */}
      <Footer />
      
      {/* Modales */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToSignup={handleSwitchToSignup}
      />
      
      <SignupModal 
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
};

export default Home;
