export default function PublicNotFound() {
  return (
    <main
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
      <h1>Pagina no encontrada</h1>
      <p>El enlace no existe o ya no esta disponible.</p>
      <a href="/">Volver al inicio</a>
    </main>
  );
}
