import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RepositorioUsuarios, cadastrar } from '../src/usuarios.js';

test('cadastra usuário com nome', () => {
  const repositorio = new RepositorioUsuarios();
  const usuario = cadastrar(repositorio, { nome: 'Ana', email: 'ana@exemplo.com' });
  assert.equal(repositorio.porEmail('ana@exemplo.com'), usuario);
});

test('recusa cadastro sem nome', () => {
  assert.throws(() => cadastrar(new RepositorioUsuarios(), { email: 'x@exemplo.com' }), /nome obrigatório/);
});
