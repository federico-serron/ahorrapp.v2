import React from 'react';
import { formatCurrency } from '../../js/utils/currency';

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
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const TransactionsList = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-600">
        <p className="text-sm">No hay transacciones aún</p>
        <p className="text-xs mt-1">Escribe una arriba para empezar</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-base flex-shrink-0">
            {getEmoji(tx)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{tx.description}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600">{tx.category || 'Sin categoría'}</p>
          </div>
          <div className="text-right flex-shrink-0">
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
      ))}
    </div>
  );
};

export default TransactionsList;
