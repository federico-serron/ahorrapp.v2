import React, { useState, lazy, Suspense } from 'react';
import { PAYMENT_METHODS, getEnabledPaymentMethods } from '../config/paymentMethods';


const loadPaymentComponent = (componentName) => {
  return lazy(() => import(`../components/payments/PaymentMethods/${componentName}/index.jsx`));
};

const PaymentMethodsView = () => {
  const [paymentStatus, setPaymentStatus] = useState({ type: null, message: '' });
  const [selectedMethod, setSelectedMethod] = useState(null);
  const enabledMethods = getEnabledPaymentMethods();

  const handlePaymentSuccess = (data) => {
    setPaymentStatus({ 
      type: 'success', 
      message: `¡Pago procesado exitosamente con ID: ${data.id}` 
    });
    // Resetear después de 5 segundos
    setTimeout(() => {
      setPaymentStatus({ type: null, message: '' });
      setSelectedMethod(null);
    }, 5000);
  };

  const handlePaymentError = (error) => {
    setPaymentStatus({ 
      type: 'error', 
      message: error || 'Ocurrió un error al procesar el pago' 
    });
  };

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId === selectedMethod ? null : methodId);
  };

  const renderPaymentMethod = (methodId) => {
    const method = enabledMethods[methodId];
    if (!method) return null;

    const PaymentComponent = loadPaymentComponent(method.component);

    return (
      <Suspense 
        key={methodId}
        fallback={
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-700 animate-pulse h-80">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6 mx-auto"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
          </div>
        }
      >
        <PaymentComponent
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          config={method.config}
          isSelected={selectedMethod === methodId}
          onSelect={() => handleMethodSelect(methodId)}
        />
      </Suspense>
    );
  };

  return (
    <section className="bg-blue-50 dark:bg-gray-900 pt-24 min-h-screen">
      <div className="py-8 px-4 mx-auto max-w-6xl sm:py-16 lg:px-6">
        <div className="max-w-3xl mb-12 text-center mx-auto">
          <h2 className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-white">
            Métodos de Pago
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Elige el método de pago que mejor se adapte a tus necesidades.
          </p>
        </div>

        {paymentStatus.type && (
          <div className={`mb-8 p-4 rounded-lg ${
            paymentStatus.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {paymentStatus.message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(enabledMethods).map(renderPaymentMethod)}
        </div>
      </div>
    </section>
  );
};

export default PaymentMethodsView;
