import { create } from 'zustand';
import type { User } from '../types';
import { DEMO_USER, IS_DEMO } from '../lib/config';
import { apiFetch, setAccessToken, setRefreshToken, refreshSession } from '../lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  isDemo: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const demoUser: User = { ...DEMO_USER, createdAt: Date.now() };

export const useAuthStore = create<AuthState>((set) => ({
  user: IS_DEMO ? demoUser : null,
  loading: IS_DEMO ? false : true,
  submitting: false,
  error: null,
  isDemo: IS_DEMO,

  init: async () => {
    if (IS_DEMO) {
      set({ user: demoUser, loading: false });
      return;
    }
    set({ loading: true });
    const refreshed = await refreshSession();
    if (!refreshed) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const user = await apiFetch<User>('/auth/me');
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    if (IS_DEMO) {
      set({ user: demoUser, error: null });
      return true;
    }
    set({ submitting: true, error: null });
    try {
      const data = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/login',
        { method: 'POST', body: { email, password }, retryOnUnauthorized: false },
      );
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      set({ user: data.user, submitting: false, error: null });
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
      const data = await apiFetch<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/register',
        { method: 'POST', body: { email, password, name }, retryOnUnauthorized: false },
      );
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      set({ user: data.user, submitting: false, error: null });
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
        await apiFetch('/auth/logout', { method: 'POST', retryOnUnauthorized: false });
      } catch {
        // ignoramos errores de logout remoto
      }
      setAccessToken(null);
      setRefreshToken(null);
      set({ user: null });
      return;
    }
    set({ user: demoUser });
  },
}));
