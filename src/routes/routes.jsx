import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
// Tus importaciones normales
import { 
  Home, 
  Login, 
  Partidos, 
  Equipos, 
  Torneos, 
  Liga, 
  Configuracion,
  RegisterManager
} from "../index";
import { UserAuth } from "../context/AuthContent";
import { ROLES } from "../utils/constants";

// --- 1. RECUPERAMOS EL LAZY LOADING DEL ADMIN ---
const AdminManagersLazy = React.lazy(() => 
  import("../pages/AdminManagers").then(module => {
    return { default: module.AdminManagers || module.default };
  })
);

// --- 2. PROTECTED ROUTE MEJORADO (Con Roles) ---
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, isLoading } = UserAuth();

  if (isLoading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && (!profile || !allowedRoles.includes(profile?.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function MyRoutes() {
  const { user } = UserAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      {/* --- RUTAS PROTEGIDAS GENERALES --- */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      
      <Route path="/partidos" element={<ProtectedRoute><Partidos /></ProtectedRoute>} />
      
      {/* ✅ CAMBIO AQUÍ: Agregamos /:teamId? para permitir sub-navegación al modal */}
      <Route path="/equipos/:teamId?" element={<ProtectedRoute><Equipos /></ProtectedRoute>} />
      
      <Route path="/torneos/:tab?" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
      <Route path="/liga/:tab?" element={<ProtectedRoute><Liga /></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
      <Route path="/invitation/:token" element={<RegisterManager />} />

      {/* --- RUTA DE ADMIN --- */}
      <Route 
        path="/admin/managers" 
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <Suspense fallback={<div>Cargando Panel Admin...</div>}>
              <AdminManagersLazy />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}