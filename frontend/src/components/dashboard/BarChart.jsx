import React from 'react'

const BarChart = () => {
    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Ventas Mensuales</h3>
            {/* Placeholder para un gráfico de barras */}
            <div className="h-64 flex items-end space-x-2 sm:space-x-4">
                <div className="w-1/4 h-[30%] bg-indigo-200 dark:bg-indigo-700 rounded-t-lg"></div>
                <div className="w-1/4 h-[50%] bg-indigo-300 dark:bg-indigo-600 rounded-t-lg"></div>
                <div className="w-1/4 h-[75%] bg-indigo-400 dark:bg-indigo-500 rounded-t-lg"></div>
                <div className="w-1/4 h-[60%] bg-indigo-300 dark:bg-indigo-600 rounded-t-lg"></div>
            </div>
        </div>
    )
}

export default BarChart
