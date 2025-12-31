import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore'; // Asumo que usas Zustand


export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) return <div>Cargando...</div>; // O tu spinner

  // 1. Si no hay usuario logueado -> Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si la ruta exige roles específicos y el perfil no lo tiene -> Home
  // (El operador ?. es por si profile aun no carga, aunque debería estar listo si isLoading es false)
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};