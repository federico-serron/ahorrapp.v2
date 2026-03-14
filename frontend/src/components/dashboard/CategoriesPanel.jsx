import React, { useState, useContext } from 'react';
import { Context } from '../../js/store/appContext';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Verde',    bg: 'bg-emerald-500',  ring: 'ring-emerald-500',  text: 'text-emerald-700 dark:text-emerald-400',  chip: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { id: 'teal',    label: 'Teal',     bg: 'bg-teal-500',     ring: 'ring-teal-500',     text: 'text-teal-700 dark:text-teal-400',         chip: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800' },
  { id: 'blue',    label: 'Azul',     bg: 'bg-blue-500',     ring: 'ring-blue-500',     text: 'text-blue-700 dark:text-blue-400',         chip: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { id: 'violet',  label: 'Violeta',  bg: 'bg-violet-500',   ring: 'ring-violet-500',   text: 'text-violet-700 dark:text-violet-400',     chip: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800' },
  { id: 'rose',    label: 'Rosa',     bg: 'bg-rose-500',     ring: 'ring-rose-500',     text: 'text-rose-700 dark:text-rose-400',         chip: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  { id: 'orange',  label: 'Naranja',  bg: 'bg-orange-500',   ring: 'ring-orange-500',   text: 'text-orange-700 dark:text-orange-400',     chip: 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  { id: 'yellow',  label: 'Amarillo', bg: 'bg-yellow-400',   ring: 'ring-yellow-400',   text: 'text-yellow-700 dark:text-yellow-400',     chip: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  { id: 'gray',    label: 'Gris',     bg: 'bg-gray-400',     ring: 'ring-gray-400',     text: 'text-gray-600 dark:text-gray-400',         chip: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
];

export const getColorOption = (colorId) =>
  COLOR_OPTIONS.find((c) => c.id === colorId) || COLOR_OPTIONS[COLOR_OPTIONS.length - 1];

export default function CategoriesPanel() {
  const { store, actions } = useContext(Context);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const duplicate = store.categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      toast.error('Ya existe una categoría con ese nombre');
      return;
    }

    setSubmitting(true);
    const result = await actions.createCategory(trimmed, selectedColor);
    setSubmitting(false);

    if (result) {
      toast.success(`Categoría "${result.name}" creada`);
      setName('');
      setSelectedColor('emerald');
    } else {
      toast.error(store.error || 'Error al crear la categoría');
    }
  };

  const handleDelete = async (id, catName) => {
    setDeletingId(id);
    const ok = await actions.deleteCategory(id);
    setDeletingId(null);
    if (ok) {
      toast.success(`Categoría "${catName}" eliminada`);
    } else {
      toast.error(store.error || 'Error al eliminar');
    }
  };

  return (
    <div className="max-w-lg">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
        Mis categorías
      </p>

      {/* Formulario para nueva categoría */}
      <form onSubmit={handleCreate} className="mb-8">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la categoría..."
            maxLength={30}
            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
          />
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiPlus size={16} />
            )}
            Añadir
          </button>
        </div>

        {/* Selector de color */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">Color:</span>
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => setSelectedColor(color.id)}
              title={color.label}
              className={`w-6 h-6 rounded-full ${color.bg} transition-all ${
                selectedColor === color.id
                  ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-950 ${color.ring} scale-110`
                  : 'opacity-60 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </form>

      {/* Lista de categorías */}
      {!store.categories_loaded ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-emerald-500 dark:border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : store.categories.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-600">No tienes categorías personalizadas aún.</p>
          <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">Crea una arriba para empezar.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {store.categories.map((cat) => {
            const color = getColorOption(cat.color);
            return (
              <li
                key={cat.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 group"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${color.bg} flex-shrink-0`} />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deletingId === cat.id}
                  title="Eliminar categoría"
                  className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 transition-all disabled:opacity-40"
                >
                  {deletingId === cat.id ? (
                    <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiTrash2 size={15} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
