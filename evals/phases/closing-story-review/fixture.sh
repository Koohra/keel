#!/usr/bin/env bash
# node-mini with a story commit that copies the e-mail check of src/users.js into src/invites.js with
# another error format, and adds an e-mail port that a "Quality goals" scenario justifies.
set -euo pipefail
plugin="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cp -R "$plugin/fixtures/node-mini/." .
cp "$plugin/evals/phases/data/APP-8-T2-users.js" src/users.js
cat >> keel/product.md <<'MD'

## Quality goals
- Q1 Troca de provedor de e-mail. Contexto: o clube troca de provedor de e-mail em 2027. Estímulo: trocar o provedor. Métrica: só um arquivo novo em `src/mail/`, sem mudar quem envia.
MD
git init -q -b feat/APP-11-convites
git config user.name Ana
git config user.email ana@example.com
git add -A
git commit -q -m "Base"
mkdir -p src/mail
cat > src/mail/sender.js <<'JS'
// E-mail port: who sends does not know the provider (keel/product.md#quality-goals Q1).
export const consoleTransport = { send: (to, text) => console.log(`[mail] ${to}: ${text}`) };
export const memoryTransport = (outbox = []) => ({ outbox, send: (to, text) => outbox.push({ to, text }) });

export function sendInvite(transport, email) {
  transport.send(email, 'Você foi convidado para o clube de leitura.');
}
JS
cat > src/invites.js <<'JS'
// Invitations sent by a member to a friend.
import { sendInvite } from './mail/sender.js';

export function invite(invites, email, transport) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) return { ok: false, message: 'email invalido' };
  invites.push({ email, sentAt: Date.now() });
  sendInvite(transport, email);
  return { ok: true };
}
JS
git add -A
git commit -q -m "APP-11 convites e boas-vindas"
