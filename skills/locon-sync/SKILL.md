---
name: locon-sync
description: Synchronize locon translation assets across every language a project supports. Audit locale JSON against code and declared languages; verify key parity, placeholders, CLDR plurals, duplicate keys, and script integrity; generate safe locale files. Use when adding a language, adding or changing UI strings, fixing missing translations, or auditing any app that uses locon.
---

# Syncing locon translation assets

locon resolves a string by its **value in the project language**, not by a key:
`<LText>Guten Morgen</LText>` looks up that exact phrase. That makes the assets
unusually easy to write and unusually easy to break silently — a typo in a
phrase is not a compile error, it just renders the source language to someone
who does not read it.

This skill audits and fills the locale files so that never happens.

## 1. Read the project's setup first

Never assume paths. Find them:

- **Assets directory** — the per-locale JSON (often `src/i18n/assets/`).
- **Project language** — the `projectLocale` prop on `<Locon>`. Its file is the
  source of truth; every other file is derived from it.
- **Default language** — the `defaultLocale` prop, used when a key is missing.
- **Declared languages** — the list the app ships. Cross-check it against the
  files on disk in _both_ directions: a declared language with no file renders
  entirely in the source language.

Resolve the directory containing this `SKILL.md` as
`LOCON_SYNC_SKILL_DIR`. Never assume the current working directory contains the
skill. Then run the audit from the app's root and pass every declared locale:

```bash
node "$LOCON_SYNC_SKILL_DIR/scripts/check-locon-assets.mjs" \
  --source de \
  --locales de,en,fr
```

This scans static strings in JavaScript/TypeScript (single, double, or template
quotes), `lIn()` calls and `LText` children/`assetKey` props. It ignores calls
inside comments and string examples. Orphaned keys and plural categories that
currently fall back to `_other` are advisory because static analysis cannot
prove either is wrong. Enforce them in CI with `--strict-orphans` and
`--strict-plurals` when the project keeps both explicit.

Pass `--allow-keys key_a,key_b` only for deliberate direct-key disambiguation.
Pass `--allow-implicit-count ar:day_one,ar:day_two` only when those exact
translations state the number in words and therefore intentionally omit
`{count}`. Treat an unused allow-list entry as stale configuration.

## 2. The invariants

Every one of these has broken a real project.

**Key parity.** Every locale carries every key the source has.

**No duplicate source values.** Two keys with the same source phrase means only
the _first_ is reachable by value lookup. The second is dead weight translators
will fill in for nothing, and any difference between the two translations
silently never appears. Either merge them, or keep both and have the code
address the shadowed one by key (`assetKey`) — the one legitimate reason to
write a key in application code.

**Plural categories are CLDR names,** never a generic `_plural`: `_zero`,
`_one`, `_two`, `_few`, `_many`, `_other`, exactly what
`Intl.PluralRules.select()` returns. Languages do not have "a" plural — German
needs two forms, Polish and Russian three, Arabic up to six. **A target locale
may add categories the source language lacks**; that is correct, not an error.
`_other` is the mandatory catch-all, and also what English uses as its plural.

**Placeholders match exactly.** Allow a missing `{count}` only for an explicit
locale/key pair whose words state the exact number. Arabic `يوم واحد` and
Hebrew `נותרה דקה אחת` already mean "one day" / "one minute"; repeating the
digit reads as "1 one day". Never infer this from `_one`: Russian selects
`_one` for 21, so `day_one: "день"` would incorrectly render just "день".
A translation may never introduce a placeholder the source lacks.

**No foreign scripts.** Machine-assisted translation occasionally drops a
fragment of the wrong alphabet into a string — a CJK word inside Russian prose.
A native reviewer reads that as file corruption rather than a translation
error, and nothing else in the toolchain catches it.

**Brand names and endonyms are never translated.** Product names stay verbatim;
language names in a picker are always endonyms, because a row reading
"Turkish" is useless to the person who needs it.

## 3. Filling in a locale

Put the completed target values in a temporary flat JSON object, then generate
the locale with the bundled CLI so key order, grouping and parity are
guaranteed by construction:

```bash
python3 "$LOCON_SYNC_SKILL_DIR/scripts/write_locale.py" \
  --locale fr \
  --input /tmp/fr.json \
  --assets src/i18n/assets \
  --source de
```

For an intentional implicit number, add for example
`--allow-implicit-count day_one,day_two`. The writer validates before an atomic
replace, copies the source file's blank-line grouping, accepts target-specific
plural categories, and refuses unsafe locale names, duplicate JSON keys,
parity errors, or placeholder drift.

Translate **meaning, not words**. UI copy has length constraints, and a literal
rendering of a German compound will overflow a button in Finnish. Keep the
register of the source — if the app addresses the user informally, match that
per language convention (`du` / `tu` / `ты`).

## 4. What the code should look like

Confirm the code addresses strings by source phrase. Keys in application code
defeat the point of the library:

```tsx
l('E-Mail nicht verfügbar') // ✅
l('settings_mail_unavailable_title') // ❌ unless deliberately disambiguating
```

Two mechanical rules:

- **`l('…')`** for anything taking a string — props, `Alert.alert`, and the
  children of components that wrap text themselves. A `<Button>` rendering
  `<Text>{children}</Text>` must not receive `<LText>`, or you nest Text in Text.
- **`<LText>`** only where the code would otherwise render a bare `<Text>`.

When extracting phrases from source, remember **JSX collapses whitespace**: a
multi-line `<LText>` child becomes one space-joined string at runtime, so the
asset value must match the collapsed form.

## 5. Beyond the strings

Shipping a language is more than its JSON. Check whether the project needs:

- **Fonts for the new scripts.** Most Latin webfonts carry no Cyrillic, Greek,
  Arabic, Hebrew, Devanagari, Thai or CJK glyphs, and a loaded font missing a
  glyph renders a tofu box on Android rather than falling back. Registering a
  script's font _under the app's existing family names_ fixes every screen
  without touching a single StyleSheet. For CJK, loading nothing is often the
  right answer: those families are tens of megabytes, and an unregistered
  family name falls back to the platform's own system face.
- **Calendars and numerals.** `Intl` defaults Persian to the Jalali calendar
  and Arabic to Arabic-Indic digits. If the data model is Gregorian, say so:
  `intlLocale(code, { calendar: 'gregory', numbering: 'latn' })`. Otherwise a
  Persian document is headed with a month its own contents do not contain.
- **RTL.** `isRtlLocale()` tells you the direction; `applyRTL()` applies it and
  returns whether a restart is needed. Direction only takes effect after that
  restart, so prompt rather than flipping silently, and convert hardcoded
  `left`/`right` style props to `start`/`end`.
- **Store and native metadata.** In Expo, the `expo-localization` plugin's
  `supportedLocales` writes `CFBundleLocalizations` and `locales_config.xml`,
  which is what makes the stores list the languages and what gives Android 13+
  its per-app language picker. Translated permission strings go in `locales`.
- **Which languages the stores actually accept.** A bundled translation is
  always allowed, but a _store listing_ is not: the App Store and Google Play
  support overlapping-but-different sets. Ship what you like; just do not
  promise a store page you cannot publish.
