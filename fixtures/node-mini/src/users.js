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
  return repository.save({ name, email, createdAt: new Date().toISOString() });
}
