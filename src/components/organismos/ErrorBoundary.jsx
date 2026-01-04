import React from 'react';
import styled from 'styled-components';
import { v } from '../../styles/variables'; // Importamos tus variables

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  // Usamos el fondo y texto del tema actual (Light/Dark)
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  text-align: center;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  // Usamos el color de error definido en tus variables
  color: ${v.colorError}; 
  margin-bottom: 1rem;
`;

const Message = styled.p`
  font-size: 1.2rem;
  margin-bottom: 2rem;
  // Usamos el color de texto del tema con un poco de opacidad
  color: ${({ theme }) => theme.text};
  opacity: 0.7;
`;

const Button = styled.button`
  padding: 10px 20px;
  // Usamos tu color principal o el color de éxito
  background-color: ${v.colorPrincipal};
  color: #fff; // Texto blanco para contraste (o theme.text si prefieres)
  border: none;
  border-radius: ${v.borderRadius};
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease-in-out;
  box-shadow: ${v.boxshadowGray};

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Aquí podrías enviar el error a un servicio como Sentry
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/'; // Redirige al inicio para intentar recuperar
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <Title>¡Ups! Algo salió mal.</Title>
          <Message>
            Ocurrió un error inesperado. Hemos notificado al equipo técnico.
          </Message>
          <Button onClick={this.handleReset}>
            Volver al Inicio
          </Button>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;