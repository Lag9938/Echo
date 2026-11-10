import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../hooks/useSpaceInviteLink', () => ({
  useSpaceInviteLink: () => ({ code: 'abc123', url: 'https://echo/invite/?code=abc123', loading: false, error: null })
}))

import { ChannelInviteModal } from '../ChannelInviteModal'
import { useVoiceStore } from '../../../stores/useVoiceStore'

const friend = (id: string, name: string) => ({ id: `f-${id}`, status: 'accepted', user: { id, display_name: name } }) as any

describe('convidar para a chamada (estilo novo)', () => {
  beforeEach(() => {
    useVoiceStore.setState({ activeVoiceChannelId: null, participants: [], spaceVoiceUsers: { vc1: [{ userId: 'lucao' }] } } as any)
  })

  it('quem já está na sala aparece como "Na chamada", no fim da lista; os outros podem ser chamados', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined)
    const { container, getAllByText } = render(
      <ChannelInviteModal
        channel={{ id: 'vc1', name: 'bate-papo', type: 'voice' } as any}
        space={{ id: 's1', name: 'Trupe Fantasma' } as any}
        onClose={() => {}}
        friendships={[friend('lucao', 'Lucão'), friend('nadya', 'nadya linda')]}
        onlineUsers={new Set(['lucao'])}
        onSendDMInvite={onSend}
        showToast={() => {}}
      />
    )
    expect(container.querySelector('.invite-title p')?.textContent).toBe('Trupe Fantasma · 1 na chamada')
    const names = [...container.querySelectorAll('.invite-friend-name')].map(n => n.textContent)
    expect(names).toEqual(['nadya linda', 'Lucão'])
    expect(container.querySelector('.invite-act.in')?.textContent).toBe('Na chamada')

    fireEvent.click(getAllByText('Chamar')[0])
    await waitFor(() => expect(container.querySelector('.invite-act.sent')?.textContent).toContain('Enviado'))
    expect(onSend).toHaveBeenCalledWith('nadya', expect.stringContaining('https://echo/invite/?code=abc123'))
  })
})
