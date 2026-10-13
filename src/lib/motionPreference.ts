// Preferência de movimento: seguir o sistema (padrão), sempre reduzir ou sempre animar.
// "Reduzir" corta animações e transições decorativas do app inteiro (ver styles/accessibility.css).
export type MotionPreference = 'system' | 'reduce' | 'full'

export const MOTION_OPTIONS: Array<{ value: MotionPreference; label: string; hint: string }> = [
  { value: 'system', label: 'Automático', hint: 'Segue a configuração do seu sistema' },
  { value: 'reduce', label: 'Reduzir', hint: 'Menos animações e transições' },
  { value: 'full', label: 'Completo', hint: 'Todas as animações' }
]

export function readMotionPreference(): MotionPreference {
  try {
    const saved = localStorage.getItem('echo-motion')
    return saved === 'reduce' || saved === 'full' ? saved : 'system'
  } catch {
    return 'system'
  }
}
