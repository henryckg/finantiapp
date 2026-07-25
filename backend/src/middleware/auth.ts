import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import type { Env } from '../index';

export function authMiddleware(c: any, next: any) {
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next);
}

export function getUserId(c: any): string {
  const payload = c.get('jwtPayload') as { sub: string };
  return payload.sub;
}
