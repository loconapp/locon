import { ComponentProps, ReactElement } from 'react'
import { Text } from 'react-native'
import useLocon from '../hooks/useLocon'
interface Props extends ComponentProps<typeof Text> {
  children: string
  assetKey?: string
}
function LText({ children, assetKey, ...props }: Props): ReactElement {
  const { l } = useLocon()
  return <Text {...props}>{l(assetKey || children)}</Text>
}

export default LText
