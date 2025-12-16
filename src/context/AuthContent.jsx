import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase.config';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);

  // --- VALIDACIÓN EN SEGUNDO PLANO (NO BLOQUEANTE) ---
  const validateProfile = async (sessionUser) => {
    if (!sessionUser) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error || !data) {
        console.warn("Usuario sin perfil detectado. Cerrando sesión...");
        // 1. Marcar error para el login
        localStorage.setItem('login_error', 'unregistered_google_account');
        // 2. Expulsar (esto disparará el evento SIGNED_OUT)
        await supabase.auth.signOut();
      } else {
        // Todo correcto
        setProfile(data);
      }
    } catch (err) {
      console.error("Error validando perfil:", err);
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
            // Lanzamos la validación SIN esperar (await) para no bloquear la UI
            validateProfile(session.user);
          }
        }
      } catch (error) {
        console.error("Init Error:", error);
      } finally {
        // CRÍTICO: Quitamos la pantalla de carga SIEMPRE al terminar de leer la sesión local.
        // Esto garantiza que la app nunca se quede "trabada".
        if (mounted) setIsLoading(false);
      }
    }

    init();

    // --- 2. ESCUCHADOR DE EVENTOS ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        // Validamos cada vez que se detecta entrada
        if (session?.user) {
            validateProfile(session.user);
        }
        // Aseguramos que no haya carga
        setIsLoading(false);
      } 
      else if (event === 'SIGNED_OUT') {
        // Limpieza total
        setUser(null);
        setProfile(null);
        setIsLoading(false);
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