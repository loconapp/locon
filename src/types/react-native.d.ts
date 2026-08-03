declare module 'react-native' {
  import { ComponentType, ReactElement } from 'react'
  
  export interface TextProps {
    children?: React.ReactNode
    [key: string]: any
  }
  
  export const Text: ComponentType<TextProps>
  
  export const View: ComponentType<any>
  export const Image: ComponentType<any>
  export const ScrollView: ComponentType<any>
  export const TouchableOpacity: ComponentType<any>
  export const StyleSheet: any
  export const Platform: any
}
