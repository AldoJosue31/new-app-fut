import styled from "styled-components";
import { useAuthStore } from "../../store/AuthStore";
import { UserAuth } from "../../context/AuthContent";

export function HomeTemplate(){
    const { cerrarSesion } = useAuthStore();
    const { user, isLoading } = UserAuth();

    if (isLoading) {
        return (
            <Container>
                <span>Cargando...</span>
            </Container>
        );
    }

    if (!user) {
        return (
            <Container>
                <span>Por favor inicia sesión</span>
            </Container>
        );
    }

    return(
        <Container>
            <span>HomeTemplate</span>
            <button onClick={cerrarSesion}>Cerrar</button>
            <span>{user?.id}</span>
            {user?.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="Avatar" />}
        </Container>
    )
}
const Container = styled.div`
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;

    img {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
    }

    button {
        padding: 10px 20px;
        background-color: ${({ theme }) => theme.primary || '#1CB0F6'};
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;

        &:hover {
            opacity: 0.8;
        }
    }
`