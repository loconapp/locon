import { useContext } from 'react'
import { LoconContext } from '../index'

function useLocon() {
  const locon = useContext(LoconContext)

  return locon
}

export default useLocon
