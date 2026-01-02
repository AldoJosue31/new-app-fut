import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase.config';
import { useAuthStore } from '../store/AuthStore';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);

  // --- VALIDACIÓN EN SEGUNDO PLANO (CON ROLE GUARD) ---
  const validateProfile = async (sessionUser) => {
    if (!sessionUser) return;

    try {
      // 1. Buscamos si existe el perfil en tu tabla
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      // 2. Si hay error o NO hay data (puede pasar durante registro inicial antes del RPC)
      if (error || !data) {
        console.warn("AuthContext: Perfil no encontrado o cuenta no vinculada. Cerrando sesión...");
        // Eliminamos el alert() para no interrumpir flujos de registro
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return;
      }

      // 3. VALIDACIÓN DE ROL (ROLE GUARD)
      const authorizedRoles = ['manager', 'admin'];
      if (!authorizedRoles.includes(data.role)) {
        console.warn(`AuthContext: Rol no autorizado (${data.role}). Cerrando sesión...`);
        // Eliminamos el alert()
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return;
      }

      // 4. Si pasó los filtros, permitimos el acceso
      setProfile(data);
      useAuthStore.setState({ profile: data }); 
      
    } catch (err) {
      console.error("Error validando perfil:", err);
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    let mounted = true;

    // --- 1. INICIALIZACIÓN RÁPIDA ---
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

    // --- 2. ESCUCHADOR DE EVENTOS ---
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