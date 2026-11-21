// Read-only git calls shared by the edges of keel-state.mjs, closing.mjs and check-feature.mjs.
import { spawnSync } from 'node:child_process';

// stdout of the command, or null when git fails.
export function gitOutput(root, args) {
  const run = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return run.status === 0 ? run.stdout : null;
}

// Paths from a command run with -z: no quoting of non-ASCII names, any character allowed.
export function gitPaths(root, args) {
  return (gitOutput(root, args) ?? '').split('\0').filter(Boolean);
}

// Full hash of a task commit reachable from HEAD, or null (missing, or left behind by a rewritten history).
export function commitInHistory(root, hash) {
  const full = gitOutput(root, ['rev-parse', '--verify', '-q', `${hash}^{commit}`])?.trim();
  if (!full) return null;
  return spawnSync('git', ['merge-base', '--is-ancestor', full, 'HEAD'], { cwd: root }).status === 0 ? full : null;
}
