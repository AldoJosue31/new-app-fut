import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/supabase.config';
import { useAuthStore } from '../store/AuthStore';

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
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const clearBrokenSession = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn("No se pudo limpiar la sesion local con signOut local:", err);
      try { await supabase.auth.signOut(); } catch (_) {}
    }

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

  const signOutSuspendedManager = async (reason) => {
    console.warn("AuthContext: Cuenta manager suspendida. Cerrando sesion...");
    showSuspendedNotice(reason);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("No se pudo cerrar sesion suspendida:", err);
    }
    setUser(null);
    setProfile(null);
    useAuthStore.setState({ user: null, profile: null });
  };

  // --- VALIDACIÓN EN SEGUNDO PLANO (CON ROLE GUARD) ---
const validateProfile = async (sessionUser) => {
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
        setUser(null);
        setProfile(null);
        return;
      }

      const authorizedRoles = ['manager', 'admin'];
      if (!authorizedRoles.includes(data.role)) {
        console.warn(`AuthContext: Rol no autorizado (${data.role}). Cerrando sesión...`);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return;
      }

      if (data.role === 'manager' && data.is_suspended) {
        await signOutSuspendedManager('No puedes iniciar sesion porque esta cuenta se encuentra bloqueada temporalmente. Contacta al administrador para recuperar el acceso.');
        return;
      }

      setProfile(data);
      useAuthStore.setState({ profile: data });
    } catch (err) {
      console.error("Error crítico validando perfil:", err);
      // Opcional: Decidir si cerrar sesión aquí o no. 
      // Generalmente mejor no cerrar por un error de catch.
    }
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            useAuthStore.setState({ user: session.user });
            validateProfile(session.user);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        useAuthStore.setState({ user: currentUser });
        
        if (currentUser) {
          validateProfile(currentUser);
        }
        setIsLoading(false);
      } 
      else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        useAuthStore.setState({ user: null, profile: null });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleSuspendedNotice = async (event) => {
      await signOutSuspendedManager(event.detail?.message || event.detail?.reason);
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
          if (updatedProfile?.role === "manager" && updatedProfile?.is_suspended) {
            await signOutSuspendedManager('Tu cuenta fue bloqueada mientras estabas conectado. La sesion se cerro para proteger el acceso.');
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

      try { channel.untrack?.().catch(()=>{}); } catch(e) {}
      try { channel.unsubscribe(); } catch(e) {}
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

      await signOutSuspendedManager(
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

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackPresence();
        markLastSeen();
      } else {
        markLastSeen();
      }
    };

    const onPageHide = () => {
      markLastSeen();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
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
