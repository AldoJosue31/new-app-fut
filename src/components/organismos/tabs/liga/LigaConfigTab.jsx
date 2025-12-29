import React, { useState } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { RiSettings4Line } from "react-icons/ri";
import { Card, CardHeader, InputText2, Btnsave } from "../../../../index";

export function LigaConfigTab({ data, onUpdate }) {
  const [tempName, setTempName] = useState(data?.name || "");

  return (
    <Card maxWidth="600px">
      <CardHeader Icono={RiSettings4Line} titulo="Datos de la Liga" />
      <FormGroup>
          <label>Nombre de la Liga</label>
          <div className="row">
              <InputText2>
                  <input 
                    className="form__field" 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Ej. Liga Municipal de Fútbol"
                  />
              </InputText2>
          </div>
          <div className="actions-right">
              <Btnsave 
                titulo="Actualizar Nombre" 
                bgcolor={v.colorPrincipal} 
                icono={<v.iconoguardar/>}
                funcion={() => onUpdate(tempName)}
              />
          </div>
      </FormGroup>
   </Card>
  );
}

const FormGroup = styled.div`
    display: flex; flex-direction: column; gap: 10px;
    label { font-weight: 600; font-size: 14px; opacity: 0.8; }
    .actions-right { display: flex; justify-content: flex-end; margin-top: 10px; }
`;