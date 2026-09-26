import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getOrCreateSpaceInvite } from '../lib/spaceInvites'
import { getPublicInviteUrl } from '../lib/invite'

/**
 * Busca (ou cria) o convite do usuário para um espaço e monta o link compartilhável.
 * O código vem do servidor: não dá para montar um link de convite só com o ID do espaço.
 */
export function useSpaceInviteLink(spaceId: string | undefined, channelId?: string) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(spaceId))
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!spaceId || !supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    getOrCreateSpaceInvite(supabase, spaceId)
      .then(invite => {
        if (!cancelled) setCode(invite.code)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setCode(null)
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [spaceId, reloadKey])

  const reload = useCallback(() => setReloadKey(k => k + 1), [])
  const url = code ? getPublicInviteUrl(code, channelId) : ''

  return { code, url, loading, error, reload }
}
