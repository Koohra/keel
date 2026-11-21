// In-memory user registry.
export class UserRepository {
  constructor() {
    this.users = [];
  }

  save(user) {
    this.users.push(user);
    return user;
  }

  byEmail(email) {
    return this.users.find((u) => u.email === email) ?? null;
  }
}

export function register(repository, { name, email }) {
  if (!name) throw new Error('name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) throw new Error('e-mail inválido');
  if (repository.byEmail(email)) throw new Error('e-mail já cadastrado');
  return repository.save({ name, email, createdAt: new Date().toISOString() });
}
