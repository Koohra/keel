import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRepository, register } from '../src/users.js';

test('registers a user with a name', () => {
  const repository = new UserRepository();
  const user = register(repository, { name: 'Ana', email: 'ana@example.com' });
  assert.equal(repository.byEmail('ana@example.com'), user);
});

test('rejects registration without a name', () => {
  assert.throws(() => register(new UserRepository(), { email: 'x@example.com' }), /name is required/);
});
