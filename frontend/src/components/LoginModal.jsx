import React, { useState, useContext } from 'react';
import { XIcon } from './Icons';
import { Context } from '../js/store/appContext';
import toast from 'react-hot-toast';

const LoginModal = ({ isOpen, onClose, onSwitchToSignup, isForced = false }) => {
  const { actions, store } = useContext(Context);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'El email es obligatorio.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'El formato del email no es válido.';
    if (!password) newErrors.password = 'La contraseña es obligatoria.';
    return newErrors;
  };

  const resetLoginModal = () => {
    setEmail('');
    setPassword('');
    setErrors({});
  };

  const handleClose = () => {
    if (isForced) return;
    onClose();
    resetLoginModal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      const resp = await actions.login(email, password);
      if (resp) {
        toast.success(store.message);
        onClose();
        resetLoginModal();
      } else {
        toast.error(store.error);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={handleClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl w-full max-w-sm p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {!isForced && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors p-1 rounded-lg"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}

        <div className="mb-8">
          <div className="w-10 h-10 bg-emerald-500 dark:bg-teal-500 rounded-xl mb-4 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Bienvenido</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-teal-400 outline-none px-0 py-2 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-700 transition-colors"
            />
            {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-teal-400 outline-none px-0 py-2 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-700 transition-colors"
            />
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Iniciar sesión
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-emerald-600 dark:text-teal-400 hover:underline font-medium"
            >
              Crear cuenta
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
