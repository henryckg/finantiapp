import { describe, it, expect } from 'vitest';
import { signJWT, verifyJWT, hashPassword, verifyPassword } from './jwt';

describe('jwt', () => {
  const secret = 'test-secret';

  it('signs and verifies a token', async () => {
    const token = await signJWT({ sub: 'user-1' }, secret, 60);
    const payload = await verifyJWT(token, secret);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('user-1');
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signJWT({ sub: 'user-1' }, secret, 60);
    const payload = await verifyJWT(token, 'other-secret');
    expect(payload).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signJWT({ sub: 'user-1' }, secret, -1);
    const payload = await verifyJWT(token, secret);
    expect(payload).toBeNull();
  });
});

describe('password hashing', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('myPassword123');
    expect(hash).not.toBe('myPassword123');
    expect(await verifyPassword('myPassword123', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correctPassword');
    expect(await verifyPassword('wrongPassword', hash)).toBe(false);
  });
});
