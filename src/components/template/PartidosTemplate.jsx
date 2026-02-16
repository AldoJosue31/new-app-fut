import React from "react";
import styled from "styled-components";
import { ContentContainer } from "../atomos/ContentContainer";
import { PageHeader } from "../moleculas/PageHeader";
import { EmptyState } from "../../index";
import { RiCalendarTodoLine } from "react-icons/ri";

export function PartidosTemplate({ state, setState }) {
  return (
    <>
      <PageHeader 
        title="Partidos" 
        marginBottom="0"
        state={state}
        setState={setState}
      />
      <StyledContentContainer>
        <Container>
            <EmptyState 
                icon={<RiCalendarTodoLine size={60} />}
                title="Próximamente"
                description="El módulo de gestión detallada de partidos estará disponible pronto."
            />
        </Container>
      </StyledContentContainer>
    </>
  );
}

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
`;