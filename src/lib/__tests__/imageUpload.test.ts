import { describe, it, expect } from 'vitest'
import { MAX_GIF_BYTES, fitWithin, gifUploadProblem, isGif } from '../imageUpload'

describe('imagens reduzidas antes de subir', () => {
  it('cabe no limite mantendo a proporção', () => {
    // a foto 4K que aparecia num avatar de 32 px
    expect(fitWithin(3840, 2160, 512, 512)).toEqual({ width: 512, height: 288 })
    expect(fitWithin(1853, 1112, 1500, 600)).toEqual({ width: 1000, height: 600 })
  })

  it('nunca aumenta uma imagem pequena', () => {
    expect(fitWithin(300, 200, 512, 512)).toEqual({ width: 300, height: 200 })
  })

  it('GIF animado: passa até o limite e é recusado acima, com o motivo', () => {
    expect(isGif({ type: '', name: 'Avatar.GIF' })).toBe(true)
    expect(gifUploadProblem({ type: 'image/gif', name: 'a.gif', size: MAX_GIF_BYTES })).toBeNull()
    expect(gifUploadProblem({ type: 'image/gif', name: 'a.gif', size: 12.9 * 1048576 })).toMatch(/até 3 MB.*12\.9 MB/)
    expect(gifUploadProblem({ type: 'image/png', name: 'a.png', size: 50 * 1048576 })).toBeNull()
  })
})
