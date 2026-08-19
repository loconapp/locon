/**
 * Decides which locale to display.
 *
 * The provider uses this, and so can anything running outside React — a
 * background task building a notification, an export pipeline, a native
 * bridge. Keeping the precedence in one place is the point: an app that
 * re-derives "explicit choice, else device, else default" on its own will
 * eventually disagree with the provider about what language it is in.
 */
import type Assets from '../types/Assets'
import getSystemLanguage from './getSystemLanguage'

interface ResolveLocaleConfig {
  assets: Assets
  /** An explicit choice, `null` to follow the device, `undefined` for neither. */
  currentLocale?: string | null
  defaultLocale?: string
  autodetect?: boolean
  /**
   * A device locale already detected by the caller.
   *
   * Pass it to skip a second detection pass; omit it to let this function
   * detect. `null` states that detection ran and matched nothing.
   */
  systemLocale?: string | null
}

function resolveLocale({
  assets,
  currentLocale,
  defaultLocale = 'en',
  autodetect = true,
  systemLocale,
}: ResolveLocaleConfig): string {
  if (currentLocale) {
    return currentLocale
  }

  if (!autodetect) {
    return defaultLocale
  }

  const detected = systemLocale === undefined ? getSystemLanguage(Object.keys(assets)) : systemLocale

  return detected ?? defaultLocale
}

export default resolveLocale
export type { ResolveLocaleConfig }
