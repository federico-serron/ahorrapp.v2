import React, { useState } from 'react';
import BasePayment from '../BasePayment';
import { CreditCardIcon } from '@heroicons/react/24/outline';

const MercadoPagoPayment = ({ 
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
          id: 'mock_mp_' + Math.random().toString(36).substr(2, 9), 
          status: 'approved' 
        });
      }, 1500);
    } catch (error) {
      onPaymentError?.(error.message || 'Error al procesar el pago con MercadoPago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BasePayment
      title="MercadoPago"
      description="La solución de pagos para Latinoamérica."
      icon={CreditCardIcon}
      onSelect={onSelect}
      isSelected={isSelected}
    >
      <button
        onClick={handlePayment}
        disabled={loading}
        className={`w-full text-white bg-sky-500 hover:bg-sky-600 focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors ${
          loading ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {loading ? 'Procesando...' : 'Pagar con MercadoPago'}
      </button>
    </BasePayment>
  );
};

export default MercadoPagoPayment;
