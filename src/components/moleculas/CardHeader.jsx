import styled from "styled-components";
import { v } from "../../styles/variables";

export const CardHeader = ({ Icono, titulo, subtitulo }) => {
  return (
    <Container>
      <div className="icon-box">
        {Icono && <Icono />}
      </div>
      <div className="header-info">
        <h3>{titulo}</h3>
        {subtitulo && <span className="subtitle">{subtitulo}</span>}
      </div>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  
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
    min-width: 45px; /* Evita que se aplaste */
  }
  
  .header-info {
    display: flex;
    flex-direction: column;
    h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }
    .subtitle {
      font-size: 14px;
      opacity: 0.7;
      margin-top: 4px;
    }
  }
`;