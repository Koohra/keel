import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));

export function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

export function readJson(path) {
  return JSON.parse(read(path));
}

const ignored = new Set(['.git', 'node_modules', 'results']);

export function listFiles(dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else files.push(relative(root, full).split(sep).join('/'));
  }
  return files;
}

export function headings(markdown) {
  return markdown.split('\n').filter((line) => /^#{1,6} /.test(line)).map((line) => line.trim());
}
