import { getAsset } from '../settings'

function l(assetKey: string): string {
  if (!assetKey) {
    return ''
  }
  const asset = getAsset(assetKey)
  return asset ?? assetKey
}

export default l
