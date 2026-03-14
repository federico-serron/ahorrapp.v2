import React, { useState, useContext } from 'react';
import { XIcon } from './Icons';
import { Context } from '../js/store/appContext';
import toast from 'react-hot-toast';

const SignupModal = ({ isOpen, onClose, onSwitchToLogin, isForced = false }) => {
  const { actions, store } = useContext(Context);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const resetSignupModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setErrors({});
  };

  const handleClose = () => {
    if (isForced) {
      onClose();
      return;
    }
    onClose();
    resetSignupModal();
  };

  const validate = () => {
    const newErrors = {};
    if (!name) newErrors.name = 'El nombre es obligatorio.';
    if (!email) newErrors.email = 'El email es obligatorio.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'El formato del email no es válido.';
    if (!password) newErrors.password = 'La contraseña es obligatoria.';
    else if (password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      const resp = await actions.signup(name, email, password);
      if (resp) {
        toast.success(store.message);
        onClose();
        resetSignupModal();
      } else {
        toast.error(store.error);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={isForced ? undefined : handleClose}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Crear cuenta</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Empieza a registrar tus finanzas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-teal-400 outline-none px-0 py-2 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-700 transition-colors"
            />
            {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
          </div>

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
              placeholder="Mín. 6 caracteres"
              className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-teal-400 outline-none px-0 py-2 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-300 dark:placeholder-gray-700 transition-colors"
            />
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Crear cuenta
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-emerald-600 dark:text-teal-400 hover:underline font-medium"
            >
              Iniciar sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
