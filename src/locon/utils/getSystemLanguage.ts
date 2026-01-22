/**
 * Detects the system language and returns the best matching available locale.
 * Uses react-native-localize if available, otherwise falls back to native APIs.
 */
export default function getSystemLanguage(availableLocales: string[]): string | null {
  if (!availableLocales?.length) return null

  // Debug logging - always enabled for now to debug language detection
  // eslint-disable-next-line no-console
  console.log('[getSystemLanguage] === START ===')
  // eslint-disable-next-line no-console
  console.log('[getSystemLanguage] Available locales:', availableLocales)

  try {
    // Try to use react-native-localize if available (most reliable)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RNLocalize = require('react-native-localize')
      
      // Check if the module is actually linked (not just installed)
      if (RNLocalize) {
        // Method 1: Try findBestLanguageTag (preferred method)
        if (typeof RNLocalize.findBestLanguageTag === 'function') {
          const best = RNLocalize.findBestLanguageTag(availableLocales)
          if (best?.languageTag) {
            // findBestLanguageTag might return a full locale like 'ru-RU', 
            // but we need to match it against our available locales which might be just 'ru'
            const languageTag = best.languageTag
            const languageCode = languageTag.split('-')[0]?.toLowerCase()
            
            // First try exact match
            if (availableLocales.includes(languageTag)) {
              return languageTag
            }
            
            // Then try language code match
            if (languageCode && availableLocales.includes(languageCode)) {
              // eslint-disable-next-line no-console
              console.log('[getSystemLanguage] ✅ Found via findBestLanguageTag:', languageCode)
              return languageCode
            }
          }
        }
        
        // Method 2: Try getLocales() as fallback
        if (typeof RNLocalize.getLocales === 'function') {
          const locales = RNLocalize.getLocales()
          // eslint-disable-next-line no-console
          console.log('[getSystemLanguage] System locales from getLocales():', JSON.stringify(locales, null, 2))
          for (const locale of locales) {
            const languageCode = locale.languageCode?.toLowerCase()
            // eslint-disable-next-line no-console
            console.log('[getSystemLanguage] Checking locale:', locale.languageCode, '->', languageCode)
            if (languageCode && availableLocales.includes(languageCode)) {
              // eslint-disable-next-line no-console
              console.log('[getSystemLanguage] ✅ Found via getLocales languageCode:', languageCode)
              return languageCode
            }
            
            // Also try languageTag if available
            if (locale.languageTag) {
              const tagCode = locale.languageTag.split('-')[0]?.toLowerCase()
              // eslint-disable-next-line no-console
              console.log('[getSystemLanguage] Checking languageTag:', locale.languageTag, '->', tagCode)
              if (tagCode && availableLocales.includes(tagCode)) {
                // eslint-disable-next-line no-console
                console.log('[getSystemLanguage] ✅ Found via getLocales languageTag:', tagCode)
                return tagCode
              }
            }
          }
        } else {
          // eslint-disable-next-line no-console
          console.log('[getSystemLanguage] ⚠️ getLocales() is not available')
        }
      } else {
        // eslint-disable-next-line no-console
        console.log('[getSystemLanguage] ⚠️ react-native-localize module not found or not linked')
      }
    } catch (localizeError) {
      // react-native-localize not available or not linked, continue with fallback methods
      // This can happen if:
      // 1. Package is not installed
      // 2. Package is installed but not linked (need to run pod install for iOS)
      // 3. Native module failed to load
      // eslint-disable-next-line no-console
      console.log('[getSystemLanguage] ❌ react-native-localize error:', localizeError)
    }

    // Fallback: Try React Native native modules
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const reactNative = require('react-native')
      const { NativeModules, Platform } = reactNative
      
      if (Platform?.OS === 'ios') {
        // iOS: Try to get preferred languages from SettingsManager
        const SettingsManager = NativeModules?.SettingsManager
        if (SettingsManager?.settings?.AppleLanguages) {
          const appleLanguages = SettingsManager.settings.AppleLanguages as string[]
          // eslint-disable-next-line no-console
          console.log('[getSystemLanguage] iOS AppleLanguages:', appleLanguages)
          for (const lang of appleLanguages) {
            const languageCode = lang.split('-')[0]?.toLowerCase()
            if (languageCode) {
              const supportedLanguage = availableLocales.find(locale => locale === languageCode)
              if (supportedLanguage) {
                // eslint-disable-next-line no-console
                console.log('[getSystemLanguage] ✅ Found via iOS SettingsManager:', supportedLanguage)
                return supportedLanguage
              }
            }
          }
        }
        
        // iOS: Try I18nManager
        const I18nManager = NativeModules?.I18nManager
        if (I18nManager?.localeIdentifier) {
          const languageCode = (I18nManager.localeIdentifier as string).split('-')[0]?.toLowerCase()
          if (languageCode) {
            const supportedLanguage = availableLocales.find(locale => locale === languageCode)
            if (supportedLanguage) {
              return supportedLanguage
            }
          }
        }
      } else if (Platform?.OS === 'android') {
        // Android: Try I18nManager
        const I18nManager = NativeModules?.I18nManager
        if (I18nManager?.localeIdentifier) {
          const languageCode = (I18nManager.localeIdentifier as string).split('-')[0]?.toLowerCase()
          if (languageCode) {
            const supportedLanguage = availableLocales.find(locale => locale === languageCode)
            if (supportedLanguage) {
              return supportedLanguage
            }
          }
        }
      }
    } catch (rnError) {
      // React Native modules not available, continue with Intl API
    }

    // Last resort: use Intl API (may return region-specific locale like 'en-DE')
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
    // eslint-disable-next-line no-console
    console.log('[getSystemLanguage] Intl locale:', systemLocale)
    if (systemLocale) {
      const languageCode = systemLocale.split('-')[0]?.toLowerCase()
      if (languageCode) {
        const supportedLanguage = availableLocales.find(locale => locale === languageCode)
        if (supportedLanguage) {
          // eslint-disable-next-line no-console
          console.log('[getSystemLanguage] ✅ Found via Intl API:', supportedLanguage)
          return supportedLanguage
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log('[getSystemLanguage] ❌ No matching locale found, returning null')
    // eslint-disable-next-line no-console
    console.log('[getSystemLanguage] === END ===')
    return null
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Could not detect system language:', error)
    return null
  }
}
