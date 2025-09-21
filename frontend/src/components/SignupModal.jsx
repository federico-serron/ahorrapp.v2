import React from 'react';
import { XIcon } from './Icons';

const SignupModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!name) newErrors.name = 'El nombre es obligatorio.';
    if (!email) newErrors.email = 'El email es obligatorio.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'El formato del email no es válido.';
    if (!password) newErrors.password = 'La contraseña es obligatoria.';
    else if (password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      console.log('Signup submitted:', { name, email, password });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 sm:p-8" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg p-1.5 transition-colors">
             <XIcon className="w-5 h-5"/>
        </button>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Crear una cuenta</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tu nombre</label>
            <input type="text" name="name" id="name" value={name} onChange={e => setName(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="John Doe" />
            {errors.name && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="email-signup" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tu email</label>
            <input type="email" name="email-signup" id="email-signup" value={email} onChange={e => setEmail(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="nombre@email.com" />
            {errors.email && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password-signup" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tu contraseña</label>
            <input type="password" name="password-signup" id="password-signup" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            {errors.password && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.password}</p>}
          </div>
          <button type="submit" className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors">Crear cuenta</button>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
            ¿Ya tienes una cuenta? <a href="#" onClick={onSwitchToLogin} className="text-blue-700 hover:underline dark:text-blue-500">Iniciar sesión</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
