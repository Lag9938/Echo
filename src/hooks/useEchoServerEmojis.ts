import { useState } from 'react'
import type { ServerEmoji, Space } from '../types'
import type { User } from '@supabase/supabase-js'

export interface UseEchoServerEmojisOptions {
  editingSpace: Space | null
  user: User
  addAuditLog: (spaceId: string, action: string) => void
  showToast: (title: string, message: string, type?: any) => void
  supabase: any
}

export function useEchoServerEmojis({
  editingSpace,
  user,
  addAuditLog,
  showToast,
  supabase
}: UseEchoServerEmojisOptions) {
  const [serverEmojis, setServerEmojis] = useState<ServerEmoji[]>([])
  const [newEmojiName, setNewEmojiName] = useState('')
  const [uploadingEmoji, setUploadingEmoji] = useState(false)

  function loadSpaceEmojis(spaceId: string) {
    try {
      const saved = localStorage.getItem(`echo-space-emojis-${spaceId}`)
      if (saved) {
        setServerEmojis(JSON.parse(saved))
      } else {
        setServerEmojis([])
      }
    } catch {
      setServerEmojis([])
    }
  }

  function saveEmojisForSpace(spaceId: string, emojiList: ServerEmoji[]) {
    setServerEmojis(emojiList)
    localStorage.setItem(`echo-space-emojis-${spaceId}`, JSON.stringify(emojiList))
  }

  async function handleCreateEmoji(file: File, name: string) {
    if (!editingSpace) return
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    if (!cleanName) {
      showToast("Nome Inválido", "Digite um nome válido para o emoji (letras, números e _).", "info")
      return
    }
    setUploadingEmoji(true)
    try {
      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `spaces/${editingSpace.id}/emojis/${cleanName}_${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          const newEmoji: ServerEmoji = {
            id: `emoji-${Date.now()}`,
            name: cleanName,
            url: urlData.publicUrl,
            created_at: new Date().toISOString(),
            creator_id: user.id
          }
          const updated = [...serverEmojis, newEmoji]
          saveEmojisForSpace(editingSpace.id, updated)
          addAuditLog(editingSpace.id, `Criou o emoji :${cleanName}:`)
          showToast("Emoji Criado!", `Emoji :${cleanName}: adicionado com sucesso.`, "info")
          setNewEmojiName('')
          setUploadingEmoji(false)
          return
        }
      }

      const reader = new FileReader()
      reader.onload = () => {
        const newEmoji: ServerEmoji = {
          id: `emoji-${Date.now()}`,
          name: cleanName,
          url: reader.result as string,
          created_at: new Date().toISOString(),
          creator_id: user.id
        }
        const updated = [...serverEmojis, newEmoji]
        saveEmojisForSpace(editingSpace.id, updated)
        addAuditLog(editingSpace.id, `Criou o emoji :${cleanName}:`)
        showToast("Emoji Criado!", `Emoji :${cleanName}: adicionado com sucesso.`, "info")
        setNewEmojiName('')
        setUploadingEmoji(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showToast("Erro ao criar emoji", err.message || "Falha no upload", "info")
      setUploadingEmoji(false)
    }
  }

  function handleDeleteEmoji(emojiId: string) {
    if (!editingSpace) return
    const target = serverEmojis.find(e => e.id === emojiId)
    if (!target) return
    const updated = serverEmojis.filter(e => e.id !== emojiId)
    saveEmojisForSpace(editingSpace.id, updated)
    addAuditLog(editingSpace.id, `Excluiu o emoji :${target.name}:`)
    showToast("Emoji Excluído", `Emoji :${target.name}: foi removido.`, "info")
  }

  return {
    serverEmojis,
    setServerEmojis,
    newEmojiName,
    setNewEmojiName,
    uploadingEmoji,
    setUploadingEmoji,
    loadSpaceEmojis,
    saveEmojisForSpace,
    handleCreateEmoji,
    handleDeleteEmoji
  }
}
