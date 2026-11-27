// Runs Keel inside the Codex CLI, with the plugin installed from this repo's Codex marketplace
// into a temporary CODEX_HOME (the user's ~/.codex is never touched).
// Usage: node evals/codex/run.mjs install
//   install: adds the marketplace, installs keel and keel-docs and checks that Codex shows the
//   skills to the model (`codex debug prompt-input`). Needs no login; CI runs it.
// The Codex CLI comes from PATH (`codex`), or from KEEL_CODEX (path to the codex executable).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const requiredSkills = ['keel:story', 'keel:setup', 'keel-docs:write'];

export function missingSkills(promptInput) {
  return requiredSkills.filter((skill) => !promptInput.includes(`${skill}:`));
}

// The npm Codex CLI is a .cmd shim on Windows, which only runs through a shell.
function codex(args, { codexHome, cwd } = {}) {
  const command = process.env.KEEL_CODEX || 'codex';
  const windows = process.platform === 'win32';
  const quoted = windows ? args.map((arg) => `"${arg}"`) : args;
  const result = spawnSync(windows ? `"${command}"` : command, quoted, {
    cwd,
    encoding: 'utf8',
    shell: windows,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CODEX_HOME: codexHome },
  });
  if (result.error) throw new Error(`codex did not run (${result.error.message}): install it with npm install --global @openai/codex`);
  return result;
}

function must(result, step) {
  if (result.status !== 0) throw new Error(`${step} failed (exit ${result.status}):\n${result.stderr}${result.stdout}`);
  return result.stdout;
}

function installPlugins(codexHome) {
  mkdirSync(codexHome, { recursive: true });
  must(codex(['plugin', 'marketplace', 'add', repo], { codexHome }), 'codex plugin marketplace add');
  for (const plugin of ['keel@keel', 'keel-docs@keel']) must(codex(['plugin', 'add', plugin], { codexHome }), `codex plugin add ${plugin}`);
}

function install() {
  const scratch = mkdtempSync(join(tmpdir(), 'keel-codex-'));
  try {
    const codexHome = join(scratch, 'codex-home');
    const workspace = join(scratch, 'workspace');
    must(spawnSync('git', ['init', '-q', workspace], { encoding: 'utf8' }), 'git init');
    installPlugins(codexHome);
    const promptInput = must(codex(['debug', 'prompt-input', 'oi'], { codexHome, cwd: workspace }), 'codex debug prompt-input');
    const missing = missingSkills(promptInput);
    if (missing.length) throw new Error(`Codex does not show these skills to the model: ${missing.join(', ')}`);
    console.log(`ok: Codex installed keel and keel-docs and shows ${requiredSkills.join(', ')}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const commands = { install };
  const run = commands[process.argv[2]];
  if (!run) {
    console.error('usage: node evals/codex/run.mjs install');
    process.exit(2);
  }
  try {
    run();
  } catch (error) {
    console.error(`fail: ${error.message}`);
    process.exit(1);
  }
}
