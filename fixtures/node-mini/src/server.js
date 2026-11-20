// Minimal HTTP routes for node-mini.
import { createServer } from 'node:http';
import { UserRepository, register } from './users.js';

export function createAppServer(repository = new UserRepository()) {
  return createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/users') {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const user = register(repository, JSON.parse(body));
        res.writeHead(201, { 'content-type': 'application/json' }).end(JSON.stringify(user));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: error.message }));
      }
    });
  });
}
