import React, {useState, useContext} from 'react';
import { XIcon } from './Icons'
import { Context } from '../js/store/appContext';
import toast from 'react-hot-toast';

const LoginModal = ({ isOpen, onClose, onSwitchToSignup }) => {
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
    setEmail("")
    setPassword("")
    setErrors({})
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      const resp = await actions.login(email, password);
      if (resp){
        toast.success(store.message);
        onClose();
        resetLoginModal();
      } else{
        toast.error(store.error);
        return;
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 sm:p-8" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg p-1.5 transition-colors">
            <XIcon className="w-5 h-5"/>
        </button>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Iniciar Sesión</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tu email</label>
            <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" placeholder="nombre@email.com" />
            {errors.email && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tu contraseña</label>
            <input type="password" name="password" id="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            {errors.password && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{errors.password}</p>}
          </div>
          <button type="submit" className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 transition-colors">Acceder a tu cuenta</button>
          <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
            ¿No tienes cuenta? <a href="#" onClick={onSwitchToSignup} className="text-blue-700 hover:underline dark:text-blue-500">Crear cuenta</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
