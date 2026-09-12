import { useState, useEffect, useRef } from 'react'
import { ColoredLightningIcon } from '../ColoredIcons'
import { BadgeVipIcon, PaletteIcon, CopyIcon } from '../icons'

export interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSimulateSubscription: () => void
  isPremiumUser?: boolean
  onResetSubscription?: () => void
  userEmail?: string
  userName?: string
  onSubscriptionSuccess?: () => void
}

function ProCrownSvg({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="proCrownMetGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <path 
        d="M3 6L6.5 16H17.5L21 6L15.5 11L12 4L8.5 11L3 6Z" 
        fill="url(#proCrownMetGrad)" 
        stroke="#f59e0b" 
        strokeWidth="1.2" 
        strokeLinejoin="round" 
      />
      <circle cx="3" cy="6" r="1.5" fill="#fef08a" />
      <circle cx="12" cy="4" r="1.5" fill="#fef08a" />
      <circle cx="21" cy="6" r="1.5" fill="#fef08a" />
      <rect x="6.5" y="17.5" width="11" height="2" rx="1" fill="url(#proCrownMetGrad)" stroke="#f59e0b" strokeWidth="0.8" />
    </svg>
  )
}

function CloseSvg({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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

function ArrowLeftSvg({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

export function SubscriptionModal({
  isOpen,
  onClose,
  onSimulateSubscription,
  isPremiumUser = false,
  onResetSubscription,
  userEmail = '',
  userName = '',
  onSubscriptionSuccess
}: SubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'pix'>('overview')
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  // In-App Pix state
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

  // Reset states when closed
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('overview')
      setPixData(null)
      setPixError(null)
      setPaymentSuccess(false)
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [isOpen])

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
              } else {
                onSimulateSubscription()
              }
            }, 1600)
          }
        }
      } catch (err) {
        console.warn('[SubscriptionModal] Polling error:', err)
      }
    }, 3000)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [pixData?.paymentId, paymentSuccess, onSubscriptionSuccess, onSimulateSubscription])

  if (!isOpen) return null

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
    <div className="screen-picker-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="screen-picker-modal" 
        style={{ 
          maxWidth: '480px', 
          padding: '24px',
          background: '#0f1117',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
          position: 'relative'
        }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            width: '28px',
            height: '28px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
          }}
          title="Fechar"
        >
          <CloseSvg size={14} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.04) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 12px auto',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.15)'
          }}>
            <ProCrownSvg size={26} />
          </div>

          <h2 style={{ 
            fontSize: '21px', 
            fontWeight: '800', 
            color: '#fff', 
            margin: '0 0 4px 0',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            Echo <span style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '900'
            }}>PRO</span>
            {isPremiumUser && (
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 7px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                color: '#34d399',
                letterSpacing: '0.04em'
              }}>
                ATIVO
              </span>
            )}
          </h2>
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--text-secondary, #94a3b8)', 
            margin: 0,
            lineHeight: '1.4'
          }}>
            {isPremiumUser 
              ? 'Sua conta possui acesso ilimitado aos recursos PRO (60 FPS, temas e insígnia VIP).'
              : 'Desbloqueie recursos avançados de transmissão e personalização.'}
          </p>
        </div>

        {isPremiumUser ? (
          <div>
            {/* Real Perks List (Active State) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <CheckmarkSvg size={18} color="#34d399" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    Transmissão 60 FPS Desbloqueada
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                    Você pode selecionar 60 quadros por segundo em qualquer compartilhamento de tela.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  fontWeight: '700',
                  fontSize: '13px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                disabled={loadingCheckout}
                onClick={handleOpenCardCheckout}
              >
                {loadingCheckout ? 'Abrindo Asaas...' : 'Gerenciar Assinatura no Asaas'}
              </button>

              {onResetSubscription && (
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    fontWeight: '600',
                    fontSize: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#f87171',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={onResetSubscription}
                >
                  Voltar para Conta Gratuita (Desativar Pro)
                </button>
              )}
            </div>
          </div>
        ) : activeTab === 'overview' ? (
          <div>
            {/* Real Perks List (100% Authentic Features in Code) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px'
            }}>
              {/* Perk 1: 60 FPS Streaming */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '11px 13px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <ColoredLightningIcon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                      Transmissão a 60 FPS
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#fbbf24'
                    }}>
                      60 FPS
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                    Transmita suas telas e jogos com 60 quadros por segundo e ultra fluidez.
                  </div>
                </div>
              </div>

              {/* Perk 2: Echo VIP Profile Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '11px 13px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(129, 140, 248, 0.12)',
                  border: '1px solid rgba(129, 140, 248, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <BadgeVipIcon style={{ width: '18px', height: '18px' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    Distintivo Echo VIP
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                    Insígnia exclusiva de apoiador desbloqueada no seu perfil e configurações.
                  </div>
                </div>
              </div>

              {/* Perk 3: Premium Themes */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '11px 13px'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}>
                  <PaletteIcon style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    Temas Exclusivos
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                    Acesso completo a todas as paletas e temas visuais protegidos na aba Aparência.
                  </div>
                </div>
              </div>
            </div>

            {/* Price Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'baseline', 
              justifyContent: 'center', 
              gap: '6px', 
              marginBottom: '14px',
              padding: '2px 0'
            }}>
              <span style={{ fontSize: '26px', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em' }}>
                R$ 9,90
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', fontWeight: '500' }}>
                / mês
              </span>
            </div>

            {/* Direct Dual Payment Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Option 1: Pagar com Pix (In-App) */}
                <button
                  type="button"
                  onClick={() => setActiveTab('pix')}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(5, 150, 105, 0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px' }}>
                    <PixSvg size={16} />
                    <span>Pagar com Pix</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#a7f3d0', fontWeight: '600' }}>
                    QR Code no App • Instantâneo
                  </span>
                </button>

                {/* Option 2: Assinar no Cartão (Asaas) */}
                <button
                  type="button"
                  onClick={handleOpenCardCheckout}
                  disabled={loadingCheckout}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.25)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(217, 119, 6, 0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(217, 119, 6, 0.25)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '13px' }}>
                    <CreditCardSvg size={16} />
                    <span>Assinar no Cartão</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#fde68a', fontWeight: '600' }}>
                    {loadingCheckout ? 'Abrindo...' : 'Mensal no Asaas'}
                  </span>
                </button>
              </div>

              <div style={{ 
                textAlign: 'center', 
                fontSize: '10px', 
                color: 'var(--text-muted, #64748b)', 
                marginTop: '4px' 
              }}>
                Pagamento processado com segurança pela instituição Asaas. Cancele quando quiser.
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Top Back Navigation */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '14px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overview')
                  setPixError(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#fff'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)'
                  e.currentTarget.style.background = 'none'
                }}
              >
                <ArrowLeftSvg size={14} /> Voltar aos benefícios
              </button>

              <span style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <PixSvg size={14} /> Pix no App
              </span>
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
                  Abra o app do seu banco, escolha Pix e escaneie ou cole a chave abaixo:
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontWeight: '700',
                    fontSize: '12px',
                    background: copiedPix ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    border: copiedPix ? '1px solid #10b981' : '1px solid rgba(16, 185, 129, 0.3)',
                    color: copiedPix ? '#34d399' : '#10b981',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '12px',
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
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  fontSize: '11px', 
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.08)',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  marginBottom: '12px' 
                }}>
                  <span className="channel-live-pulse-dot" style={{ width: 6, height: 6, background: '#38bdf8', borderRadius: '50%' }} />
                  Aguardando confirmação bancária em tempo real...
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
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
                    title="Abrir página Pix do Asaas no navegador"
                  >
                    Abrir no navegador <ExternalLinkSvg size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGeneratePix}>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

                  <div style={{ textAlign: 'center', marginTop: '4px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '11px',
                        color: 'var(--text-secondary, #94a3b8)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'underline'
                      }}
                      onClick={handleOpenPixWebCheckout}
                    >
                      Prefere pagar pelo site do Asaas? Clique aqui <ExternalLinkSvg size={11} />
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
