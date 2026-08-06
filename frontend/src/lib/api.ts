import { API_URL } from './config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// El access token se guarda en sessionStorage: sobrevive a las navegaciones
// dentro de la PWA (Astro static = page loads completos) pero se borra al
// cerrar la app, evitando refrescos innecesarios y sin persistirlo en disco.
const ACCESS_KEY = 'finanzas.accessToken';

// El refresh token se guarda en localStorage: en iOS la cookie httpOnly no es
// fiable cuando el backend está en otro sitio (vercel.app vs workers.dev),
// porque WebKit bloquea cookies third-party y la PWA no las retiene.
const REFRESH_KEY = 'finanzas.refreshToken';

export function getRefreshToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    // localStorage puede fallar (modo privado / cuota); no es crítico.
  }
}

function readAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

let accessToken: string | null = readAccessToken();

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(ACCESS_KEY, token);
    else sessionStorage.removeItem(ACCESS_KEY);
  } catch {
    // sessionStorage puede fallar (modo privado / cuota); no es crítico.
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  retryOnUnauthorized?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError('PUBLIC_API_URL no está configurada.', 0);
  }

  const { body, retryOnUnauthorized = true, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const result = await refreshSession();
    if (result === 'ok') {
      return apiFetch<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      message = data.error ?? data.message ?? message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Fetch con soporte de ETag / If-None-Match.
 * - Si el servidor responde 304 (nada cambió), devuelve { notModified: true }.
 * - Si responde 200, devuelve { notModified: false, data, etag }.
 * El etag se extrae del header de respuesta para que el caller lo persista.
 */
export type ETagResult<T> =
  | { notModified: true }
  | { notModified: false; data: T; etag: string | null };

export async function apiFetchWithETag<T>(
  path: string,
  options: RequestOptions & { etag?: string | null } = {},
): Promise<ETagResult<T>> {
  if (!API_URL) {
    throw new ApiError('PUBLIC_API_URL no está configurada.', 0);
  }

  const { body, etag, retryOnUnauthorized = true, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(etag ? { 'If-None-Match': etag } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const result = await refreshSession();
    if (result === 'ok') {
      return apiFetchWithETag<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (response.status === 304) {
    return { notModified: true };
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string; message?: string };
      message = data.error ?? data.message ?? message;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(message, response.status);
  }

  const data = (await response.json()) as T;
  return { notModified: false, data, etag: response.headers.get('ETag') };
}

export type RefreshResult = 'ok' | 'network' | 'invalid';

let refreshPromise: Promise<RefreshResult> | null = null;

/**
 * Refresca la sesión usando la cookie httpOnly del refresh token.
 * - 'ok': sesión refrescada, hay nuevo access token.
 * - 'network': no se pudo contactar al backend (offline / red inestable).
 *   El refresh token sigue siendo potencialmente válido; no se debe cerrar sesión.
 * - 'invalid': el backend rechazó el refresh token (401/400). Hay que loguear de nuevo.
 */
export async function refreshSession(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    if (!API_URL) return 'invalid' as RefreshResult;

    try {
      // Priorizamos el token guardado en localStorage (fiable en PWA iOS);
      // la cookie httpOnly queda como fallback (web mismo-sitio).
      const storedRefresh = getRefreshToken();
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: storedRefresh ? JSON.stringify({ refreshToken: storedRefresh }) : undefined,
      });
      if (!response.ok) {
        // 401/400 => token inválido o revocado. Limpiamos tokens.
        setAccessToken(null);
        setRefreshToken(null);
        return 'invalid';
      }
      const data = (await response.json()) as { accessToken: string; refreshToken?: string };
      setAccessToken(data.accessToken);
      // El backend rota el refresh token en cada refresh: persistir el nuevo.
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return 'ok';
    } catch {
      // Error de red: no sabemos si el token es válido. No cerramos sesión.
      return 'network';
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
