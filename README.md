## locon

`locon` is a small, typed i18n helper for React Native.  
It provides a context provider, a hook, and a simple text component to keep
your translations flat, explicit, and easy to use.

---

### Features

- **React Native–first**: tiny API, no global singletons
- **Context provider** with pluggable assets (per-locale JSON)
- **Device language auto-detection** (optional)
- **`useLocon()` hook** for accessing translations and changing locale
- **`<LText>` component** as a drop-in localized `<Text>`
- Fully typed TypeScript build (`dist/index.d.ts`)

---

### Installation

```bash
npm install locon
# or
yarn add locon
```

**Important:** After installation, run pod install for iOS:

```bash
cd ios && pod install
```

**Peer dependencies**

- `react >= 19.0.0`
- `react-native >= 0.70.0`
- `react-native-localize >= 3.0.0` (installed automatically)

`react-native-localize` is used for accurate device language detection on iOS and Android.

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
      defaultLocale='en'
      projectLocale='de'
      autodetect
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

1. Use `react-native-localize` to detect device locale on iOS/Android
2. Match the detected locale (including region) or just language code against your `assets`
3. If a match is found, use it as initial locale
4. Otherwise, fall back to `defaultLocale`

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
      <LText>Hello</LText>

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
  currentLocale?: string
  defaultLocale?: string
  projectLocale?: string
  autodetect?: boolean
}
```

- **`assets`**  
  Map of locale → flat translations, e.g. `{ en: { hello: 'Hello' }, de: { hello: 'Hallo' } }`

- **`currentLocale`**  
  Initial locale. If provided, it overrides auto-detection.

- **`defaultLocale`** (default `'en'`)  
  Used when key is missing in the current locale.

- **`projectLocale`** (default `'en'`)  
  Used for reverse lookup by value (e.g. when you only know the string in
  project language).

- **`autodetect`** (default `true`)  
  Enables system language detection as described above.

#### `useLocon()`

```ts
import { useLocon } from 'locon'

const {
  l, // (key/value: string) => string
  assets, // all assets map
  currentLocale, // current language code
  defaultLocale, // default language code
  autodetect, // boolean
  setLocale, // (locale: string) => void
} = useLocon()
```

- `l(key)`  
  Returns the localized string or the key itself if nothing was found.

- `setLocale(locale)`  
  Switches to `locale` if it exists in `assets`, otherwise logs a warning
  in development.

#### `<LText />`

```ts
interface LTextProps extends ComponentProps<typeof Text> {
  children: string
  assetKey?: string
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
