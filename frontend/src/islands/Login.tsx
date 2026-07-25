import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { IS_DEMO } from '../lib/config';
import { Button } from '../components/ui/Button';
import { FieldRow, Input } from '../components/ui/Field';

export default function Login() {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('Completa email y contraseña');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    const success = mode === 'register'
      ? await register(email.trim(), password, name.trim())
      : await login(email.trim(), password);
    if (success) {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-accent/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent size-6"
          >
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M21 7v5M21 7h-5" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold">Finanzas</h1>
        <p className="text-text-secondary mt-1 text-xs">
          {IS_DEMO ? 'Demo local — no necesitas cuenta' : 'Inicia sesión para continuar'}
        </p>
      </div>

      {IS_DEMO && (
        <div className="border-warning/30 bg-warning/10 rounded-md border p-3 text-center text-xs">
          Estás en modo demostración. Los datos se guardan localmente en tu navegador.
          <br />
          <button
            type="button"
            onClick={() => {
              window.location.href = '/dashboard';
            }}
            className="text-accent mt-2 font-medium underline-offset-2 hover:underline"
          >
            Entrar al dashboard →
          </button>
        </div>
      )}

      {!IS_DEMO && (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          {mode === 'register' && (
            <FieldRow label="Nombre">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
              />
            </FieldRow>
          )}

          <FieldRow label="Email" error={localError ?? undefined}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </FieldRow>

          <FieldRow label="Contraseña" error={error ?? undefined}>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </FieldRow>

          <Button type="submit" variant="primary" disabled={loading} className="mt-1 w-full">
            {loading ? 'Cargando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setLocalError(null);
            }}
            className="text-text-secondary hover:text-text-primary text-center text-xs transition-colors"
          >
            {mode === 'login'
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </form>
      )}
    </div>
  );
}
