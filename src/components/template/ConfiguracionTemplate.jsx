import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Device } from "../../styles/breakpoints";
import { 
  Btnsave, 
  InputText2,
  BtnNormal, 
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
  const [loadingUnlink, setLoadingUnlink] = useState(false);

  // --- LÓGICA GOOGLE ACTUALIZADA ---
  // 1. Buscamos la identidad completa de Google
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === 'google'
  );
  
  // 2. Determinamos si está vinculado
  const isGoogleLinked = !!googleIdentity;

  // 3. Extraemos datos específicos de la cuenta de Google (si existe)
  // Nota: Supabase suele guardar esto en identity_data
  const googleEmail = googleIdentity?.identity_data?.email;
  const googleAvatar = googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture;

  // Cargar datos iniciales
  useEffect(() => {
    if (profile?.full_name) {
      setNombre(profile.full_name);
    }
  }, [profile]);

  // --- ACTUALIZAR PERFIL ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoadingUpdate(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: nombre })
        .eq('id', user.id);

      if (error) throw error;
      
      await fetchProfile(user.id);
      alert("Perfil actualizado correctamente");
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  // --- VINCULAR GOOGLE ---
  const handleLinkGoogle = async () => {
    setLoadingLink(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/configuracion`, 
        }
      });
      if (error) throw error;
    } catch (err) {
      alert("Error al vincular Google: " + err.message);
      setLoadingLink(false);
    }
  };

  // --- DESVINCULAR GOOGLE ---
  const handleUnlinkGoogle = async () => {
    if (!confirm("¿Estás seguro de querer desvincular tu cuenta de Google?")) return;

    setLoadingUnlink(true);
    try {
      if (!googleIdentity) throw new Error("No se encontró la identidad de Google.");

      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;

      // Refrescamos usuario
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      useAuthStore.setState({ user: updatedUser });

      alert("Cuenta de Google desvinculada correctamente.");
    } catch (err) {
      alert("Error al desvincular: " + err.message);
    } finally {
      setLoadingUnlink(false);
    }
  };

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
        <Card>
          <CardHeader>
            <div className="icon-box"><v.iconoUser /></div>
            <h3>Mi Información</h3>
          </CardHeader>
          
          <form onSubmit={handleUpdateProfile}>
            <Label>ID de Usuario</Label>
            <InputText2>
              <input className="form__field disabled" value={user?.id || ""} disabled type="text" />
            </InputText2>

            <Label>Rol en la Liga</Label>
            <RoleBadge $role={profile?.role || 'default'}>
               {!profile ? "Cargando..." : getRoleLabel(profile.role)}
            </RoleBadge>

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

            <Label>Correo Electrónico (Principal)</Label>
            <InputText2>
              <input className="form__field disabled" value={user?.email || ""} disabled type="text" />
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

          {/* --- SECCIÓN CUENTAS VINCULADAS --- */}
<LinkedAccounts>
            <h4>Cuentas Vinculadas</h4>
            <div className="account-item">
              <div className="left">
                {isGoogleLinked && googleAvatar ? (
                  <img src={googleAvatar} alt="Avatar Google" className="google-avatar" />
                ) : (
                  <span className="google-icon"><v.iconogoogle /></span>
                )}
                <div className="info">
                  <span>{isGoogleLinked && googleEmail ? googleEmail : "Google"}</span>
                  <small>
                    {isGoogleLinked 
                      ? "Cuenta vinculada correctamente" 
                      : "Vincula tu cuenta para iniciar sesión más rápido"}
                  </small>
                </div>
              </div>

              <div className="right">
                {isGoogleLinked ? (
                  <ActionsGroup>
                    <StatusBadge $active={true}>Conectado</StatusBadge>
                    {/* El botón de Desvincular (ROJO) lo dejamos como Btnsave porque es una acción crítica/destructiva */}
                    <Btnsave 
                      funcion={handleUnlinkGoogle}
                      titulo={loadingUnlink ? "..." : "Desvincular"}
                      bgcolor={v.rojo}
                      color="#fff" // Texto blanco forzado para el botón rojo
                      width="auto"
                      disabled={loadingUnlink}
                    />
                  </ActionsGroup>
                ) : (
                  /* AQUÍ EL CAMBIO: Usamos BtnNormal en lugar de Btnsave.
                     Ya no pasamos bgcolor ni color, el componente lo decide por el tema.
                  */
                  <BtnNormal 
                    funcion={handleLinkGoogle}
                    titulo={loadingLink ? "Redirigiendo..." : "Vincular"}
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
// ... (Tus estilos Container, HeaderSection, ContentGrid, Card, CardHeader, Label, RoleBadge, Divider se mantienen igual) ...
const Container = styled.div`
  min-height: 100vh;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;

  /* --- CAMBIO --- */
  padding-top: 80px; 

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
  background-color: ${({ theme }) => theme.bgcards || "#fff"};
  padding: 30px;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.boxshadowGray || "0 4px 12px rgba(0,0,0,0.1)"};
  color: ${({ theme }) => theme.text};
  width: 100%;
  max-width: 600px;
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
  background: ${({ $role, theme }) => 
    $role === 'admin' ? '#ff4757' :      
    $role === 'manager' ? '#2ed573' :    
    $role === 'user' ? '#1e90ff' :       
    theme.bg4};                          
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

// --- ESTILOS ACTUALIZADOS PARA LINKEDACCOUNTS ---
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
  
  /* Icono por defecto */
  .google-icon {
    font-size: 28px;
    display: flex;
  }

  /* Nueva clase para la imagen de perfil de Google */
  .google-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid ${({ theme }) => theme.bg4};
  }

  .info {
    display: flex;
    flex-direction: column;
    span { 
        font-weight: 600; 
        font-size: 15px; 
        
        /* Limitar largo del correo en móviles si es necesario */
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    small { opacity: 0.6; font-size: 13px; }
  }
  .right {
    display: flex;
    align-items: center;
  }
`;

const ActionsGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StatusBadge = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #2ed573;
  padding: 6px 12px;
  background: rgba(46, 213, 115, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(46, 213, 115, 0.2);
  white-space: nowrap;
`;