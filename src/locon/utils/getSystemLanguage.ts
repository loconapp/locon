export default function getSystemLanguage(availableLocales: string[]): string | null {
  try {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
    if (!systemLocale) return null

    const languageCode = systemLocale.split('-')[0]?.toLowerCase()
    if (!languageCode) return null

    const supportedLanguage = availableLocales.find(locale => locale === languageCode)

    return supportedLanguage ? languageCode : null
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('Could not detect system language:', error)
    return null
  }
}
