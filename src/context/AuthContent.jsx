import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase.config';
import { useAuthStore } from '../store/AuthStore'; // 1. Importar el Store

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
      // 1. Buscamos si existe el perfil en tu tabla
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      // 2. Si hay error o NO hay data, es un intruso (o cuenta no vinculada)
      if (error || !data) {
        console.warn("Acceso denegado: Cuenta de Google no vinculada.");

        // --- IMPORTANTE: CERRAR SESIÓN INMEDIATAMENTE ---
        await supabase.auth.signOut();
        
        // Limpiamos el estado local para que la UI reaccione rápido
        setUser(null);
        setProfile(null);

        // --- MENSAJE DE ERROR ---
        alert("ACCESO DENEGADO: Esta cuenta de Google no está vinculada a ningún usuario registrado. Pide al administrador que cree tu cuenta primero.");
        
        // El ProtectedRoute se encargará de devolverlo al Login al detectar user = null
        return;
      }

      // 3. Si el perfil SÍ existe, permitimos el acceso
      setProfile(data);
      useAuthStore.setState({ profile: data }); 
      
    } catch (err) {
      console.error("Error validando perfil:", err);
      // Por seguridad, si falla algo grave, también cerramos sesión
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
            // Sincronizar usuario inmediatamente
            useAuthStore.setState({ user: session.user }); // <--- Sincronizar Usuario en Store
            
            // Lanzamos la validación SIN esperar
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
        
        // Sincronizar Store
        useAuthStore.setState({ user: currentUser }); // <--- Sincronizar
        
        if (currentUser) {
            validateProfile(currentUser);
        }
        setIsLoading(false);
      } 
      else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        
        // Limpiar Store al salir
        useAuthStore.setState({ user: null, profile: null }); // <--- Limpiar Store
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