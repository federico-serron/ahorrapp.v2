import React, { useEffect, useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Context } from '../../../js/store/appContext';

const PayPalSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');
  const token = searchParams.get('token');
  const PayerID = searchParams.get('PayerID');

  const { actions, store } = useContext(Context);

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Procesando el pago...");

  useEffect(() => {
    // Aquí podrías hacer una llamada a tu backend para confirmar el pago
    // usando paymentId, token y PayerID
    console.log('Payment successful:', { paymentId, token, PayerID });

    const capturePayment = async () => {
      try {

        const response = await actions.captureOrderPayPal(token);
        if (response?.status === "COMPLETED") {
          setStatus("success")
          setMessage("Pago confirmado exitosamente")
        } else {
          setStatus("error");
          setMessage(store.error);
        }

      } catch (error) {
        setStatus("error")
        setMessage(error)
      }
    }

    capturePayment();
  }, [paymentId, token, PayerID]);

  const handleReturnHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen mt-20 bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center">
          {status === "loading" ? <ArrowPathIcon className="mx-auto h-16 w-16 text-green-500" /> : status === "success" ? <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" /> : null}
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {status === "loading" ? "Processing payment...": "¡Pago Exitoso!" }
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            ID de transacción: {paymentId}
          </p>
          <div className="mt-8">
            <button
              onClick={handleReturnHome}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPalSuccess;
