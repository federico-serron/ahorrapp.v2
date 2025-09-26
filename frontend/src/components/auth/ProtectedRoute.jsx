import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import React from 'react'

const ProtectedRoute = ({children}) => {
    const {isAuthenticated, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!isAuthenticated) return <Navigate to="/" />;

    return children;
}

export default ProtectedRoute;
