# Changelog

## 1.6.0

### Added

- `locon/core`: React-free and React Native-free ESM/CommonJS entry for Node and
  plain TypeScript, exporting `createTranslator`, `intlLocale`, `createLocon`
  and `matchLocale` with types.
- `locon/react`: React 19+ adapter with `LoconProvider` and `useLocon`, without
  importing React Native.
- Lazy per-locale resource loaders, JSON-module support, successful-load cache,
  parallel request deduplication and ordered locale preference matching.
- Async locale switching with last-selection-wins behavior, loading/error state,
  preservation of the current locale on failure and retry support.

### Compatibility

- The existing `locon` React Native entry, provider, hook and `LText` API remain
  available. Native device language detection and RTL behavior are unchanged.
- React and React Native peers are optional at package installation time; each
  adapter still requires its runtime. Node core needs neither framework.
- Lazy lookups use only already loaded resources for fallback. Prefer stable
  keys when the source-language resource has not been loaded. Source-phrase
  reverse lookup continues to work when that resource is available.
- Clean the output directory once before building all entries to avoid parallel
  builds removing each other's output.

### Verification

- Existing native tests and built-entry smoke tests are retained.
- Added coverage for lazy loads, caching, concurrent switching, failed load
  retry, platform-free Node imports and React updates after resource loading.
