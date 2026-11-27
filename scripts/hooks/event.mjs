// Normalizes a hook event from Claude Code or Codex: the project root, the files an edit touches
// and the shell command. The rules (checkEdit, checkCommand, checkGitCommit) stay agent-agnostic.
// Codex sends file edits as apply_patch with the patch in tool_input.command and has no CLAUDE_PROJECT_DIR.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const PATCH_LINE = /^\*\*\* (Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/;

// Files a Codex patch touches, in order. A rename lists the source (update) and the destination (move).
export function patchFiles(text) {
  const files = [];
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const match = PATCH_LINE.exec(line);
    if (!match) continue;
    if (match[3]) files.push({ path: match[3].trim(), change: 'move' });
    else files.push({ path: match[2].trim(), change: match[1].toLowerCase() });
  }
  return files;
}

// CLAUDE_PROJECT_DIR, else the closest folder above the cwd with .git (a folder, or a file in a worktree), else the cwd.
export function projectRoot(event, env = process.env) {
  if (env.CLAUDE_PROJECT_DIR) return env.CLAUDE_PROJECT_DIR;
  if (!event.cwd) return null;
  const cwd = resolve(event.cwd);
  for (let dir = cwd; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return cwd;
  }
}

// Absolute paths of the files the tool call edits: file_path or notebook_path (Claude Code),
// or every file in an apply_patch, including one sent through the shell. Relative paths come from the cwd.
export function editTargets(event) {
  const input = event.tool_input ?? {};
  const base = event.cwd ?? process.cwd();
  const single = input.file_path ?? input.notebook_path;
  const files = single ? [{ path: single, change: 'update' }] : patchFiles(input.command);
  return files.map((file) => ({ ...file, path: resolve(base, file.path) }));
}

export function shellCommand(event) {
  return event.tool_name === 'Bash' ? event.tool_input?.command ?? '' : null;
}
