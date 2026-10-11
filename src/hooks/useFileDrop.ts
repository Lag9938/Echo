import { useCallback, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { filesFromTransfer } from '../lib/attachments'

/** O que está sendo arrastado são arquivos? (arrastar texto ou uma imagem da própria conversa não conta) */
function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

/**
 * Arrastar arquivos para dentro de uma conversa. Espalhe `dropProps` no elemento que cobre a conversa e use
 * `isDragging` para mostrar a área de soltar.
 */
export function useFileDrop(onFiles: (files: File[]) => void, enabled = true) {
  const [isDragging, setIsDragging] = useState(false)
  // dragenter/dragleave disparam a cada filho por onde o mouse passa: só a contagem diz se saiu de verdade
  const depth = useRef(0)

  const onDragEnter = useCallback((event: DragEvent) => {
    if (!enabled || !carriesFiles(event)) return
    event.preventDefault()
    depth.current += 1
    setIsDragging(true)
  }, [enabled])

  const onDragOver = useCallback((event: DragEvent) => {
    if (!enabled || !carriesFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [enabled])

  const onDragLeave = useCallback((event: DragEvent) => {
    if (!enabled || !carriesFiles(event)) return
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setIsDragging(false)
  }, [enabled])

  const onDrop = useCallback((event: DragEvent) => {
    if (!enabled || !carriesFiles(event)) return
    event.preventDefault()
    depth.current = 0
    setIsDragging(false)
    const files = filesFromTransfer(event.dataTransfer)
    if (files.length > 0) onFiles(files)
  }, [enabled, onFiles])

  return { isDragging, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}
