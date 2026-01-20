import type Assets from './Assets'
interface LoconContext {
  l: (assetKey: string) => string
  assets: Assets
  currentLocale: string
  defaultLocale: string
  autodetect: boolean
  setLocale: (locale: string) => void
}
export default LoconContext
