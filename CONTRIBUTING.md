# Contributing

## Code comments must be written in English

All code comments — line comments (`//`), block comments (`/* */`), and
JSDoc — **must be written in English**. This keeps the codebase consistent
and readable for every contributor.

> **Scope:** this rule applies to **code comments only**. It does **not**
> apply to user-facing content or translations:
> - i18n locale files (`src/i18n/locales/en.json`, `es.json`) — the Spanish
>   translations there are **content** and must stay in Spanish.
> - User content (threads, etc.) and any string literals rendered to users.

### Heuristic check

A lightweight, dependency-free script flags comments that look like Spanish:

```bash
node scripts/check-comment-language.js          # scan all of src/
node scripts/check-comment-language.js <file>   # scan specific files
```

It inspects **only comments** (it skips string/template literals and the
i18n locale JSON), and flags a comment when it contains `¿`, `¡`, `ñ`, or
several Spanish function words (`el`, `la`, `que`, `para`, `según`, ...).

**This is a heuristic, not a guarantee.** It reliably catches obvious
Spanish but can miss short or accent-free Spanish, and may occasionally
flag a false positive (e.g. a comment that quotes a Spanish proper noun).
It is a tripwire to keep new Spanish comments out — not a perfect language
detector. If you hit a false positive, rephrase the comment in English.

### Enable the pre-commit hook

The check runs automatically on staged files via a shared git hook. Enable
it once per clone (no extra dependencies required):

```bash
git config core.hooksPath .githooks
```

The hook (`.githooks/pre-commit`) runs the script against staged
`.js` / `.jsx` / `.css` files and blocks the commit if a likely-Spanish
comment is found.
