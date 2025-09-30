import React from 'react'

const CakeChart = () => {
    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Distribución de Usuarios</h3>
            {/* Placeholder para un gráfico circular */}
            <div className="h-64 flex justify-center items-center">
                <div className="w-48 h-48 rounded-full" style={{ background: 'conic-gradient(#a78bfa 40%, #7c3aed 40% 70%, #5b21b6 70%)' }}></div>
            </div>
        </div>
    )
}

export default CakeChart
