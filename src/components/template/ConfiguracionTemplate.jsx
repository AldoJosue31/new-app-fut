import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { Btnsave, InputText2, BtnNormal, Title } from "../../index";
import { useAuthStore } from "../../store/AuthStore";
import { supabase } from "../../supabase/supabase.config";
// Nuevos componentes
import { ContentContainer } from "../atomos/ContentContainer";
import { Card } from "../moleculas/Card";
import { CardHeader } from "../moleculas/CardHeader";

export function ConfiguracionTemplate() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [nombre, setNombre] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);

  // Lógica Google intacta
  const googleIdentity = user?.identities?.find((i) => i.provider === 'google');
  const isGoogleLinked = !!googleIdentity;
  const googleEmail = googleIdentity?.identity_data?.email;
  const googleAvatar = googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture;

  useEffect(() => {
    if (profile?.full_name) setNombre(profile.full_name);
  }, [profile]);

  // Manejadores (Update, Link, Unlink) se mantienen igual...
  const handleUpdateProfile = async (e) => { /* ... tu código ... */ };
  const handleLinkGoogle = async () => { /* ... tu código ... */ };
  const handleUnlinkGoogle = async () => { /* ... tu código ... */ };

  const getRoleLabel = (role) => {
    switch(role) {
        case 'admin': return 'Administrador de la App';
        case 'manager': return 'Gestor de la Liga';
        case 'user': return 'Jugador';
        default: return 'Sin rol asignado';
    }
  };

  return (
    <ContentContainer>
      <HeaderSection>
        <Title>Configuración</Title>
      </HeaderSection>

      <ContentGrid>
        <Card maxWidth="600px">
          <CardHeader 
            Icono={v.iconoUser}
            titulo="Mi Información"
          />
          
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

            <Label>Correo Electrónico</Label>
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
                    <Btnsave 
                      funcion={handleUnlinkGoogle}
                      titulo={loadingUnlink ? "..." : "Desvincular"}
                      bgcolor={v.rojo}
                      color="#fff"
                      width="auto"
                      disabled={loadingUnlink}
                    />
                  </ActionsGroup>
                ) : (
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
    </ContentContainer>
  );
}

// Estilos específicos de Configuración (Badges, LinkedAccounts, etc.)
// ... (Aquí van tus styled components RoleBadge, Divider, LinkedAccounts, StatusBadge intactos)
const HeaderSection = styled.div`margin-bottom: 10px; width: 100%; max-width: 600px;`;
const ContentGrid = styled.div`display: flex; justify-content: center; width: 100%;`;
const Label = styled.label`display: block; margin-bottom: 6px; margin-top: 15px; font-size: 14px; font-weight: 600; opacity: 0.9; padding-left: 4px;`;
const Divider = styled.div`height: 1px; background: ${({ theme }) => theme.bg4 || "#e1e1e1"}; margin: 30px 0;`;


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