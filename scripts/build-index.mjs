#!/usr/bin/env node
// Scanne les dossiers de modèles et génère projects.js, lu par index.html.
// Usage : node scripts/build-index.mjs
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, basename, extname, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_URL = 'https://github.com/FeralDrak/ai-generated-apps';
const SKIP_DIRS = new Set(['node_modules', 'scripts', 'audio-cut-analysis', 'src', 'build', 'dist']);

// Nom lisible + famille pour chaque dossier. Un dossier absent d'ici est deviné.
const MODELS = {
  'claude37sonnet': ['Claude 3.7 Sonnet', 'claude'],
  'claude45opus': ['Claude Opus 4.5', 'claude'],
  'claude-46-opus': ['Claude Opus 4.6', 'claude'],
  'claude-47-opus': ['Claude Opus 4.7', 'claude'],
  'claude-48-opus': ['Claude Opus 4.8', 'claude'],
  'claude-48-opus-max': ['Claude Opus 4.8 · max', 'claude'],
  'claude-opus-5-extra': ['Claude Opus 5 · extra', 'claude'],
  'claude-opus-5-max': ['Claude Opus 5 · max', 'claude'],
  'claude-opus-55-extra': ['Claude Opus 5.5 · extra', 'claude'],
  'claude-sonnet-5-extra': ['Claude Sonnet 5 · extra', 'claude'],
  'claude-fable-5-extra': ['Claude Fable 5 · extra', 'claude'],
  'claude-fable-5-max': ['Claude Fable 5 · max', 'claude'],
  'gpt-41': ['GPT-4.1', 'openai'],
  'gpt-41-mini': ['GPT-4.1 mini', 'openai'],
  'gpt-41-nano': ['GPT-4.1 nano', 'openai'],
  'gpt-5': ['GPT-5', 'openai'],
  'gpt-5-nano': ['GPT-5 nano', 'openai'],
  'gpt-51': ['GPT-5.1', 'openai'],
  'gpt-54-xhigh': ['GPT-5.4 · xhigh', 'openai'],
  'gpt-55': ['GPT-5.5', 'openai'],
  'gpt-55-with-goal': ['GPT-5.5 · avec objectif', 'openai'],
  'gpt-56-sol-extra': ['GPT-5.6 Sol · extra', 'openai'],
  'gpt-56-sol-ultra': ['GPT-5.6 Sol · ultra', 'openai'],
  'gpt-6-ultra': ['GPT-6 · ultra', 'openai'],
  'gpt-oss-120b': ['GPT-OSS 120B', 'openai'],
  'codex-51-max': ['GPT-5.1 Codex Max', 'openai'],
  'codex53': ['GPT-5.3 Codex', 'openai'],
  'codex53-new': ['GPT-5.3 Codex · v2', 'openai'],
  'gemini-25-pro': ['Gemini 2.5 Pro', 'google'],
  'gemini3-pro': ['Gemini 3 Pro', 'google'],
  'gemini3-flash-preview': ['Gemini 3 Flash Preview', 'google'],
  'gemini-31-pro': ['Gemini 3.1 Pro', 'google'],
  'gemini-36-flash': ['Gemini 3.6 Flash', 'google'],
  'gemma-4-e4b': ['Gemma 4 E4B', 'google'],
  'grok-35': ['Grok 3.5', 'xai'],
  'grok-420': ['Grok 4.20', 'xai'],
  'grok-45': ['Grok 4.5', 'xai'],
  'grok-46': ['Grok 4.6', 'xai'],
  'grok-code-fast1': ['Grok Code Fast 1', 'xai'],
  'deepseek-r1-0528': ['DeepSeek R1 0528', 'deepseek'],
  'deepseek-v3-2': ['DeepSeek V3.2', 'deepseek'],
  'deepseek-v32-speciale': ['DeepSeek V3.2 Speciale', 'deepseek'],
  'qwen-35-9b': ['Qwen 3.5 9B', 'qwen'],
  'qwen-35-flash': ['Qwen 3.5 Flash', 'qwen'],
  'qwen-36-35b-a3b': ['Qwen 3.6 35B-A3B', 'qwen'],
  'qwen-38-2400b-a95b': ['Qwen 3.8 2400B-A95B', 'qwen'],
  'glm-4-7': ['GLM 4.7', 'zhipu'],
  'glm-52': ['GLM 5.2', 'zhipu'],
  'kimi-k3': ['Kimi K3', 'moonshot'],
};

