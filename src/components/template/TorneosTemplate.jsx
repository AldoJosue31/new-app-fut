import React from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { InputText2 } from "../organismos/formularios/InputText2";
import { Btnsave } from "../moleculas/Btnsave";
import { Title } from "../atomos/Title";
// Importamos los nuevos componentes
import { ContentContainer } from "../atomos/ContentContainer";
import { Card } from "../moleculas/Card";
import { CardHeader } from "../moleculas/CardHeader";

export function TorneosTemplate({ form, onChange, onSubmit, loading }) {
  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Torneos</Title>
      </HeaderSection>

      <ContentGrid>
        <Card maxWidth="600px">
          <CardHeader 
            Icono={v.iconocorona}
            titulo="Crear Nuevo Torneo"
          />

          <form onSubmit={onSubmit}>
            <div className="form-content">
              <section>
                <Label>Nombre de la División</Label>
                <InputText2>
                  <input
                    className="form__field"
                    type="text"
                    placeholder="Ej: Primera División"
                    name="division"
                    value={form.division}
                    onChange={onChange}
                    required
                  />
                </InputText2>
              </section>

              <section>
                <Label>Temporada</Label>
                <InputText2>
                  <input
                    className="form__field"
                    type="text"
                    placeholder="Ej: Apertura 2025"
                    name="season"
                    value={form.season}
                    onChange={onChange}
                    required
                  />
                </InputText2>
              </section>

              <section>
                <Label>Fecha de Inicio</Label>
                <InputText2>
                  <input
                    className="form__field"
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={onChange}
                    required
                  />
                </InputText2>
              </section>
            </div>

            <div className="actions">
              <Btnsave 
                titulo={loading ? "Procesando..." : "Iniciar Torneo"} 
                bgcolor={v.colorPrincipal}
                icono={<v.iconoguardar />}
                disabled={loading}
              />
            </div>
          </form>
        </Card>
      </ContentGrid>
    </ContentContainer>
  );
}

// Estilos locales específicos de esta vista
const HeaderSection = styled.div`
  margin-bottom: 10px;
  width: 100%;
  max-width: 600px;
`;

const ContentGrid = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  opacity: 0.9;
`;

const FormContent = styled.div`
   display: flex;
   flex-direction: column;
   gap: 15px;
`;