import type Assets from './Assets'

interface Settings {
  assets: Assets
  currentLocale: string
  defaultLocale: string
  autodetect: boolean
}

export default Settings