function guessModel(dir) {
  const family = ['claude', 'gpt', 'codex', 'gemini', 'gemma', 'grok', 'deepseek', 'qwen', 'glm', 'kimi']
    .find((f) => dir.startsWith(f));
  const fam = { gpt: 'openai', codex: 'openai', gemini: 'google', gemma: 'google', grok: 'xai', glm: 'zhipu', kimi: 'moonshot' }[family] || family || 'other';
  const name = dir.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  return [name, fam];
}

// Type de projet déduit du chemin (premier motif qui matche). Le titre peut corriger.
const TYPES = [
  [/pachinko/, 'pachinko'],
  [/platform-shooter/, 'platformer'],
  [/idle/, 'idle'],
  [/city-builder/, 'city'],
  [/solar|solaire/, 'solar'],
  [/genetic-garden|perlin|fluid/, 'simulation'],
  [/weather|meteo/, 'weather'],
  [/landing-page/, 'landing'],
  [/animator/, 'tool'],
  [/loto|wheel/, 'luck'],
  [/wolf|loup|licorne|\.svg$/, 'svg'],
  [/learning|javascript_|architecture|solid|complexity|distributed|listes|messages|php|scaleway/, 'learning'],
];

function guessType(path, title) {
  if (/weather/i.test(title)) return 'weather';
  for (const [re, t] of TYPES) if (re.test(path)) return t;
  for (const [re, t] of TYPES) if (re.test(title.toLowerCase())) return t;
  return 'other';
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(html|svg)$/i.test(name)) out.push(full);
  }
  return out;
}

function gitAddedDate(rel) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%as', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    return out.split('\n').pop() || null;
  } catch { return null; }
}

function titleOf(file) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/<title>([^<]*)<\/title>/i) || src.match(/aria-label="([^"]+)"/i);
  return m ? m[1].replace(/&amp;/g, '&').trim() : '';
}

const projects = [];
for (const modelDir of readdirSync(ROOT)) {
  const full = join(ROOT, modelDir);
  if (modelDir.startsWith('.') || SKIP_DIRS.has(modelDir) || !statSync(full).isDirectory()) continue;
  const [modelName, family] = MODELS[modelDir] || guessModel(modelDir);

  for (const file of walk(full)) {
    const rel = relative(ROOT, file).split('\\').join('/');
    let title = titleOf(file);
    let url = rel;
    let playable = true;

    // Projets Create React App : public/index.html n'est qu'un squelette, pas jouable sans build.
    const isCra = rel.endsWith('/public/index.html') && existsSync(join(dirname(file), '..', 'package.json'));
    if (isCra) {
      const hasBuild = existsSync(join(dirname(file), '..', 'build', 'index.html'));
      const projDir = rel.replace(/\/public\/index\.html$/, '');
      if (hasBuild) url = projDir + '/build/index.html';
      else { url = `${REPO_URL}/tree/main/${projDir}`; playable = false; }
      if (!title || title === 'React App') title = '';
    }

    // Nom de projet : dossier du projet si le fichier s'appelle index.html, sinon nom du fichier.
    const parts = rel.split('/');
    const fileBase = basename(rel, extname(rel));
    let slug = fileBase;
    if (isCra) slug = parts[parts.length - 3];
    else if (/^index\d*$/.test(fileBase) && parts.length > 2) slug = parts[parts.length - 2] + (fileBase === 'index' ? '' : ' ' + fileBase.replace('index', '#'));
    if (!title) title = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    projects.push({
      model: modelDir,
      modelName,
      family,
      type: guessType(rel.toLowerCase(), title),
      title,
      slug,
      url,
      source: rel,
      playable,
      react: isCra,
      date: gitAddedDate(rel) || statSync(file).mtime.toISOString().slice(0, 10),
    });
  }
}

projects.sort((a, b) => a.model.localeCompare(b.model) || a.slug.localeCompare(b.slug));
const header = '// Fichier généré par scripts/build-index.mjs — ne pas modifier à la main.\n';
writeFileSync(join(ROOT, 'projects.js'), header + 'window.PROJECTS = ' + JSON.stringify(projects, null, 1) + ';\n');
console.log(`${projects.length} projets, ${new Set(projects.map((p) => p.model)).size} modèles → projects.js`);
