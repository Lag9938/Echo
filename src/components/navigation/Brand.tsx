import { EchoAtomLogo } from '../icons'

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark-atom" title="Echo">
        <EchoAtomLogo size={20} />
      </div>
      <span className="brand-name">echo</span>
    </div>
  )
}
