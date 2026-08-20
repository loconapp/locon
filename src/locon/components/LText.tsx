import { ComponentProps, ReactElement } from 'react'
import { Text } from 'react-native'
import useLocon from '../hooks/useLocon'

interface LTextProps extends ComponentProps<typeof Text> {
  children: string
  assetKey?: string
  /** Values for `{token}` placeholders. */
  params?: Record<string, string | number>
  /** Selects a plural form via `Intl.PluralRules`. */
  count?: number
  /** Renders in this locale instead of the current one. */
  locale?: string
}

function LText({ children, assetKey, params, count, locale, ...props }: LTextProps): ReactElement {
  const { l } = useLocon()
  const value = l(assetKey || children, { params, count, locale, fallback: assetKey ? children : undefined })

  return <Text {...props}>{value}</Text>
}

export default LText
export type { LTextProps }
