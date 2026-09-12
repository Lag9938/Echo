import { useState, useEffect, useRef } from 'react'
import { ColoredLightningIcon } from '../../components/ColoredIcons'
import { BadgeVipIcon, PaletteIcon, CopyIcon } from '../../components/icons'

export interface SubscriptionTabProps {
  isPremiumUser: boolean
  onSimulateSubscription?: () => void
  onResetSubscription?: () => void
  userEmail?: string
  userName?: string
  onSubscriptionSuccess?: () => void
}

function ProCrownSvg({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="subProCrownGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path 
        d="M3 6L6.5 16H17.5L21 6L15.5 11L12 4L8.5 11L3 6Z" 
        fill="url(#subProCrownGrad)" 
        stroke="#f59e0b" 
        strokeWidth="1.2" 
        strokeLinejoin="round" 
      />
      <circle cx="3" cy="6" r="1.5" fill="#fef08a" />
      <circle cx="12" cy="4" r="1.5" fill="#fef08a" />
      <circle cx="21" cy="6" r="1.5" fill="#fef08a" />
      <rect x="6.5" y="17.5" width="11" height="2" rx="1" fill="url(#subProCrownGrad)" stroke="#f59e0b" strokeWidth="0.8" />
    </svg>
  )
}

function CheckmarkSvg({ size = 16, color = '#10b981' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PixSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.54 13.65l-3.08-3.08a.65.65 0 0 0-.92 0l-3.08 3.08a1.95 1.95 0 0 1-2.76 0L4.1 12.05a1.95 1.95 0 0 1 0-2.76l4.6-4.6a1.95 1.95 0 0 1 2.76 0l4.6 4.6a1.95 1.95 0 0 1 0 2.76l-1.6 1.6a.65.65 0 0 0 0 .92l1.08 1.08z" opacity="0.85" />
      <path d="M8.46 10.35l3.08 3.08a.65.65 0 0 0 .92 0l3.08-3.08a1.95 1.95 0 0 1 2.76 0l1.6 1.6a1.95 1.95 0 0 1 0 2.76l-4.6 4.6a1.95 1.95 0 0 1-2.76 0l-4.6-4.6a1.95 1.95 0 0 1 0-2.76l1.6-1.6a.65.65 0 0 0 0-.92L7.38 8.27z" />
    </svg>
  )
}

function CreditCardSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="6" cy="15" r="1" fill="currentColor" />
    </svg>
  )
}

