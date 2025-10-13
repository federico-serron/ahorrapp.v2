import React, { useState, useContext } from 'react';
import BasePayment from '../BasePayment';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { Context } from '../../../../js/store/appContext';
import toast from 'react-hot-toast';

const PayPalPayment = ({
  onPaymentError,
  config = {},
  isSelected,
  onSelect
}) => {

  const { actions, store } = useContext(Context);
  const [loading, setLoading] = useState(false);

  const handlePayment = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const amount = 10;
    try {
      setLoading(true);
      const approvalUrl = await actions.createOrderPayPal(amount);
      if (approvalUrl) {
        window.location.href = approvalUrl;
      } else {
        toast.error(store.error);
        return;
      }
    } catch (error) {
      toast.error(error.message);
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
        className={`w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
      >
        {loading ? 'Procesando...' : 'Pagar con PayPal'}
      </button>
    </BasePayment>
  );
};

export default PayPalPayment;
