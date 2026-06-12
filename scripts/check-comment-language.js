#!/usr/bin/env node
/**
 * Heuristic guard: flag code COMMENTS written in Spanish.
 *
 * Convention: all code comments must be in English (see CONTRIBUTING.md).
 *
 * This is a HEURISTIC, not a guarantee. It reliably catches obvious Spanish
 * (¿ ¡ ñ, or comments containing several Spanish function words such as
 * "el", "la", "que", "para", "según"...). It will NOT catch short Spanish
 * comments that happen to use no function words, and it may occasionally
 * miss accent-free Spanish. It is a tripwire to keep new Spanish comments
 * out, not a perfect language detector.
 *
 * It ONLY inspects comments — never string literals, JSX text, or the i18n
 * locale files (src/i18n/locales/*.json) — so Spanish *content* (the es
 * translations, user-facing copy) is never flagged.
 *
 * Usage:
 *   node scripts/check-comment-language.js [file ...]
 *   node scripts/check-comment-language.js          # scans all of src/
 * Exit code 1 if any likely-Spanish comment is found.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Spanish function words (accent-stripped, lowercase). A comment needs at
// least MIN_HITS distinct matches to be flagged — one stray word that also
// looks English (e.g. a variable name in prose) will not trip the guard.
const SPANISH_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al',
  'que', 'con', 'sin', 'por', 'para', 'pero', 'como', 'mas', 'segun',
  'este', 'esta', 'esto', 'estos', 'estas', 'ese', 'esa', 'eso', 'esos',
  'esas', 'cada', 'donde', 'cuando', 'porque', 'tambien', 'solo', 'hace',
  'hacer', 'son', 'estan', 'ser', 'estar', 'hay', 'asi', 'aqui', 'alli',
  'sus', 'mismo', 'misma', 'muy', 'entre', 'sobre', 'hasta', 'desde',
  'cual', 'cuales', 'cuantos', 'qué', 'cómo', 'funcion', 'aunque', 'cuyo',
  'segundo', 'siguiente', 'tiene', 'debe', 'puede', 'usuario', 'pantalla',
]);
const MIN_HITS = 2;
// These single characters are unambiguous Spanish and flag on their own.
const STRONG = /[ñÑ¿¡]/;

const stripAccents = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function isSpanish(text) {
  if (STRONG.test(text)) return true;
  const words = stripAccents(text.toLowerCase()).match(/[a-z]+/g) || [];
  const hits = new Set();
  for (const w of words) if (SPANISH_WORDS.has(w)) hits.add(w);
  return hits.size >= MIN_HITS;
}

/**
 * Extract comments from JS/CSS source as {line, text}, skipping string and
 * template literals so their contents are never inspected. Best-effort
 * single-pass scanner — good enough for a lint tripwire.
 */
function extractComments(src) {
  const out = [];
  let i = 0;
  let line = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '\n') { line++; i++; continue; }
    // String literals — skip entirely.
    if (c === '"' || c === "'" || c === '`') {
      const quote = c; i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') i++;
        else if (src[i] === '\n') line++;
        i++;
      }
      i++; continue;
    }
    // Line comment.
    if (c === '/' && next === '/') {
      let text = '';
      i += 2;
      while (i < n && src[i] !== '\n') { text += src[i]; i++; }
      out.push({ line, text });
      continue;
    }
    // Block comment (JS and CSS).
    if (c === '/' && next === '*') {
      const startLine = line;
      let text = '';
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        text += src[i]; i++;
      }
      i += 2;
      out.push({ line: startLine, text });
      continue;
    }
    i++;
  }
  return out;
}

function collectFiles(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'locales') continue;
      collectFiles(full, acc);
    } else if (/\.(js|jsx|css)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const args = process.argv.slice(2);
  let files;
  if (args.length) {
    files = args.filter((f) => /\.(js|jsx|css)$/.test(f) && fs.existsSync(f));
  } else {
    files = collectFiles(path.join(process.cwd(), 'src'), []);
  }

  const findings = [];
  for (const file of files) {
    // Never inspect the i18n locale JSON — but those are .json so already
    // excluded by extension. Guard anyway in case a path is passed.
    if (file.includes(path.join('i18n', 'locales'))) continue;
    let src;
    try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const { line, text } of extractComments(src)) {
      if (isSpanish(text)) {
        findings.push({ file, line, text: text.trim().slice(0, 80) });
      }
    }
  }

  if (findings.length) {
    console.error('\n✖ Likely Spanish comment(s) found. Comments must be in English.\n');
    for (const f of findings) {
      console.error(`  ${f.file}:${f.line}  // ${f.text}`);
    }
    console.error(
      `\n${findings.length} comment(s) flagged. This check is heuristic — ` +
      'if a flag is a false positive (e.g. a proper noun), rephrase the comment ' +
      'in English or adjust the wording. See CONTRIBUTING.md.\n'
    );
    process.exit(1);
  }
  console.log('✓ No Spanish comments detected.');
}

main();
