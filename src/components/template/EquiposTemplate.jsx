import styled from "styled-components";

export function EquiposTemplate() {
  return (
    <Container>
      <h1>Equipos</h1>
      <span>Administra los equipos de tu liga.</span>
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