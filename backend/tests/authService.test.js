import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../services/authService.js';

test('password hashing never stores plaintext and verifies correctly', async () => {
  const password = 'demo-password-123';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

