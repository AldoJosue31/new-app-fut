import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../styles/variables";
import {
  Btnsave,
  InputText2,
  BtnNormal,
  ContentContainer,
  Card,
  CardHeader,
  Badge,
} from "../../index";
import { PageHeader } from "../moleculas/PageHeader";
import { useAuthStore } from "../../store/AuthStore";
import {
  getLeagueNameByOwner,
  linkGoogleIdentity,
  unlinkGoogleIdentity,
  updateProfileName,
} from "../../services/account";
import { TournamentAutoRedirectPreference } from "../TournamentAutoRedirectPreference";

export function ConfiguracionTemplate({ state, setState }) {
  const { user, profile, fetchProfile } = useAuthStore();
  const [nombre, setNombre] = useState("");
  const [leagueName, setLeagueName] = useState(null);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);

  const googleIdentity = user?.identities?.find((identity) => identity.provider === "google");
  const isGoogleLinked = !!googleIdentity;
  const googleEmail = googleIdentity?.identity_data?.email;
  const googleAvatar =
    googleIdentity?.identity_data?.avatar_url || googleIdentity?.identity_data?.picture;

  useEffect(() => {
    if (profile?.full_name) {
      setNombre(profile.full_name);
    }
  }, [profile]);

  useEffect(() => {
    const loadLeagueName = async () => {
      if (!user) return;
      try {
        const nextLeagueName = await getLeagueNameByOwner(user.id);
        setLeagueName(nextLeagueName);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    loadLeagueName();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoadingUpdate(true);

    try {
      await updateProfileName(user.id, nombre);
      await fetchProfile(user.id);
      alert("Perfil actualizado");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLoadingLink(true);
    try {
      await linkGoogleIdentity(`${window.location.origin}/configuracion`);
    } catch (error) {
      alert("Error: " + error.message);
      setLoadingLink(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm("¿Desvincular Google?")) return;
    setLoadingUnlink(true);

    try {
      if (!googleIdentity) throw new Error("No identity");
      const updatedUser = await unlinkGoogleIdentity(googleIdentity);
      useAuthStore.setState({ user: updatedUser });
      alert("Desvinculado");
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoadingUnlink(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "manager":
        return "Gestor";
      case "user":
        return "Jugador";
      default:
        return "Sin rol";
    }
  };

  return (
    <>
      <PageHeader
        title="Configuración"
        maxWidth="600px"
        marginBottom="0"
        state={state}
        setState={setState}
      />

      <StyledContentContainer>
        <MainContainer>
          <Card maxWidth="600px">
            <CardHeader Icono={v.iconoUser} titulo="Mi Información" />
            {leagueName && <Badge color={v.colorPrincipal}>Liga: {leagueName}</Badge>}

            <form onSubmit={handleUpdateProfile}>
              <Label>ID de Usuario</Label>
              <InputText2>
                <input className="form__field disabled" value={user?.id || ""} disabled type="text" />
              </InputText2>

              <Label>Rol en la Liga</Label>
              <RoleBadge $role={profile?.role || "default"}>
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

            <PreferencesSection>
              <h4>Preferencias</h4>
              <TournamentAutoRedirectPreference />
            </PreferencesSection>

            <Divider />

            <LinkedAccounts>
              <h4>Cuentas Vinculadas</h4>
              <div className="account-item">
                <div className="left">
                  {isGoogleLinked && googleAvatar ? (
                    <img src={googleAvatar} alt="Avatar Google" className="google-avatar" />
                  ) : (
                    <span className="google-icon">
                      <v.iconogoogle />
                    </span>
                  )}
                  <div className="info">
                    <span>{isGoogleLinked && googleEmail ? googleEmail : "Google"}</span>
                    <small>
                      {isGoogleLinked ? "Cuenta vinculada correctamente" : "Vincula tu cuenta"}
                    </small>
                  </div>
                </div>

                <div className="right">
                  {isGoogleLinked ? (
                    <ActionsGroup>
                      <StatusBadge $active>Conectado</StatusBadge>
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
                      titulo={loadingLink ? "..." : "Vincular"}
                      disabled={loadingLink}
                    />
                  )}
                </div>
              </div>
            </LinkedAccounts>
          </Card>
        </MainContainer>
      </StyledContentContainer>
    </>
  );
}

const StyledContentContainer = styled(ContentContainer)`
  && {
    padding-top: 0 !important;
    margin-top: 0 !important;
  }
`;

const MainContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 20px;
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
    $role === "admin"
      ? "#ff4757"
      : $role === "manager"
        ? "#00913cff"
        : $role === "user"
          ? "#1e90ff"
          : theme.bg4};
  color: ${({ $role }) =>
    $role === "admin" || $role === "manager" || $role === "user" ? "#fff" : "inherit"};
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.bg4 || "#e1e1e1"};
  margin: 30px 0;
`;

const PreferencesSection = styled.div`
  h4 {
    margin: 0 0 14px 0;
    font-size: 16px;
  }
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

    small {
      opacity: 0.6;
      font-size: 13px;
    }
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
