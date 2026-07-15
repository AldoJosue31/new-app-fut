import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Home } from "../pages/Home";
import { Login } from "../pages/Login";
import { Partidos } from "../pages/Partidos";
import { Equipos } from "../pages/Equipos";
import { Torneos } from "../pages/Torneos";
import { Liga } from "../pages/Liga";
import { Configuracion } from "../pages/Configuracion";
import { RegisterManager } from "../pages/RegisterManager";
import { RegisterDelegate } from "../pages/RegisterDelegate";
import { UserAuth } from "../context/AuthContent";
import { ROLES } from "../utils/constants";
import { PublicStandings } from '../pages/PublicStandings';
import Landing from '../pages/Landing';

const AdminManagersLazy = React.lazy(() => 
  import("../pages/AdminManagers").then(module => {
    return { default: module.AdminManagers || module.default };
  })
);

function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, isLoading } = UserAuth();

  if (isLoading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <div>Cargando...</div>;

  if (allowedRoles && (!profile || !allowedRoles.includes(profile?.role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Home inteligente: sin sesión muestra Landing pública, con sesión muestra Dashboard
function HomeGate({ sidebarState, setSidebarState }) {
  const { user, profile, isLoading } = UserAuth();

  if (isLoading) return <div>Cargando...</div>;
  if (!user) return <Landing />;
  if (!profile) return <div>Cargando...</div>;
  if (profile.role === ROLES.DELEGATE) return <Navigate to="/equipos" replace />;

  return <Home state={sidebarState} setState={setSidebarState} />;
}

// --- RECIBIMOS LAS PROPS DEL SIDEBAR AQUÍ ---
export function MyRoutes({ sidebarState, setSidebarState }) {
  const { user } = UserAuth();

  return (
    <Routes>
      <Route path="/share/standings/:torneoId" element={<PublicStandings />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      {/* Landing pública accesible directamente */}
      <Route path="/landing" element={<Landing />} />

      {/* HOME: usuarios sin sesión ven Landing, con sesión ven Dashboard */}
      <Route
        path="/"
        element={<HomeGate sidebarState={sidebarState} setSidebarState={setSidebarState} />}
      />

      {/* --- RUTAS PROTEGIDAS --- */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
            <Home state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        }
      />

      {/* 2. PARTIDOS: Agregamos props */}
      <Route 
        path="/partidos" 
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
            <Partidos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      {/* 3. EQUIPOS por divisiÃ³n */}
      <Route
        path="/division/:divisionId/equipos/:teamId?"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.DELEGATE]}>
            <Equipos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        }
      />

      {/* 3b. EQUIPOS legacy */}
      <Route 
        path="/equipos/:teamId?" 
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.DELEGATE]}>
            <Equipos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />
      
      {/* 4. TORNEOS por divisiÃ³n */}
      <Route
        path="/division/:divisionId/torneos/:torneoOrTab?/:tab?/:jornadaId?"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
            <Torneos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        }
      />

      {/* 4b. TORNEOS legacy */}
      <Route 
        path="/torneos/:torneoOrTab?/:tab?/:jornadaId?"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
            <Torneos state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />
      
      {/* 5. LIGA: Agregamos props */}
      <Route 
        path="/liga/:tab?" 
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
            <Liga state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      {/* 6. CONFIGURACION: Agregamos props */}
      <Route 
        path="/configuracion" 
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.DELEGATE]}>
            <Configuracion state={sidebarState} setState={setSidebarState} />
          </ProtectedRoute>
        } 
      />

      <Route path="/invitation/:token" element={<RegisterManager />} />
      <Route path="/delegate/invitation/:token" element={<RegisterDelegate />} />

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
