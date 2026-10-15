import createTranslator from '../locon/utils/createTranslator'
import type Assets from '../locon/types/Assets'
import type TranslateOptions from '../locon/types/TranslateOptions'

type Resource = Record<string, string>
export type ResourceLoader = () => Promise<Resource | { default: Resource }>
export interface ResourceOptions {
  loaders: Record<string, ResourceLoader>
  defaultLocale: string
  projectLocale?: string
  locale?: string | null
  /** Ordered browser/device preferences, or an explicit list in Node. */
  languages?: readonly string[]
}
export interface LocaleSnapshot {
  currentLocale: string
  loading: boolean
  ready: boolean
  error: Error | null
}

const normalized = (value: string) => value.replace(/_/g, '-').toLowerCase()
/** First matching preference wins; regional variants can use a base resource. */
export function matchLocale(languages: readonly string[], supported: readonly string[], fallback: string): string {
  for (const language of languages) {
    let candidate = normalized(language)
    while (candidate) {
      const exact = supported.find((locale) => normalized(locale) === candidate)
      if (exact) return exact
      const next = candidate.lastIndexOf('-')
      if (next < 0) break
      candidate = candidate.slice(0, next)
    }
    const base = normalized(language).split('-')[0]
    const variant = supported.find((locale) => normalized(locale).split('-')[0] === base)
    if (variant) return variant
  }
  return fallback
}

/** A per-app/per-request store. Importing it touches neither React nor a platform API. */
export function createLocon(options: ResourceOptions) {
  const locales = Object.keys(options.loaders)
  if (!locales.includes(options.defaultLocale)) throw new Error('[locon] defaultLocale needs a loader')
  const initial = matchLocale(options.locale ? [options.locale] : options.languages ?? [], locales, options.defaultLocale)
  let snapshot: LocaleSnapshot = { currentLocale: initial, loading: false, ready: false, error: null }
  let assets: Assets = {}
  const pending = new Map<string, Promise<Resource>>()
  const listeners = new Set<() => void>()
  let selection = 0
  const notify = (next: LocaleSnapshot) => { snapshot = next; listeners.forEach((listener) => listener()) }

  async function loadLocale(locale: string): Promise<Resource> {
    if (!locales.includes(locale)) throw new Error(`[locon] Unsupported locale: ${locale}`)
    if (assets[locale]) return assets[locale]
    let request = pending.get(locale)
    if (!request) {
      request = Promise.resolve().then(options.loaders[locale]).then((module) => {
        const resource = typeof module.default === 'object' ? module.default : module as Resource
        if (!resource || typeof resource !== 'object' || Array.isArray(resource) || Object.values(resource).some((value) => typeof value !== 'string')) {
          throw new Error(`[locon] Invalid resources: ${locale}`)
        }
        // New identity keeps createTranslator's reverse indexes correct.
        assets = { ...assets, [locale]: { ...resource } }
        return assets[locale]
      }).finally(() => pending.delete(locale))
      pending.set(locale, request)
    }
    return request
  }

  async function setLocale(locale: string | null): Promise<boolean> {
    const target = locale === null ? matchLocale(options.languages ?? [], locales, options.defaultLocale) : locale
    if (!locales.includes(target)) throw new Error(`[locon] Unsupported locale: ${target}`)
    const version = ++selection
    notify({ ...snapshot, loading: true, error: null })
    try {
      await loadLocale(target)
      if (version !== selection) return false
      notify({ currentLocale: target, loading: false, ready: true, error: null })
      return true
    } catch (cause) {
      if (version === selection) notify({ ...snapshot, loading: false, error: cause instanceof Error ? cause : new Error('[locon] Loading failed') })
      throw cause
    }
  }

  function l(key: string, translateOptions?: TranslateOptions): string {
    return createTranslator({ assets, locale: snapshot.currentLocale, defaultLocale: options.defaultLocale, projectLocale: options.projectLocale })(key, translateOptions)
  }

  return {
    locales, l, loadLocale, setLocale,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
export type LoconInstance = ReturnType<typeof createLocon>
