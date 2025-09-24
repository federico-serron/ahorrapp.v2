import React, { useState } from 'react';
import BasePayment from '../BasePayment';
import { CreditCardIcon } from '@heroicons/react/24/solid';

const StripePayment = ({ 
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
          id: 'mock_st_' + Math.random().toString(36).substr(2, 9), 
          status: 'succeeded' 
        });
      }, 1500);
    } catch (error) {
      onPaymentError?.(error.message || 'Error al procesar el pago con Stripe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BasePayment
      title="Stripe"
      description="Usa tu tarjeta de crédito o débito con Stripe."
      icon={CreditCardIcon}
      onSelect={onSelect}
      isSelected={isSelected}
    >
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors ${
          loading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Procesando...' : 'Pagar con Stripe'}
      </button>
    </BasePayment>
  );
};

export default StripePayment;
