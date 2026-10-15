import { createContext, useContext, useSyncExternalStore } from 'react'
import type { PropsWithChildren } from 'react'
import type { LoconInstance } from '../core/resources'
export { createLocon, matchLocale } from '../core/resources'
export type { LoconInstance, ResourceOptions, ResourceLoader } from '../core/resources'

const Context = createContext<LoconInstance | null>(null)
export function LoconProvider({ instance, children }: PropsWithChildren<{ instance: LoconInstance }>) {
  return <Context value={instance}>{children}</Context>
}
export function useLocon() {
  const instance = useContext(Context)
  if (!instance) throw new Error('[locon/react] useLocon needs LoconProvider')
  const snapshot = useSyncExternalStore(instance.subscribe, instance.getSnapshot, instance.getSnapshot)
  return { ...snapshot, locales: instance.locales, l: instance.l, setLocale: instance.setLocale }
}
