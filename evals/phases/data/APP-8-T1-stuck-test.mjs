
test('recusa e-mail inválido', () => {
  const repository = new UserRepository();
  assert.throws(() => register(repository, { name: 'Ana', email: 'ana@example.com' }), /e-mail inválido/);
});
