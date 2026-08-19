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
  - `react-native-localize >= 3.0.0` — for bare React Native apps

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
      assets={{ en, de }}
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

1. Read the device's preferred languages from the first source available —
   `react-native-localize`, then `expo-localization`, then React Native's
   `NativeModules`, then `Intl`
2. Match each one against your `assets`, widening from the exact tag (`pt-BR`)
   to the language subtag (`pt`) to any locale in the same language
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
      {/* Localised value by key */}
      <Text>
        {l('current_language')}: {currentLocale}
      </Text>
      {/* or by value in project- or default language */}
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

  - a **string** pins that locale and overrides auto-detection
  - **`null`** explicitly follows the device language
  - **omitted** leaves the locale uncontrolled after the initial detection

  The `null` form is what apps with a "System" option in their language picker
  want: persist the user's choice as `string | null` and pass it straight
  through, and switching back to "System" re-detects immediately instead of
  waiting for a restart.

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
}
```

**Interpolation** — `{token}` placeholders are replaced from `params`.
Unknown tokens are left as-is rather than blanked:

```json
{ "saved_radius": "{m} m radius · saved" }
```

```tsx
l('saved_radius', { params: { m: 150 } }) // → '150 m radius · saved'
```

**Plurals** — pass `count` and suffix your keys with the CLDR plural
_category_, which is exactly what `Intl.PluralRules` returns for that locale.
`{count}` is interpolated for free.

```json
// en.json — two forms
{ "day_one": "{count} day", "day_other": "{count} days" }

// ru.json — three
{ "day_one": "{count} день", "day_few": "{count} дня", "day_many": "{count} дней" }

// ar.json — up to six
{ "day_zero": "…", "day_one": "…", "day_two": "…", "day_few": "…", "day_many": "…", "day_other": "…" }
```

```tsx
l('day', { count: 5 }) // en → '5 days' · ru → '5 дней'
```

There is deliberately no generic `_plural` suffix: most languages do not have
a single plural form. Categories fall back to `_other`, then to the bare key,
so a locale only needs the forms it actually inflects.

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

- If `assetKey` is provided, `LText` uses it directly as the lookup key.
- Otherwise, it uses `children` as an input to the same resolution logic
  as `l()`:
  1. Try to find a key in the **project locale** whose **value** equals
     `children`, then use that key in the current locale.
  2. If nothing is found in the project locale, try **directly** using
     `children` as a key in the current locale.
  3. If still nothing is found, fall back to the **default locale**.
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
  defaultLocale: 'en',
  projectLocale: 'de', // … regardless of what the UI is showing
})

l('Arbeitszeit') // → 'Çalışma süresi'
```

This is what lets an app export a report in a language the interface is not
currently in — a user browsing in Turkish can still hand their employer a
German timesheet.

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
node node_modules/locon/skills/locon-sync/scripts/check-locon-assets.mjs --source de
```

It checks that every phrase in the code resolves, that all locales carry the
same keys, that placeholders line up, that no locale has picked up characters
from another script, and that nothing addresses a key where a source phrase
belongs. It exits non-zero, so it works as a CI step.

`write_locale.py` generates a locale file from the source locale, preserving
key order and grouping and refusing to write anything that breaks an
invariant — including the plural rules, where a target language may add
categories the source has no equivalent for (Polish `_few`, Arabic `_two`).

If you use an agentic coding tool that supports skills, point it at
`node_modules/locon/skills/locon-sync/` (or copy the folder into your own
skills directory) and it will follow the same workflow, including the parts
that are not about strings at all — fonts for new scripts, calendars and
numbering systems, RTL, and store metadata.

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

- `dist/index.js` (CJS)
- `dist/index.mjs` (ESM)
- `dist/index.d.ts` (types)

So you can import from `locon` in both JS and TS projects and get type
support for `Locon`, `useLocon`, and `LText`.

---

### License

`locon` is released under the **ISC** license.
