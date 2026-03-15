import React, { useState, useContext } from 'react';
import { Context } from '../../js/store/appContext';
import { formatCurrency } from '../../js/utils/currency';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const CATEGORY_EMOJI = {
  'Alimentación': '🛒',
  'Transporte': '🚗',
  'Ocio': '🎬',
  'Ingresos': '💰',
  'Salud': '🏥',
  'Ropa': '👕',
  'Hogar': '🏠',
  'Suscripciones': '📱',
  'Restaurante': '🍽️',
  'Viajes': '✈️',
};

const DEFAULT_EMOJI_EXPENSE = '💸';
const DEFAULT_EMOJI_INCOME = '💰';

function getEmoji(transaction) {
  if (transaction.emoji) return transaction.emoji;
  if (transaction.category && CATEGORY_EMOJI[transaction.category]) return CATEGORY_EMOJI[transaction.category];
  return transaction.amount >= 0 ? DEFAULT_EMOJI_INCOME : DEFAULT_EMOJI_EXPENSE;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const TransactionsList = ({ transactions }) => {
  const { store, actions } = useContext(Context);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const startEdit = (tx) => {
    setConfirmDeleteId(null);
    setEditingId(tx.id);
    setEditForm({
      description: tx.description,
      amount: Math.abs(tx.amount),
      isIncome: tx.amount >= 0,
      category: tx.category || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id) => {
    if (!editForm.description?.trim()) {
      toast.error('La descripción no puede estar vacía');
      return;
    }
    setLoadingId(id);
    const result = await actions.updateTransaction(id, {
      description: editForm.description.trim(),
      amount: parseFloat(editForm.amount) || 0,
      is_income: editForm.isIncome,
      category: editForm.category,
    });
    setLoadingId(null);
    if (result) {
      toast.success('Transacción actualizada');
      cancelEdit();
    } else {
      toast.error(store.error || 'Error al actualizar');
    }
  };

  const handleDelete = async (id) => {
    setLoadingId(id);
    const ok = await actions.deleteTransaction(id);
    setLoadingId(null);
    if (ok) {
      toast.success('Transacción eliminada');
      setConfirmDeleteId(null);
    } else {
      toast.error(store.error || 'Error al eliminar');
    }
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-600">
        <p className="text-sm">No hay transacciones aún</p>
        <p className="text-xs mt-1">Escribe una arriba para empezar</p>
      </div>
    );
  }

  const categories = store.categories || [];

  return (
    <div className="space-y-0.5">
      {transactions.map((tx) => {
        const isEditing = editingId === tx.id;
        const isConfirmingDelete = confirmDeleteId === tx.id;
        const isLoading = loadingId === tx.id;

        if (isEditing) {
          return (
            <div key={tx.id} className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descripción"
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
                />
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
                >
                  {categories.length === 0 && <option value={editForm.category}>{editForm.category}</option>}
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-32 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm font-mono text-gray-900 dark:text-gray-50 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
                />
                <button
                  onClick={() => setEditForm({ ...editForm, isIncome: !editForm.isIncome })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    editForm.isIncome
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-teal-400'
                      : 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                  }`}
                >
                  {editForm.isIncome ? 'Ingreso' : 'Gasto'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <FiX size={15} />
                </button>
                <button
                  onClick={() => handleSave(tx.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {isLoading
                    ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <FiCheck size={13} />
                  }
                  Guardar
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={tx.id}
            className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-base flex-shrink-0">
              {getEmoji(tx)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{tx.description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">{tx.category || 'Sin categoría'}</p>
            </div>

            {/* Acciones — visibles en hover o al confirmar delete */}
            <div className={`flex items-center gap-1 transition-opacity ${isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {isConfirmingDelete ? (
                <>
                  <span className="text-xs text-red-500 dark:text-red-400 mr-1">¿Eliminar?</span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={isLoading}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors disabled:opacity-60"
                  >
                    {isLoading
                      ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      : 'Sí'
                    }
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
                  >
                    No
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(tx)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-teal-400 transition-colors"
                    title="Editar"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(tx.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </>
              )}
            </div>

            <div className="text-right flex-shrink-0 ml-1">
              <p className={`text-sm font-mono font-semibold ${
                tx.amount >= 0
                  ? 'text-emerald-600 dark:text-teal-400'
                  : 'text-red-500 dark:text-red-400'
              }`}>
                {tx.amount >= 0 ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {tx.date ? formatDate(tx.date) : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionsList;
