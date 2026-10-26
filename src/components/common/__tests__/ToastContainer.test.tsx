import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastContainer } from '../ToastContainer'
import type { Toast } from '../../../types'

describe('ToastContainer', () => {
  it('não renderiza nada quando a lista de toasts estiver vazia', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onRemoveToast={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza toasts com badge, título e mensagem', () => {
    const toasts: Toast[] = [
      {
        id: 't1',
        title: 'Lucas Calheiros',
        message: 'E aí, tudo bem?',
        type: 'message',
        data: { type: 'dm', senderId: 'user-1' }
      }
    ]

    render(
      <ToastContainer
        toasts={toasts}
        onRemoveToast={vi.fn()}
      />
    )

    expect(screen.getByText('Lucas Calheiros')).not.toBeNull()
    expect(screen.getByText('E aí, tudo bem?')).not.toBeNull()
    expect(screen.getByText('MENSAGEM PRIVADA')).not.toBeNull()
  })

  it('chama onToastClick e onRemoveToast ao clicar no card', () => {
    const onToastClick = vi.fn()
    const onRemoveToast = vi.fn()
    const toasts: Toast[] = [
      {
        id: 't2',
        title: 'Mateus',
        message: 'Mencionou você em #geral',
        type: 'mention',
        data: { type: 'channel', channelId: 'ch-1' }
      }
    ]

    render(
      <ToastContainer
        toasts={toasts}
        onRemoveToast={onRemoveToast}
        onToastClick={onToastClick}
      />
    )

    const card = screen.getByRole('alert')
    fireEvent.click(card)

    expect(onToastClick).toHaveBeenCalledWith(toasts[0])
    expect(onRemoveToast).toHaveBeenCalledWith('t2')
  })

  it('chama onRemoveToast ao clicar no botão de fechar', () => {
    const onRemoveToast = vi.fn()
    const toasts: Toast[] = [
      {
        id: 't3',
        title: 'Aviso',
        message: 'Operação concluída',
        type: 'info'
      }
    ]

    render(
      <ToastContainer
        toasts={toasts}
        onRemoveToast={onRemoveToast}
      />
    )

    const closeBtn = screen.getByTitle('Fechar notificação')
    fireEvent.click(closeBtn)

    expect(onRemoveToast).toHaveBeenCalledWith('t3')
  })

  it('permite abrir resposta rápida e enviar mensagem', async () => {
    const onQuickReply = vi.fn().mockResolvedValue(true)
    const onRemoveToast = vi.fn()
    const toasts: Toast[] = [
      {
        id: 't4',
        title: 'Sarah',
        message: 'Bora jogar?',
        type: 'message',
        data: { type: 'dm', senderId: 'user-2' }
      }
    ]

    render(
      <ToastContainer
        toasts={toasts}
        onRemoveToast={onRemoveToast}
        onQuickReply={onQuickReply}
      />
    )

    // Clica em responder
    const replyBtn = screen.getByRole('button', { name: /Responder/i })
    fireEvent.click(replyBtn)

    // Campo de texto aparece
    const input = screen.getByPlaceholderText(/Responder para Sarah.../i)
    expect(input).not.toBeNull()

    // Digita e envia
    fireEvent.change(input, { target: { value: 'Bora agora!' } })
    const submitBtn = screen.getByTitle('Enviar resposta rápida')
    fireEvent.click(submitBtn)

    expect(onQuickReply).toHaveBeenCalledWith(toasts[0], 'Bora agora!')
  })
})
