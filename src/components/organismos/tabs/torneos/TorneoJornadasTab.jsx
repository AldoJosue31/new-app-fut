import React from "react";
import styled from "styled-components";
import { Card } from "../../../../index";

export function TorneoJornadasTab() {
  return (
    <Card maxWidth="800px">
        <EmptyState>
            <h3>Gestor de Jornadas</h3>
            <p>Selecciona una jornada para editar horarios y resultados.</p>
        </EmptyState>
    </Card>
  );
}

const EmptyState = styled.div`
  padding: 40px; text-align: center; opacity: 0.6;
  h3 { margin-bottom: 10px; font-size: 1.2rem; }
`;