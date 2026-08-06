import { create } from 'zustand';
import type { User } from '../types';
import { DEMO_USER, IS_DEMO } from '../lib/config';
import { apiFetch, setAccessToken, setRefreshToken, getRefreshToken, refreshSession } from '../lib/api';
import { getMeta, setMeta, deleteMeta } from '../lib/db';

interface AuthState {
  user: User | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  isDemo: boolean;
  /** True cuando la sesión activa proviene de caché offline (sin backend). */
  offline: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const demoUser: User = { ...DEMO_USER, createdAt: Date.now() };

const SESSION_USER_KEY = 'session.user';

export const useAuthStore = create<AuthState>((set) => ({
  user: IS_DEMO ? demoUser : null,
  loading: IS_DEMO ? false : true,
  submitting: false,
  error: null,
  isDemo: IS_DEMO,
  offline: false,

  init: async () => {
    if (IS_DEMO) {
      set({ user: demoUser, loading: false, offline: false });
      return;
    }
    set({ loading: true });

    // Si ya tenemos un access token en memoria/sessionStorage, intentamos /auth/me
    // directamente y sólo refrescamos si hace falta (401).
    try {
      const user = await apiFetch<User>('/auth/me');
      await setMeta(SESSION_USER_KEY, user);
      set({ user, loading: false, offline: false });
      return;
    } catch (error) {
      // Si fue 401, apiFetch ya intentó refrescar. Si sigue fallando por otra
      // razón (red), caemos al flujo de refresh explícito más abajo.
      const status = (error as { status?: number }).status;
      if (status !== 401 && status !== undefined) {
        // Error distinto de auth (5xx, etc.): intentar refresh por si acaso,
        // y si no, usar caché offline.
      }
    }

    const result = await refreshSession();
    if (result === 'ok') {
      try {
        const user = await apiFetch<User>('/auth/me', { retryOnUnauthorized: false });
        await setMeta(SESSION_USER_KEY, user);
        set({ user, loading: false, offline: false });
        return;
      } catch {
        // cae al fallback de caché
      }
    }

    if (result === 'network') {
      // Sin red: mantenemos la sesión cacheada para que la PWA funcione offline.
      const cached = await getMeta<User>(SESSION_USER_KEY);
      set({ user: cached ?? null, loading: false, offline: true });
      return;
    }

    // result === 'invalid': token rechazado => cerrar sesión.
    await deleteMeta(SESSION_USER_KEY);
    setAccessToken(null);
    set({ user: null, loading: false, offline: false });
  },

  login: async (email, password) => {
    if (IS_DEMO) {
      set({ user: demoUser, error: null });
      return true;
    }
    set({ submitting: true, error: null });
    try {
      const data = await apiFetch<{ user: User; accessToken: string; refreshToken?: string }>(
        '/auth/login',
        { method: 'POST', body: { email, password }, retryOnUnauthorized: false },
      );
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken ?? null);
      await setMeta(SESSION_USER_KEY, data.user);
      set({ user: data.user, submitting: false, error: null, offline: false });
      return true;
    } catch (error) {
      set({
        submitting: false,
        error: error instanceof Error ? error.message : 'No se pudo iniciar sesión',
      });
      return false;
    }
  },

  register: async (email, password, name) => {
    if (IS_DEMO) {
      set({ user: demoUser, error: null });
      return true;
    }
    set({ submitting: true, error: null });
    try {
      const data = await apiFetch<{ user: User; accessToken: string; refreshToken?: string }>(
        '/auth/register',
        { method: 'POST', body: { email, password, name }, retryOnUnauthorized: false },
      );
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken ?? null);
      await setMeta(SESSION_USER_KEY, data.user);
      set({ user: data.user, submitting: false, error: null, offline: false });
      return true;
    } catch (error) {
      set({
        submitting: false,
        error: error instanceof Error ? error.message : 'No se pudo registrar',
      });
      return false;
    }
  },

  logout: async () => {
    if (!IS_DEMO) {
      try {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: { refreshToken: getRefreshToken() },
          retryOnUnauthorized: false,
        });
      } catch {
        // ignoramos errores de logout remoto
      }
      await deleteMeta(SESSION_USER_KEY);
      setAccessToken(null);
      setRefreshToken(null);
      set({ user: null, offline: false });
      return;
    }
    set({ user: null });
  },
}));
