import React from 'react'

const ActivitiesList = () => {
    return (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <h3 className="text-lg font-semibold p-6">Actividad Reciente</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="p-4 font-medium">Usuario</th>
                            <th className="p-4 font-medium">Acción</th>
                            <th className="p-4 font-medium">Fecha</th>
                            <th className="p-4 font-medium">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                            <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/c4b5fd/3730a3?text=A" alt="Avatar" className="w-8 h-8 rounded-full mr-3" />Ana López</td>
                            <td className="p-4">Actualizó su perfil</td>
                            <td className="p-4 text-gray-500 dark:text-gray-400">Hace 2 minutos</td>
                            <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 dark:bg-green-700 dark:text-green-100 rounded-full">Completado</span></td>
                        </tr>
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                            <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/fca5a5/7f1d1d?text=B" alt="Avatar" className="w-8 h-8 rounded-full mr-3" />Carlos Ruiz</td>
                            <td className="p-4">Subió un nuevo archivo</td>
                            <td className="p-4 text-gray-500 dark:text-gray-400">Hace 15 minutos</td>
                            <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 dark:bg-yellow-700 dark:text-yellow-100 rounded-full">Pendiente</span></td>
                        </tr>
                        <tr className="border-t border-gray-200 dark:border-gray-700">
                            <td className="p-4 flex items-center"><img src="https://placehold.co/40x40/93c5fd/1e3a8a?text=C" alt="Avatar" className="w-8 h-8 rounded-full mr-3" />Beatriz Gil</td>
                            <td className="p-4">Eliminó un usuario</td>
                            <td className="p-4 text-gray-500 dark:text-gray-400">Hace 1 hora</td>
                            <td className="p-4"><span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 dark:bg-red-700 dark:text-red-100 rounded-full">Cancelado</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ActivitiesList
