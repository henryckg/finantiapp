import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../index';
import { signJWT, verifyJWT, hashPassword, verifyPassword } from '../lib/jwt';

const app = new Hono<{ Bindings: Env }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();
  if (existing) return c.json({ error: 'Email ya registrado' }, 409);

  const id = crypto.randomUUID();
  const now = Date.now();
  const passwordHash = await hashPassword(password);

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, email, passwordHash, name ?? null, now)
    .run();

  const defaultCategories = [
    ['Alimentación', 'expense'], ['Transporte', 'expense'], ['Vivienda', 'expense'],
    ['Salud', 'expense'], ['Educación', 'expense'], ['Entretención', 'expense'],
    ['Ropa', 'expense'], ['Tecnología', 'expense'], ['Servicios', 'expense'],
    ['Deudas', 'expense'], ['Otros', 'expense'], ['Sueldo', 'income'],
    ['Freelance', 'income'], ['Inversiones', 'income'], ['Otros ingresos', 'income'],
  ];
  await c.env.DB.batch(
    defaultCategories.map(([categoryName, categoryType]) =>
      c.env.DB.prepare(
        'INSERT INTO categories (id, user_id, name, type, is_default, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      ).bind(crypto.randomUUID(), id, categoryName, categoryType, now),
    ),
  );

  const accessToken = await signJWT({ sub: id }, c.env.JWT_SECRET, 900);
  const refreshToken = await signJWT({ sub: id }, c.env.JWT_REFRESH_SECRET, 2592000);

  return c.json({ user: { id, email, name: name ?? null, createdAt: now }, accessToken, refreshToken }, 201);
});

app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const user = (await c.env.DB.prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first()) as { id: string; email: string; password_hash: string; name: string | null; created_at: number } | null;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Credenciales inválidas' }, 401);
  }

  const accessToken = await signJWT({ sub: user.id }, c.env.JWT_SECRET, 900);
  const refreshToken = await signJWT({ sub: user.id }, c.env.JWT_REFRESH_SECRET, 2592000);

  return c.json({
    user: { id: user.id, email: user.email, name: user.name, createdAt: user.created_at },
    accessToken,
    refreshToken,
  });
});

app.post('/logout', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'No autorizado' }, 401);
  const token = auth.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_REFRESH_SECRET);
  if (payload) {
    await c.env.SESSIONS.put(`revoked:${payload.sub}`, '1', { expirationTtl: 2592000 });
  }
  return c.json({ ok: true });
});

app.post('/refresh', async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>();
  if (!body.refreshToken) return c.json({ error: 'Token requerido' }, 400);
  const payload = await verifyJWT(body.refreshToken, c.env.JWT_REFRESH_SECRET);
  if (!payload) return c.json({ error: 'Token inválido' }, 401);

  const revoked = await c.env.SESSIONS.get(`revoked:${payload.sub}`);
  if (revoked) return c.json({ error: 'Sesión revocada' }, 401);

  const accessToken = await signJWT({ sub: payload.sub }, c.env.JWT_SECRET, 900);
  const refreshToken = await signJWT({ sub: payload.sub }, c.env.JWT_REFRESH_SECRET, 2592000);
  return c.json({ accessToken, refreshToken });
});

export const authRoutes = app;
