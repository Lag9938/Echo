import { describe, it, expect, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AVATAR_DECORATIONS } from '../AvatarDecoration'
import { HighTierDecorationRenderer } from '../HighTierDecorations'
import { getAvatarVideoDecoration } from '../../lib/avatarVideoDecorations'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

describe('decorações de avatar', () => {
  let root: Root | null = null
  let container: HTMLDivElement | null = null
  afterEach(() => {
    if (root) act(() => root!.unmount())
    container?.remove()
    root = null
    container = null
  })

  const render = (node: React.ReactNode) => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root!.render(node))
    return container
  }

  it('os ids são únicos e cada categoria usada existe na Loja', () => {
    const ids = AVATAR_DECORATIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    const categories = new Set(AVATAR_DECORATIONS.map((d) => d.category))
    expect([...categories].every((c) => ['Aura', 'Fantasia', 'Animais', 'Sazonal'].includes(c))).toBe(true)
  })

  it('toda decoração registrada tem desenho próprio (nenhuma cai no padrão por esquecimento)', () => {
    const fallbackClass = 'pk-orb'
    for (const deco of AVATAR_DECORATIONS.filter((d) => !getAvatarVideoDecoration(d.id))) {
      const el = render(<HighTierDecorationRenderer id={deco.id} />)
      const svg = el.querySelector('svg')
      expect(svg, deco.id).not.toBeNull()
      expect(svg!.getAttribute('class'), deco.id).not.toContain(fallbackClass)
      act(() => root!.unmount())
      el.remove()
      root = null
      container = null
    }
  })

  it('as decorações em SVG não têm filtro e seguem o contrato do 120×120 (leves em listas)', () => {
    // todas as desenhadas em SVG (as de vídeo não têm <svg>)
    const light = AVATAR_DECORATIONS.map((d) => d.id).filter((id) => !getAvatarVideoDecoration(id))
    const videos = AVATAR_DECORATIONS.filter((d) => getAvatarVideoDecoration(d.id)).length
    expect(light.length).toBe(AVATAR_DECORATIONS.length - videos)
    for (const id of light) {
      const el = render(<HighTierDecorationRenderer id={id} />)
      expect(el.querySelector('filter'), id).toBeNull()
      expect(el.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 120 120')
      act(() => root!.unmount())
      el.remove()
      root = null
      container = null
    }
  })

  it('uma decoração que saiu do catálogo (ex.: a antiga Raposa Astral) não desenha nada em vez de cair numa errada', () => {
    for (const id of ['astral_kitsune', 'soundwave_orb', 'fire_storm', 'prismatic_crown', 'cyber_hud', 'hex_shield']) {
      const el = render(<HighTierDecorationRenderer id={id} />)
      expect(el.innerHTML, id).toBe('')
      act(() => root!.unmount())
      el.remove()
      root = null
      container = null
    }
  })

  it('duas instâncias da mesma decoração não repartem ids de gradiente (senão uma apaga a outra)', () => {
    const el = render(
      <div>
        <HighTierDecorationRenderer id="crystal_wings" />
        <HighTierDecorationRenderer id="crystal_wings" />
      </div>
    )
    const ids = Array.from(el.querySelectorAll('[id]')).map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
