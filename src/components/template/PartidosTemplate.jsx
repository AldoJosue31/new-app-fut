import React from "react";
import styled from "styled-components";
import { EmptyState, Title, ContentContainer } from "../../index"; // Importar
import { RiCalendarTodoLine } from "react-icons/ri";

export function PartidosTemplate() {
  return (
    <ContentContainer>
      <div style={{marginBottom: 20}}>
        <Title>Gestión de Partidos</Title>
      </div>
      
      <Container>
        <EmptyState 
            icon={<RiCalendarTodoLine size={60} />}
            title="Próximamente"
            description="El módulo de gestión detallada de partidos estará disponible pronto. Por ahora gestiona los resultados desde la sección de Torneos."
        />
      </Container>
    </ContentContainer>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
`;