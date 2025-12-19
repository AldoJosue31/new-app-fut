import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { 
  Btnsave, 
  InputText2, 
  Title 
} from "../../index";
import { useAuthStore } from "../../store/AuthStore";
import { supabase } from "../../supabase/supabase.config";

export function ConfiguracionTemplate() {
  const { user, profile, fetchProfile } = useAuthStore();
  
  // Estados para Mi Perfil
  const [nombre, setNombre] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);

  // Detectar si Google ya está vinculado en las identidades de Supabase
  const isGoogleLinked = user?.identities?.some((identity) => identity.provider === 'google');

  // Cargar datos iniciales
  useEffect(() => {
    if (profile?.full_name) {
      setNombre(profile.full_name);
    }
  }, [profile]);

  // --- 1. ACTUALIZAR INFORMACIÓN BÁSICA ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoadingUpdate(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: nombre })
        .eq('id', user.id);

      if (error) throw error;
      
      // Recargar perfil en el store para reflejar cambios
      await fetchProfile(user.id);
      alert("Perfil actualizado correctamente");
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  // --- 2. VINCULAR CUENTA DE GOOGLE ---
const handleLinkGoogle = async () => {
    setLoadingLink(true);
    try {
      // CORRECCIÓN: Usamos linkIdentity en lugar de signInWithOAuth
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          // Es importante que la URL coincida con la configurada en Supabase -> Auth -> URL Configuration
          redirectTo: `${window.location.origin}/configuracion`, 
        }
      });
      
      if (error) throw error;
      
      // linkIdentity iniciará el flujo OAuth y redirigirá al usuario.
      // No necesitamos hacer nada más aquí, al volver la sesión tendrá la identidad agregada.

    } catch (err) {
      alert("Error al vincular Google: " + err.message);
      setLoadingLink(false);
    }
  };

  // Función auxiliar para traducir el rol a texto amigable
const getRoleLabel = (role) => {
    switch(role) {
        case 'admin': return 'Administrador de la App';
        case 'manager': return 'Gestor de la Liga';
        case 'user': return 'Jugador';
        default: return 'Sin rol asignado';
    }
  };

  return (
    <Container>
      <HeaderSection>
        <Title>Configuración</Title>
      </HeaderSection>

      <ContentGrid>
        {/* --- TARJETA ÚNICA: INFORMACIÓN Y VINCULACIÓN --- */}
        <Card>
          <CardHeader>
            <div className="icon-box"><v.iconoUser /></div>
            <h3>Mi Información</h3>
          </CardHeader>
          
          <form onSubmit={handleUpdateProfile}>
            {/* Campo ID (Solo lectura) */}
            <Label>ID de Usuario</Label>
            <InputText2>
              <input 
                className="form__field disabled" 
                value={user?.id || ""} 
                disabled 
                type="text" 
              />
            </InputText2>

            {/* Campo ROL (Solo lectura desde tabla profiles) */}
            <Label>Rol en la Liga</Label>
<RoleBadge $role={profile?.role || 'default'}>
               {!profile 
                  ? "Cargando..." 
                  : getRoleLabel(profile.role) 
               }
            </RoleBadge>

            {/* Campo NOMBRE (Editable) */}
            <Label>Nombre Completo</Label>
            <InputText2>
              <input 
                className="form__field" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                placeholder="Tu nombre completo" 
                type="text" 
              />
            </InputText2>

            {/* Campo EMAIL (Solo lectura) */}
            <Label>Correo Electrónico</Label>
            <InputText2>
              <input 
                className="form__field disabled" 
                value={user?.email || ""} 
                disabled 
                type="text" 
              />
            </InputText2>

            <div className="actions">
              <Btnsave 
                titulo={loadingUpdate ? "Guardando..." : "Guardar Cambios"}
                bgcolor={v.colorPrincipal}
                color="#fff"
                icono={<v.iconoguardar />}
                disabled={loadingUpdate}
              />
            </div>
          </form>

          <Divider />

          {/* --- SECCIÓN VINCULAR CUENTA --- */}
          <LinkedAccounts>
            <h4>Cuentas Vinculadas</h4>
            <div className="account-item">
              <div className="left">
                <span className="google-icon"><v.iconogoogle /></span>
                <div className="info">
                  <span>Google</span>
                  <small>
                    {isGoogleLinked 
                      ? "Cuenta vinculada correctamente" 
                      : "Vincula tu cuenta para iniciar sesión más rápido"}
                  </small>
                </div>
              </div>

              <div className="right">
                {isGoogleLinked ? (
                  <StatusBadge $active={true}>Conectado</StatusBadge>
                ) : (
                  <Btnsave 
                    funcion={handleLinkGoogle}
                    titulo={loadingLink ? "Redirigiendo..." : "Vincular"}
                    bgcolor="#fff"
                    color="#333"
                    icono={null} // Sin icono extra
                    disabled={loadingLink}
                  />
                )}
              </div>
            </div>
          </LinkedAccounts>

        </Card>
      </ContentGrid>
    </Container>
  );
}

/* --- STYLED COMPONENTS --- */
const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center; // Centrado para una sola columna
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
  background-color: ${({ theme }) => theme.bgcards || "#fff"};
  padding: 30px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.boxshadowGray || "0 4px 12px rgba(0,0,0,0.1)"};
  color: ${({ theme }) => theme.text};
  width: 100%;
  max-width: 600px; // Limitamos el ancho para que se vea elegante

  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
`;

const CardHeader = styled.div`
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
  }

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  margin-top: 15px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
  padding-left: 4px;
`;

const RoleBadge = styled.div`
  display: inline-block;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
  /* Colores según el rol */
  background: ${({ $role, theme }) => 
    $role === 'admin' ? '#ff4757' :      // Rojo para Admin
    $role === 'manager' ? '#2ed573' :    // Verde para Gestor
    $role === 'user' ? '#1e90ff' :       // Azul para Jugador
    theme.bg4};                          // Gris para "Sin rol"
  
  color: ${({ $role }) => 
    ($role === 'admin' || $role === 'manager' || $role === 'user') 
    ? '#fff' 
    : 'inherit'};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.bg4 || "#e1e1e1"};
  margin: 30px 0;
`;

const LinkedAccounts = styled.div`
  h4 {
    margin: 0 0 20px 0;
    font-size: 16px;
  }
  .account-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px;
    border-radius: 12px;
    background: ${({ theme }) => theme.bgtotal};
    border: 1px solid ${({ theme }) => theme.bg4};
    gap: 10px;
    flex-wrap: wrap;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .google-icon {
    font-size: 28px;
    display: flex;
  }
  .info {
    display: flex;
    flex-direction: column;
    span { font-weight: 600; font-size: 15px; }
    small { opacity: 0.6; font-size: 13px; }
  }
  .right {
    display: flex;
    align-items: center;
  }
`;

const StatusBadge = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #2ed573;
  padding: 6px 12px;
  background: rgba(46, 213, 115, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(46, 213, 115, 0.2);
`;