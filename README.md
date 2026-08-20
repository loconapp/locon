## locon

[![npm version](https://img.shields.io/npm/v/locon.svg)](https://www.npmjs.com/package/locon)
[![GitHub tag](https://img.shields.io/github/v/tag/loconapp/locon?display_name=tag)](https://github.com/loconapp/locon/tags)
[![Release workflow](https://github.com/loconapp/locon/actions/workflows/release.yml/badge.svg)](https://github.com/loconapp/locon/actions/workflows/release.yml)

[Website](https://locon.dev) · [npm](https://www.npmjs.com/package/locon) · [GitHub](https://github.com/loconapp/locon)

`locon` is a small, typed i18n helper for React Native.  
It provides a context provider, a hook, and a simple text component to keep
your translations flat, explicit, and easy to use.

Basic usage: use `<LText>` instead of `<Text>`. Put plain text in your project language (or the default language) inside and it will be localized automatically.

```tsx
import { LText } from 'locon'

function Example() {
  return <LText>Hello</LText>
}
```

---

### Features

- **React Native–first**: tiny API, no global singletons
- **Expo-ready**: detects the device language through `expo-localization`, no native linking
- **Context provider** with pluggable assets (per-locale JSON)
- **Device language auto-detection** (optional)
- **`useLocon()` hook** for accessing translations and changing locale
- **`<LText>` component** as a drop-in localized `<Text>`
- **Interpolation and plurals** via `{token}` params and CLDR plural categories
- **Locale-scoped lookups** with `lIn()` / `createTranslator()` — render a PDF in one language while the UI is in another
- **RTL aware**: `isRTL` on the context, plus an explicit `applyRTL()` helper
- **Locale utilities** — `resolveLocale()`, `getSystemLanguage()` and `intlLocale()`, usable without a provider
- Fully typed TypeScript build (`dist/index.d.ts`)

---

### Installation

Use your package manager of choice:

| npm                 | yarn             | bun             |
| ------------------- | ---------------- | --------------- |
| `npm install locon` | `yarn add locon` | `bun add locon` |

```bash
npm install locon
# or
yarn add locon
# or
bun add locon
```

**Peer dependencies**

- `react >= 19.0.0`
- `react-native >= 0.70.0`
- **one** of the following, if you want native device-language detection:
  - `expo-localization >= 14.0.0` — for Expo apps
  - `react-native-localize 3.x` — for bare React Native apps

Both are optional. Without either, `locon` falls back to React Native's own
`NativeModules` and then to the `Intl` API, which is usually enough to get the
language right but ignores the user's ordered language preferences.

In a bare React Native app, install `react-native-localize` and run pods:

```bash
yarn add react-native-localize
cd ios && pod install
```

---

### Use with Expo

`locon` needs no native module of its own, so it works in the managed
workflow, in a dev client, and in Expo Go.

```bash
npx expo install expo-localization
```

That is the whole integration — detection picks `expo-localization` up
automatically when it is installed.

To make the languages you ship visible to the operating system and the stores,
declare them in `app.json`. This is what puts your app in the App Store's
"Languages" list and in Android 13+'s per-app language picker:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-localization",
        {
          "supportedLocales": {
            "ios": ["de", "en", "fr", "ar"],
            "android": ["de", "en", "fr", "ar"]
          },
          "supportsRTL": true,
          "allowDynamicLocaleChangesAndroid": true
        }
      ]
    ]
  }
}
```

Then run `npx expo prebuild` so the config lands in the native projects.

> The locales you list here are independent of the store listing languages
> Apple and Google support: shipping a bundled translation is always allowed,
> even for a language whose store page you cannot localize.

---

### Quick start

#### 1. Prepare your translation assets

`locon` expects flat key/value objects per locale:

```ts
// en.json
export default {
  hello: 'Hello',
  welcome_title: 'Welcome',
  change_language: 'Change language',
}

// de.json
export default {
  hello: 'Hallo',
  welcome_title: 'Willkommen',
  change_language: 'Sprache ändern',
}
```

You can also use JSON files and import them in your app bundle.

#### 2. Wrap your app with `Locon`

```tsx
import React from 'react'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import Locon from 'locon'

import en from './assets/i18n/en.json'
import de from './assets/i18n/de.json'
import RootNavigator from './RootNavigator'

const assets = { en, de }

function App() {
  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#ffffff',
    },
  }

  return (
    <Locon
      assets={assets}
      projectLocale='de'
    >
      <NavigationContainer theme={theme}>
        <RootNavigator />
      </NavigationContainer>
    </Locon>
  )
}

export default App
```

If `currentLocale` is not provided and `autodetect` is `true` (default),
`locon` will:

1. Read the device's preferred languages from these sources in order —
   `expo-localization`, then `react-native-localize`, then React Native's
   `NativeModules`, then `Intl`
2. Match each one against your `assets`, widening from the normalized exact
   tag (`pt_BR` → `pt-BR`), to the same script — explicit or inferred from
   region (`zh-Hant-TW` / `zh-TW` → `zh-Hant`) — to a bare language
   (`de-AT` → `de`), and finally to any locale in the same language
3. If a match is found, use it as the initial locale
4. Otherwise, fall back to `defaultLocale`

Device order is preference order, so a user whose second language you ship
gets that rather than your default.

#### 3. Use the `useLocon()` hook

```tsx
import React from 'react'
import { View, Button, Text } from 'react-native'
import { useLocon } from 'locon'

function LanguageSwitcher() {
  const { l, currentLocale, setLocale } = useLocon()

  return (
    <View>
      {/* Resolve by the value written in the project language. */}
      <Text>
        {l('Current language')}: {currentLocale}
      </Text>
      <Button
        title='English'
        onPress={() => setLocale('en')}
      />
      <Button
        title='Deutsch'
        onPress={() => setLocale('de')}
      />
    </View>
  )
}
```

#### 4. Use `<LText>` for localized text

```tsx
import React from 'react'
import { View } from 'react-native'
import { LText } from 'locon'

function Welcome() {
  return (
    <View>
      {/* Uses children as value to find the key, with fallback children */}
      <LText>Hallo</LText>

      {/* Or explicit key with fallback children */}
      <LText assetKey='welcome_title'>Welcome</LText>
    </View>
  )
}
```

---

### API

#### `<Locon />`

```ts
interface LoconProps extends PropsWithChildren {
  assets?: Record<string, Record<string, string>>
  currentLocale?: string | null
  defaultLocale?: string
  projectLocale?: string
  autodetect?: boolean
}
```

- **`assets`**  
  Map of locale → flat translations, e.g. `{ en: { hello: 'Hello' }, de: { hello: 'Hallo' } }`  
  Keep this object stable (module constant or `useMemo`) — `locon` caches its
  value→key index against the object's identity.

- **`currentLocale`**  
  Which locale to show:

  - a **string** selects that locale and overrides auto-detection; if the prop
    later changes, the provider follows the new value
  - **`null`** explicitly follows the device language
  - **omitted** leaves the locale uncontrolled after the initial detection

  The `null` form is what apps with a "System" option in their language picker
  want: persist the user's choice as `string | null` and pass it straight
  through, and switching back to "System" re-detects immediately instead of
  waiting for a restart.

  `currentLocale` is not a fully controlled React value: `setLocale()` can
  still change the provider after the initial prop is applied. A later change
  to the prop takes precedence again. This preserves the imperative API used
  by existing apps.

- **`defaultLocale`** (default `'en'`)  
  Used when key is missing in the current locale.

- **`projectLocale`** (default `'en'`)  
  Define language you use for texts in your project.
  Used for reverse lookup by value (e.g. when you only know the string in
  project language).

- **`autodetect`** (default `true`)  
  Enables system language detection as described above.

#### `useLocon()`

```ts
import { useLocon } from 'locon'

const {
  l, // (key/value: string, options?: TranslateOptions) => string
  lIn, // (locale: string, key/value: string, options?) => string
  assets, // all assets map
  locales, // every locale present in assets
  currentLocale, // current language code
  defaultLocale, // default language code
  projectLocale, // language your source strings are written in
  systemLocale, // locale detected from the device, or null
  isRTL, // whether currentLocale is written right-to-left
  autodetect, // boolean
  setLocale, // (locale: string | null) => void
} = useLocon()
```

- `l(key, options?)`  
  Returns the localized string or the key itself if nothing was found.

- `lIn(locale, key, options?)`  
  Same resolution, forced into `locale`. Handy for rendering one screen
  section — or one exported document — in another language.

- `setLocale(locale)`  
  Switches to `locale` if it exists in `assets`, otherwise logs a warning
  in development. Pass `null` to go back to following the device language.

#### `TranslateOptions`

```ts
interface TranslateOptions {
  params?: Record<string, string | number>
  count?: number
  locale?: string
  fallback?: string
}
```

**Interpolation** — `{token}` placeholders are replaced from `params`.
Unknown tokens are left as-is rather than blanked:

```json
{ "saved_radius": "{m} m radius · saved" }
```

```tsx
l('{m} m radius · saved', { params: { m: 150 } }) // → '150 m radius · saved'
```

**Fallback** — `fallback` is returned only when no locale resolves the input.
`<LText assetKey='…'>children</LText>` uses this internally so a missing key
shows its human-readable children rather than the raw key.

**Plurals** — pass `count` and suffix your keys with the CLDR plural
_category_, which is exactly what `Intl.PluralRules` returns for that locale.
`{count}` is interpolated for free.
When `params` also contains a `count` key, the dedicated `count` option wins so
the rendered number always agrees with the selected plural form.

Locon delegates category selection to the runtime's `Intl.PluralRules`:

```ts
const ruPlural = new Intl.PluralRules('ru')

ruPlural.select(21) // → 'one'
ruPlural.select(22) // → 'few'
ruPlural.select(25) // → 'many'
ruPlural.select(1.5) // → 'other'
```

See the [ECMA-402 `Intl.PluralRules.select()` specification](https://tc39.es/ecma402/#sec-intl.pluralrules.prototype.select)
and [Unicode CLDR's Russian plural rules](https://unicode.org/cldr/charts/49/verify/numbers/ru.html)
for the exact language-specific rules and examples.

These are all six possible suffixes. The count examples are locale-specific,
not universal rules:

| Suffix   | Example selection                        | Example value    |
| -------- | ---------------------------------------- | ---------------- |
| `_zero`  | Arabic `0`                               | `"لا أيام"`      |
| `_one`   | English `1`                              | `"{count} day"`  |
| `_two`   | Arabic `2`                               | `"يومان"`        |
| `_few`   | Russian `2–4`, except `12–14`            | `"{count} дня"`  |
| `_many`  | Russian `0`, `5–20`, `25–30`, and so on  | `"{count} дней"` |
| `_other` | English `0` and `2+`; decimals; fallback | `"{count} days"` |

Always provide `_other`. It is CLDR's catch-all category and Locon's first
fallback when a locale-specific category is absent.

```json
// en.json — two forms
{ "day_one": "{count} day", "day_other": "{count} days" }

// ru.json — four categories (three for integers, plus _other for decimals)
{ "day_one": "{count} день", "day_few": "{count} дня", "day_many": "{count} дней", "day_other": "{count} дня" }

// ar.json — all six
{
  "day_zero": "لا أيام",
  "day_one": "يوم واحد",
  "day_two": "يومان",
  "day_few": "{count} أيام",
  "day_many": "{count} يومًا",
  "day_other": "{count} يوم"
}
```

```tsx
l('{count} days', { count: 5 }) // en → '5 days' · ru → '5 дней'
```

There is deliberately no generic `_plural` suffix: most languages do not have
a single plural form. Categories fall back to `_other`, then to the bare key.

#### `<LText />`

```ts
interface LTextProps extends ComponentProps<typeof Text> {
  children: string
  assetKey?: string
  params?: Record<string, string | number>
  count?: number
  locale?: string
}
```

- If `assetKey` is provided, `LText` uses it directly as the lookup key and
  renders `children` when that key is missing in every fallback locale.
- Otherwise, it uses `children` as an input to the same resolution logic
  as `l()`:
  1. If `children` is a key in the target, default, or project locale, use it
     directly (the backward-compatible key-based form).
  2. Otherwise, find a key whose value equals `children`, first in the
     **project locale**, then in the **default locale**.
  3. Resolve that key in the target locale, then the default locale, then the
     project locale.
  4. If there is no match anywhere, render `children` as-is.

Fallback happens **per key**, not per locale: a string missing from the current
locale falls back on its own, so a half-finished translation stays readable
instead of rendering blank.

#### `createTranslator()` — localization outside React

The resolver the provider uses, available on its own. Use it wherever there is
no React tree: generating a PDF or spreadsheet, composing an e-mail, or
building a notification from a background task.

```ts
import { createTranslator } from 'locon'
import de from './assets/i18n/de.json'
import tr from './assets/i18n/tr.json'

const l = createTranslator({
  assets: { de, tr },
  locale: 'tr', // the document's language …
  defaultLocale: 'de',
  projectLocale: 'de', // … regardless of what the UI is showing
})

l('Arbeitszeit') // → 'Çalışma süresi'
```

This is what lets an app export a report in a language the interface is not
currently in — a user browsing in German can still produce a Turkish report.

#### `resolveLocale()` — the provider's locale precedence

`createTranslator()` needs a locale, and outside React nothing has picked one
for you. `resolveLocale()` answers that question with the exact precedence
`<Locon />` uses internally: an explicit choice, else the device language, else
the default.

```ts
import { resolveLocale } from 'locon'
import de from './assets/i18n/de.json'
import en from './assets/i18n/en.json'

const assets = { de, en }

resolveLocale({ assets, currentLocale: 'de' }) // → 'de' — an explicit choice wins
resolveLocale({ assets, currentLocale: null }) // → device language, else 'en'
resolveLocale({ assets, autodetect: false, defaultLocale: 'de' }) // → 'de'
```

The config it takes:

```ts
interface ResolveLocaleConfig {
  assets: Assets
  /** An explicit choice, `null` to follow the device, `undefined` for neither. */
  currentLocale?: string | null
  defaultLocale?: string // default 'en'
  autodetect?: boolean // default true
  /** A device locale you already detected — pass it to skip a second detection pass. */
  systemLocale?: string | null
}
```

Reach for it in a background task, an export pipeline, or a native bridge —
anywhere that has to agree with the UI about what language the app is in. An
app that re-derives the rule by hand eventually disagrees with the provider.

`getSystemLanguage(availableLocales)` is the detection step on its own. It
returns the best match among the locales you ship, or `null`, trying
`expo-localization`, then `react-native-localize`, then React Native's
`NativeModules`, then `Intl` — skipping silently past whichever are not
installed.

```ts
import { getSystemLanguage } from 'locon'

getSystemLanguage(['de', 'en', 'pt-BR']) // device asks for pt → 'pt-BR'
```

Matching widens progressively — normalized exact tag, same script (explicit or
inferred from a region), bare language, then any locale in the same language.
Thus both `zh-Hant-TW` and `zh-TW` choose `zh-Hant`, not an earlier `zh-Hans`.
Device order is preference order, so the user's first choice beats a closer
match further down their list.

#### `intlLocale()` — tags for `Intl`

`locon` has no opinion on which calendar or numbering system your app should
use: a Persian journal app wants Jalali dates, a Persian payroll export usually
does not. That is a product decision. What it can do is get the tag syntax
right, which naive concatenation does not — appending `-u-ca-gregory` to a
locale that already reads `de-u-nu-latn` produces two `-u-` singletons, and
`Intl` throws on it.

```ts
import { intlLocale } from 'locon'

intlLocale('fa', { calendar: 'persian' }) // → 'fa-u-ca-persian'
intlLocale('pt_BR') // → 'pt-BR'
intlLocale('de-u-nu-latn', { calendar: 'gregory' }) // → 'de-u-nu-latn-ca-gregory'
intlLocale('en-x-private', { calendar: 'gregory' }) // → 'en-u-ca-gregory-x-private'
intlLocale('fa-u-ca-gregory', { calendar: 'persian' }) // → unchanged: the tag already decided
intlLocale('de') // → 'de'

new Intl.DateTimeFormat(intlLocale('fa', { calendar: 'persian' })).format(date)
```

Extensions already present in the tag are left alone, so an explicit choice by
the caller — or by the user's own device settings — wins over your default.

#### RTL

```ts
import { applyRTL, isRtlLocale, useLocon } from 'locon'

isRtlLocale('ar') // true
isRtlLocale('ar-EG') // true — region subtags are ignored
isRtlLocale('pa-Arab') // true — an explicit script subtag wins
isRtlLocale('ha') // false — CLDR treats Hausa as Latin-script

const { isRTL } = useLocon() // direction of the current locale
```

`applyRTL(locale)` aligns React Native's `I18nManager` with the locale and
returns `true` when the direction actually changed — which means the app has
to restart before the new direction renders. `locon` never restarts your app
for you; prompt the user, or reload with `expo-updates`:

```tsx
const needsRestart = applyRTL('ar')

if (needsRestart) {
  Alert.alert('Restart required', 'Reopen the app to apply the new direction.')
}
```

Calling it again with the current direction before restarting cancels a queued
opposite change (for example, Arabic then English), so a dismissed language
choice cannot leave the next launch in the wrong direction.

On Expo, set `supportsRTL: true` in the `expo-localization` plugin config
(see [Use with Expo](#use-with-expo)) or iOS will ignore the direction change.

---

### Keeping translations in sync

Value-based lookup makes the assets easy to write and easy to break quietly: a
typo in an `<LText>` child is not a compile error, it just renders your source
language to someone who cannot read it.

The package ships a skill and two scripts for that. Audit a project's assets
against its code:

```bash
node node_modules/locon/skills/locon-sync/scripts/check-locon-assets.mjs \
  --source de \
  --locales de,en,fr
```

It checks that every statically written phrase in the code resolves, that all
declared locales have files, that all locale files carry the same keys, that
placeholders line up, that duplicate JSON keys cannot be silently overwritten,
that no locale has picked up characters from another script, and that nothing
addresses a key where a source phrase belongs. It exits non-zero, so it works
as a CI step.

Orphaned keys are reported but are advisory by default: a lightweight source
scan cannot prove that a dynamically selected string is unused. In a project
that keeps lookups static, make them fatal too:

```bash
node node_modules/locon/skills/locon-sync/scripts/check-locon-assets.mjs --source de --strict-orphans
```

Missing CLDR categories are also advisory because locon deliberately falls
back to `_other`; use `--strict-plurals` when every selectable category must be
written explicitly. If two source values intentionally differ only by context,
allow their direct keys with `--allow-keys key_a,key_b`.

`{count}` must match by default. Allow an exact translation to omit it only by
locale and key, for example
`--allow-implicit-count ar:day_one,ar:day_two`. This is never inferred from the
suffix: Russian 21 selects `_one`, so an unparameterized `day_one: "день"`
would lose the number.

`write_locale.py` validates before atomically replacing a locale file,
preserves source key order and grouping, and accepts target-specific plural
categories:

```bash
python3 node_modules/locon/skills/locon-sync/scripts/write_locale.py \
  --locale fr \
  --input /tmp/fr.json \
  --assets src/i18n/assets \
  --source de
```

If you use an agentic coding tool that supports skills, point it at
`node_modules/locon/skills/locon-sync/` (or copy the folder into your own
skills directory) and it will follow the same workflow, including the parts
that are not about strings at all — fonts for new scripts, calendars and
numbering systems, RTL, and store metadata.

#### Use the skill with Claude Code or Codex

Claude Code and Codex both use the open Agent Skills format but scan different
project directories. Keep one canonical npm copy and expose it to both from
the app root:

```bash
mkdir -p .claude/skills .agents/skills
ln -s ../../node_modules/locon/skills/locon-sync .claude/skills/locon-sync
ln -s ../../node_modules/locon/skills/locon-sync .agents/skills/locon-sync
```

Commit these two links so everyone opening the repository gets the same skill.
If the commands do not appear in an already open session, reopen the project.
Copy the folder instead on systems where project symlinks are unavailable, and
refresh both copies whenever `locon` is updated.

Invoke the skill explicitly at the beginning of a chat message. Claude Code
uses `/locon-sync`; Codex uses `$locon-sync`. The rest of the message is the
task and any limits you want the agent to observe.

Audit without changing files:

```text
# Claude Code
/locon-sync Audit every declared locale in this project. Do not change files; report missing assets, unresolved strings, placeholder or plural problems, and integration gaps.

# Codex
$locon-sync Audit every declared locale in this project. Do not change files; report missing assets, unresolved strings, placeholder or plural problems, and integration gaps.
```

Synchronize existing languages after UI copy changes:

```text
# Claude Code
/locon-sync Synchronize all existing locales after my source-language UI changes. Preserve product meaning, run the bundled checker and relevant tests, and list anything that needs my decision.

# Codex
$locon-sync Synchronize all existing locales after my source-language UI changes. Preserve product meaning, run the bundled checker and relevant tests, and list anything that needs my decision.
```

Add a language end to end:

```text
# Claude Code
/locon-sync Add Polish (pl) to this app. Inspect the project before editing, translate every source asset, update the declared language list and picker, check fonts, RTL, Intl and native/store metadata, then run validation. Do not publish.

# Codex
$locon-sync Add Polish (pl) to this app. Inspect the project before editing, translate every source asset, update the declared language list and picker, check fonts, RTL, Intl and native/store metadata, then run validation. Do not publish.
```

Both tools can also select the skill automatically from a plain request such
as “audit the Locon translations” because its description declares those
tasks. The explicit command is useful when you want to guarantee that the
workflow and bundled scripts are loaded. You can inspect the available skills
with `/skills` in either tool. See the official
[Claude Code skills documentation](https://code.claude.com/docs/en/slash-commands)
and [Codex skills documentation](https://learn.chatgpt.com/docs/build-skills).

The agent first discovers the source locale, asset directory, and complete
declared language list. It then runs the checker, makes only the requested
changes, uses the safe writer when generating a locale, and verifies JSON,
placeholders, plurals, scripts, fonts, RTL, locale-sensitive formatting, and
native/store declarations. A skill supplies a workflow, not extra permissions:
publishing, pushing, or destructive changes still require the authority you
give the agent in the chat.

---

### ESLint integration (`react-native/no-raw-text`)

If you use `eslint-plugin-react-native` with the `react-native/no-raw-text`
rule enabled, you may see errors like:

> Raw text (Hello) cannot be used outside of a `<Text>` tag

because the rule does not know that `LText` ultimately renders a React
Native `<Text>` under the hood.

To fix this, tell the rule to treat `LText` as an allowed wrapper:

```js
// .eslintrc.js
module.exports = {
  // ...
  rules: {
    // other rules...
    'react-native/no-raw-text': [
      'error',
      {
        skip: ['LText'],
      },
    ],
  },
}
```

This keeps the rule active for other components, but lets you freely use
raw text inside `<LText>`.

---

### TypeScript

The published package contains:

- `dist/index.js` — one bundled CommonJS file
- `dist/index.d.ts` — types

So you can import from `locon` in both JS and TS projects and get type support
for every export. Public component/configuration types are importable too:

```ts
import type {
  Assets,
  IntlExtensions,
  LTextProps,
  LoconContextValue,
  LoconProps,
  ResolveLocaleConfig,
  TranslateOptions,
  Translator,
  TranslatorConfig,
} from 'locon'
```

The build is deliberately **CommonJS only, and bundled**. Metro finds optional
dependencies by statically reading literal `require()` calls, and esbuild
rewrites those into its own shim when emitting ESM — so an ESM build registered
nothing and even `react-native` failed to resolve at runtime. Bundling matters
for the same reason: an unbundled tree emitted extensionless relative imports,
which Node resolves to `.js` but Metro tries `.mjs` for first, loading the
library twice. Two instances mean two contexts — the provider fills one, every
`useLocon()` reads the other, and consumers get untranslated screens with no
error at all. Metro consumes CJS natively, so a second format buys a React
Native library nothing.

---

### License

`locon` is released under the **ISC** license.
