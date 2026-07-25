export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: number,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const data = `${enc(header)}.${enc(fullPayload)}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${sig}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const sigBytes = Uint8Array.from(
    atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) return null;
  const payload = JSON.parse(
    atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
  ) as Record<string, unknown>;
  const exp = payload.exp as number;
  if (exp && Math.floor(Date.now() / 1000) > exp) return null;
  return payload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${salt}:${password}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${salt}:${password}`));
  return `${salt}:${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, expected] = hash.split(':');
  if (!salt || !expected) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${salt}:${password}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${salt}:${password}`));
  const actual = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return actual === expected;
}
