const FORMATTER = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount) => FORMATTER.format(Math.abs(Number(amount)));
