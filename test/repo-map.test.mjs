import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { root } from './helpers.mjs';
import { definitions, repoMap } from '../scripts/repo-map.mjs';

const script = join(root, 'scripts', 'repo-map.mjs');

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'keel-repomap-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return dir;
}

function withProject(files, fn) {
  const dir = project(files);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('extracts definitions with the line in each language', () => {
  const cases = {
    'a.ts': ['import x from "y";', 'export class Conta {', '  async sacar(valor: number): Promise<void> {', '    if (valor) {', '  }', '}', 'export function abrir(id) {', 'export interface Repo {', 'const interno = 1;'],
    'b.py': ['import os', 'class Pedido:', '    def total(self, itens):', 'async def enviar(p):'],
    'c.go': ['package main', 'func (s *Servidor) Iniciar(porta int) error {', 'type Servidor struct {', 'func main() {'],
    'D.cs': ['using System;', 'public sealed class Fatura', '{', '    public decimal Calcular(int dias)', '    {', '        return 0;', '    }'],
    'E.java': ['package app;', 'public class Cliente {', '    public String nome(int id) {', '        for (int i = 0; i < 1; i++) {'],
    'F.kt': ['package app', 'data class Item(val id: Int)', 'fun somar(a: Int, b: Int): Int = a + b'],
  };
  const expected = {
    'a.ts': [2, 3, 7, 8],
    'b.py': [2, 3, 4],
    'c.go': [2, 3, 4],
    'D.cs': [2, 4],
    'E.java': [2, 3],
    'F.kt': [2, 3],
  };
  for (const [file, lines] of Object.entries(cases)) {
    const defs = definitions(file, lines.join('\n'));
    assert.deepEqual(defs.map((d) => d.line), expected[file], file);
    assert.equal(defs[0].text, lines[defs[0].line - 1].trim(), file);
  }
  assert.deepEqual(definitions('a.ts', cases['a.ts'].join('\n')).map((d) => d.name), ['Conta', 'sacar', 'abrir', 'Repo']);
  assert.deepEqual(definitions('notas.md', '# class X'), []);
});

test('a file cited by others comes before one nobody cites', () => {
  withProject({
    'src/sozinho.js': 'export function isolado() {}\n',
    'src/conta.js': 'export class Conta {}\n',
    'src/a.js': 'import { Conta } from "./conta.js";\nexport function a() { return new Conta(); }\n',
    'src/b.js': 'import { Conta } from "./conta.js";\nexport function b() { return Conta; }\n',
  }, (dir) => {
    const map = repoMap(dir, { budget: 1000 });
    assert.ok(map.indexOf('src/conta.js') < map.indexOf('src/sozinho.js'), map);
    assert.match(map, /^src\/conta\.js$\n^ {2}1: export class Conta \{\}$/m);
  });
});

test('the map fits the budget and says how many files were left out', () => {
  const files = {};
  for (let i = 0; i < 40; i += 1) files[`src/m${i}.js`] = `export function funcao${i}(parametroComprido, outroParametro) {}\n`;
  withProject(files, (dir) => {
    const map = repoMap(dir, { budget: 120 });
    assert.ok(Math.ceil(map.length / 4) <= 120, `${map.length} characters`);
    assert.match(map, /^… \d+ files outside the budget of 120 tokens$/m);
  });
});

test('ignores node_modules, .git and build folders; the focus pulls files up', () => {
  withProject({
    'node_modules/lib/index.js': 'export function lib() {}\n',
    '.git/hooks/x.js': 'function hook() {}\n',
    'dist/app.js': 'function compiled() {}\n',
    'src/billing.js': 'export function charge() {}\n',
    'src/login.js': 'export function signIn() {}\n',
  }, (dir) => {
    const map = repoMap(dir, { budget: 1000 });
    assert.doesNotMatch(map, /node_modules|\.git|dist\//);
    const focused = repoMap(dir, { budget: 1000, focus: ['login'] });
    assert.ok(focused.indexOf('src/login.js') < focused.indexOf('src/billing.js'), focused);
  });
  withProject({ 'README.md': '# nothing\n' }, (dir) => {
    assert.match(repoMap(dir, { budget: 100 }), /no definitions found/);
  });
});

test('a large central file goes in cut, it does not drop out', () => {
  const files = { 'src/servico.js': Array.from({ length: 80 }, (_, i) => `export function operacao${i}(a, b) {}`).join('\n') };
  for (let i = 0; i < 5; i += 1) files[`src/uso${i}.js`] = `import { operacao1 } from './servico.js';\nexport function uso${i}() { return operacao1(); }\n`;
  withProject(files, (dir) => {
    const map = repoMap(dir, { budget: 300 });
    assert.ok(Math.ceil(map.length / 4) <= 300, `${map.length} characters`);
    assert.match(map, /^src\/servico\.js$\n^ {2}1: export function operacao0/m);
    assert.match(map, /^ {2}… \+\d+ definitions$/m);
  });
});

test('a budget below the minimum is refused', () => {
  withProject({ 'a.js': 'export function a() {}\n' }, (dir) => {
    assert.throws(() => repoMap(dir, { budget: 5 }), /minimum/);
  });
});

test('in git, paths with accents go into the map', () => {
  withProject({ 'src/cobrança.js': 'export function cobrar() {}\n' }, (dir) => {
    const git = spawnSync('git', ['init', '-q'], { cwd: dir });
    if (git.status !== 0) return;
    assert.match(repoMap(dir, { budget: 200 }), /^src\/cobrança\.js$/m);
  });
});

test('CLI prints the map of the current directory', () => {
  const result = spawnSync(process.execPath, [script, '--budget', '800', '--focus', 'state'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^scripts\/keel-state\.mjs$/m);
  assert.doesNotMatch(result.stdout, /\\/);
  const bad = spawnSync(process.execPath, [script, '--budget', 'lots'], { cwd: root, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /--budget/);
  const spaced = spawnSync(process.execPath, [script, '--focus', 'state', 'scripts', 'test'], { cwd: root, encoding: 'utf8' });
  assert.equal(spaced.status, 1);
  assert.match(spaced.stderr, /comma/);
  const missing = spawnSync(process.execPath, [script, 'does-not-exist'], { cwd: root, encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /does not exist/);
});
