import { create } from 'zustand';
import { supabase } from "../lib/supabase/browserClient.js";
import {
  buildAuthCallbackPath,
  ROUTES,
} from "../lib/navigation/routes.js";
import { useDivisionStore } from './DivisionStore';
import { useEquiposStore } from './EquiposStore';
import { ROLES } from '../utils/constants';

export const useAuthStore = create((set, get) => {
  const clearSessionState = () => {
    set({
      authLoadingAction: false,
      isLoading: false,
      profile: null,
      serverAuthReason: null,
      serverAuthStatus: "anonymous",
      user: null,
    });
    useDivisionStore.getState().resetStore();
    useEquiposStore.getState().resetStore();
  };

  const discardUnauthorizedSession = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      console.warn('No se pudo limpiar la sesión local no autorizada:', error.message);
    }

    clearSessionState();
  };

  const fetchProfile = async (id) => {
    if (!id) {
      set({ profile: null });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('Perfil no encontrado (AuthStore):', error.message);
        set({ profile: null });
        return null;
      }

      set({ profile: data });
      return data;
    } catch (error) {
      console.error('Error obteniendo el perfil:', error);
      set({ profile: null });
      return null;
    }
  };

  const actions = {
    signupWithEmail: async (email, password, extra = {}) => {
      set({ authLoadingAction: true });

      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        const user = data?.user ?? data;
        if (user?.id) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            email,
            full_name: extra.full_name ?? null,
            created_at: new Date().toISOString(),
          });
          if (profileError) throw profileError;

          await fetchProfile(user.id);
        }

        return user;
      } finally {
        set({ authLoadingAction: false });
      }
    },

    loginWithEmail: async (email, password) => {
      set({ authLoadingAction: true });

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const sessionUser = data?.user;
        if (!sessionUser?.id) {
          const invalidSessionError = new Error('No se recibió una sesión válida.');
          invalidSessionError.code = 'INVALID_SESSION';
          throw invalidSessionError;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profileError || !profile) {
          await discardUnauthorizedSession();
          const profileUnavailableError = new Error('No fue posible validar tu acceso.');
          profileUnavailableError.code = 'PROFILE_UNAVAILABLE';
          throw profileUnavailableError;
        }

        const authorizedRoles = [ROLES.MANAGER, ROLES.DELEGATE, ROLES.ADMIN];
        if (!authorizedRoles.includes(profile.role)) {
          await discardUnauthorizedSession();
          const unauthorizedRoleError = new Error('No tienes permisos de acceso.');
          unauthorizedRoleError.code = 'UNAUTHORIZED_ROLE';
          throw unauthorizedRoleError;
        }

        if ([ROLES.MANAGER, ROLES.DELEGATE].includes(profile.role) && profile.is_suspended) {
          const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
          if (signOutError) await discardUnauthorizedSession();
          else clearSessionState();

          window.dispatchEvent(new CustomEvent('account-suspended-notice', {
            detail: {
              message: 'No puedes iniciar sesión porque esta cuenta se encuentra bloqueada temporalmente. Contacta al administrador para recuperar el acceso.',
            },
          }));

          const suspendedError = new Error('Cuenta bloqueada temporalmente.');
          suspendedError.code = 'ACCOUNT_SUSPENDED';
          throw suspendedError;
        }

        set({
          isLoading: false,
          profile,
          serverAuthReason: null,
          serverAuthStatus: "authenticated",
          user: sessionUser,
        });
        return data;
      } finally {
        set({ authLoadingAction: false });
      }
    },

    loginGoogle: async (returnPath = ROUTES.DASHBOARD) => {
      set({ authLoadingAction: true });

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: buildAuthCallbackPath(
              window.location.origin,
              returnPath,
            ),
            queryParams: {
              prompt: 'select_account',
            },
          },
        });
        if (error) throw error;
      } catch (error) {
        set({ authLoadingAction: false });
        throw error;
      }
    },

    cerrarSesion: async () => {
      set({ authLoadingAction: true });

      try {
        const currentUser = get().user;
        const currentProfile = get().profile;

        if (currentUser?.id && currentProfile?.id === currentUser.id) {
          void (async () => {
            try {
              const { error: lastSeenError } = await supabase
                .from('profiles')
                .update({
                  metadata: {
                    ...(currentProfile.metadata || {}),
                    last_seen_at: new Date().toISOString(),
                  },
                })
                .eq('id', currentUser.id);

              if (lastSeenError) {
                console.warn('No se pudo actualizar la última actividad:', lastSeenError.message);
              }
            } catch (error) {
              console.warn('No se pudo registrar la última actividad:', error);
            }
          })();
        }

        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signOutError) throw signOutError;

        clearSessionState();
      } finally {
        set({ authLoadingAction: false });
      }
    },

    fetchProfile,

    hydrateServerAuth: (snapshot) => {
      if (snapshot?.status === "authenticated") {
        set({
          isLoading: false,
          profile: snapshot.profile,
          serverAuthReason: null,
          serverAuthStatus: snapshot.status,
          user: snapshot.user,
        });
        return;
      }

      if (snapshot?.status === "profile-unavailable") {
        set({
          isLoading: true,
          profile: null,
          serverAuthReason: snapshot.reason || null,
          serverAuthStatus: snapshot.status,
          user: snapshot.user || null,
        });
        return;
      }

      set({
        isLoading: false,
        profile: null,
        serverAuthReason: snapshot?.reason || null,
        serverAuthStatus: snapshot?.status || "anonymous",
        user: null,
      });
    },

    clearSessionState,
    setAuthState: (nextState) => set(nextState),

    user: null,
    profile: null,
    isLoading: true,
    authLoadingAction: false,
    serverAuthReason: null,
    serverAuthStatus: "pending",
  };

  return actions;
});

export default useAuthStore;
