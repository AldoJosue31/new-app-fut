import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import { 
  Btnsave, 
  InputText2,
  BtnNormal, 
  Title,
  ContentContainer,
  Card,
  CardHeader,
  Badge
} from "../../index";
import { useAuthStore } from "../../store/AuthStore";
import { supabase } from "../../supabase/supabase.config";

export function ConfiguracionTemplate() {
  const { user, profile, fetchProfile } = useAuthStore();
  
  // Estados para Mi Perfil
  const [nombre, setNombre] = useState("");
  const [leagueName, setLeagueName] = useState(null);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);

  // --- LÓGICA GOOGLE ---
  // Buscamos la identidad de google en el array de identidades del usuario
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === 'google'
  );
  
  const isGoogleLinked = !!googleIdentity;
  const googleEmail = googleIdentity?.identity_data?.email;
  const googleAvatar = googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture;

  useEffect(() => {
    if (profile?.full_name) {
      setNombre(profile.full_name);
    }
  }, [profile]);

  // 3. Efecto para obtener el nombre de la liga
  useEffect(() => {
    const fetchLeagueName = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('name')
          .eq('owner_id', user.id)
          .single();
        
        if (data && !error) {
          setLeagueName(data.name);
        }
      } catch (err) {
        console.error("Error al obtener la liga:", err);
      }
    };

    fetchLeagueName();
  }, [user]);

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

  // --- DESVINCULAR GOOGLE (CORREGIDO) ---
  const handleUnlinkGoogle = async () => {
    if (!confirm("¿Estás seguro de querer desvincular tu cuenta de Google?")) return;

    setLoadingUnlink(true);
    try {
      if (!googleIdentity) throw new Error("No se encontró la identidad de Google.");

      // 1. Desvincular en el backend
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;

      // 2. CORRECCIÓN CLAVE: Forzar refresco de sesión completo
      // Esto actualiza el localStorage y el token interno de Supabase
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) throw refreshError;

      if (session?.user) {
        // Actualizamos el store con el usuario que viene de la nueva sesión
        useAuthStore.setState({ user: session.user });
      } else {
        // Fallback por si acaso no hay sesión (raro)
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        useAuthStore.setState({ user: updatedUser });
      }

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
    <ContentContainer>
<HeaderSection>
        {/* 4. Renderizamos el Título junto con el Badge */}
        <div className="title-area">
            <Title>Configuración</Title>
        </div>
      </HeaderSection>

      <Card maxWidth="600px">
        <CardHeader 
            Icono={v.iconoUser}
            titulo="Mi Información"
        />
          {leagueName && (
                <Badge color={v.colorPrincipal}>
                    Liga: {leagueName}
                </Badge>
            )}
        
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
    </ContentContainer>
  );
}

/* --- STYLED COMPONENTS --- */

const HeaderSection = styled.div`
  margin-bottom: 10px;
  width: 100%;
  max-width: 600px;
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
  
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
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