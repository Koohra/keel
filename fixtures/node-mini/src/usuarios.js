// Cadastro de usuários em memória.
export class RepositorioUsuarios {
  constructor() {
    this.usuarios = [];
  }

  salvar(usuario) {
    this.usuarios.push(usuario);
    return usuario;
  }

  porEmail(email) {
    return this.usuarios.find((u) => u.email === email) ?? null;
  }
}

export function cadastrar(repositorio, { nome, email }) {
  if (!nome) throw new Error('nome obrigatório');
  return repositorio.salvar({ nome, email, criadoEm: new Date().toISOString() });
}
