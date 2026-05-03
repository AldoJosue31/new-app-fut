import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/supabase.config';
import { useAuthStore } from '../store/AuthStore';

const AuthContext = createContext();
const PRESENCE_CHANNEL = 'online-managers';
const PRESENCE_HEARTBEAT_MS = 30000;

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function UserAuth() {
  return useContext(AuthContext);
}
