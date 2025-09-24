export const PAYMENT_METHODS = {
  MERCADOPAGO: {
    id: 'mercadopago',
    component: 'MercadoPago',
    enabled: true,
    name: 'MercadoPago',
    description: 'La solución de pagos para Latinoamérica.',
    color: 'bg-sky-500 hover:bg-sky-600',
    config: {
      publicKey: import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY,
    }
  },
  PAYPAL: {
    id: 'paypal',
    component: 'PayPal',
    enabled: true,
    name: 'PayPal',
    description: 'Paga de forma segura con tu cuenta de PayPal.',
    color: 'bg-blue-600 hover:bg-blue-700',
    config: {
      clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
    }
  },
  STRIPE: {
    id: 'stripe',
    component: 'Stripe',
    enabled: true,
    name: 'Stripe',
    description: 'Usa tu tarjeta de crédito o débito con Stripe.',
    color: 'bg-indigo-600 hover:bg-indigo-700',
    config: {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    }
  }
};

export const getEnabledPaymentMethods = () => {
  return Object.entries(PAYMENT_METHODS)
    .filter(([_, method]) => method.enabled)
    .reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value
    }), {});
};
