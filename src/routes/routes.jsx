import { Routes, Route, Navigate } from "react-router-dom";
import { Home, Login } from "../index"
import { UserAuth } from "../context/AuthContent";

function ProtectedRoute({ children }) {
    const { user, isLoading } = UserAuth();

    if (isLoading) {
        return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export function MyRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
                <ProtectedRoute>
                    <Home />
                </ProtectedRoute>
            } />
        </Routes>
    )
}