import styled from "styled-components";

export function InputText2({ children }) {
    return (
        <Container>
            <div className="form__group field">{children}</div>
        </Container>
    );
}
const Container = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  width: 100%;

  .form__group {
    position: relative;
    width: 100%;
  }
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-background-clip: text;
    -webkit-text-fill-color: ${(props) => props.theme.text};
    transition: background-color 5000s ease-in-out 0s;
  }
  .form__field {
    border: 2px solid ${({ theme }) => theme.color2};
    border-radius: 15px;
    font-family: inherit;
    outline: 0;
    font-size: 17px;
    color: ${(props) => props.theme.text};
    padding: 12px;
    background: transparent;
    transition: border-color 0.2s;
    width: 100%; /* Ajustado al 100% del contenedor padre */
    box-sizing: border-box;

    &.disabled {
      color: #696969;
      background: #2d2d2d;
      border-radius: 8px;
      margin-top: 8px;
      border-bottom: 1px dashed #656565;
    }
  }

  /* Estilos para el Label (Etiqueta Flotante) */
  .form__label {
    position: absolute;
    top: 12px;
    left: 15px;
    display: block;
    transition: 0.2s;
    font-size: 17px;
    color: ${({ theme }) => theme.text};
    opacity: 0.7;
    pointer-events: none; /* Permite hacer clic a través del label hacia el input */
  }

  /* Cuando el input tiene placeholder (aunque sea espacio vacío) o focus */
  .form__field:focus ~ .form__label,
  .form__field:not(:placeholder-shown) ~ .form__label {
    position: absolute;
    top: -10px;
    left: 15px;
    display: block;
    font-size: 14px;
    color: #1cb0f6;
    font-weight: 700;
    background-color: ${({ theme }) => theme.bgcards || theme.bgtotal}; /* Fondo para tapar el borde */
    padding: 0 5px;
    opacity: 1;
  }

  /* Reset input invalid */
  .form__field:required,
  .form__field:invalid {
    box-shadow: none;
  }

  .form__field:focus {
    font-weight: 700;
    border: 2px solid #1cb0f6;
  }
`;