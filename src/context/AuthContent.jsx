import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase.config';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // Iniciamos cargando
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);

  // Función auxiliar para traer el perfil
  async function fetchProfile(id) {
    if (!id) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles') // Asegúrate que esta tabla exista en tu DB
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // 1. Obtenemos la sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Error en Auth Init:", error);
      } finally {
        // 2. PASE LO QUE PASE, dejamos de cargar aquí
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // 3. Escuchamos cambios (Login, Logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event); // Útil para depurar
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        // Opcional: recargar perfil si cambia la sesión
        // await fetchProfile(session.user.id); 
      } else {
        setUser(null);
        setProfile(null);
      }
      
      // Asegurarnos de que isLoading sea false si el evento llega después
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ... (Tus funciones signInWithEmail, signInWithGoogle, signOut quedan igual) ...
  // Solo asegúrate de incluirlas en el value del provider
  
  /* Actions (copiadas de tu código para mantener funcionalidad) */
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
  
  // ... resto de tus funciones ...

  const value = {
    user,
    profile,
    isLoading,
    authLoadingAction,
    signInWithEmail,
    // ... exporta el resto ...
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function UserAuth() {
  return useContext(AuthContext);
}