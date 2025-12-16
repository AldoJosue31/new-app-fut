import styled from "styled-components";

export function PartidosTemplate() {
  return (
    <Container>
      <h1>Gestión de Partidos</h1>
      <span>Aquí podrás programar y ver los resultados de los partidos.</span>
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