import React, { useState, useEffect, useRef } from 'react'

export interface GlobalShortcutRecorderProps {
  label: string
  description?: string
  value: string
  defaultValue: string
  actionKey: string
  popularPresets?: string[]
  onChange: (newShortcut: string) => void
}

/**
 * Converte um evento do teclado para a sintaxe Accelerator do Electron
 */
export function parseKeyboardEventToAccelerator(e: KeyboardEvent): { accelerator: string | null; warning?: string } {
  // Ignora teclas modificadoras isoladas
  if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(e.key)) {
    return { accelerator: null }
  }

  const modifiers: string[] = []
  if (e.ctrlKey) modifiers.push('Ctrl')
  if (e.altKey) modifiers.push('Alt')
  if (e.shiftKey) modifiers.push('Shift')
  if (e.metaKey) modifiers.push('Super')

  let keyName = ''

  // Teclas F1-F24
  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(e.code)) {
    keyName = e.code.toUpperCase()
  } else if (e.code.startsWith('Key')) {
    keyName = e.code.slice(3).toUpperCase()
  } else if (e.code.startsWith('Digit')) {
    keyName = e.code.slice(5)
  } else if (e.code.startsWith('Numpad')) {
    const np = e.code.slice(6)
    if (/^[0-9]$/.test(np)) {
      keyName = `num${np}`
    } else if (np === 'Add') keyName = 'numadd'
    else if (np === 'Subtract') keyName = 'numsub'
    else if (np === 'Multiply') keyName = 'nummult'
    else if (np === 'Divide') keyName = 'numdiv'
    else if (np === 'Decimal') keyName = 'numdec'
    else keyName = np
  } else {
    switch (e.code) {
      case 'Space': keyName = 'Space'; break
      case 'Enter': keyName = 'Return'; break
      case 'Backspace': keyName = 'Backspace'; break
      case 'Delete': keyName = 'Delete'; break
      case 'Insert': keyName = 'Insert'; break
      case 'Home': keyName = 'Home'; break
      case 'End': keyName = 'End'; break
      case 'PageUp': keyName = 'PageUp'; break
      case 'PageDown': keyName = 'PageDown'; break
      case 'ArrowUp': keyName = 'Up'; break
      case 'ArrowDown': keyName = 'Down'; break
      case 'ArrowLeft': keyName = 'Left'; break
      case 'ArrowRight': keyName = 'Right'; break
      case 'Pause': keyName = 'Pause'; break
      case 'PrintScreen': keyName = 'PrintScreen'; break
      case 'ScrollLock': keyName = 'ScrollLock'; break
      case 'Tab': keyName = 'Tab'; break
      case 'Minus': keyName = '-'; break
      case 'Equal': keyName = 'Plus'; break
      case 'BracketLeft': keyName = '['; break
      case 'BracketRight': keyName = ']'; break
      case 'Backslash': keyName = '\\'; break
      case 'Semicolon': keyName = ';'; break
      case 'Quote': keyName = "'"; break
      case 'Comma': keyName = ','; break
      case 'Period': keyName = '.'; break
      case 'Slash': keyName = '/'; break
      case 'Backquote': keyName = '`'; break
      default:
        if (e.key && e.key.length === 1) {
          keyName = e.key.toUpperCase()
        } else {
          keyName = e.code || e.key
        }
    }
  }

  if (!keyName) return { accelerator: null }

  // Teclas que podem ser usadas sozinhas globalmente sem travar a escrita em jogos
  const isAllowedSingleKey =
    /^F([1-9]|1[0-9]|2[0-4])$/i.test(keyName) ||
    ['Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'Pause', 'PrintScreen', 'ScrollLock', 'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9', 'numadd', 'numsub', 'nummult', 'numdiv'].includes(keyName)

  if (modifiers.length === 0 && !isAllowedSingleKey) {
    // Para teclados 60% e letras comuns: adiciona Alt por padrão para evitar travar digitação no PC
    return {
      accelerator: `Alt+${keyName}`,
      warning: `Para a tecla "${keyName}", adicionamos Alt ("Alt+${keyName}") para não bloquear sua digitação no Windows e nos jogos.`
    }
  }

  const accelerator = [...modifiers, keyName].join('+')
  return { accelerator }
}

export function formatKeyParts(keyStr: string): string[] {
  if (!keyStr || keyStr === 'none') return []
  return keyStr.split('+').map(part => {
    if (part === 'Control') return 'Ctrl'
    if (part === 'CommandOrControl') return 'Ctrl'
    if (part === 'Return') return 'Enter'
    return part
  })
}

