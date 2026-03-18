import React, { useState, useContext, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Context } from '../../js/store/appContext';
import toast from 'react-hot-toast';
import Sidebar from '../../components/dashboard/Sidebar';
import Header from '../../components/dashboard/Header';
import StatCard from '../../components/dashboard/StatCard';
import TransactionsList from '../../components/dashboard/TransactionsList';
import CategoriesPanel from '../../components/dashboard/CategoriesPanel';
import AnalyticsPanel from '../../components/dashboard/AnalyticsPanel';
import ProfilePanel from '../../components/dashboard/ProfilePanel';
import LoginModal from '../../components/LoginModal';
import SignupModal from '../../components/SignupModal';
import { formatCurrency } from '../../js/utils/currency';

const tabTitles = {
  inicio: 'Inicio',
  transacciones: 'Transacciones',
  analiticas: 'Analíticas',
  configuracion: 'Configuración',
};

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const { store, actions } = useContext(Context);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');
  const [authView, setAuthView] = useState('login');
  const [transactionInput, setTransactionInput] = useState('');
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated) {
      if (!store.transactions_loaded) actions.getTransactions();
      if (!store.categories_loaded) actions.getCategories();
    }
  }, [isAuthenticated]);

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!transactionInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await actions.createTransaction(transactionInput.trim());
    setIsSubmitting(false);

    if (result) {
      setLastTransaction(`${result.description} · ${result.amount >= 0 ? '+' : '-'}${formatCurrency(result.amount)}`);
      setTransactionInput('');
      toast.success(`${result.category} · ${result.description}`);
    } else {
      toast.error(store.error || 'Error al registrar la transacción');
    }
  };

  const transactions = store.transactions || [];
  const { total_income: income, total_expenses: expenses, balance, top_category: topCategory } = store.transactions_summary;

  const userName = store.logged_user?.name || store.logged_user?.email || 'Usuario';
  const isForced = !isAuthenticated;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 dark:border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 font-sans overflow-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
        <Header
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          title={tabTitles[activeTab]}
          userName={userName}
        />

        <main className={`flex-1 overflow-y-auto p-6 lg:p-8 bg-white dark:bg-gray-950 transition-all duration-300 ${isForced ? 'blur-sm pointer-events-none select-none' : ''}`}>

          {/* Analíticas */}
          {activeTab === 'analiticas' && <AnalyticsPanel />}

          {/* Configuración: perfil + categorías */}
          {activeTab === 'configuracion' && (
            <div className="space-y-10">
              <ProfilePanel />
              <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
                <CategoriesPanel />
              </div>
            </div>
          )}

          {/* Contenido principal: inicio y transacciones */}
          {activeTab !== 'configuracion' && activeTab !== 'analiticas' && <>

          {/* Input de transacción en lenguaje natural */}
          <div className="mb-8">
            <form onSubmit={handleTransactionSubmit}>
              <div className="relative">
                <textarea
                  value={transactionInput}
                  onChange={(e) => setTransactionInput(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ0-9\s+\-.,]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTransactionSubmit(e);
                    }
                  }}
                  placeholder="¿Qué pasó? Ej: Pagué $850 en el súper esta mañana..."
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full resize-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 pr-32 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors text-sm leading-relaxed disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="absolute bottom-4 right-4 bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {isSubmitting ? 'Procesando...' : 'Registrar'}
                </button>
              </div>
              {lastTransaction && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-600 pl-1">
                  Último registrado:{' '}
                  <span className="italic">"{lastTransaction}"</span>
                </p>
              )}
            </form>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard
              title="Gastos este mes"
              value={expenses > 0 ? `-${formatCurrency(expenses)}` : formatCurrency(0)}
              subtitle="Total de gastos"
              trendUp={false}
            />
            <StatCard
              title="Balance"
              value={`${balance >= 0 ? '+' : '-'}${formatCurrency(balance)}`}
              subtitle="Ingresos - gastos"
              trendUp={balance >= 0}
            />
            <StatCard
              title="Transacciones"
              value={store.transactions_pagination.total.toString()}
              subtitle="Registradas en total"
            />
            <StatCard
              title="Mayor gasto"
              value={topCategory || '—'}
              subtitle="Categoría principal"
            />
          </div>

          {/* Lista de transacciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Transacciones recientes
              </p>
              {store.transactions_pagination.total > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-600">
                  {store.transactions_pagination.total} en total
                </span>
              )}
            </div>

            {!store.transactions_loaded ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-emerald-500 dark:border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <TransactionsList transactions={transactions} />

                {/* Controles de paginación */}
                {store.transactions_pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => actions.getTransactions(store.transactions_pagination.page - 1, store.transactions_pagination.per_page)}
                      disabled={!store.transactions_pagination.has_prev}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-500 dark:hover:border-teal-400 hover:text-emerald-600 dark:hover:text-teal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Anterior
                    </button>

                    <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                      {store.transactions_pagination.page} / {store.transactions_pagination.pages}
                    </span>

                    <button
                      onClick={() => actions.getTransactions(store.transactions_pagination.page + 1, store.transactions_pagination.per_page)}
                      disabled={!store.transactions_pagination.has_next}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-500 dark:hover:border-teal-400 hover:text-emerald-600 dark:hover:text-teal-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          </>}
        </main>
      </div>

      {/* Modales de autenticación forzados si no hay sesión */}
      {isForced && authView === 'login' && (
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          onSwitchToSignup={() => setAuthView('signup')}
          isForced={true}
        />
      )}
      {isForced && authView === 'signup' && (
        <SignupModal
          isOpen={true}
          onClose={() => setAuthView('login')}
          onSwitchToLogin={() => setAuthView('login')}
          isForced={true}
        />
      )}
    </div>
  );
}
