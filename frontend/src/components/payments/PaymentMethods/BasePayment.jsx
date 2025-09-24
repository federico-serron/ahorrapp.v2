import React from 'react';

const BasePayment = ({ 
  title, 
  description, 
  icon: Icon,
  children,
  onSelect,
  isSelected = false,
  className = ''
}) => {
  return (
    <div 
      className={`p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md flex flex-col items-center text-center border-2 transition-all ${
        isSelected 
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' 
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
      } ${className}`}
      onClick={onSelect}
    >
      {Icon && (
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      <h3 className="mb-2 text-xl font-bold dark:text-white">{title}</h3>
      <p className="font-light text-gray-500 dark:text-gray-400 mb-4 flex-grow">{description}</p>
      {children}
    </div>
  );
};

export default BasePayment;
