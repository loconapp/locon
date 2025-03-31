import type Locales from './Locales'

interface Settings {
  defaultLocale: string
  locales: Locales
  autodetect: boolean
}

export default Settings
