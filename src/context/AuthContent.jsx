import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/supabase.config';
import { useAuthStore } from '../store/AuthStore';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);

  // Ref para mantener canal de presencia único por sesión
  const presenceRef = useRef(null);

  // --- VALIDACIÓN EN SEGUNDO PLANO (CON ROLE GUARD) ---
  const validateProfile = async (sessionUser) => {
    if (!sessionUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error || !data) {
        console.warn("AuthContext: Perfil no encontrado o cuenta no vinculada. Cerrando sesión...");
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
      console.error("Error validando perfil:", err);
      await supabase.auth.signOut();
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

  // ---------------------------
  // NUEVO: EFECTO DE PRESENCIA
  // ---------------------------
  useEffect(() => {
    // Si no hay usuario: limpiar canal si existe
    if (!user?.id) {
      if (presenceRef.current) {
        try { presenceRef.current.untrack?.().catch(()=>{}); } catch(e){};
        try { presenceRef.current.unsubscribe(); } catch(e){};
        presenceRef.current = null;
      }
      return;
    }

    // Si ya existe, no volver a crear
    if (presenceRef.current) {
      console.log('[AUTH] presence already active for', user.id);
      return;
    }

    const channel = supabase.channel('online-managers');
    presenceRef.current = channel;

    const handleSubscribe = async (status) => {
      console.log('[AUTH][TRACKER] channel status', status);
      // debug session
      try {
        const { data } = await supabase.auth.getSession();
        console.log('[AUTH][TRACKER] session', data);
      } catch(e) {
        console.warn('[AUTH][TRACKER] getSession err', e);
      }

      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
          console.log('[AUTH][TRACKER] tracked presence for', user.id);
        } catch (err) {
          console.error('[AUTH][TRACKER] track error', err);
        }
      }
    };

    channel.subscribe(handleSubscribe);

    // Re-track on visibility change (optional but useful)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        try {
          channel.track({ user_id: user.id, online_at: new Date().toISOString() })
            .then(() => console.log('[AUTH][TRACKER] re-tracked on visible', user.id))
            .catch(e => console.error('[AUTH][TRACKER] re-track err', e));
        } catch(e) {}
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try { channel.untrack?.().catch(()=>{}); } catch(e) {}
      try { channel.unsubscribe(); } catch(e) {}
      presenceRef.current = null;
    };
  }, [user?.id]);

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
