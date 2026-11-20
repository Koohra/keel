// Rotas HTTP mínimas do node-mini.
import { createServer } from 'node:http';
import { RepositorioUsuarios, cadastrar } from './usuarios.js';

export function criarServidor(repositorio = new RepositorioUsuarios()) {
  return createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/usuarios') {
      res.writeHead(404).end();
      return;
    }
    let corpo = '';
    req.on('data', (parte) => { corpo += parte; });
    req.on('end', () => {
      try {
        const usuario = cadastrar(repositorio, JSON.parse(corpo));
        res.writeHead(201, { 'content-type': 'application/json' }).end(JSON.stringify(usuario));
      } catch (erro) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ erro: erro.message }));
      }
    });
  });
}
