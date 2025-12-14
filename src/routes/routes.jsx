// src/routes/routes.jsx  (o la ruta correcta de tu archivo)
import { Routes, Route, Navigate } from "react-router-dom";
import { Home, Login } from "../index";
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

      {/* Ruta canónica del dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Mantén "/" también por compatibilidad */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirige cualquier ruta desconocida a "/" */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
