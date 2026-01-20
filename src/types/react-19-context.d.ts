import 'react'

declare module 'react' {
  interface Context<T> {
    (props: { value: T; children: React.ReactNode }): React.ReactElement
  }
}
