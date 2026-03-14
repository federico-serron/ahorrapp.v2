import React from 'react';

const StatCard = ({ title, value, subtitle, trend, trendUp }) => {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </p>
      <p className={`text-2xl font-mono font-semibold tracking-tight mb-1 ${
        trendUp === true
          ? 'text-emerald-600 dark:text-teal-400'
          : trendUp === false
          ? 'text-red-500 dark:text-red-400'
          : 'text-gray-900 dark:text-gray-50'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-400 dark:text-gray-600">{subtitle}</p>
      )}
      {trend && (
        <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
          trendUp
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-teal-400'
            : 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400'
        }`}>
          {trend}
        </span>
      )}
    </div>
  );
};

export default StatCard;
