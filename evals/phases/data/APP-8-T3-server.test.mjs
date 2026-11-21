import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/server.js';
import { UserRepository } from '../src/users.js';

test('POST /users responde 201', async () => {
  const repository = new UserRepository();
  const server = createAppServer(repository).listen(0);
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/users`, { method: 'POST', body: JSON.stringify({ name: 'Ana', email: 'ana@example.com' }) });
  server.close();
  assert.equal(response.status, 201);
  assert.equal(repository.byEmail('ana@example.com').name, 'Ana');
});
