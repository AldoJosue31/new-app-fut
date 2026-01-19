import React from "react";
import styled from "styled-components";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { EmptyState } from "../../index";
import { RiCalendarTodoLine } from "react-icons/ri";

export function PartidosTemplate() {
  return (
    <ContentContainer>
      <PageHeader title="Gestión de Partidos" />
      <Container>
        <EmptyState 
            icon={<RiCalendarTodoLine size={60} />}
            title="Próximamente"
            description="El módulo de gestión detallada de partidos estará disponible pronto."
        />
      </Container>
    </ContentContainer>
  );
}

// Limpio: Sin animación
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
`;