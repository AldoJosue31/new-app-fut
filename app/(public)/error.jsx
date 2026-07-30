"use client";

export default function PublicError({ reset }) {
  return (
    <main
      role="alert"
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1>No pudimos cargar esta pagina</h1>
      <p>Intenta nuevamente. Si el problema continua, vuelve al inicio.</p>
      <button type="button" onClick={reset}>
        Reintentar
      </button>
      <a href="/">Volver al inicio</a>
    </main>
  );
}
