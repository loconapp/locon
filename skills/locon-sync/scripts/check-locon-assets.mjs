#!/usr/bin/env node
/**
 * Audits locon translation assets against the code and against each other.
 *
 * locon looks a string up by its value in the project language, so a typo in a
 * `<LText>` child is not a compile error — it silently renders the source
 * language to someone who cannot read it. Nothing else in a typical toolchain
 * catches that, or any of the other failure modes below.
 *
 *   1. every phrase passed to `l()` / `<LText>` resolves
 *   2. every locale has exactly the keys the source locale has
 *   3. placeholders match (with a documented exception for plurals)
 *   4. no unreachable duplicate values
 *   5. no orphaned keys nothing in the code asks for
 *   6. the code addresses strings by source phrase, not by key
 *   7. no stray characters from another script
 *
 * Usage:
 *   node check-locon-assets.mjs [--source de] [--assets src/i18n/assets]
 *                               [--src app,src] [--allow-keys a,b]
 *
 * Exits non-zero when anything is wrong, so it works as a CI step.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith('--')) args.set(arg.slice(2), process.argv[i + 1]);
}

const ROOT = resolve(args.get('root') ?? process.cwd());
const SOURCE_LOCALE = args.get('source') ?? 'en';
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const IMPLIES_COUNT = /_(zero|one|two)$/;

/** Keys the code may address directly, because their value is shadowed. */
const ALLOWED_KEYS = new Set((args.get('allow-keys') ?? '').split(',').filter(Boolean));

/** Finds the assets directory when not given one. */
function findAssets() {
  if (args.get('assets')) return resolve(ROOT, args.get('assets'));
  const guesses = ['src/i18n/assets', 'src/assets/i18n', 'assets/i18n', 'src/locales', 'locales'];
  const hit = guesses.find((g) => existsSync(join(ROOT, g, `${SOURCE_LOCALE}.json`)));
  if (!hit) {
    console.error(
      `Could not find the assets directory. Pass --assets <path> (looked for ${SOURCE_LOCALE}.json in: ${guesses.join(', ')})`,
    );
    process.exit(2);
  }
  return join(ROOT, hit);
}

const ASSET_DIR = findAssets();
const SOURCE_DIRS = (args.get('src') ?? 'app,src').split(',').filter(Boolean);

const problems = [];
const note = (message) => problems.push(message);

// ── assets ────────────────────────────────────────────────────────────
const locales = readdirSync(ASSET_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));

const assets = Object.fromEntries(
  locales.map((locale) => [locale, JSON.parse(readFileSync(join(ASSET_DIR, `${locale}.json`), 'utf8'))]),
);

const source = assets[SOURCE_LOCALE];
if (!source) {
  console.error(`Source locale "${SOURCE_LOCALE}.json" not found in ${ASSET_DIR}`);
  process.exit(2);
}

const sourceKeys = Object.keys(source);
const valueToKey = new Map();
const shadowed = [];
for (const key of sourceKeys) {
  const value = source[key];
  if (valueToKey.has(value)) shadowed.push([value, valueToKey.get(value), key]);
  else valueToKey.set(value, key);
}

// ── source files ──────────────────────────────────────────────────────
function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    if (entry === 'node_modules' || entry.startsWith('.')) return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

const files = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir)));

/** JSX collapses newlines and indentation in text children into single spaces. */
const collapse = (text) => text.replace(/\s+/g, ' ').trim();

const used = [];
/** Every string literal, for usage detection only (arrays, consts, …). */
const literals = new Set();