export function GlobalShortcutRecorder({
  label,
  description,
  value,
  defaultValue,
  popularPresets = [],
  onChange
}: GlobalShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [heldModifiers, setHeldModifiers] = useState<string[]>([])
  const [manualText, setManualText] = useState('')
  const [isManualEdit, setIsManualEdit] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const keyParts = formatKeyParts(value)
  const isCustomDisabled = !value || value === 'none'

  // Listener global enquanto estiver gravando tecla
  useEffect(() => {
    if (!isRecording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setIsRecording(false)
        setHeldModifiers([])
        setFeedbackNotice(null)
        return
      }

      // Se for apenas tecla modificadora, atualiza o feedback em tempo real
      if (['Control', 'Shift', 'Alt', 'Meta', 'AltGraph'].includes(e.key)) {
        const mods: string[] = []
        if (e.ctrlKey) mods.push('Ctrl')
        if (e.altKey) mods.push('Alt')
        if (e.shiftKey) mods.push('Shift')
        setHeldModifiers(mods)
        return
      }

      const result = parseKeyboardEventToAccelerator(e)
      if (result.accelerator) {
        onChange(result.accelerator)
        setIsRecording(false)
        setHeldModifiers([])
        if (result.warning) {
          setFeedbackNotice(result.warning)
          setTimeout(() => setFeedbackNotice(null), 6000)
        } else {
          setFeedbackNotice(null)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const mods: string[] = []
      if (e.ctrlKey) mods.push('Ctrl')
      if (e.altKey) mods.push('Alt')
      if (e.shiftKey) mods.push('Shift')
      setHeldModifiers(mods)
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsRecording(false)
        setHeldModifiers([])
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('mousedown', handleClickOutside, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [isRecording, onChange])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualText.trim()
    if (!trimmed) return
    onChange(trimmed)
    setIsManualEdit(false)
  }

  return (
    <div
      ref={cardRef}
      style={{
        background: 'var(--bg-primary)',
        padding: '14px 16px',
        borderRadius: '10px',
        border: isRecording ? '1.5px solid #00f2fe' : '1px solid var(--border-color)',
        boxShadow: isRecording ? '0 0 16px rgba(0, 242, 254, 0.25)' : 'none',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* Header com Nome e Descrição */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
            {label}
          </span>
          {description && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {description}
            </span>
          )}
        </div>

        {/* Status Badge */}
        {!isCustomDisabled ? (
          <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
            ATIVO
          </span>
        ) : (
          <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
            DESATIVADO
          </span>
        )}
      </div>

      {/* Caixa de Exibição / Gravação do Atalho */}
      {!isManualEdit ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setIsRecording(true)
              setFeedbackNotice(null)
            }}
            style={{
              flex: 1,
              minHeight: '38px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: isRecording ? '1.5px solid #00f2fe' : '1px solid var(--border-color)',
              background: isRecording ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
            title="Clique para gravar um atalho personalizado do seu teclado"
          >
            {isRecording ? (
              <span style={{ color: '#00f2fe', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                {heldModifiers.length > 0 ? (
                  <>
                    {heldModifiers.map(m => (
                      <kbd key={m} style={{ background: 'rgba(0,242,254,0.2)', color: '#00f2fe', padding: '2px 6px', borderRadius: '4px', border: '1px solid #00f2fe', fontSize: '11px' }}>
                        {m}
                      </kbd>
                    ))}
                    <span>+ Pressione a próxima tecla...</span>
                  </>
                ) : (
                  'Pressione qualquer tecla ou combinação... (Esc cancela)'
                )}
              </span>
            ) : isCustomDisabled ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                Atalho Desativado (Clique para Gravar)
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {keyParts.map((part, idx) => (
                  <React.Fragment key={idx}>
                    <kbd
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        color: '#00f2fe',
                        border: '1px solid rgba(0, 242, 254, 0.35)',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '12px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      {part}
                    </kbd>
                    {idx < keyParts.length - 1 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </button>

          {/* Botão de Gravar / Mudar */}
          <button
            type="button"
            className="picker-close-btn"
            style={{
              margin: 0,
              padding: '7px 12px',
              fontSize: '11.5px',
              fontWeight: 600,
              background: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
              borderColor: isRecording ? '#ef4444' : 'var(--border-color)',
              color: isRecording ? '#ef4444' : 'var(--text-primary)'
            }}
            onClick={() => {
              if (isRecording) {
                setIsRecording(false)
                setHeldModifiers([])
              } else {
                setIsRecording(true)
                setFeedbackNotice(null)
              }
            }}
          >
            {isRecording ? 'Cancelar' : 'Gravar Tecla'}
          </button>

          {/* Botão Editar Texto Manual */}
          <button
            type="button"
            className="picker-close-btn"
            style={{ margin: 0, padding: '7px 9px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            title="Digitar nome da tecla manualmente"
            onClick={() => {
              setManualText(value !== 'none' ? value : '')
              setIsManualEdit(true)
              setIsRecording(false)
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          {/* Botão Limpar / Desativar */}
          {!isCustomDisabled && (
            <button
              type="button"
              className="picker-close-btn"
              style={{ margin: 0, padding: '7px 9px', fontSize: '11px', color: 'var(--text-muted)' }}
              title="Desativar atalho"
              onClick={() => onChange('none')}
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        /* Modo de Digitação Manual */
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Ex: Alt+M, Ctrl+Shift+X, Delete, F8..."
            autoFocus
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 700,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            className="picker-close-btn"
            style={{ margin: 0, padding: '6px 12px', fontSize: '11.5px', background: '#00f2fe', color: '#000', fontWeight: 700, border: 'none' }}
          >
            Salvar
          </button>
          <button
            type="button"
            className="picker-close-btn"
            style={{ margin: 0, padding: '6px 10px', fontSize: '11px' }}
            onClick={() => setIsManualEdit(false)}
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Aviso de feedback amigável para teclados 60% */}
      {feedbackNotice && (
        <div style={{ fontSize: '11.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', background: 'rgba(56, 189, 248, 0.25)', padding: '1px 5px', borderRadius: '4px' }}>Dica</span>
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Chips de Atalhos Rápidos Recomendados (Incluindo 60%) */}
      {popularPresets.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sugestões Rápidas:</span>
          {popularPresets.map(preset => {
            const isSelected = value === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                style={{
                  background: isSelected ? 'rgba(0, 242, 254, 0.2)' : 'var(--bg-secondary)',
                  border: isSelected ? '1px solid #00f2fe' : '1px solid var(--border-color)',
                  color: isSelected ? '#00f2fe' : 'var(--text-secondary)',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset}
              </button>
            )
          })}
          {value !== defaultValue && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                padding: '2px 4px',
                fontSize: '10.5px',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginLeft: 'auto'
              }}
            >
              Restaurar Padrão ({defaultValue})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
