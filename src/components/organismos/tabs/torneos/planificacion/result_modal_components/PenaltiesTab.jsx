// src/components/organismos/tabs/torneos/planificacion/result_modal_components/PenaltiesTab.jsx
import React from "react";
import styled from "styled-components";
import { InputNumber } from "../../../../../../index";

export const PenaltiesTab = ({ penalties, match, setPenalties }) => (
    <Container>
        <h3>Definición por Penales / Shootouts</h3>
        <div className="pen-inputs">
            <div className="team">
                <span>{match.local?.name}</span>
                <InputNumber value={penalties.local} onChange={(e) => setPenalties({...penalties, local: e.target.value})} />
            </div>
            <div className="team">
                <span>{match.visitante?.name}</span>
                <InputNumber value={penalties.visit} onChange={(e) => setPenalties({...penalties, visit: e.target.value})} />
            </div>
        </div>
    </Container>
);

const Container = styled.div` 
    text-align: center; padding: 20px; 
    h3 { margin-bottom: 20px; font-size: 1rem; opacity: 0.8; } 
    .pen-inputs { 
        display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;
        .team { display: flex; flex-direction: column; gap: 10px; span { font-weight: 600; } } 
    } 
`;