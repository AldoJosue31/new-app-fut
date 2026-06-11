import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import { PublicStandings } from '../pages/PublicStandings';

const AdminManagersLazy = React.lazy(() => 
  import("../pages/AdminManagers").then(module => {
    return { default: module.AdminManagers || module.default };
  })
);

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, isLoading } = UserAuth();

  if (isLoading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && (!profile || !allowedRoles.includes(profile?.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// --- RECIBIMOS LAS PROPS DEL SIDEBAR AQUÍ ---
export function MyRoutes({ sidebarState, setSidebarState }) {
  const { user } = UserAuth();

  return (
    <Routes>
      <Route path="/share/standings/:torneoId" element={<PublicStandings />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      {/* --- RUTAS PROTEGIDAS --- */}
      
      {/* 1. HOME: Agregamos props */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Home state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Home state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      {/* 2. PARTIDOS: Agregamos props */}
      <Route 
        path="/partidos" 
        element={
          <ProtectedRoute>
            <Partidos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      {/* 3. EQUIPOS: Agregamos props */}
      <Route 
        path="/equipos/:teamId?" 
        element={
          <ProtectedRoute>
            <Equipos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />
      
      {/* 4. TORNEOS por divisiÃ³n */}
      <Route
        path="/division/:divisionId/torneos/:tab?"
        element={
          <ProtectedRoute>
            <Torneos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        }
      />

      {/* 4b. TORNEOS legacy */}
      <Route 
        path="/torneos/:tab?" 
        element={
          <ProtectedRoute>
            <Torneos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />
      
      {/* 5. LIGA: Agregamos props */}
      <Route 
        path="/liga/:tab?" 
        element={
          <ProtectedRoute>
            <Liga state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      {/* 6. CONFIGURACION: Agregamos props */}
      <Route 
        path="/configuracion" 
        element={
          <ProtectedRoute>
            <Configuracion state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      <Route path="/invitation/:token" element={<RegisterManager />} />

      {/* 7. ADMIN: Agregamos props al componente Lazy */}
      <Route 
        path="/admin/managers" 
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <Suspense fallback={<div>Cargando Panel Admin...</div>}>
              <AdminManagersLazy state={sidebarState} setState={setSidebarState} />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
