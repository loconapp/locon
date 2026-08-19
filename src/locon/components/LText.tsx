import { ComponentProps, ReactElement } from 'react'
import { Text } from 'react-native'
import useLocon from '../hooks/useLocon'

interface Props extends ComponentProps<typeof Text> {
  children: string
  assetKey?: string
  /** Values for `{token}` placeholders. */
  params?: Record<string, string | number>
  /** Selects a plural form via `Intl.PluralRules`. */
  count?: number
  /** Renders in this locale instead of the current one. */
  locale?: string
}

function LText({ children, assetKey, params, count, locale, ...props }: Props): ReactElement {
  const { l } = useLocon()

  return <Text {...props}>{l(assetKey || children, { params, count, locale })}</Text>
}

export default LText
