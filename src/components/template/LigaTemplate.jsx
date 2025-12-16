import styled from "styled-components";

export function LigaTemplate() {
  return (
    <Container>
      <h1>Mi Liga</h1>
      <span>Estadísticas generales y configuración de la liga.</span>
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