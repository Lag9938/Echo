import { describe, it, expect } from 'vitest'
import { buildNoticeWindowScript } from '../services/updateNotice.js'

describe('buildNoticeWindowScript', () => {
  const script = buildNoticeWindowScript({ width: 420, height: 128, title: 'Atualizando o Echo', subtitle: 'Ele reabre sozinho em instantes.' }).join('\n')

  it('leva o título e o subtítulo e define Say, Tick e Pump para o resto do script usar', () => {
    expect(script).toContain("Title = 'Atualizando o Echo'")
    expect(script).toContain("Sub = 'Ele reabre sozinho em instantes.'")
    expect(script).toContain('function Say(')
    expect(script).toContain('function Tick')
    expect(script).toContain('function Pump(')
  })

  it('cria a janela dentro de try/catch: se falhar, $form fica nulo e a atualização segue sem aviso', () => {
    const tryAt = script.indexOf('try {\n  Add-Type -AssemblyName System.Windows.Forms')
    const show = script.indexOf('$form.Show()')
    const catchAt = script.indexOf('} catch { $form = $null')
    expect(tryAt).toBeGreaterThan(-1)
    expect(show).toBeGreaterThan(tryAt)
    expect(catchAt).toBeGreaterThan(show)
    // Tick não faz nada sem janela
    expect(script).toContain('function Tick { if ($form)')
  })

  it('escapa aspas simples nos textos para não quebrar o script', () => {
    const s = buildNoticeWindowScript({ title: "Echo d'água", subtitle: "o'neil" }).join('\n')
    expect(s).toContain("Title = 'Echo d''água'")
    expect(s).toContain("Sub = 'o''neil'")
  })

  it('tem o modo de erro (sem a barra de progresso) e anima a espera em ~30 quadros por segundo', () => {
    expect(script).toContain('$n.Mode -eq "error"')
    expect(script).toContain('if (-not $err) {')
    expect(script).toContain('[int]($seconds * 30)')
  })
})

describe('aviso do atualizador por tema', () => {
  const script = (theme) => buildNoticeWindowScript({ title: 'T', subtitle: 'S', theme }).join('\n')

  it('o padrão é o tema escuro (grafite chapado, sem brilho colorido)', () => {
    const s = script(undefined)
    expect(s).toContain('Light = $false')
    expect(s).toContain('FromArgb(22, 22, 24)')
    expect(s).not.toContain('PathGradientBrush')
  })

  it('o tema claro usa papel quente, texto escuro e fundo da janela claro', () => {
    const s = script('light')
    expect(s).toContain('Light = $true')
    expect(s).toContain('FromArgb(251, 250, 247)')
    expect(s).toContain("$form.BackColor = [System.Drawing.Color]::FromArgb(251, 250, 247)")
    // texto principal escuro no claro
    expect(s).toContain('if ($L) { [System.Drawing.Color]::FromArgb(30, 30, 33) }')
  })
})
