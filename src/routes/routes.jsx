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

// --- 1. RECUPERAMOS EL LAZY LOADING DEL ADMIN ---
// Esto evita que el código de administración pese en la carga inicial de la app
const AdminManagersLazy = React.lazy(() => 
  import("../pages/AdminManagers").then(module => {
    // Si exportaste con 'export default', usa module.default
    // Si exportaste con 'export const AdminManagers', usa module.AdminManagers
    return { default: module.AdminManagers || module.default };
  })
);

// --- 2. PROTECTED ROUTE MEJORADO (Con Roles) ---
// Usamos tu estructura de "children", pero agregamos la validación de allowedRoles
function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, isLoading } = UserAuth();

  if (isLoading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // ⚠️ Asegúrate de tener 'profile?' para evitar error si el perfil tarda en llegar
  if (allowedRoles && (!profile || !allowedRoles.includes(profile?.role))) {
    // Opcional: Console log para depurar por qué te saca
    // console.log("Bloqueado por rol:", profile?.role, "Esperado:", allowedRoles);
    return <Navigate to="/" replace />;
  }

  return children;
}

export function MyRoutes() {
  const { user } = UserAuth();

  return (
    <Routes>
      {/* Mejora opcional: Si el usuario ya está logueado, no mostrar el Login, 
          mandarlo directo al home. Si prefieres que siempre se vea el login, 
          quita la condición y deja solo element={<Login />} 
      */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      {/* --- RUTAS PROTEGIDAS GENERALES --- */}
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      
      <Route path="/partidos" element={<ProtectedRoute><Partidos /></ProtectedRoute>} />
      <Route path="/equipos" element={<ProtectedRoute><Equipos /></ProtectedRoute>} />
      <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
      <Route path="/liga" element={<ProtectedRoute><Liga /></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
      <Route path="/invitation/:token" element={<RegisterManager />} />

      {/* --- RUTA DE ADMIN (Recuperada) --- */}
      {/* Solo accesible si el rol es 'admin' */}
      <Route 
        path="/admin/managers" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<div>Cargando Panel Admin...</div>}>
              <AdminManagersLazy />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      {/* Ruta 404 por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}