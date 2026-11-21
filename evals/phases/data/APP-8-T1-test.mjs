
test('recusa e-mail inválido', () => {
  const repository = new UserRepository();
  assert.throws(() => register(repository, { name: 'Ana', email: 'ana-sem-arroba' }), /e-mail inválido/);
  assert.equal(repository.byEmail('ana-sem-arroba'), null);
});
