import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { IS_DEMO } from '../lib/config';

export default function RootRedirect() {
  const initAuth = useAuthStore((state) => state.init);
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  useEffect(() => {
    if (IS_DEMO) {
      window.location.replace('/dashboard');
      return;
    }
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (IS_DEMO || loading) return;
    window.location.replace(user ? '/dashboard' : '/login');
  }, [IS_DEMO, loading, user]);

  return null;
}
