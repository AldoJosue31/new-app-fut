import React from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";
import { InputText2 } from "../organismos/formularios/InputText2";
import { Btnsave } from "../moleculas/Btnsave";
import { Title } from "../atomos/Title";

export function TorneosTemplate({ form, onChange, onSubmit, loading }) {
  return (
    <Container>
      <HeaderSection>
        <Title>Torneos</Title>
      </HeaderSection>

      <ContentGrid>
        <Card>
          <CardHeader>
            <div className="icon-box">
              <v.iconocorona />
            </div>
            <h3>Crear Nuevo Torneo</h3>
          </CardHeader>

          <form onSubmit={onSubmit}>
            {/* Usamos un grid interno para los inputs si hay espacio */}
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
                bgcolor={v.colorPrincipal} // Verde consistente
                icono={<v.iconoguardar />}
                disabled={loading}
              />
            </div>
          </form>
        </Card>
      </ContentGrid>
    </Container>
  );
}

// --- ESTILOS REPLICADOS DE CONFIGURACION ---
const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  background-color: ${({ theme }) => theme.bgtotal};

  /* --- CAMBIO: Espacio extra en móvil para que el botón no tape el título --- */
  padding-top: 80px; 

  /* Regresamos al padding normal en PC/Tablet */
  @media ${Device.tablet} {
    padding-top: 20px;
  }
`;

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

const Card = styled.div`
  background-color: ${({ theme }) => theme.bgcards};
  padding: 30px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.boxshadowGray};
  color: ${({ theme }) => theme.text};
  width: 100%;
  max-width: 600px; // Mismo ancho que config

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 30px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
  
  .icon-box {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    background: ${({ theme }) => theme.primary || v.colorPrincipal};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 22px;
  }
  
  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: ${({ theme }) => theme.text};
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  opacity: 0.9;
`;