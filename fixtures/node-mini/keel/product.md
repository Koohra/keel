# node-mini

Projeto mínimo usado pelos casos de eval do Keel.

## Visão
Serviço HTTP de cadastro de usuários para um clube de leitura. Usuários se cadastram com nome e e-mail.

## Glossário
- Usuário: pessoa cadastrada no clube, identificada pelo e-mail.

## Engineering principles
1. Regra de negócio fica em `src/users.js`, não no handler HTTP. [review]
2. Erros de validação respondem 400 com `{ "error": "<mensagem>" }`. [review]

### Checks
Tests: `npm test`
