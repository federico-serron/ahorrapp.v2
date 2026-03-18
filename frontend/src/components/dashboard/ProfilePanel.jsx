import React, { useState, useContext, useEffect } from 'react';
import { Context } from '../../js/store/appContext';
import { FiUser, FiPhone, FiCheck, FiEdit2 } from 'react-icons/fi';

export default function ProfilePanel() {
  const { store, actions } = useContext(Context);
  const user = store.logged_user || {};

  const [name, setName]   = useState(user.name  || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Sync cuando el usuario carga en el store
  useEffect(() => {
    setName(user.name   || '');
    setPhone(user.phone || '');
  }, [user.name, user.phone]);

  const isDirty =
    name.trim() !== (user.name  || '') ||
    phone.trim() !== (user.phone || '');

  const isValid = name.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty || !isValid || saving) return;

    setSaving(true);
    const ok = await actions.updateProfile({ name, phone });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="max-w-lg">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
        Mi perfil
      </p>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-900">
          <span className="text-xl font-semibold text-emerald-600 dark:text-teal-400">
            {initial}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
            {user.name || 'Sin nombre'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {user.email || ''}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Nombre */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            Nombre
          </label>
          <div className="relative">
            <FiUser
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre completo"
              maxLength={80}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
            />
          </div>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            Teléfono móvil
            <span className="ml-1.5 text-gray-300 dark:text-gray-700">(opcional)</span>
          </label>
          <div className="relative">
            <FiPhone
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600 pointer-events-none"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+598 09x xxx xxx"
              maxLength={30}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
            />
          </div>
        </div>

        {/* Botón guardar */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!isDirty || !isValid || saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <FiCheck size={15} />
            ) : (
              <FiEdit2 size={14} />
            )}
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>

      </form>
    </div>
  );
}
