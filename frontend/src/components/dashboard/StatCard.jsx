import React from 'react'

const StatCard = ({ title, value, icon }) => {
    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-start justify-between">
                <div className="flex flex-col space-y-2">
                    <span className="text-gray-500 dark:text-gray-400">{title}</span>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
                </div>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-full">
                    {icon}
                </div>
            </div>
        </div>
    )
}


export default StatCard;