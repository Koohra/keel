
test('recusa e-mail duplicado', () => {
  const repository = new UserRepository();
  register(repository, { name: 'Ana', email: 'ana@example.com' });
  assert.throws(() => register(repository, { name: 'Ana 2', email: 'ana@example.com' }), /e-mail já cadastrado/);
});
