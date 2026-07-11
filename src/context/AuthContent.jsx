import React, { createContext, useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase.config';
import { useAuthStore } from '../store/AuthStore';
import { ROLES } from '../utils/constants';

const AuthContext = createContext();
const PRESENCE_CHANNEL = 'online-managers';
const PRESENCE_HEARTBEAT_MS = 30000;
const MANAGER_ACCESS_EVENT = 'manager-access-change';

export function AuthContextProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);
  const [suspendedNotice, setSuspendedNotice] = useState(null);

  // Ref para mantener canal de presencia único por sesión
  const presenceRef = useRef(null);
  const userRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const clearBrokenSession = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn("No se pudo limpiar la sesion local con signOut local:", err);
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }

    userRef.current = null;
    profileRef.current = null;
    setUser(null);
    setProfile(null);
    useAuthStore.setState({ user: null, profile: null });
  };

  const isInvalidRefreshTokenError = (error) => {
    const message = String(error?.message || error || "").toLowerCase();
    return message.includes('refresh token') || message.includes('invalid refresh token');
  };

  const showSuspendedNotice = (reason = 'Tu cuenta fue bloqueada temporalmente por el administrador.') => {
    setSuspendedNotice({
      title: 'Cuenta bloqueada',
      message: reason,
    });
  };

  const signOutSuspendedAccount = useEffectEvent(async (reason) => {
    console.warn("AuthContext: Cuenta suspendida. Cerrando sesion...");
    showSuspendedNotice(reason);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("No se pudo cerrar sesion suspendida:", err);
    }
    userRef.current = null;
    profileRef.current = null;
    setUser(null);
    setProfile(null);
    useAuthStore.setState({ user: null, profile: null });
  });

  // --- VALIDACIÓN EN SEGUNDO PLANO (CON ROLE GUARD) ---
  const validateProfile = useEffectEvent(async (sessionUser) => {
    if (!sessionUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        // SOLUCIÓN: Si es un error de conexión o fetch, NO cerramos sesión.
        // Solo logueamos el error y permitimos que la sesión continúe.
        // El usuario podrá seguir navegando y se reintentará luego.
        console.error("Error temporal validando perfil (No se cerrará sesión):", error.message);
        return; 
      }

      if (!data) {
        // Solo cerramos sesión si NO hay error técnico pero tampoco hay datos (perfil borrado)
        console.warn("AuthContext: Perfil no encontrado en BD. Cerrando sesión...");
        await supabase.auth.signOut();
        userRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        return;
      }

      const authorizedRoles = [ROLES.MANAGER, ROLES.ADMIN, ROLES.DELEGATE];
      if (!authorizedRoles.includes(data.role)) {
        console.warn(`AuthContext: Rol no autorizado (${data.role}). Cerrando sesión...`);
        await supabase.auth.signOut();
        userRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        return;
      }

      if ([ROLES.MANAGER, ROLES.DELEGATE].includes(data.role) && data.is_suspended) {
        await signOutSuspendedAccount('No puedes iniciar sesion porque esta cuenta se encuentra bloqueada temporalmente. Contacta al administrador para recuperar el acceso.');
        return;
      }

      profileRef.current = data;
      setProfile(data);
      useAuthStore.setState({ profile: data });
    } catch (err) {
      console.error("Error crítico validando perfil:", err);
      // Opcional: Decidir si cerrar sesión aquí o no. 
      // Generalmente mejor no cerrar por un error de catch.
    }
  });

  useEffect(() => {
    let mounted = true;
    let authValidationTimer = null;

    const validateAfterAuthEvent = (currentUser, showLoader = false) => {
      if (authValidationTimer) window.clearTimeout(authValidationTimer);

      authValidationTimer = window.setTimeout(async () => {
        authValidationTimer = null;
        if (!mounted) return;

        try {
          if (currentUser) {
            await validateProfile(currentUser);
          }
        } finally {
          if (showLoader && mounted) {
            setIsLoading(false);
          }
        }
      }, 0);
    };

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            userRef.current = session.user;
            setUser(session.user);
            useAuthStore.setState({ user: session.user });
            await validateProfile(session.user);
          }
        }
      } catch (error) {
        console.error("Init Error:", error);
        if (isInvalidRefreshTokenError(error)) {
          await clearBrokenSession();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN') {
        const currentUser = session?.user ?? null;
        const isNewSession =
          currentUser?.id && currentUser.id !== userRef.current?.id;

        // No desmontar la aplicaciÃ³n cuando Supabase repite SIGNED_IN al
        // recuperar foco: es la misma sesiÃ³n y el perfil ya estÃ¡ en memoria.
        if (!isNewSession) {
          if (currentUser && !profileRef.current) {
            validateAfterAuthEvent(currentUser);
          }
          return;
        }

        setIsLoading(true);
        userRef.current = currentUser;
        profileRef.current = null;
        setUser(currentUser);
        setProfile(null);
        useAuthStore.setState({ user: currentUser });

        validateAfterAuthEvent(currentUser, true);
      }
      else if (event === 'TOKEN_REFRESHED') {
        const currentUser = session?.user ?? null;
        userRef.current = currentUser;
        setUser(currentUser);
        useAuthStore.setState({ user: currentUser });

        if (currentUser) {
          validateAfterAuthEvent(currentUser);
        }
      } 
      else if (event === 'SIGNED_OUT') {
        if (authValidationTimer) window.clearTimeout(authValidationTimer);
        userRef.current = null;
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        useAuthStore.setState({ user: null, profile: null });
      }
    });

    return () => {
      mounted = false;
      if (authValidationTimer) window.clearTimeout(authValidationTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleSuspendedNotice = async (event) => {
      await signOutSuspendedAccount(event.detail?.message || event.detail?.reason);
    };

    window.addEventListener('account-suspended-notice', handleSuspendedNotice);
    return () => window.removeEventListener('account-suspended-notice', handleSuspendedNotice);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`profile-access-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        async ({ new: updatedProfile }) => {
          if ([ROLES.MANAGER, ROLES.DELEGATE].includes(updatedProfile?.role) && updatedProfile?.is_suspended) {
            await signOutSuspendedAccount('Tu cuenta fue bloqueada mientras estabas conectado. La sesion se cerro para proteger el acceso.');
            return;
          }

          if (updatedProfile?.id === user.id) {
            setProfile(updatedProfile);
            useAuthStore.setState({ profile: updatedProfile });
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    const cleanupPresence = () => {
      if (!presenceRef.current) return;

      const { channel, heartbeatId } = presenceRef.current;
      if (heartbeatId) clearInterval(heartbeatId);

      try {
        channel.untrack?.().catch(() => undefined);
      } catch {
        /* ignore */
      }
      try {
        channel.unsubscribe();
      } catch {
        /* ignore */
      }
      presenceRef.current = null;
    };

    if (!user?.id) {
      cleanupPresence();
      return;
    }

    if (!profile?.id || profile.id !== user.id) {
      cleanupPresence();
      return;
    }

    if (profile.role !== 'manager') {
      cleanupPresence();
      return;
    }

    if (presenceRef.current?.userId === user.id) {
      console.log('[AUTH] presence already active for', user.id);
      return;
    }

    cleanupPresence();

    let lastSeenWarningLogged = false;
    const startedAt = new Date().toISOString();
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const buildPresencePayload = () => ({
      user_id: user.id,
      role: profile.role,
      online_at: startedAt,
      last_seen_at: new Date().toISOString(),
    });

    channel.on("broadcast", { event: MANAGER_ACCESS_EVENT }, async ({ payload }) => {
      if (payload?.user_id !== user.id) return;
      if (!payload?.suspended) return;

      await signOutSuspendedAccount(
        payload.message ||
        'Tu cuenta fue bloqueada por el administrador mientras estabas conectado. Se cerro tu sesion y no podras volver a entrar hasta que sea reactivada.'
      );
    });

    const markLastSeen = async () => {
      const currentProfile = profileRef.current;
      if (!currentProfile?.id || currentProfile.id !== user.id) return;

      const lastSeenAt = new Date().toISOString();
      const nextMetadata = {
        ...(currentProfile.metadata || {}),
        last_seen_at: lastSeenAt,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ metadata: nextMetadata })
        .eq('id', user.id);

      if (error) {
        if (!lastSeenWarningLogged) {
          console.warn('[AUTH][TRACKER] no se pudo actualizar last_seen_at:', error.message);
          lastSeenWarningLogged = true;
        }
        return;
      }

      profileRef.current = {
        ...currentProfile,
        metadata: nextMetadata,
      };
    };

    const trackPresence = async () => {
      try {
        await channel.track(buildPresencePayload());
      } catch (err) {
        console.error('[AUTH][TRACKER] track error', err);
      }
    };

    presenceRef.current = {
      channel,
      heartbeatId: null,
      userId: user.id,
    };

    const handleSubscribe = async (status) => {
      console.log('[AUTH][TRACKER] channel status', status);

      if (status === 'SUBSCRIBED') {
        await trackPresence();
        await markLastSeen();
        console.log('[AUTH][TRACKER] tracked presence for', user.id);
      }
    };

    channel.subscribe(handleSubscribe);

    const heartbeatId = setInterval(() => {
      trackPresence();
      markLastSeen();
    }, PRESENCE_HEARTBEAT_MS);
    presenceRef.current.heartbeatId = heartbeatId;

    const onPageHide = () => {
      markLastSeen();
    };

    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      markLastSeen();
      cleanupPresence();
    };
  }, [profile?.id, profile?.role, user?.id]);

  // --- Funciones Públicas ---
  async function signInWithEmail(email, password) {
    setAuthLoadingAction(true);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      setAuthLoadingAction(false);
      if (res.error) throw res.error;
      return res;
    } catch (err) {
      setAuthLoadingAction(false);
      throw err;
    }
  }

  const value = {
    user,
    profile,
    isLoading,
    authLoadingAction,
    signInWithEmail,
  };

  const handleSuspendedNoticeClose = () => {
    setSuspendedNotice(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {suspendedNotice && (
        <SuspendedOverlay>
          <SuspendedDialog>
            <h3>{suspendedNotice.title}</h3>
            <p>{suspendedNotice.message}</p>
            <button
              type="button"
              onClick={handleSuspendedNoticeClose}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                color: '#ffffff',
                background: '#1CB0F6',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Regresar al login
            </button>
          </SuspendedDialog>
        </SuspendedOverlay>
      )}
    </AuthContext.Provider>
  );
}

export function UserAuth() {
  return useContext(AuthContext);
}

const SuspendedOverlay = ({ children }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 300000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'rgba(0, 0, 0, 0.68)',
      backdropFilter: 'blur(4px)',
    }}
  >
    {children}
  </div>
);

const SuspendedDialog = ({ children }) => (
  <div
    style={{
      width: '100%',
      maxWidth: 420,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: 24,
      borderRadius: 14,
      color: '#f8fafc',
      background: '#101820',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
    }}
  >
    {children}
  </div>
);
