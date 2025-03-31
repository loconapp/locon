import l from '../functions/l'

interface Props {
  children: string
}
function L({ children }: Props): string {
  return l(children)
}

export default L
