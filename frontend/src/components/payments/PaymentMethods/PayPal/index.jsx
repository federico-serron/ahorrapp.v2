import React, { useState } from 'react';
import BasePayment from '../BasePayment';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

const PayPalPayment = ({ 
  onPaymentSuccess, 
  onPaymentError, 
  config = {},
  isSelected,
  onSelect
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async (e) => {
    e?.stopPropagation();
    try {
      setLoading(true);
      // Simulación de pago exitoso
      setTimeout(() => {
        onPaymentSuccess?.({ 
          id: 'mock_pp_' + Math.random().toString(36).substr(2, 9), 
          status: 'completed' 
        });
      }, 1500);
    } catch (error) {
      onPaymentError?.(error.message || 'Error al procesar el pago con PayPal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BasePayment
      title="PayPal"
      description="Paga de forma segura con tu cuenta de PayPal."
      icon={CurrencyDollarIcon}
      onSelect={onSelect}
      isSelected={isSelected}
    >
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors ${
          loading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Procesando...' : 'Pagar con PayPal'}
      </button>
    </BasePayment>
  );
};

export default PayPalPayment;
