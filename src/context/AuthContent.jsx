// src/context/AuthContent.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase.config';

const AuthContext = createContext();

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);        // supabase user
  const [profile, setProfile] = useState(null);  // row de profiles
  const [isLoading, setIsLoading] = useState(true);
  const [authLoadingAction, setAuthLoadingAction] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user ?? null;
      if (!mounted) return;
      setUser(sessionUser);
      if (sessionUser) await fetchProfile(sessionUser.id);
      setIsLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(id) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (!error) setProfile(data);
    } catch (err) {
      console.error('fetchProfile error', err);
    } finally {
      setIsLoading(false);
    }
  }

  /* Auth actions */
  async function signUpWithEmail(email, password, extra = {}) {
    setAuthLoadingAction(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const user = data.user ?? data;
      // crear profile por upsert (idempotente)
      await supabase.from('profiles').upsert({
        id: user.id,
        email,
        full_name: extra.full_name ?? null,
      });
      setAuthLoadingAction(false);
      return user;
    } catch (err) {
      setAuthLoadingAction(false);
      throw err;
    }
  }

  async function signInWithEmail(email, password) {
    setAuthLoadingAction(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthLoadingAction(false);
      return data;
    } catch (err) {
      setAuthLoadingAction(false);
      throw err;
    }
  }

  async function signInWithGoogle() {
    setAuthLoadingAction(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
      // la session se recibirá por onAuthStateChange
    } finally {
      // no seteamos authLoadingAction=false aquí; la sesión llegará y actualizará
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    isLoading,
    authLoadingAction,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---------- Hooks / exports ---------- */

/**
 * Hook principal (nombre nuevo): useAuthStoreContext
 * Hook legacy / compat: UserAuth (para imports existentes)
 * También exporto useAuthStore para mayor compatibilidad.
 */
export function useAuthStoreContext() {
  return useContext(AuthContext);
}

export function UserAuth() {
  return useContext(AuthContext);
}

/* alias adicional para compatibilidad con nombres usados en tu app */
export const useAuthStore = useAuthStoreContext;