function ExternalLinkSvg({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function SubscriptionTab({
  isPremiumUser,
  onSimulateSubscription,
  onResetSubscription,
  userEmail = '',
  userName = '',
  onSubscriptionSuccess
}: SubscriptionTabProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [showPixModule, setShowPixModule] = useState(false)

  // In-Tab Pix state
  const [fullName, setFullName] = useState(userName || '')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [pixLoading, setPixLoading] = useState(false)
  const [pixError, setPixError] = useState<string | null>(null)
  const [pixData, setPixData] = useState<{
    paymentId: string
    qrCodeImage: string | null
    copyPaste: string | null
    value: number
  } | null>(null)
  const [copiedPix, setCopiedPix] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const pollTimerRef = useRef<any>(null)

  // Polling for Pix payment status
  useEffect(() => {
    if (!pixData?.paymentId || paymentSuccess) return

    pollTimerRef.current = setInterval(async () => {
      try {
        if ((window as any).electronAPI?.asaasCheckPaymentStatus) {
          const res = await (window as any).electronAPI.asaasCheckPaymentStatus(pixData.paymentId)
          if (res && res.isPaid) {
            setPaymentSuccess(true)
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
            setTimeout(() => {
              if (onSubscriptionSuccess) {
                onSubscriptionSuccess()
              } else if (onSimulateSubscription) {
                onSimulateSubscription()
              }
            }, 1600)
          }
        }
      } catch (err) {
        console.warn('[SubscriptionTab] Polling error:', err)
      }
    }, 3000)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [pixData?.paymentId, paymentSuccess, onSubscriptionSuccess, onSimulateSubscription])

  const handleOpenCardCheckout = async () => {
    setLoadingCheckout(true)
    let url = 'https://www.asaas.com/c/1gt86ha34vf8us16'
    try {
      if ((window as any).electronAPI?.asaasGetCheckoutUrl) {
        const res = await (window as any).electronAPI.asaasGetCheckoutUrl()
        if (res && (res.cardUrl || res.url)) {
          url = res.cardUrl || res.url
        }
      }
    } catch (e) {
      console.warn('Fallback URL used:', e)
    } finally {
      setLoadingCheckout(false)
    }

    if ((window as any).electronAPI?.openExternal) {
      ;(window as any).electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleOpenPixWebCheckout = async () => {
    let url = 'https://www.asaas.com/c/btwdghfsbzw95dhd'
    try {
      if ((window as any).electronAPI?.asaasGetCheckoutUrl) {
        const res = await (window as any).electronAPI.asaasGetCheckoutUrl()
        if (res && res.pixUrl) {
          url = res.pixUrl
        }
      }
    } catch (e) {
      console.warn('Fallback Pix web URL used:', e)
    }

    if ((window as any).electronAPI?.openExternal) {
      ;(window as any).electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault()
    setPixError(null)
    setPixLoading(true)

    try {
      if (!(window as any).electronAPI?.asaasCreatePixCharge) {
        throw new Error('Geração de Pix disponível no aplicativo desktop.')
      }

      const cleanCpf = cpfCnpj.replace(/\D/g, '')
      if (cleanCpf.length < 11) {
        throw new Error('Informe um CPF válido (11 dígitos).')
      }

      const res = await (window as any).electronAPI.asaasCreatePixCharge({
        name: fullName.trim() || 'Usuário Echo',
        email: userEmail.trim(),
        cpfCnpj: cleanCpf,
        value: 9.90
      })

      if (!res || !res.success) {
        throw new Error(res?.error || 'Não foi possível gerar a cobrança Pix. Verifique os dados inseridos.')
      }

      setPixData({
        paymentId: res.paymentId,
        qrCodeImage: res.qrCodeImage,
        copyPaste: res.copyPaste,
        value: res.value || 9.90
      })
    } catch (err: any) {
      setPixError(err.message || 'Erro ao comunicar com o gateway Asaas.')
    } finally {
      setPixLoading(false)
    }
  }

  const handleCopyPix = () => {
    if (pixData?.copyPaste) {
      navigator.clipboard.writeText(pixData.copyPaste)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2500)
    }
  }

  const formatCpf = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 3) return nums
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`
  }

  return (
    <div className="settings-container" style={{ maxWidth: '820px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 6px 0' }}>
          <span>Gestão da Assinatura</span>
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            padding: '2px 8px',
            borderRadius: '6px',
            background: isPremiumUser ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            border: isPremiumUser ? '1px solid #10b981' : '1px solid #f59e0b',
            color: isPremiumUser ? '#34d399' : '#fbbf24',
            letterSpacing: '0.04em'
          }}>
            {isPremiumUser ? 'PRO ATIVO' : 'ECHO PRO'}
          </span>
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary, #94a3b8)', fontSize: '13px' }}>
          Gerencie seu plano Echo Pro, consulte formas de pagamento e acompanhe seus benefícios exclusivos.
        </p>
      </div>

      {/* Plan Status Card */}
      <div style={{
        background: isPremiumUser 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)'
          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: isPremiumUser 
          ? '1px solid rgba(16, 185, 129, 0.3)' 
          : '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '14px',
        padding: '22px 24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: isPremiumUser
                ? 'rgba(16, 185, 129, 0.15)'
                : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.08) 100%)',
              border: isPremiumUser ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.4)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}>
              {isPremiumUser ? (
                <CheckmarkSvg size={28} color="#10b981" />
              ) : (
                <ProCrownSvg size={28} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                  {isPremiumUser ? 'Echo Pro Mensal' : 'Plano Gratuito'}
                </h3>
                {isPremiumUser && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    <span className="channel-live-pulse-dot" style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%' }} />
                    Assinatura Ativa
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                {isPremiumUser
                  ? 'Todos os recursos de alta performance (60 FPS, distintivo VIP e temas) estão liberados para sua conta.'
                  : 'Sua conta está limitada a 30 FPS na transmissão de tela e temas padrão.'}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>
              R$ 9,90
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
              {isPremiumUser ? 'por mês (recorrente)' : 'por mês para assinar'}
            </div>
          </div>
        </div>

        {/* Action Buttons inside Status Card */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '16px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {isPremiumUser ? (
            <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleOpenCardCheckout}
                disabled={loadingCheckout}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease'
                }}
              >
                <span>{loadingCheckout ? 'Abrindo Asaas...' : 'Gerenciar no Asaas (Faturas / Cartão)'}</span>
                <ExternalLinkSvg size={11} />
              </button>

              {onResetSubscription && (
                <button
                  type="button"
                  onClick={onResetSubscription}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Voltar para Conta Gratuita (Desativar Pro)
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPixModule(true)
                  setPixError(null)
                }}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '11px 16px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <PixSvg size={16} />
                <span>Pagar com Pix (R$ 9,90)</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCardCheckout}
                disabled={loadingCheckout}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  padding: '11px 16px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <CreditCardSvg size={16} />
                <span>Assinar no Cartão (R$ 9,90/mês)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* In-Page Pix Module */}
      {showPixModule && !isPremiumUser && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PixSvg size={18} />
              Pagamento Instantâneo via Pix (R$ 9,90)
            </h3>
            <button
              type="button"
              onClick={() => setShowPixModule(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary, #94a3b8)',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕ Fechar
            </button>
          </div>

          {paymentSuccess ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px auto'
              }}>
                <CheckmarkSvg size={26} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', margin: '0 0 6px 0' }}>
                Pagamento Confirmado!
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', margin: 0 }}>
                Sua conta foi atualizada para Echo Pro. A transmissão a 60 FPS já está desbloqueada!
              </p>
            </div>
          ) : pixData ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                background: '#fff', 
                padding: '12px', 
                borderRadius: '12px', 
                display: 'inline-block',
                marginBottom: '14px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                {pixData.qrCodeImage ? (
                  <img 
                    src={pixData.qrCodeImage} 
                    alt="QR Code Pix" 
                    style={{ width: '160px', height: '160px', display: 'block' }} 
                  />
                ) : (
                  <div style={{ width: '160px', height: '160px', display: 'grid', placeItems: 'center', color: '#000', fontSize: '11px' }}>
                    QR Code indisponível
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#fff', fontWeight: '600', marginBottom: '4px' }}>
                Valor: R$ {Number(pixData.value || 9.90).toFixed(2).replace('.', ',')}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '12px' }}>
                Abra o app do seu banco, selecione Pix e escaneie o código ou use a chave Copia e Cola:
              </div>

              <button
                type="button"
                onClick={handleCopyPix}
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  padding: '11px 14px',
                  fontWeight: '700',
                  fontSize: '12px',
                  background: copiedPix ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  border: copiedPix ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
                  color: copiedPix ? '#34d399' : '#10b981',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  margin: '0 auto 12px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                {copiedPix ? (
                  <>
                    <CheckmarkSvg size={14} color="#34d399" /> Código Pix Copiado com Sucesso!
                  </>
                ) : (
                  <>
                    <CopyIcon style={{ width: '14px', height: '14px' }} /> Copiar Código Pix Copia e Cola
                  </>
                )}
              </button>

              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '11px', 
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.08)',
                padding: '7px 14px',
                borderRadius: '6px',
                marginBottom: '14px' 
              }}>
                <span className="channel-live-pulse-dot" style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: '50%' }} />
                Aguardando confirmação bancária em tempo real...
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: 'var(--text-secondary, #94a3b8)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={() => setPixData(null)}
                >
                  Gerar novo código
                </button>

                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={handleOpenPixWebCheckout}
                >
                  Abrir no navegador <ExternalLinkSvg size={11} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGeneratePix} style={{ maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary, #94a3b8)', marginBottom: '4px' }}>
                  CPF do Titular
                </label>
                <input
                  type="text"
                  required
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '7px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#fff',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)', marginTop: '3px', display: 'block' }}>
                  Exigido pelas normas do Banco Central para registro do QR Code Pix.
                </span>
              </div>

              {pixError && (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  fontSize: '11px',
                  marginBottom: '12px'
                }}>
                  {pixError}
                </div>
              )}

              <button
                type="submit"
                disabled={pixLoading}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontWeight: '700',
                  fontSize: '13px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                }}
              >
                <PixSvg size={16} />
                {pixLoading ? 'Gerando cobrança Pix...' : 'Gerar QR Code Pix (R$ 9,90)'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Perks Comparison Grid */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: '0 0 12px 0' }}>
          Benefícios do Echo Pro
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
          {/* Perk 1 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '12px'
            }}>
              <ColoredLightningIcon size={20} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Transmissão a 60 FPS
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.4' }}>
              Transmita seus jogos e telas com ultra fluidez a 60 quadros por segundo e aceleração de hardware nativa.
            </div>
          </div>

          {/* Perk 2 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(129, 140, 248, 0.12)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '12px'
            }}>
              <BadgeVipIcon style={{ width: '20px', height: '20px' }} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Distintivo Echo VIP
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.4' }}>
              Insígnia dourada exclusiva de apoiador vinculada ao seu perfil público e exibida nos canais de voz.
            </div>
          </div>

          {/* Perk 3 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '12px'
            }}>
              <PaletteIcon style={{ width: '18px', height: '18px', color: '#38bdf8' }} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Temas Exclusivos
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', lineHeight: '1.4' }}>
              Acesso irrestrito a todas as paletas e temas visuais protegidos na aba Aparência do aplicativo.
            </div>
          </div>
        </div>
      </div>

      {/* Security & Payment Details Footer */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
            Processamento financeiro regulamentado pelo Banco Central via <strong>Asaas S.A.</strong>
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
          Sem carência ou multas • Cancele quando desejar
        </div>
      </div>
    </div>
  )
}