for (const file of files) {
  const code = readFileSync(file, 'utf8');

  for (const match of code.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    literals.add(match[1].replace(/\\'/g, "'"));
  }
  for (const match of code.matchAll(/\bl\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    used.push({ phrase: match[1].replace(/\\'/g, "'"), file });
  }
  for (const match of code.matchAll(/<LText\b[^>]*>([^<>{}]+)<\/LText>/g)) {
    used.push({ phrase: collapse(match[1]), file });
  }
}

const resolvedKeys = new Set();

for (const { phrase, file } of used) {
  if (!phrase) continue;
  const rel = file.replace(`${ROOT}/`, '');
  const isKey = phrase in source;
  const isValue = valueToKey.has(phrase);
  const base = phrase.replace(PLURAL_SUFFIX, '');
  const isPluralBase = sourceKeys.some((key) => key.replace(PLURAL_SUFFIX, '') === base && key !== base);

  if (!isKey && !isValue && !isPluralBase) {
    note(`unresolved phrase in ${rel}: "${phrase}"`);
  }
  if (isValue) resolvedKeys.add(valueToKey.get(phrase));
  if (isKey && !isValue && !ALLOWED_KEYS.has(phrase)) {
    note(`key used instead of source phrase in ${rel}: ${phrase} — write l('${source[phrase]}')`);
  }
}

// A shadowed duplicate is a bug only when nothing addresses it by key.
for (const [value, first, second] of shadowed) {
  if (!literals.has(second)) {
    note(`unreachable duplicate: "${value}" is both ${first} and ${second} — only the first resolves`);
  }
}

// ── locale parity ─────────────────────────────────────────────────────
const placeholders = (value) => new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

for (const locale of locales) {
  if (locale === SOURCE_LOCALE) continue;
  const target = assets[locale];

  const missing = sourceKeys.filter((key) => !(key in target));
  const unknown = Object.keys(target).filter(
    (key) =>
      !(key in source) &&
      !(PLURAL_SUFFIX.test(key) && sourceKeys.some((k) => k.replace(PLURAL_SUFFIX, '') === key.replace(PLURAL_SUFFIX, ''))),
  );

  if (missing.length) {
    note(`${locale}.json missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}`);
  }
  if (unknown.length) note(`${locale}.json has unknown keys: ${unknown.slice(0, 5).join(', ')}`);

  for (const key of Object.keys(target)) {
    const sourceKey = key in source ? key : key.replace(PLURAL_SUFFIX, '_other');
    if (!(sourceKey in source)) continue;

    const want = placeholders(source[sourceKey]);
    const got = placeholders(target[key]);
    const introduced = [...got].filter((p) => !want.has(p));
    const dropped = [...want].filter((p) => !got.has(p));

    if (introduced.length) note(`${locale}.json unknown placeholder in ${key}: {${introduced.join('}, {')}}`);
    // A plural category that already states the number may drop {count}:
    // Arabic 'يوم واحد' means "one day"; adding the digit reads as "1 one day".
    if (dropped.length && !(dropped.length === 1 && dropped[0] === 'count' && IMPLIES_COUNT.test(key))) {
      note(`${locale}.json missing placeholder in ${key}: {${dropped.join('}, {')}}`);
    }
  }
}

// ── script sanity ─────────────────────────────────────────────────────
const FOREIGN_SCRIPTS = [
  { name: 'CJK', pattern: /[぀-ヿ一-鿿가-힯]/, allowed: ['ja', 'ko', 'zh', 'zh-Hans', 'zh-Hant'] },
  { name: 'Cyrillic', pattern: /[Ѐ-ӿ]/, allowed: ['ru', 'uk', 'be', 'bg', 'sr', 'mk', 'kk'] },
  { name: 'Arabic', pattern: /[؀-ۿ]/, allowed: ['ar', 'fa', 'ur', 'ps', 'ckb'] },
  { name: 'Hebrew', pattern: /[֐-׿]/, allowed: ['he', 'yi'] },
  { name: 'Devanagari', pattern: /[ऀ-ॿ]/, allowed: ['hi', 'mr', 'ne'] },
  { name: 'Thai', pattern: /[฀-๿]/, allowed: ['th'] },
  { name: 'Greek', pattern: /[Ͱ-Ͽ]/, allowed: ['el'] },
];

for (const locale of locales) {
  for (const { name, pattern, allowed } of FOREIGN_SCRIPTS) {
    if (allowed.includes(locale)) continue;
    for (const [key, value] of Object.entries(assets[locale])) {
      if (pattern.test(value)) note(`${locale}.json contains ${name} characters in ${key}: "${value}"`);
    }
  }
}

// ── orphans ───────────────────────────────────────────────────────────
const usedPhrases = new Set([...used.map((u) => u.phrase), ...resolvedKeys]);

const pluralFamilyUsed = (key) => {
  const base = key.replace(PLURAL_SUFFIX, '');
  if (base === key) return false;
  return sourceKeys.some(
    (sibling) =>
      sibling.replace(PLURAL_SUFFIX, '') === base &&
      (usedPhrases.has(sibling) || usedPhrases.has(source[sibling]) || literals.has(source[sibling])),
  );
};

const orphans = files.length
  ? sourceKeys.filter(
      (key) =>
        !usedPhrases.has(key) &&
        !usedPhrases.has(source[key]) &&
        !literals.has(source[key]) &&
        !pluralFamilyUsed(key),
    )
  : [];

// ── report ────────────────────────────────────────────────────────────
console.log(`source:  ${SOURCE_LOCALE}.json (${sourceKeys.length} keys)`);
console.log(`locales: ${locales.join(', ')}`);
console.log(`code:    ${files.length} files, ${usedPhrases.size} distinct phrases`);

if (orphans.length) {
  console.log(`\norphaned keys (${orphans.length}) — nothing in the code asks for these:`);
  for (const key of orphans) console.log(`  ${key}  =  "${source[key]}"`);
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.log(`  ✗ ${problem}`);
  process.exit(1);
}

console.log('\n✓ assets and code agree');
