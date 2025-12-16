import { Routes, Route, Navigate } from "react-router-dom";
// Asegúrate de que las nuevas páginas se importen desde el index
import { 
  Home, 
  Login, 
  Partidos, 
  Equipos, 
  Torneos, 
  Liga, 
  Configuracion 
} from "../index";
import { UserAuth } from "../context/AuthContent";

function ProtectedRoute({ children }) {
  const { user, isLoading } = UserAuth();

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        Cargando...
      </div>
    );
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

      {/* --- RUTAS PROTEGIDAS DEL DASHBOARD --- */}
      
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      
      {/* Nuevas Rutas */}
      <Route path="/partidos" element={<ProtectedRoute><Partidos /></ProtectedRoute>} />
      <Route path="/equipos" element={<ProtectedRoute><Equipos /></ProtectedRoute>} />
      <Route path="/torneos" element={<ProtectedRoute><Torneos /></ProtectedRoute>} />
      <Route path="/liga" element={<ProtectedRoute><Liga /></ProtectedRoute>} />
      <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}