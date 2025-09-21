import React from 'react';

const PaymentMethodsView = () => {
    const paymentOptions = [
        { name: 'PayPal', description: 'Paga de forma segura con tu cuenta de PayPal.', color: 'bg-blue-600 hover:bg-blue-700' },
        { name: 'Stripe', description: 'Usa tu tarjeta de crédito o débito con Stripe.', color: 'bg-indigo-600 hover:bg-indigo-700' },
        { name: 'MercadoPago', description: 'La solución de pagos para Latinoamérica.', color: 'bg-sky-500 hover:bg-sky-600' }
    ];

    return (
        <section className="bg-blue-100 dark:bg-gray-900 pt-24">
            <div className="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6">
                <div className="max-w-screen-md mb-8 lg:mb-16 text-center mx-auto">
                    <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white">Métodos de Pago</h2>
                    <p className="text-gray-500 sm:text-xl dark:text-gray-400">Elige el método de pago que mejor se adapte a tus necesidades. Integraciones sencillas y seguras.</p>
                </div>
                <div className="space-y-8 md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-12 md:space-y-0">
                    {paymentOptions.map(option => (
                        <div key={option.name} className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md flex flex-col items-center text-center">
                            <h3 className="mb-2 text-2xl font-bold dark:text-white">{option.name}</h3>
                            <p className="font-light text-gray-500 dark:text-gray-400 mb-4">{option.description}</p>
                            <button className={`w-full text-white ${option.color} focus:ring-4 focus:outline-none font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors`}>
                                Pagar con {option.name}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PaymentMethodsView;
