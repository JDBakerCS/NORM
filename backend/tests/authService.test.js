import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserIdFromPayload, hashPassword, verifyPassword } from '../services/authService.js';

test('password hashing never stores plaintext and verifies correctly', async () => {
  const password = 'demo-password-123';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('JWT payload user IDs must be positive safe integers', () => {
  assert.equal(getUserIdFromPayload({ sub: '42' }), 42);
  assert.equal(getUserIdFromPayload({ sub: '0' }), null);
  assert.equal(getUserIdFromPayload({ sub: '-1' }), null);
  assert.equal(getUserIdFromPayload({ sub: 'not-a-number' }), null);
  assert.equal(getUserIdFromPayload({}), null);
});
