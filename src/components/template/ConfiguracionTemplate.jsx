import styled from "styled-components";

export function ConfiguracionTemplate() {
  return (
    <Container>
      <h1>Configuración</h1>
      <span>Ajustes del sistema y preferencias de usuario.</span>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  h1 { font-size: 2rem; font-weight: 700; }
`;