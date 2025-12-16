import styled from "styled-components";

export function TorneosTemplate() {
  return (
    <Container>
      <h1>Torneos</h1>
      <span>Crea y configura los torneos activos.</span>
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