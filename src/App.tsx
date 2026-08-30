import { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { useVoiceChannel } from './lib/useVoiceChannel'
import type { VoiceParticipant } from './lib/useVoiceChannel'
import './App.css'

type Page = 'Amigos' | 'Mensagens' | 'Servidores' | 'Descobrir' | 'Configurações'
type Space = { id: string; name: string; description: string; creator_id: string }
type Channel = { id: string; name: string; type: 'text' | 'voice'; space_id: string }
type Message = { 
  id: string; 
  body: string; 
  created_at: string; 
  author_id: string; 
  profile?: { display_name: string; avatar_url?: string };
  attachment_url?: string;
  attachment_type?: string;
}

type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
}

type Toast = {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'message' | 'friend';
}

type FriendshipRequest = {
  id: string
  user: { id: string; display_name: string; avatar_url?: string }
  status: 'pending' | 'accepted'
  initiatorId: string
}

/* ── Modern SVG Icons for Call Controls ──────────────── */
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.18 1.57"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function ScreenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  )
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" fill="currentColor"/>
    </svg>
  )
}

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function HashtagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function formatMessageText(text: string, userDisplayName?: string): React.ReactNode {
  if (!text) return "";

  // Detect code blocks first
  const blockCodeRegex = /```([\s\S]+?)```/g;
  const blockParts = text.split(blockCodeRegex);

  return blockParts.map((blockPart, blockIndex) => {
    // Odd index means it is a code block
    if (blockIndex % 2 === 1) {
      return (
        <pre 
          key={`block-c-${blockIndex}`} 
          style={{ 
            fontFamily: 'monospace', 
            background: 'var(--bg-tertiary)', 
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '0.9em',
            overflowX: 'auto',
            border: '1.5px solid var(--border-color)',
            margin: '8px 0',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-primary)',
            textAlign: 'left'
          }}
        >
          <code>{blockPart}</code>
        </pre>
      );
    }

    // Process URLs on normal text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = blockPart.split(urlRegex);

    return (
      <span key={blockIndex}>
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            return (
              <a 
                key={index} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}
              >
                {part}
              </a>
            );
          }

          // Format bold, italic, strikethrough, inline code and mentions
          let subParts: (string | React.ReactNode)[] = [part];

          // Bold: **text**
          const boldRegex = /\*\*([^*]+)\*\*/g;
          subParts = subParts.flatMap(sp => {
            if (typeof sp !== 'string') return sp;
            const bParts = sp.split(boldRegex);
            return bParts.map((bp, i) => {
              if (i % 2 === 1) return <strong key={`b-${i}`}>{bp}</strong>;
              return bp;
            });
          });

          // Italic: *text*
          const italicRegex = /\*([^*]+)\*/g;
          subParts = subParts.flatMap(sp => {
            if (typeof sp !== 'string') return sp;
            const iParts = sp.split(italicRegex);
            return iParts.map((ip, i) => {
              if (i % 2 === 1) return <em key={`i-${i}`}>{ip}</em>;
              return ip;
            });
          });

          // Strikethrough: ~~text~~
          const strikeRegex = /~~([^~]+)~~/g;
          subParts = subParts.flatMap(sp => {
            if (typeof sp !== 'string') return sp;
            const sParts = sp.split(strikeRegex);
            return sParts.map((spart, i) => {
              if (i % 2 === 1) return <span key={`s-${i}`} style={{ textDecoration: 'line-through' }}>{spart}</span>;
              return spart;
            });
          });

          // Inline code: `text`
          const codeRegex = /`([^`]+)`/g;
          subParts = subParts.flatMap(sp => {
            if (typeof sp !== 'string') return sp;
            const cParts = sp.split(codeRegex);
            return cParts.map((cp, i) => {
              if (i % 2 === 1) {
                return (
                  <code 
                    key={`c-${i}`} 
                    style={{ 
                      fontFamily: 'monospace', 
                      background: 'var(--bg-tertiary)', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '0.9em',
                      color: 'var(--accent-color)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {cp}
                  </code>
                );
              }
              return cp;
            });
          });

          // Mentions: @username
          if (userDisplayName) {
            const escapedName = userDisplayName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const mentionRegex = new RegExp(`(@${escapedName})`, 'gi');
            subParts = subParts.flatMap(sp => {
              if (typeof sp !== 'string') return sp;
              const mParts = sp.split(mentionRegex);
              return mParts.map((mp, i) => {
                if (i % 2 === 1) return <span key={`m-${i}`} className="mention-tag">{mp}</span>;
                return mp;
              });
            });
          }

          return <span key={index}>{subParts}</span>;
        })}
      </span>
    );
  });
}

function copyToClipboard(text: string): boolean {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("navigator.clipboard failed, trying fallback", e);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed", err);
    return false;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])
  if (loading) return <div className="loading-screen"><div className="loader" /><span>Abrindo o Echo…</span></div>
  if (!isSupabaseConfigured) return <div className="loading-screen">A conexão com o banco ainda não foi configurada.</div>
  return user ? <Echo user={user} /> : <Auth />
}

function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setBusy(true); setNotice('')
    if (mode === 'signup') {
      const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
      if (error) setNotice(error.message)
      else if (!data.session) setNotice('Conta criada! Faça login para acessar.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setNotice(error.message)
    }
    setBusy(false)
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <h1>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h1>
        <p>Converse, crie e encontre sua comunidade.</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Seu nome<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label>}
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no Echo' : 'Criar conta'}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice('') }}>
          {mode === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tenho uma conta'}
        </button>
      </section>
    </main>
  )
}

function Echo({ user }: { user: User }) {
  const [page, setPage] = useState<Page>('Servidores')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null)
  const [spaceChannels, setSpaceChannels] = useState<Record<string, Channel[]>>({})
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [newSpace, setNewSpace] = useState('')
  const [creating, setCreating] = useState(false)
  const [joinSpaceCode, setJoinSpaceCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [showNewChannel, setShowNewChannel] = useState<string | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text')
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false)
  const [addSpaceModalTab, setAddSpaceModalTab] = useState<'options' | 'create' | 'join'>('options')

  // DM and notification states
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [selectedDMUserId, setSelectedDMUserId] = useState<string | null>(null)
  const [dmDraft, setDmDraft] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pendingFriendCount, setPendingFriendCount] = useState(0)
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({})
  const [isUploading, setIsUploading] = useState(false)

  const showToast = (title: string, message: string, type: 'info' | 'message' | 'friend' = 'info') => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Space/Server Settings States
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [editingSpaceName, setEditingSpaceName] = useState('')
  const [editingSpaceDescription, setEditingSpaceDescription] = useState('')
  const [activeSpaceTab, setActiveSpaceTab] = useState<'geral' | 'channels'>('geral')
  const [showSpaceSettingsModal, setShowSpaceSettingsModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [spaceMembers, setSpaceMembers] = useState<any[]>([])
  const [showMembersList, setShowMembersList] = useState(true)
  const [showVoiceChat, setShowVoiceChat] = useState(false)
  const [showVoiceMembers, setShowVoiceMembers] = useState(false)
  const [customStatus, setCustomStatus] = useState(() => localStorage.getItem('echo-custom-status') || '')
  const [presenceData, setPresenceData] = useState<Record<string, any>>({})
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set())
  const selectedChannelRef = useRef(selectedChannel)
  const presenceChannelRef = useRef<any>(null)

  useEffect(() => {
    selectedChannelRef.current = selectedChannel
    if (selectedChannel) {
      setUnreadChannels(prev => {
        if (!prev.has(selectedChannel.id)) return prev
        const next = new Set(prev)
        next.delete(selectedChannel.id)
        return next
      })
    }
  }, [selectedChannel])

  const displayName = (user.user_metadata.display_name as string | undefined) || user.email?.split('@')[0] || 'Você'

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('echo-theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme')
    } else {
      document.body.classList.remove('dark-theme')
    }
    localStorage.setItem('echo-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Voice hook and state
  const { 
    participants, 
    isMuted, 
    isConnected, 
    localScreenStream,
    joinVoice, 
    leaveVoice, 
    toggleMute,
    startScreenShare,
    stopScreenShare,
    changeInputDevice,
    changeOutputDevice,
    changeScreenShareSettings,
    changePeerVolume,
    changePeerScreenVolume
  } = useVoiceChannel()

  // Local profile states
  const [profileDisplayName, setProfileDisplayName] = useState(displayName)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')

  useEffect(() => {
    async function loadUserProfile() {
      if (!supabase) return
      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
      if (data) {
        if (data.display_name) setProfileDisplayName(data.display_name)
        if (data.avatar_url) setProfileAvatarUrl(data.avatar_url)
      }
    }
    loadUserProfile()
  }, [user.id])

  // Local volumes state
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('echo-user-volumes')
    return saved ? JSON.parse(saved) : {}
  })

  // Selected participant for local volume control modal
  const [volumeControlUser, setVolumeControlUser] = useState<VoiceParticipant | null>(null)

  // Sincronizar volumes locais sempre que participantes ou volumes mudarem
  useEffect(() => {
    participants.forEach(p => {
      if (p.userId !== user.id) {
        const vol = userVolumes[p.userId] !== undefined ? userVolumes[p.userId] : 100
        changePeerVolume(p.userId, vol / 100)
      }
    })
  }, [participants, userVolumes, changePeerVolume])

  // Local screenshare volumes state
  const [peerScreenVolumes, setPeerScreenVolumes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('echo-peer-screen-volumes')
    return saved ? JSON.parse(saved) : {}
  })

  // Synchronize peer screenshare volumes
  useEffect(() => {
    participants.forEach(p => {
      if (p.userId !== user.id) {
        const vol = peerScreenVolumes[p.userId] !== undefined ? peerScreenVolumes[p.userId] : 100
        changePeerScreenVolume(p.userId, vol / 100)
      }
    })
  }, [participants, peerScreenVolumes, changePeerScreenVolume])

  const activeScreenSharer = participants.find(p => p.screenStream !== undefined)
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null)
  const [screenSources, setScreenSources] = useState<any[]>([])
  const [showScreenPicker, setShowScreenPicker] = useState(false)
  const [isScreenFullScreen, setIsScreenFullScreen] = useState(false)

  // Exit fullscreen on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsScreenFullScreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Screen settings state
  const [screenQuality, setScreenQuality] = useState<'720p' | '1080p' | 'native'>('720p')
  const [screenFps, setScreenFps] = useState<15 | 30 | 60>(30)
  const [showScreenMenu, setShowScreenMenu] = useState(false)

  // Audio settings configuration
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
  const [selectedInputId, setSelectedInputId] = useState<string>(() => localStorage.getItem('echo-input-id') || 'default')
  const [selectedOutputId, setSelectedOutputId] = useState<string>(() => localStorage.getItem('echo-output-id') || 'default')
  const [audioError, setAudioError] = useState<string | null>(null)

  async function loadAudioDevices() {
    try {
      setAudioError(null)
      // Trigger permission request to read labels properly
      let gotStream = false
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach(t => t.stop())
        gotStream = true
      } catch (err: any) {
        console.error("getUserMedia error:", err)
        setAudioError(`Erro de Permissão/Hardware: ${err.name} - ${err.message}`)
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter(d => d.kind === 'audioinput')
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioInputs(inputs)
      setAudioOutputs(outputs)

      if (gotStream && inputs.length === 0) {
        setAudioError("Permissão concedida, mas nenhum dispositivo de entrada de áudio (microfone) foi detectado.")
      }
    } catch (err: any) {
      console.error('Error loading devices:', err)
      setAudioError(`Erro geral: ${err.message}`)
    }
  }

  useEffect(() => {
    if (page === 'Configurações') {
      loadAudioDevices()
    }
  }, [page])

  function handleInputDeviceChange(id: string) {
    setSelectedInputId(id)
    localStorage.setItem('echo-input-id', id)
    changeInputDevice(id)
  }

  function handleOutputDeviceChange(id: string) {
    setSelectedOutputId(id)
    localStorage.setItem('echo-output-id', id)
    changeOutputDevice(id)
  }

  // Friends system state
  const [friendships, setFriendships] = useState<FriendshipRequest[]>([])
  const [friendTab, setFriendTab] = useState<'online' | 'all' | 'pending' | 'add'>('online')
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [friendSearchNotice, setFriendSearchNotice] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareContainerRef = useRef<HTMLDivElement | null>(null)

  // Re-attach screen stream to video element whenever the page changes or the stream updates
  useEffect(() => {
    if (screenShareVideoRef.current) {
      const stream = activeScreenSharer?.screenStream || null
      if (screenShareVideoRef.current.srcObject !== stream) {
        screenShareVideoRef.current.srcObject = stream
      }
      // Force play in case browser paused it when hidden
      if (stream && screenShareVideoRef.current.paused) {
        screenShareVideoRef.current.play().catch(() => {})
      }
    }
  }, [activeScreenSharer?.screenStream, selectedChannel, page])

  useEffect(() => {
    if (!isConnected) {
      setActiveVoiceChannelId(null)
    }
  }, [isConnected])

  async function handleJoinVoice(channelId: string) {
    await joinVoice(channelId, user.id, profileDisplayName, profileAvatarUrl, selectedInputId, selectedOutputId)
    setActiveVoiceChannelId(channelId)
  }

  function handleLeaveVoice() {
    leaveVoice()
    setActiveVoiceChannelId(null)
  }

  function openSpaceSettings(space: Space) {
    setEditingSpace(space)
    setEditingSpaceName(space.name)
    setEditingSpaceDescription(space.description || '')
    setActiveSpaceTab('geral')
    setShowSpaceSettingsModal(true)
  }

  async function handleSaveSpaceSettings(event: FormEvent) {
    event.preventDefault(); if (!supabase || !editingSpace || !editingSpaceName.trim()) return
    setError('')
    const { error: err } = await supabase
      .from('spaces')
      .update({ 
        name: editingSpaceName.trim(),
        description: editingSpaceDescription.trim()
      })
      .eq('id', editingSpace.id)

    if (err) {
      setError(err.message)
    } else {
      setShowSpaceSettingsModal(false)
      await loadSpaces()
    }
  }

  async function renameChannel(channelId: string, newName: string) {
    if (!supabase || !newName.trim()) return
    setError('')
    const { error: err } = await supabase
      .from('channels')
      .update({ name: newName.trim() })
      .eq('id', channelId)

    if (err) {
      setError(err.message)
    } else {
      if (editingSpace) {
        await loadChannelsForSpace(editingSpace.id)
      }
    }
  }

  async function executeDeleteChannel(channelId: string) {
    if (!supabase || !editingSpace) return
    setError('')
    const { error: err } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (err) {
      setError(err.message)
    } else {
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null)
      }
      await loadChannelsForSpace(editingSpace.id)
    }
    setConfirmModalConfig(null)
  }

  function deleteChannel(channelId: string) {
    if (!editingSpace) return
    const ch = (spaceChannels[editingSpace.id] ?? []).find(c => c.id === channelId)
    if (!ch) return
    
    setConfirmModalConfig({
      isOpen: true,
      title: "Excluir Canal",
      message: `Tem certeza de que deseja excluir o canal "# ${ch.name}"? Todas as mensagens dele serão perdidas permanentemente e esta ação não poderá ser desfeita.`,
      onConfirm: () => {
        executeDeleteChannel(channelId)
      }
    })
  }

  async function executeDeleteSpace() {
    if (!supabase || !editingSpace) return
    setError('')
    const { error: err } = await supabase
      .from('spaces')
      .delete()
      .eq('id', editingSpace.id)

    if (err) {
      setError(err.message)
    } else {
      setShowSpaceSettingsModal(false)
      setExpandedSpace(null)
      setSelectedChannel(null)
      await loadSpaces()
    }
    setConfirmModalConfig(null)
  }

  function handleDeleteSpace() {
    if (!editingSpace) return
    setConfirmModalConfig({
      isOpen: true,
      title: "Excluir Servidor",
      message: `Tem certeza de que deseja excluir permanentemente o servidor "${editingSpace.name}"? Todos os canais e mensagens dele serão perdidos de forma irreversível e esta ação não poderá ser desfeita.`,
      onConfirm: () => {
        executeDeleteSpace()
      }
    })
  }

  function getQualityDimensions(quality: '720p' | '1080p' | 'native') {
    if (quality === '720p') return { w: 1280, h: 720 }
    if (quality === '1080p') return { w: 1920, h: 1080 }
    return { w: undefined, h: undefined }
  }

  async function handleQualityChange(newQuality: '720p' | '1080p' | 'native') {
    setScreenQuality(newQuality)
    const { w, h } = getQualityDimensions(newQuality)
    if (localScreenStream) {
      await changeScreenShareSettings(w, h, screenFps)
    }
  }

  async function handleFpsChange(newFps: 15 | 30 | 60) {
    setScreenFps(newFps)
    if (localScreenStream) {
      const { w, h } = getQualityDimensions(screenQuality)
      await changeScreenShareSettings(w, h, newFps)
    }
  }


  async function openScreenPicker() {
    if (localScreenStream) {
      setShowScreenMenu(prev => !prev)
      return
    }
    if ((window as any).electronAPI) {
      try {
        const sources = await (window as any).electronAPI.getSources()
        setScreenSources(sources)
        setShowScreenPicker(true)
      } catch (err) {
        setError('Não foi possível capturar as telas: ' + err)
      }
    } else {
      const { w, h } = getQualityDimensions(screenQuality)
      await startScreenShare(undefined, w, h, screenFps)
    }
  }

  async function forceOpenScreenPicker() {
    setShowScreenMenu(false)
    if ((window as any).electronAPI) {
      try {
        const sources = await (window as any).electronAPI.getSources()
        setScreenSources(sources)
        setShowScreenPicker(true)
      } catch (err) {
        setError('Não foi possível capturar as telas: ' + err)
      }
    } else {
      const { w, h } = getQualityDimensions(screenQuality)
      await startScreenShare(undefined, w, h, screenFps)
    }
  }

  async function selectScreenSource(sourceId: string) {
    setShowScreenPicker(false)
    const { w, h } = getQualityDimensions(screenQuality)
    await startScreenShare(sourceId, w, h, screenFps)
  }

  async function ensureProfile() {
    if (!supabase) return
    await supabase.from('profiles').upsert({ id: user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true })
  }

  async function loadSpaces() {
    if (!supabase) return
    await ensureProfile()
    const { data, error: queryError } = await supabase.from('space_members').select('spaces(id,name,description,creator_id)').eq('user_id', user.id)
    if (queryError) { setError(queryError.message); return }
    const result = (data ?? []).map((row: { spaces: Space | Space[] }) => Array.isArray(row.spaces) ? row.spaces[0] : row.spaces).filter((space): space is Space => Boolean(space))
    setSpaces(result)
    if (result.length > 0 && !expandedSpace) {
      setExpandedSpace(result[0].id)
    }
  }

  async function loadChannelsForSpace(spaceId: string) {
    if (!supabase) return
    const { data, error: queryError } = await supabase.from('channels').select('id,name,type,space_id').eq('space_id', spaceId).order('position')
    if (queryError) { setError(queryError.message); return }
    const result = (data ?? []) as Channel[]
    setSpaceChannels(prev => ({ ...prev, [spaceId]: result }))
    if (!selectedChannel && result.length > 0) {
      const firstText = result.find(c => c.type === 'text')
      if (firstText) setSelectedChannel(firstText)
    }
  }

  async function loadMessages(channelId: string) {
    if (!supabase) return
    const { data, error: queryError } = await supabase.from('messages').select('id,body,created_at,author_id,attachment_url,attachment_type,profiles(display_name,avatar_url)').eq('channel_id', channelId).order('created_at')
    if (queryError) { setError(queryError.message); return }
    setMessages((data ?? []).map((row: any) => ({ ...row, profile: Array.isArray(row.profiles) ? row.profiles?.[0] : row.profiles })))
  }

  async function loadSpaceMembers(spaceId: string) {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('space_members')
      .select('role, user:profiles(id, display_name, avatar_url)')
      .eq('space_id', spaceId)

    if (queryError) {
      console.warn("loadSpaceMembers error", queryError)
      return
    }

    const members = (data ?? []).map((row: any) => ({
      role: row.role,
      user: Array.isArray(row.user) ? row.user[0] : row.user
    })).filter(m => m.user !== null)

    setSpaceMembers(members)
  }

  useEffect(() => {
    if (selectedChannel?.space_id) {
      loadSpaceMembers(selectedChannel.space_id)
    } else {
      setSpaceMembers([])
    }
  }, [selectedChannel?.space_id])

  // Friends system APIs
  async function loadFriendships() {
    if (!supabase) return
    const { data, error: qError } = await supabase
      .from('friendships')
      .select('id, status, user:profiles!friendships_user_id_fkey(id, display_name, avatar_url), friend:profiles!friendships_friend_id_fkey(id, display_name, avatar_url)')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    
    if (qError) { setError(qError.message); return }
    
    const list = (data ?? []).map((row: any) => {
      const isInitiator = row.user.id === user.id
      const targetUser = isInitiator ? row.friend : row.user
      return {
        id: row.id,
        user: targetUser,
        status: row.status,
        initiatorId: row.user.id
      } as FriendshipRequest
    })
    setFriendships(list)
    const incomingPending = list.filter(r => r.status === 'pending' && r.initiatorId !== user.id).length
    setPendingFriendCount(incomingPending)
  }

  async function sendFriendRequest(event: FormEvent) {
    event.preventDefault(); if (!supabase || !friendSearchQuery.trim()) return
    setFriendSearchNotice('')
    const targetName = friendSearchQuery.trim()
    
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_name', targetName)
    
    if (pError || !profiles || profiles.length === 0) {
      setFriendSearchNotice('Usuário não encontrado. Verifique o nome de exibição.')
      return
    }
    
    const targetUserId = profiles[0].id
    if (targetUserId === user.id) {
      setFriendSearchNotice('Você não pode adicionar a si mesmo.')
      return
    }
    
    const { error: fError } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: targetUserId,
        status: 'pending'
      })
    
    if (fError) {
      if (fError.code === '23505') {
        setFriendSearchNotice('Vocês já são amigos ou já existe uma solicitação pendente.')
      } else {
        setFriendSearchNotice(fError.message)
      }
    } else {
      setFriendSearchNotice('Solicitação de amizade enviada com sucesso!')
      setFriendSearchQuery('')
      await loadFriendships()
    }
  }

  async function acceptFriendRequest(friendshipId: string) {
    if (!supabase) return
    const { error: fError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    
    if (fError) setError(fError.message)
    else await loadFriendships()
  }

  async function removeFriendship(friendshipId: string) {
    if (!supabase) return
    const { error: fError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
    
    if (fError) setError(fError.message)
    else await loadFriendships()
  }

  async function loadDirectMessages(friendId: string) {
    if (!supabase) return
    const { data, error: queryError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, receiver_id, body, attachment_url, attachment_type, created_at')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at')
      
    if (queryError) {
      setError(queryError.message)
      return
    }
    setDirectMessages((data ?? []) as DirectMessage[])
  }

  async function sendDirectMessage(body: string, attachmentUrl?: string, attachmentType?: string) {
    if (!supabase || !selectedDMUserId) return
    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedDMUserId,
        body,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })
      
    if (sendError) {
      setError(sendError.message)
    } else {
      setDmDraft('')
      await loadDirectMessages(selectedDMUserId)
    }
  }

  async function handleChatFileUpload(file: File) {
    if (!supabase || !selectedChannel) return
    setIsUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `channels/${selectedChannel.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadError) {
        setError(uploadError.message)
        setIsUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
      const fileType = file.type.startsWith('image/') ? 'image' : 'file'
      
      const { error: sendError } = await supabase.from('messages').insert({
        channel_id: selectedChannel.id,
        author_id: user.id,
        body: file.name,
        attachment_url: urlData.publicUrl,
        attachment_type: fileType
      })
      if (sendError) setError(sendError.message)
    } catch (err: any) {
      setError(err.message || 'Erro no upload.')
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    loadSpaces()
    loadFriendships()
    loadAudioDevices()

    const client = supabase
    if (!client) return
    
    // Setup global online presence
    const presenceChannel = client.channel('global-presence', {
      config: { presence: { key: user.id } }
    })
    presenceChannelRef.current = presenceChannel
    
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const online = new Set<string>()
        const pData: Record<string, any> = {}
        
        Object.keys(state).forEach(key => {
          online.add(key)
          const userPresence = state[key]
          if (userPresence && userPresence.length > 0) {
            pData[key] = userPresence[0]
          }
        })
        
        setPresenceData(pData)
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const savedStatus = localStorage.getItem('echo-custom-status') || ''
          await presenceChannel.track({
            user_id: user.id,
            display_name: displayName,
            online_at: new Date().toISOString(),
            custom_status: savedStatus
          })
        }
      })

    // Setup global realtime messages listener to detect unread messages
    const globalMessagesChannel = client.channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any
        if (newMsg && newMsg.channel_id !== selectedChannelRef.current?.id) {
          setUnreadChannels(prev => {
            if (prev.has(newMsg.channel_id)) return prev
            const next = new Set(prev)
            next.add(newMsg.channel_id)
            return next
          })
        }
      })
      .subscribe()

    return () => {
      client.removeChannel(presenceChannel)
      client.removeChannel(globalMessagesChannel)
    }
  }, [])

  useEffect(() => {
    if (expandedSpace) loadChannelsForSpace(expandedSpace)
  }, [expandedSpace])

  useEffect(() => {
    const client = supabase
    if (!selectedChannel || !client || selectedChannel.type !== 'text') return
    loadMessages(selectedChannel.id)
    const live = client.channel(`messages-${selectedChannel.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${selectedChannel.id}` }, () => loadMessages(selectedChannel.id)).subscribe()
    return () => { client.removeChannel(live) }
  }, [selectedChannel?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for realtime direct messages and show notifications
  useEffect(() => {
    if (!supabase || !user) return

    const handleNewDM = (payload: any) => {
      const newMsg = payload.new as DirectMessage
      
      // If it's related to the user
      if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
        // If it's from the currently selected friend
        if (selectedDMUserId && (newMsg.sender_id === selectedDMUserId || newMsg.receiver_id === selectedDMUserId)) {
          loadDirectMessages(selectedDMUserId)
        } else if (newMsg.receiver_id === user.id) {
          // Increment unread count for the sender
          setUnreadDMs(prev => {
            const currentCount = prev[newMsg.sender_id] || 0
            return { ...prev, [newMsg.sender_id]: currentCount + 1 }
          })
          
          // Try to find the friend's name
          const friendObj = friendships.find(f => f.user.id === newMsg.sender_id)
          const senderName = friendObj?.user.display_name || 'Um amigo'
          showToast(`Nova mensagem de ${senderName}`, newMsg.body.substring(0, 50) + (newMsg.body.length > 50 ? '...' : ''), 'message')
        }
      }
    }

    const liveDMs = supabase
      .channel('public-direct-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, handleNewDM)
      .subscribe()

    return () => {
      supabase?.removeChannel(liveDMs)
    }

  }, [selectedDMUserId, friendships, user])

  useEffect(() => {
    if (!supabase || !user) return

    const handleFriendshipChanges = (payload: any) => {
      loadFriendships()
      if (payload.eventType === 'INSERT') {
        const newFriendship = payload.new
        if (newFriendship.friend_id === user.id) {
          showToast('Solicitação de Amizade', 'Você recebeu um novo convite de amizade.', 'friend')
        }
      }
    }

    const liveFriendships = supabase
      .channel('public-friendships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, handleFriendshipChanges)
      .subscribe()

    return () => {
      supabase?.removeChannel(liveFriendships)
    }
  }, [user?.id])

  async function createSpace(event: FormEvent) {
    event.preventDefault(); if (!supabase || !newSpace.trim()) return
    setCreating(true); setError('')
    const { data: space, error: spaceError } = await supabase.from('spaces').insert({ name: newSpace.trim(), creator_id: user.id }).select().single()
    if (spaceError || !space) { setError(spaceError?.message ?? 'Não foi possível criar o espaço.'); setCreating(false); return }
    await supabase.from('space_members').insert({ space_id: space.id, user_id: user.id, role: 'owner' })
    await supabase.from('channels').insert({ space_id: space.id, name: 'Geral', type: 'text', position: 0 })
    setNewSpace(''); setCreating(false)
    await loadSpaces()
    setExpandedSpace(space.id)
    await loadChannelsForSpace(space.id)
  }

  async function joinSpace(event: FormEvent) {
    event.preventDefault(); if (!supabase || !joinSpaceCode.trim()) return
    setJoining(true); setError('')
    const code = joinSpaceCode.trim()
    
    try {
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('id', code)
        .single()
        
      if (spaceError || !space) {
        setError('Código de convite inválido ou servidor não encontrado.')
        setJoining(false)
        return
      }
      
      const { data: member } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('space_id', space.id)
        .eq('user_id', user.id)
        .maybeSingle()
        
      if (member) {
        setError('Você já é um membro deste servidor!')
        setJoining(false)
        return
      }
      
      const { error: insertError } = await supabase
        .from('space_members')
        .insert({ space_id: space.id, user_id: user.id, role: 'member' })
        
      if (insertError) {
        setError(insertError.message)
        setJoining(false)
        return
      }
      
      setJoinSpaceCode('')
      setJoining(false)
      await loadSpaces()
      setExpandedSpace(space.id)
      await loadChannelsForSpace(space.id)
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no servidor.')
      setJoining(false)
    }
  }

  async function createChannel(event: FormEvent, spaceId: string) {
    event.preventDefault(); if (!supabase || !newChannelName.trim()) return
    setError('')
    const currentChannels = spaceChannels[spaceId] ?? []
    const { error: channelError } = await supabase.from('channels').insert({
      space_id: spaceId,
      name: newChannelName.trim(),
      type: newChannelType,
      position: currentChannels.length,
    })
    if (channelError) { setError(channelError.message); return }
    setNewChannelName(''); setShowNewChannel(null); setNewChannelType('text')
    await loadChannelsForSpace(spaceId)
  }

  async function send(event: FormEvent) {
    event.preventDefault(); if (!supabase || !selectedChannel || !draft.trim()) return
    const { error: sendError } = await supabase.from('messages').insert({ channel_id: selectedChannel.id, author_id: user.id, body: draft.trim() })
    if (sendError) setError(sendError.message); else setDraft('')
  }

  function toggleSpace(spaceId: string) {
    setExpandedSpace(prev => prev === spaceId ? null : spaceId)
  }

  function getSpaceForChannel(channel: Channel | null) {
    if (!channel) return null
    return spaces.find(s => s.id === channel.space_id) ?? null
  }

  const currentSpace = getSpaceForChannel(selectedChannel)
  const activeVoiceChannel = activeVoiceChannelId
    ? Object.values(spaceChannels).flat().find(c => c.id === activeVoiceChannelId)
    : null

  return (
    <main className="echo-app">
      <header className="topbar">
        <Brand />
        <nav>
          {(['Servidores', 'Amigos', 'Configurações', 'Descobrir'] as Page[]).map((item) => {
            const totalUnread = item === 'Amigos' ? pendingFriendCount + Object.values(unreadDMs).reduce((a, b) => a + b, 0) : 0
            return (
              <button key={item} className={page === item ? 'nav-active' : ''} onClick={() => setPage(item)} style={{ position: 'relative' }}>
                {item}
                {totalUnread > 0 && <span className="nav-badge">{totalUnread}</span>}
              </button>
            )
          })}
        </nav>
      </header>

      <section className="workspace" style={{ display: page === 'Servidores' ? undefined : 'none' }}>
          <aside className="sidebar">
            <div className="sidebar-scrollable">
              <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Seus Espaços</span>
                <button className="add-space-trigger-btn" onClick={() => { setAddSpaceModalTab('options'); setShowAddSpaceModal(true) }} title="Criar ou Entrar em um Servidor">＋</button>
              </div>

            <div className="spaces-tree">
              {spaces.map((space) => {
                const isExpanded = expandedSpace === space.id
                const channels = spaceChannels[space.id] ?? []
                const textChannels = channels.filter(c => c.type === 'text')
                const voiceChannels = channels.filter(c => c.type === 'voice')
                return (
                  <div className="space-node" key={space.id}>
                    <div className="space-header-container">
                      <button className={`space-header ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleSpace(space.id)}>
                        <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>
                        <div className="space-avatar-mini">
                          {space.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="space-name">{space.name}</span>
                      </button>
                      <button 
                        className="space-invite-trigger" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          copyToClipboard(space.id); 
                          showToast("Convite Copiado!", `Código do servidor "${space.name}" copiado para a área de transferência.`, 'info'); 
                        }}
                        title="Copiar código de convite do servidor"
                      >
                        <LinkIcon />
                      </button>
                      {space.creator_id === user.id && (
                        <button 
                          className="space-settings-trigger" 
                          onClick={(e) => { e.stopPropagation(); openSpaceSettings(space) }}
                          title="Configurar Servidor"
                        >
                          <SettingsIcon />
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="space-children">
                        {textChannels.length > 0 && (
                          <div className="channel-group">
                            <span className="channel-group-label">TEXTO</span>
                            {textChannels.map(ch => (
                              <button key={ch.id} className={`channel-item ${selectedChannel?.id === ch.id ? 'active' : ''} ${unreadChannels.has(ch.id) ? 'unread' : ''}`} onClick={() => setSelectedChannel(ch)}>
                                <span className="ch-icon"><HashtagIcon /></span>
                                <span>{ch.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {voiceChannels.length > 0 && (
                          <div className="channel-group">
                            <span className="channel-group-label">VOZ</span>
                            {voiceChannels.map(ch => {
                              const isActive = activeVoiceChannelId === ch.id
                              return (
                                <div key={ch.id} className="voice-channel-node">
                                  <button className={`channel-item voice-item ${selectedChannel?.id === ch.id ? 'active' : ''}`} onClick={() => setSelectedChannel(ch)}>
                                    <span className="ch-icon"><VolumeIcon /></span>
                                    <span>{ch.name}</span>
                                  </button>
                                  {isActive && participants.length > 0 && (
                                    <div className="sidebar-voice-users">
                                      {participants.map(p => (
                                        <div 
                                          key={p.userId} 
                                          className={`sidebar-voice-user ${p.isSpeaking ? 'speaking' : ''}`}
                                          onClick={() => {
                                            if (p.userId !== user.id) {
                                              setVolumeControlUser(p)
                                            }
                                          }}
                                          style={{ cursor: p.userId !== user.id ? 'pointer' : 'default' }}
                                          title={p.userId !== user.id ? "Ajustar volume de áudio" : ""}
                                        >
                                          <div className="sidebar-voice-avatar">
                                            {p.avatarUrl ? (
                                              <img src={p.avatarUrl} alt={p.displayName} className="sidebar-avatar-img" />
                                            ) : (
                                              p.displayName.slice(0, 1).toUpperCase()
                                            )}
                                          </div>
                                          <span className="sidebar-voice-name">{p.displayName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {showNewChannel === space.id ? (
                          <form className="new-channel-form" onSubmit={(e) => createChannel(e, space.id)}>
                            <div className="new-ch-type-row">
                              <button type="button" className={`type-btn ${newChannelType === 'text' ? 'type-active' : ''}`} onClick={() => setNewChannelType('text')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HashtagIcon /> Texto</button>
                              <button type="button" className={`type-btn ${newChannelType === 'voice' ? 'type-active' : ''}`} onClick={() => setNewChannelType('voice')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><VolumeIcon /> Voz</button>
                            </div>
                            <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Nome do canal" required minLength={2} />
                            <div className="new-ch-actions">
                              <button type="submit" className="ch-create-btn">Criar</button>
                              <button type="button" className="ch-cancel-btn" onClick={() => { setShowNewChannel(null); setNewChannelName('') }}>Cancelar</button>
                            </div>
                          </form>
                        ) : (
                          <button className="add-channel-btn" onClick={() => setShowNewChannel(space.id)}>
                            <PlusIcon />
                            <span>Novo canal</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {activeVoiceChannelId && (
              <div className="voice-status-panel">
                <div className="voice-status-info">
                  <span className="voice-status-indicator">●</span>
                  <div className="voice-status-text">
                    <span className="voice-status-label">Voz conectada</span>
                    <span className="voice-status-channel">{activeVoiceChannel?.name}</span>
                  </div>
                </div>
                <div className="voice-status-actions">
                  <button className={`voice-action-btn ${isMuted ? 'muted' : ''}`} onClick={toggleMute} title={isMuted ? "Desmutar" : "Mutar"}>
                    {isMuted ? <MicOffIcon /> : <MicIcon />}
                  </button>
                  <button className="voice-action-btn disconnect-btn" onClick={handleLeaveVoice} title="Desconectar">
                    <PhoneOffIcon />
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="sidebar-profile-footer">
            <div className="profile-footer-info">
              <div className="profile-footer-avatar">
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt={profileDisplayName} />
                ) : (
                  profileDisplayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="profile-footer-meta">
                <span className="profile-footer-name" title={profileDisplayName}>{profileDisplayName}</span>
                <span className="profile-footer-status">Online</span>
              </div>
            </div>
            <div className="profile-footer-actions">
              <button className="profile-footer-btn" onClick={toggleTheme} title="Alternar tema">
                {theme === 'light' ? <MoonIcon /> : <SunIcon />}
              </button>
              <button className="profile-footer-btn" onClick={() => setPage('Configurações')} title="Configurações">
                <SettingsIcon />
              </button>
              <button className="profile-footer-btn logout" onClick={() => supabase?.auth.signOut()} title="Sair">
                <LogOutIcon />
              </button>
            </div>
          </div>
        </aside>

          <section className="main-content">
            {error && <div className="app-error">{error}<button className="dismiss-error" onClick={() => setError('')}>✕</button></div>}

            {selectedChannel ? (
              selectedChannel.type === 'text' ? (
                <>
                  <header className="content-header">
                    <div className="header-info">
                      {currentSpace && <span className="header-space">{currentSpace.name}</span>}
                      <h1><span className="header-icon"><HashtagIcon /></span> {selectedChannel.name}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="live-badge">● ao vivo</span>
                      <button 
                        className={`profile-footer-btn ${showMembersList ? 'active' : ''}`} 
                        onClick={() => setShowMembersList(!showMembersList)}
                        title="Lista de Membros"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <UsersIcon />
                      </button>
                    </div>
                  </header>
                  <div className="chat-workspace-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
                    <div className="chat-area-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <div className="messages-area">
                        {messages.length === 0 && <div className="no-messages"><span className="no-msg-icon">✉</span><p>Ainda não há mensagens.<br />Diga olá!</p></div>}
                        {messages.map((message) => {
                          const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
                          return (
                            <article className={`msg-card ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''}`} key={message.id}>
                              <div className={`msg-avatar ${message.author_id === user.id ? 'avatar-self' : 'avatar-other'}`} style={{ overflow: 'hidden' }}>
                                {message.profile?.avatar_url ? (
                                  <img src={message.profile.avatar_url} alt={message.profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                                ) : (
                                  (message.profile?.display_name ?? 'E').slice(0, 1).toUpperCase()
                                )}
                              </div>
                              <div className="msg-body">
                                <div className="msg-meta">
                                  <strong>{message.profile?.display_name ?? 'Membro'}</strong>
                                  <time>{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                </div>
                                {message.attachment_url && message.attachment_type === 'image' ? (
                                  <img src={message.attachment_url} alt="anexo" className="msg-attachment-img" onClick={() => window.open(message.attachment_url, '_blank')} />
                                ) : message.attachment_url && message.attachment_type !== 'image' ? (
                                  <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="msg-attachment-file">📎 {message.body}</a>
                                ) : (
                                  <p>{formatMessageText(message.body, profileDisplayName)}</p>
                                )}
                              </div>
                            </article>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                      <form className="composer" onSubmit={send}>
                        <input type="file" id="chat-file-input" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChatFileUpload(f); e.target.value = '' }} />
                        <button type="button" className="dm-attach-btn" onClick={() => document.getElementById('chat-file-input')?.click()} disabled={isUploading} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px 0 0' }}>
                          {isUploading ? '⏳' : '📎'}
                        </button>
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Mensagem em ${selectedChannel.name}…`} />
                        <button type="submit" className="send-btn" disabled={!draft.trim() && !isUploading}>
                          <span>↑</span>
                        </button>
                      </form>
                    </div>
                    {showMembersList && currentSpace && (
                      <aside className="members-sidebar">
                        <div className="members-sidebar-inner">
                          <div className="members-group-label">Membros ({spaceMembers.length})</div>
                          <div className="members-list">
                            {spaceMembers.map((member) => {
                              const isCreator = currentSpace.creator_id === member.user.id
                              const isVoiceUser = participants.some(p => p.userId === member.user.id)
                              return (
                                <div className="member-card" key={member.user.id}>
                                  <div className="member-avatar-container">
                                    <div className="member-avatar">
                                      {member.user.avatar_url ? (
                                        <img src={member.user.avatar_url} alt={member.user.display_name} />
                                      ) : (
                                        member.user.display_name.slice(0, 1).toUpperCase()
                                      )}
                                    </div>
                                    <span className={`member-status-dot ${isVoiceUser ? 'voice-active' : 'online'}`} />
                                  </div>
                                  <div className="member-info">
                                    <div className="member-name-row">
                                      <span className="member-name">{member.user.display_name}</span>
                                      {isCreator && <span className="member-badge creator">Criador</span>}
                                    </div>
                                    <span className="member-status-text" title={presenceData[member.user.id]?.custom_status}>
                                      {isVoiceUser ? 'Em chamada' : (presenceData[member.user.id]?.custom_status || 'Disponível')}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                </>
              ) : (
                <div className="voice-room">
                  <header className="content-header">
                    <div className="header-info">
                      {currentSpace && <span className="header-space">{currentSpace.name}</span>}
                      <h1><span className="header-icon"><VolumeIcon /></span> {selectedChannel.name}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {activeVoiceChannelId === selectedChannel.id && (
                        <span className="live-badge voice-live">● Conectado</span>
                      )}
                      <button 
                        className={`profile-footer-btn ${showVoiceChat ? 'active' : ''}`} 
                        onClick={() => setShowVoiceChat(!showVoiceChat)}
                        title="Chat de Texto"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <MessageSquareIcon />
                      </button>
                      <button 
                        className={`profile-footer-btn ${showVoiceMembers ? 'active' : ''}`} 
                        onClick={() => setShowVoiceMembers(!showVoiceMembers)}
                        title="Lista de Membros"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <UsersIcon />
                      </button>
                    </div>
                  </header>

                  <div className="voice-workspace-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
                    <div className="voice-content" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: activeVoiceChannelId === selectedChannel.id ? '0' : '24px', minWidth: 0 }}>
                      {activeVoiceChannelId === selectedChannel.id ? (
                        <div className="voice-split-layout" style={!showVoiceChat ? { gridTemplateColumns: '1fr' } : undefined}>
                          {/* Media pane (Left) */}
                          <div className="voice-media-pane">
                            {activeScreenSharer ? (
                              <div className={`screen-share-view ${isScreenFullScreen ? 'fullscreen-active' : ''}`} ref={screenShareContainerRef}>
                                <video 
                                  ref={screenShareVideoRef}
                                  autoPlay 
                                  playsInline 
                                  muted
                                  className="screen-share-video-el"
                                />
                                <div className="screen-share-tag" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span>🖥️ Transmissão de {activeScreenSharer.displayName}</span>
                                  <AudioLevelMeter stream={activeScreenSharer.screenStream || null} />
                                </div>
                                
                                <div className="screen-share-overlay-controls">
                                  {activeScreenSharer.userId !== user.id && (
                                    <div className="screen-volume-control" title="Volume da Transmissão">
                                      <span style={{ fontSize: '13.5px' }}>🔊</span>
                                      <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={peerScreenVolumes[activeScreenSharer.userId] !== undefined ? peerScreenVolumes[activeScreenSharer.userId] : 100}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value)
                                          const newVols = { ...peerScreenVolumes, [activeScreenSharer.userId]: val }
                                          setPeerScreenVolumes(newVols)
                                          localStorage.setItem('echo-peer-screen-volumes', JSON.stringify(newVols))
                                        }}
                                        style={{ width: '80px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                                      />
                                      <span style={{ fontSize: '11px', minWidth: '30px', fontWeight: 'bold' }}>
                                        {peerScreenVolumes[activeScreenSharer.userId] !== undefined ? peerScreenVolumes[activeScreenSharer.userId] : 100}%
                                      </span>
                                    </div>
                                  )}
                                  <button 
                                    className="fullscreen-toggle-btn"
                                    onClick={() => setIsScreenFullScreen(!isScreenFullScreen)}
                                    title="Tela Cheia"
                                  >
                                    <FullscreenIcon />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="participants-grid">
                                {participants.map(p => (
                                  <div 
                                    key={p.userId} 
                                    className={`participant-card ${p.isSpeaking ? 'speaking' : ''}`}
                                    onClick={() => {
                                      if (p.userId !== user.id) {
                                        setVolumeControlUser(p)
                                      }
                                    }}
                                    style={{ cursor: p.userId !== user.id ? 'pointer' : 'default' }}
                                    title={p.userId !== user.id ? "Ajustar volume de áudio" : ""}
                                  >
                                    <div className="participant-avatar-large">
                                      {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt={p.displayName} className="round-avatar-img-large" />
                                      ) : (
                                        <span className="avatar-initial-large">
                                          {p.displayName.slice(0, 1).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <span className="participant-name">
                                      {p.displayName}
                                      {p.userId === user.id && " (Você)"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Controls bottom bar */}
                            <div className="voice-controls-bar">
                              <button 
                                className={`control-btn mic-btn ${isMuted ? 'muted' : ''}`} 
                                onClick={toggleMute}
                                title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
                              >
                                {isMuted ? <MicOffIcon /> : <MicIcon />}
                              </button>
                              
                              <div className="screen-control-wrapper" style={{ position: 'relative' }}>
                                <button 
                                  className={`control-btn screen-btn ${localScreenStream ? 'sharing' : ''}`} 
                                  onClick={openScreenPicker}
                                  title="Opções de Transmissão"
                                >
                                  <ScreenIcon />
                                </button>
                                {showScreenMenu && localScreenStream && (
                                  <div className="screen-share-dropdown">
                                    <div className="dropdown-section">
                                      <button className="dropdown-action-btn danger" onClick={async () => { setShowScreenMenu(false); await stopScreenShare() }}>
                                        Parar Transmissão
                                      </button>
                                      <button className="dropdown-action-btn" onClick={forceOpenScreenPicker}>
                                        Mudar de Janela
                                      </button>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <div className="dropdown-section">
                                      <span className="section-title">Resolução</span>
                                      {([720, 1080, 'native'] as const).map(q => {
                                        const label = q === 720 ? '720p' : q === 1080 ? '1080p' : 'native'
                                        const keyVal = q === 720 ? '720p' : q === 1080 ? '1080p' : 'native'
                                        return (
                                          <button 
                                            key={keyVal} 
                                            className={`dropdown-option ${screenQuality === keyVal ? 'selected' : ''}`}
                                            onClick={() => handleQualityChange(keyVal)}
                                          >
                                            {q === 'native' ? 'Nativa / Fonte' : label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    <div className="dropdown-divider" />
                                    <div className="dropdown-section">
                                      <span className="section-title">FPS</span>
                                      {([15, 30, 60] as const).map(fps => (
                                        <button 
                                          key={fps} 
                                          className={`dropdown-option ${screenFps === fps ? 'selected' : ''}`}
                                          onClick={() => handleFpsChange(fps)}
                                        >
                                          {fps} FPS
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <button 
                                className="control-btn leave-btn" 
                                onClick={handleLeaveVoice}
                                title="Sair da chamada"
                              >
                                <PhoneOffIcon />
                              </button>
                            </div>
                          </div>

                          {/* Chat pane (Right) */}
                          <div className="voice-chat-pane" style={!showVoiceChat ? { display: 'none' } : undefined}>
                            <div className="voice-chat-messages">
                              {messages.length === 0 && (
                                <div className="no-messages">
                                  <span className="no-msg-icon">💬</span>
                                  <p>Início do chat por texto da chamada.</p>
                                </div>
                              )}
                              {messages.map((message) => {
                                const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
                                return (
                                  <article className={`msg-card ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''}`} key={message.id}>
                                    <div className={`msg-avatar ${message.author_id === user.id ? 'avatar-self' : 'avatar-other'}`} style={{ overflow: 'hidden' }}>
                                      {message.profile?.avatar_url ? (
                                        <img src={message.profile.avatar_url} alt={message.profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                                      ) : (
                                        (message.profile?.display_name ?? 'E').slice(0, 1).toUpperCase()
                                      )}
                                    </div>
                                    <div className="msg-body">
                                      <div className="msg-meta">
                                        <strong>{message.profile?.display_name ?? 'Membro'}</strong>
                                        <time>{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                      </div>
                                      {message.attachment_url && message.attachment_type === 'image' ? (
                                        <img src={message.attachment_url} alt="anexo" className="msg-attachment-img" onClick={() => window.open(message.attachment_url, '_blank')} />
                                      ) : message.attachment_url && message.attachment_type !== 'image' ? (
                                        <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="msg-attachment-file">📎 {message.body}</a>
                                      ) : (
                                        <p>{formatMessageText(message.body, profileDisplayName)}</p>
                                      )}
                                    </div>
                                  </article>
                                )
                              })}
                              <div ref={messagesEndRef} />
                            </div>
                            <form className="voice-chat-composer" onSubmit={send}>
                              <input type="file" id="voice-chat-file-input" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChatFileUpload(f); e.target.value = '' }} />
                              <button type="button" className="dm-attach-btn" onClick={() => document.getElementById('voice-chat-file-input')?.click()} disabled={isUploading} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px 0 0' }}>
                                {isUploading ? '⏳' : '📎'}
                              </button>
                              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Conversar por texto com a call…" />
                              <button type="submit" className="send-btn" disabled={!draft.trim() && !isUploading}>
                                <span>↑</span>
                              </button>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <div className="voice-join-panel">
                          <div className="voice-join-icon">🔊</div>
                          <h2>Pronto para entrar?</h2>
                          {activeVoiceChannelId ? (
                            <p>Você já está na chamada de <strong>{activeVoiceChannel?.name}</strong>. Entrar aqui desconectará você da outra chamada.</p>
                          ) : (
                            <p>Entre no canal de voz para conversar em tempo real com outras pessoas neste espaço.</p>
                          )}
                          <button 
                            className="voice-join-submit-btn" 
                            onClick={async () => {
                              if (activeVoiceChannelId) {
                                handleLeaveVoice()
                              }
                              await handleJoinVoice(selectedChannel.id)
                            }}
                          >
                            Entrar na chamada
                          </button>
                        </div>
                      )}
                    </div>
                    {currentSpace && (
                      <aside className="members-sidebar" style={!showVoiceMembers ? { display: 'none' } : undefined}>
                        <div className="members-sidebar-inner">
                          <div className="members-group-label">Membros ({spaceMembers.length})</div>
                          <div className="members-list">
                            {spaceMembers.map((member) => {
                              const isCreator = currentSpace.creator_id === member.user.id
                              const isVoiceUser = participants.some(p => p.userId === member.user.id)
                              return (
                                <div className="member-card" key={member.user.id}>
                                  <div className="member-avatar-container">
                                    <div className="member-avatar">
                                      {member.user.avatar_url ? (
                                        <img src={member.user.avatar_url} alt={member.user.display_name} />
                                      ) : (
                                        member.user.display_name.slice(0, 1).toUpperCase()
                                      )}
                                    </div>
                                    <span className={`member-status-dot ${isVoiceUser ? 'voice-active' : 'online'}`} />
                                  </div>
                                  <div className="member-info">
                                    <div className="member-name-row">
                                      <span className="member-name">{member.user.display_name}</span>
                                      {isCreator && <span className="member-badge creator">Criador</span>}
                                    </div>
                                    <span className="member-status-text" title={presenceData[member.user.id]?.custom_status}>
                                      {isVoiceUser ? 'Em chamada' : (presenceData[member.user.id]?.custom_status || 'Disponível')}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </aside>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="empty-main">
                <div className="empty-icon">✦</div>
                <h2>Selecione um canal</h2>
                <p>Escolha um espaço e canal na barra lateral para começar a conversar.</p>
              </div>
            )}
          </section>
        </section>

      <div style={{ display: page === 'Amigos' ? undefined : 'none' }}>
        <FriendsView 
          friendships={friendships}
          friendTab={friendTab}
          setFriendTab={setFriendTab}
          friendSearchQuery={friendSearchQuery}
          setFriendSearchQuery={setFriendSearchQuery}
          friendSearchNotice={friendSearchNotice}
          sendFriendRequest={sendFriendRequest}
          acceptFriendRequest={acceptFriendRequest}
          removeFriendship={removeFriendship}
          onlineUsers={onlineUsers}
          presenceData={presenceData}
          user={user}
          selectedDMUserId={selectedDMUserId}
          directMessages={directMessages}
          dmDraft={dmDraft}
          setDmDraft={setDmDraft}
          unreadDMs={unreadDMs}
          onOpenDM={(friendId: string) => {
            setSelectedDMUserId(friendId)
            setUnreadDMs(prev => { const next = { ...prev }; delete next[friendId]; return next })
            loadDirectMessages(friendId)
          }}
          onSendDM={async (e: FormEvent) => {
            e.preventDefault()
            if (!dmDraft.trim()) return
            await sendDirectMessage(dmDraft.trim())
          }}
          onCloseDM={() => { setSelectedDMUserId(null); setDirectMessages([]) }}
          isUploading={isUploading}
          onUploadFile={async (file: File) => {
            if (!supabase) return
            setIsUploading(true)
            const ext = file.name.split('.').pop()
            const path = `dm/${user.id}/${Date.now()}.${ext}`
            const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
            if (uploadError) { setError(uploadError.message); setIsUploading(false); return }
            const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
            const fileType = file.type.startsWith('image/') ? 'image' : 'file'
            await sendDirectMessage(dmDraft.trim() || file.name, urlData.publicUrl, fileType)
            setIsUploading(false)
          }}
          profileDisplayName={profileDisplayName}
          profileAvatarUrl={profileAvatarUrl}
          theme={theme}
          toggleTheme={toggleTheme}
          setPage={setPage}
          onSignOut={() => supabase?.auth.signOut()}
        />
      </div>

      <div style={{ display: page === 'Configurações' ? undefined : 'none' }}>
        <SettingsView 
          userId={user.id}
          currentDisplayName={profileDisplayName}
          currentAvatarUrl={profileAvatarUrl}
          customStatus={customStatus}
          onProfileUpdate={(name, avatar) => {
            setProfileDisplayName(name)
            setProfileAvatarUrl(avatar)
          }}
          onCustomStatusUpdate={async (status) => {
            setCustomStatus(status)
            localStorage.setItem('echo-custom-status', status)
            if (presenceChannelRef.current) {
              await presenceChannelRef.current.track({
                user_id: user.id,
                display_name: profileDisplayName,
                online_at: new Date().toISOString(),
                custom_status: status
              })
            }
          }}
          audioInputs={audioInputs}
          audioOutputs={audioOutputs}
          selectedInputId={selectedInputId}
          selectedOutputId={selectedOutputId}
          onInputDeviceChange={handleInputDeviceChange}
          onOutputDeviceChange={handleOutputDeviceChange}
          audioError={audioError}
          onRefreshDevices={loadAudioDevices}
          profileDisplayName={profileDisplayName}
          profileAvatarUrl={profileAvatarUrl}
          theme={theme}
          toggleTheme={toggleTheme}
          setPage={setPage}
          onSignOut={() => supabase?.auth.signOut()}
        />
      </div>

      <div style={{ display: page === 'Descobrir' ? undefined : 'none' }}>
        <Placeholder page={'Descobrir'} />
      </div>

      {/* Create/Join Space Modal (Discord-Style) */}
      {showAddSpaceModal && (
        <div className="screen-picker-overlay" onClick={() => setShowAddSpaceModal(false)}>
          <div className="screen-picker-modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            {addSpaceModalTab === 'options' && (
              <>
                <h2 style={{ textAlign: 'center' }}>Adicionar um servidor</h2>
                <p style={{ textAlign: 'center' }}>Um servidor é onde você e seus amigos se reúnem. Crie o seu próprio ou junte-se a um já existente.</p>
                <div className="add-space-modal-cards">
                  <div className="add-space-card">
                    <span className="add-space-card-icon">🎨</span>
                    <h3>Criar o meu</h3>
                    <p>Comece um servidor do seu jeito e convide os amigos para conversar.</p>
                    <button className="add-space-card-btn" onClick={() => setAddSpaceModalTab('create')}>Criar Servidor</button>
                  </div>
                  <div className="add-space-card">
                    <span className="add-space-card-icon">🤝</span>
                    <h3>Entrar em um</h3>
                    <p>Tem um código de convite? Junte-se a um servidor ativo agora.</p>
                    <button className="add-space-card-btn" onClick={() => setAddSpaceModalTab('join')}>Entrar no Servidor</button>
                  </div>
                </div>
                <button className="picker-close-btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => setShowAddSpaceModal(false)}>Cancelar</button>
              </>
            )}

            {addSpaceModalTab === 'create' && (
              <>
                <h2>Criar seu servidor</h2>
                <p>Dê um nome ao seu novo servidor. Você poderá alterá-lo a qualquer momento.</p>
                <form 
                  onSubmit={async (e) => { 
                    e.preventDefault(); 
                    await createSpace(e); 
                    setShowAddSpaceModal(false); 
                  }} 
                  className="add-space-modal-form"
                >
                  <input 
                    value={newSpace} 
                    onChange={(e) => setNewSpace(e.target.value)} 
                    placeholder="Nome do servidor" 
                    required 
                    minLength={2}
                    maxLength={80}
                  />
                  <button type="submit" className="add-space-modal-submit-btn" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar'}
                  </button>
                </form>
                <button className="add-space-modal-back-btn" onClick={() => setAddSpaceModalTab('options')}>Voltar</button>
              </>
            )}

            {addSpaceModalTab === 'join' && (
              <>
                <h2>Entrar em um servidor</h2>
                <p>Insira o código de convite enviado por um amigo para se juntar ao servidor.</p>
                <form 
                  onSubmit={async (e) => { 
                    e.preventDefault(); 
                    await joinSpace(e); 
                    setShowAddSpaceModal(false); 
                  }} 
                  className="add-space-modal-form"
                >
                  <input 
                    value={joinSpaceCode} 
                    onChange={(e) => setJoinSpaceCode(e.target.value)} 
                    placeholder="Código do convite" 
                    required 
                  />
                  <button type="submit" className="add-space-modal-submit-btn" disabled={joining}>
                    {joining ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
                <button className="add-space-modal-back-btn" onClick={() => setAddSpaceModalTab('options')}>Voltar</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Screen Selection Modal */}
      {showScreenPicker && (
        <div className="screen-picker-overlay">
          <div className="screen-picker-modal">
            <h2>Selecione a tela ou janela</h2>
            <p>Escolha o que você gostaria de transmitir para a chamada de voz.</p>
            <div className="sources-list">
              {screenSources.map(source => (
                <button key={source.id} className="source-card" onClick={() => selectScreenSource(source.id)}>
                  {source.thumbnail && <img src={source.thumbnail} alt={source.name} />}
                  <span>{source.name}</span>
                </button>
              ))}
            </div>
            <button className="picker-close-btn" onClick={() => setShowScreenPicker(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Space Settings Modal */}
      {showSpaceSettingsModal && editingSpace && (
        <div className="screen-picker-overlay">
          <div className="screen-picker-modal space-settings-modal" style={{ maxWidth: '500px' }}>
            <h2>Configurações do Servidor</h2>
            <p>Gerencie o servidor <strong>{editingSpace.name}</strong>.</p>
            
            <div className="space-settings-tabs">
              <button 
                type="button"
                className={`settings-tab-btn ${activeSpaceTab === 'geral' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('geral')}
              >
                Visão Geral
              </button>
              <button 
                type="button"
                className={`settings-tab-btn ${activeSpaceTab === 'channels' ? 'active' : ''}`}
                onClick={() => setActiveSpaceTab('channels')}
              >
                Canais
              </button>
            </div>

            {activeSpaceTab === 'geral' && (
              <>
                <form onSubmit={handleSaveSpaceSettings} className="space-settings-form">
                  <label className="space-settings-label">Nome do Servidor</label>
                  <input 
                    value={editingSpaceName} 
                    onChange={(e) => setEditingSpaceName(e.target.value)} 
                    placeholder="Insira o nome do servidor"
                    required 
                    minLength={2}
                    maxLength={80}
                  />
                  
                  <label className="space-settings-label" style={{ display: 'block', marginTop: '12px' }}>Descrição do Servidor</label>
                  <textarea 
                    value={editingSpaceDescription} 
                    onChange={(e) => setEditingSpaceDescription(e.target.value)} 
                    placeholder="Fale um pouco sobre o que é este servidor..."
                    className="space-settings-textarea"
                    maxLength={280}
                  />
                  
                  <button type="submit" className="add-space-modal-submit-btn" style={{ marginTop: '16px' }}>
                    Salvar Alterações
                  </button>
                </form>

                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginTop: '16px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Código de Convite do Servidor
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={editingSpace.id} 
                      readOnly 
                      style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-main)' }} 
                    />
                    <button 
                      type="button" 
                      className="ch-create-btn" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => {
                        copyToClipboard(editingSpace.id)
                        showToast("Código Copiado!", "Código de convite copiado com sucesso.", "info")
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Envie este código para seus amigos. Eles podem usá-lo na barra lateral para entrar neste servidor.
                  </p>
                </div>

                <div className="dropdown-divider" style={{ margin: '16px 0' }} />

                <div className="danger-zone">
                  <h3>Zona de Perigo</h3>
                  <p>Ao excluir este servidor, todos os canais, mensagens e participantes associados a ele serão deletados permanentemente. Esta ação não pode ser desfeita.</p>
                  <button 
                    type="button" 
                    className="dropdown-action-btn danger" 
                    style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px' }} 
                    onClick={handleDeleteSpace}
                  >
                    Excluir Servidor
                  </button>
                </div>
              </>
            )}

            {activeSpaceTab === 'channels' && (
              <>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-secondary)' }}>Canais do Servidor</h3>
                <div className="space-settings-channels-list">
                  {(spaceChannels[editingSpace.id] ?? []).map(ch => (
                    <div key={ch.id} className="settings-channel-item">
                      <span className="channel-item-prefix">{ch.type === 'text' ? '＃' : '🔊'}</span>
                      <input 
                        type="text" 
                        defaultValue={ch.name} 
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value.trim() !== ch.name) {
                            renameChannel(ch.id, e.target.value.trim())
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      {ch.name !== 'Geral' && (
                        <button 
                          className="settings-channel-delete-btn" 
                          onClick={() => deleteChannel(ch.id)}
                          title="Excluir Canal"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault()
                    await createChannel(e, editingSpace.id)
                  }}
                  className="settings-channel-create-inline-form"
                >
                  <h4>Criar Novo Canal</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="Nome do canal"
                      required
                      minLength={2}
                      maxLength={60}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                    <select 
                      value={newChannelType} 
                      onChange={(e) => setNewChannelType(e.target.value as 'text' | 'voice')}
                      style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="text">Texto</option>
                      <option value="voice">Voz</option>
                    </select>
                    <button type="submit" className="add-space-card-btn" style={{ width: 'auto', padding: '8px 16px' }}>Criar</button>
                  </div>
                </form>
              </>
            )}

            <button className="picker-close-btn" style={{ marginTop: '16px' }} onClick={() => setShowSpaceSettingsModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* User Volume Control Modal */}
      {volumeControlUser && (
        <div className="screen-picker-overlay" onClick={() => setVolumeControlUser(null)}>
          <div className="screen-picker-modal volume-control-modal" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h2>Volume de Usuário</h2>
            <p>Ajuste o volume local de <strong>{volumeControlUser.displayName}</strong>.</p>
            
            <div className="volume-slider-container" style={{ margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <span>Volume de Voz</span>
                <span>{userVolumes[volumeControlUser.userId] !== undefined ? userVolumes[volumeControlUser.userId] : 100}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={userVolumes[volumeControlUser.userId] !== undefined ? userVolumes[volumeControlUser.userId] : 100}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  const newVols = { ...userVolumes, [volumeControlUser.userId]: val }
                  setUserVolumes(newVols)
                  localStorage.setItem('echo-user-volumes', JSON.stringify(newVols))
                }}
                style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
              />
            </div>

            <button className="picker-close-btn" style={{ width: '100%', margin: 0 }} onClick={() => setVolumeControlUser(null)}>
              Pronto
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModalConfig && confirmModalConfig.isOpen && (
        <div className="screen-picker-overlay confirm-modal-overlay" onClick={() => setConfirmModalConfig(null)}>
          <div className="screen-picker-modal confirm-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="confirm-modal-title">{confirmModalConfig.title}</h2>
            <p className="confirm-modal-message" style={{ margin: '12px 0 20px', fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {confirmModalConfig.message}
            </p>
            <div className="confirm-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                className="ch-create-btn" 
                style={{ background: 'none', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 'bold' }} 
                onClick={() => setConfirmModalConfig(null)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="dropdown-action-btn danger" 
                style={{ width: 'auto', padding: '10px 20px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 'bold' }} 
                onClick={confirmModalConfig.onConfirm}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast-item toast-${toast.type || 'info'}`}>
              <div className="toast-content">
                <strong>{toast.title}</strong>
                <span>{toast.message}</span>
              </div>
              <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>✕</button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><i /><i /><i /></span>
      <span>echo</span>
    </div>
  )
}

function Placeholder({ page }: { page: Exclude<Page, 'Servidores' | 'Amigos' | 'Configurações'> }) {
  return (
    <section className="empty-page">
      <div className="empty-symbol">✦</div>
      <h1>{page}</h1>
      <p>Esta área estará disponível em breve.</p>
    </section>
  )
}

/* ── Friends View Component ─────────────────────── */
function FriendsView({
  friendships,
  friendTab,
  setFriendTab,
  friendSearchQuery,
  setFriendSearchQuery,
  friendSearchNotice,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  onlineUsers,
  presenceData,
  user,
  selectedDMUserId,
  directMessages,
  dmDraft,
  setDmDraft,
  unreadDMs,
  onOpenDM,
  onSendDM,
  onCloseDM,
  isUploading,
  onUploadFile,
  profileDisplayName,
  profileAvatarUrl,
  theme,
  toggleTheme,
  setPage,
  onSignOut
}: {
  friendships: FriendshipRequest[]
  friendTab: 'online' | 'all' | 'pending' | 'add'
  setFriendTab: (tab: 'online' | 'all' | 'pending' | 'add') => void
  friendSearchQuery: string
  setFriendSearchQuery: (val: string) => void
  friendSearchNotice: string
  sendFriendRequest: (event: FormEvent) => void
  acceptFriendRequest: (id: string) => void
  removeFriendship: (id: string) => void
  onlineUsers: Set<string>
  presenceData: Record<string, any>
  user: User
  selectedDMUserId: string | null
  directMessages: DirectMessage[]
  dmDraft: string
  setDmDraft: (val: string) => void
  unreadDMs: Record<string, number>
  onOpenDM: (friendId: string) => void
  onSendDM: (event: FormEvent) => void
  onCloseDM: () => void
  isUploading: boolean
  onUploadFile: (file: File) => void
  profileDisplayName: string
  profileAvatarUrl: string
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setPage: (page: Page) => void
  onSignOut: () => void
}) {
  const dmFileRef = useRef<HTMLInputElement>(null)
  const dmMessagesEndRef = useRef<HTMLDivElement>(null)
  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const onlineFriends = acceptedFriends.filter(f => onlineUsers.has(f.user.id))
  const pendingRequests = friendships.filter(f => f.status === 'pending')

  return (
    <section className="friends-workspace">
      <aside className="friends-sidebar">
        <div className="friends-sidebar-scrollable">
          <div className="sidebar-header">Amigos</div>
          <div className="friends-menu">
            <button className={`menu-item ${friendTab === 'online' ? 'active' : ''}`} onClick={() => setFriendTab('online')}>
              <span className="menu-icon"><ActivityIcon /></span>
              <span>Online</span>
              {onlineFriends.length > 0 && <span className="menu-badge">{onlineFriends.length}</span>}
            </button>
            <button className={`menu-item ${friendTab === 'all' ? 'active' : ''}`} onClick={() => setFriendTab('all')}>
              <span className="menu-icon"><UsersIcon /></span>
              <span>Todos</span>
              {acceptedFriends.length > 0 && <span className="menu-badge">{acceptedFriends.length}</span>}
            </button>
            <button className={`menu-item ${friendTab === 'pending' ? 'active' : ''}`} onClick={() => setFriendTab('pending')}>
              <span className="menu-icon"><ClockIcon /></span>
              <span>Pendentes</span>
              {pendingRequests.length > 0 && <span className="menu-badge pending-badge">{pendingRequests.length}</span>}
            </button>
            <button className={`menu-item add-friend-item ${friendTab === 'add' ? 'active' : ''}`} onClick={() => setFriendTab('add')}>
              <span className="menu-icon"><PlusIcon /></span>
              <span>Adicionar Amigo</span>
            </button>
          </div>
        </div>

        <div className="sidebar-profile-footer">
          <div className="profile-footer-info">
            <div className="profile-footer-avatar">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={profileDisplayName} />
              ) : (
                profileDisplayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="profile-footer-meta">
              <span className="profile-footer-name" title={profileDisplayName}>{profileDisplayName}</span>
              <span className="profile-footer-status">Online</span>
            </div>
          </div>
          <div className="profile-footer-actions">
            <button className="profile-footer-btn" onClick={toggleTheme} title="Alternar tema">
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button className="profile-footer-btn" onClick={() => setPage('Configurações')} title="Configurações">
              <SettingsIcon />
            </button>
            <button className="profile-footer-btn logout" onClick={onSignOut} title="Sair">
              <LogOutIcon />
            </button>
          </div>
        </div>
      </aside>

      <section className="friends-content">
        {friendTab === 'online' && (
          <div className="friends-list-container">
            <h2>Amigos Online ({onlineFriends.length})</h2>
            {onlineFriends.length === 0 ? (
              <div className="empty-friends-list">Nenhum amigo online no momento.</div>
            ) : (
              <div className="friends-list">
                {onlineFriends.map(friend => (
                  <div key={friend.id} className="friend-row">
                    <div className="friend-avatar-wrapper">
                      <div className="friend-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {friend.user.avatar_url ? (
                          <img src={friend.user.avatar_url} alt={friend.user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          friend.user.display_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="online-indicator" />
                    </div>
                    <div className="friend-info">
                      <span className="friend-name">{friend.user.display_name}</span>
                      <span className="friend-status" title={presenceData[friend.user.id]?.custom_status}>
                        {presenceData[friend.user.id]?.custom_status || 'Disponível'}
                      </span>
                    </div>
                    <div className="friend-actions">
                      <button className="friend-action-btn msg-btn" onClick={() => onOpenDM(friend.user.id)} title="Mensagem" style={{ position: 'relative' }}>
                        💬
                        {unreadDMs[friend.user.id] && <span className="unread-badge">{unreadDMs[friend.user.id]}</span>}
                      </button>
                      <button className="friend-action-btn remove-btn" onClick={() => removeFriendship(friend.id)} title="Desfazer Amizade">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {friendTab === 'all' && (
          <div className="friends-list-container">
            <h2>Todos os Amigos ({acceptedFriends.length})</h2>
            {acceptedFriends.length === 0 ? (
              <div className="empty-friends-list">Você ainda não tem amigos adicionados.</div>
            ) : (
              <div className="friends-list">
                {acceptedFriends.map(friend => {
                  const isOnline = onlineUsers.has(friend.user.id)
                  return (
                    <div key={friend.id} className="friend-row">
                      <div className="friend-avatar-wrapper">
                        <div className="friend-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {friend.user.avatar_url ? (
                            <img src={friend.user.avatar_url} alt={friend.user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            friend.user.display_name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        {isOnline && <span className="online-indicator" />}
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{friend.user.display_name}</span>
                        <span className="friend-status" title={isOnline ? (presenceData[friend.user.id]?.custom_status || 'Online') : 'Offline'}>
                          {isOnline ? (presenceData[friend.user.id]?.custom_status || 'Online') : 'Offline'}
                        </span>
                      </div>
                      <div className="friend-actions">
                        <button className="friend-action-btn msg-btn" onClick={() => onOpenDM(friend.user.id)} title="Mensagem" style={{ position: 'relative' }}>
                          💬
                          {unreadDMs[friend.user.id] && <span className="unread-badge">{unreadDMs[friend.user.id]}</span>}
                        </button>
                        <button className="friend-action-btn remove-btn" onClick={() => removeFriendship(friend.id)} title="Desfazer Amizade">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {friendTab === 'pending' && (
          <div className="friends-list-container">
            <h2>Solicitações Pendentes ({pendingRequests.length})</h2>
            {pendingRequests.length === 0 ? (
              <div className="empty-friends-list">Nenhuma solicitação de amizade pendente.</div>
            ) : (
              <div className="friends-list">
                {pendingRequests.map(req => {
                  const isReceived = req.initiatorId !== user.id
                  return (
                    <div key={req.id} className="friend-row">
                      <div className="friend-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {req.user.avatar_url ? (
                          <img src={req.user.avatar_url} alt={req.user.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          req.user.display_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="friend-info">
                        <span className="friend-name">{req.user.display_name}</span>
                        <span className="friend-status">{isReceived ? 'Quer ser seu amigo' : 'Solicitação enviada'}</span>
                      </div>
                      <div className="friend-actions">
                        {isReceived ? (
                          <>
                            <button className="friend-action-btn accept-btn" onClick={() => acceptFriendRequest(req.id)} title="Aceitar">✓</button>
                            <button className="friend-action-btn decline-btn" onClick={() => removeFriendship(req.id)} title="Recusar">✕</button>
                          </>
                        ) : (
                          <button className="friend-action-btn cancel-btn" onClick={() => removeFriendship(req.id)} title="Cancelar solicitação">Cancelar</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {friendTab === 'add' && (
          <div className="add-friend-container">
            <h2>Adicionar Amigo</h2>
            <p>Você pode adicionar amigos digitando o Nome de Exibição (Display Name) deles.</p>
            <form onSubmit={sendFriendRequest} className="add-friend-form">
              <input 
                value={friendSearchQuery} 
                onChange={e => setFriendSearchQuery(e.target.value)} 
                placeholder="Insira o nome de exibição do seu amigo…" 
                required 
                minLength={2}
              />
              <button type="submit">Enviar solicitação</button>
            </form>
            {friendSearchNotice && (
              <div className={`friend-search-notice ${friendSearchNotice.includes('sucesso') ? 'success' : 'error'}`}>
                {friendSearchNotice}
              </div>
            )}
          </div>
        )}
      </section>

      {/* DM Chat Panel */}
      {selectedDMUserId && (() => {
        const dmFriend = friendships.find(f => f.user.id === selectedDMUserId)
        const dmFriendName = dmFriend?.user.display_name || 'Amigo'
        return (
          <aside className="dm-chat-panel">
            <div className="dm-chat-header">
              <div className="dm-chat-header-info">
                <div className="friend-avatar" style={{ width: 32, height: 32, fontSize: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {dmFriend?.user.avatar_url ? (
                    <img src={dmFriend.user.avatar_url} alt={dmFriendName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    dmFriendName.slice(0, 1).toUpperCase()
                  )}
                </div>
                <span className="dm-chat-name">{dmFriendName}</span>
              </div>
              <button className="dm-close-btn" onClick={onCloseDM} title="Fechar">✕</button>
            </div>
            <div className="dm-messages-list">
              {directMessages.length === 0 ? (
                <div className="dm-empty">Nenhuma mensagem ainda. Diga oi! 👋</div>
              ) : (
                directMessages.map(msg => (
                  <div key={msg.id} className={`dm-message ${msg.sender_id === user.id ? 'dm-sent' : 'dm-received'}`}>
                    <div className="dm-bubble">
                      {msg.attachment_url && msg.attachment_type === 'image' && (
                        <img src={msg.attachment_url} alt="anexo" className="dm-attachment-img" onClick={() => window.open(msg.attachment_url, '_blank')} />
                      )}
                      {msg.attachment_url && msg.attachment_type !== 'image' && (
                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="dm-attachment-file">📎 {msg.body}</a>
                      )}
                      {(!msg.attachment_url || msg.attachment_type === 'image') && <span>{msg.body}</span>}
                      <span className="dm-time">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={dmMessagesEndRef} />
            </div>
            <form className="dm-compose" onSubmit={onSendDM}>
              <input type="file" ref={dmFileRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); e.target.value = '' }} />
              <button type="button" className="dm-attach-btn" onClick={() => dmFileRef.current?.click()} disabled={isUploading} title="Anexar arquivo">
                {isUploading ? '⏳' : '📎'}
              </button>
              <input value={dmDraft} onChange={(e) => setDmDraft(e.target.value)} placeholder="Escreva uma mensagem…" />
              <button type="submit" disabled={!dmDraft.trim() && !isUploading}>➤</button>
            </form>
          </aside>
        )
      })()}
    </section>
  )
}

/* ── Settings View Component ────────────────────── */
function SettingsView({
  userId,
  currentDisplayName,
  currentAvatarUrl,
  customStatus,
  onProfileUpdate,
  onCustomStatusUpdate,
  audioInputs,
  audioOutputs,
  selectedInputId,
  selectedOutputId,
  onInputDeviceChange,
  onOutputDeviceChange,
  audioError,
  onRefreshDevices,
  profileDisplayName,
  profileAvatarUrl,
  theme,
  toggleTheme,
  setPage,
  onSignOut
}: {
  userId: string
  currentDisplayName: string
  currentAvatarUrl: string
  customStatus: string
  onProfileUpdate: (name: string, avatar: string) => void
  onCustomStatusUpdate: (status: string) => void
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  selectedInputId: string
  selectedOutputId: string
  onInputDeviceChange: (id: string) => void
  onOutputDeviceChange: (id: string) => void
  audioError: string | null
  onRefreshDevices: () => void
  profileDisplayName: string
  profileAvatarUrl: string
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setPage: (page: Page) => void
  onSignOut: () => void
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'audio'>('profile')
  
  // Profile settings state
  const [localDisplayName, setLocalDisplayName] = useState(currentDisplayName)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(currentAvatarUrl)
  const [localCustomStatus, setLocalCustomStatus] = useState(customStatus)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  async function handleAvatarUpload(file: File) {
    if (!supabase) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
      setLocalAvatarUrl(urlData.publicUrl)
    } catch (err: any) {
      alert('Erro ao fazer upload da imagem: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Mic test state
  const [testingMic, setTestingMic] = useState(false)
  const [testVolume, setTestVolume] = useState(0)
  const micTestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const micTestStreamRef = useRef<MediaStream | null>(null)
  const micTestCtxRef = useRef<AudioContext | null>(null)

  // Public/free avatars gallery
  const defaultAvatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo5',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo6'
  ]

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setSavingProfile(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        display_name: localDisplayName,
        avatar_url: localAvatarUrl
      })
      if (error) throw error
      onProfileUpdate(localDisplayName, localAvatarUrl)
      onCustomStatusUpdate(localCustomStatus)
      alert('Perfil salvo com sucesso!')
    } catch (err: any) {
      alert('Erro ao salvar perfil: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  function toggleMicTest() {
    if (testingMic) {
      if (micTestIntervalRef.current) clearInterval(micTestIntervalRef.current)
      micTestStreamRef.current?.getTracks().forEach(t => t.stop())
      micTestCtxRef.current?.close().catch(() => {})
      setTestVolume(0)
      setTestingMic(false)
    } else {
      navigator.mediaDevices.getUserMedia({
        audio: selectedInputId !== 'default' ? { deviceId: { exact: selectedInputId } } : true,
        video: false
      }).then(stream => {
        micTestStreamRef.current = stream
        const ctx = new AudioContext()
        micTestCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)

        setTestingMic(true)
        micTestIntervalRef.current = setInterval(() => {
          const data = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length
          const vol = Math.min(100, Math.floor(avg * 2.5))
          setTestVolume(vol)
        }, 100)
      }).catch(err => {
        alert('Não foi possível acessar o microfone para teste: ' + err)
      })
    }
  }

  useEffect(() => {
    return () => {
      if (micTestIntervalRef.current) clearInterval(micTestIntervalRef.current)
      micTestStreamRef.current?.getTracks().forEach(t => t.stop())
      micTestCtxRef.current?.close().catch(() => {})
    }
  }, [])

  return (
    <section className="settings-workspace">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-scrollable">
          <div className="sidebar-header">Configurações</div>
          <div className="settings-menu">
            <button 
              className={`menu-item ${activeSettingsTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('profile')}
            >
              <span className="menu-icon">👤</span>
              <span>Meu Perfil</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('audio')}
            >
              <span className="menu-icon">🎙️</span>
              <span>Voz e Áudio</span>
            </button>
          </div>
        </div>

        <div className="sidebar-profile-footer">
          <div className="profile-footer-info">
            <div className="profile-footer-avatar">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={profileDisplayName} />
              ) : (
                profileDisplayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="profile-footer-meta">
              <span className="profile-footer-name" title={profileDisplayName}>{profileDisplayName}</span>
              <span className="profile-footer-status">Online</span>
            </div>
          </div>
          <div className="profile-footer-actions">
            <button className="profile-footer-btn" onClick={toggleTheme} title="Alternar tema">
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            <button className="profile-footer-btn" onClick={() => setPage('Configurações')} title="Configurações">
              <SettingsIcon />
            </button>
            <button className="profile-footer-btn logout" onClick={onSignOut} title="Sair">
              <LogOutIcon />
            </button>
          </div>
        </div>
      </aside>

      <section className="settings-content">
        {activeSettingsTab === 'profile' ? (
          <div className="settings-container">
            <h2>Meu Perfil</h2>
            <p>Gerencie o seu nome de usuário e foto de exibição para todo o Echo.</p>

            <form onSubmit={handleSaveProfile} className="profile-settings-form">
              <div className="profile-preview-card">
                <div className="profile-preview-avatar">
                  {localAvatarUrl ? (
                    <img src={localAvatarUrl} alt="Visualização do Avatar" className="round-avatar-img-large" />
                  ) : (
                    <span className="avatar-initial-large">
                      {localDisplayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="profile-preview-meta">
                  <h3>{localDisplayName || 'Membro'}</h3>
                  <p style={{ fontStyle: 'italic', opacity: 0.8, fontSize: '13px', margin: '2px 0 0 0' }}>{localCustomStatus || 'Nenhum status'}</p>
                </div>
              </div>

              <div className="selector-card" style={{ marginTop: '20px' }}>
                <label>Nome de Exibição (Username)</label>
                <input 
                  value={localDisplayName} 
                  onChange={(e) => setLocalDisplayName(e.target.value)} 
                  placeholder="Seu nome no Echo"
                  required 
                  minLength={2}
                  maxLength={40}
                  className="profile-input-text"
                />
              </div>

              <div className="selector-card" style={{ marginTop: '16px' }}>
                <label>Status de Atividade (ex: Jogando Minecraft)</label>
                <input 
                  value={localCustomStatus} 
                  onChange={(e) => setLocalCustomStatus(e.target.value)} 
                  placeholder="O que você está fazendo agora?"
                  maxLength={100}
                  className="profile-input-text"
                />
              </div>

              <div className="selector-card" style={{ marginTop: '16px' }}>
                <label>Foto de Perfil (URL da Imagem)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    value={localAvatarUrl} 
                    onChange={(e) => setLocalAvatarUrl(e.target.value)} 
                    placeholder="Cole o link de qualquer imagem (.png, .jpg, .svg)"
                    className="profile-input-text"
                    style={{ flex: 1 }}
                  />
                  <input 
                    type="file" 
                    id="profile-avatar-upload-input" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => { 
                      const f = e.target.files?.[0]; 
                      if (f) handleAvatarUpload(f); 
                      e.target.value = '' 
                    }} 
                  />
                  <button 
                    type="button" 
                    className="ch-create-btn" 
                    style={{ padding: '10px 16px', fontSize: '13px', whiteSpace: 'nowrap', width: 'auto', margin: 0 }}
                    onClick={() => document.getElementById('profile-avatar-upload-input')?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Enviando...' : '📤 Enviar Imagem'}
                  </button>
                </div>
              </div>

              <div className="avatar-gallery-section" style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Ou escolha um Avatar de Robô rápido:
                </label>
                <div className="avatar-gallery-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {defaultAvatars.map((url, idx) => (
                    <button 
                      key={idx}
                      type="button" 
                      onClick={() => setLocalAvatarUrl(url)}
                      className={`gallery-avatar-btn ${localAvatarUrl === url ? 'selected' : ''}`}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: localAvatarUrl === url ? '3px solid var(--accent-color)' : '2px solid transparent',
                        padding: 0,
                        cursor: 'pointer',
                        background: 'var(--bg-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <img src={url} alt={`Avatar ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="ch-create-btn" 
                style={{ marginTop: '24px', padding: '12px', width: '100%', fontWeight: 'bold' }}
                disabled={savingProfile}
              >
                {savingProfile ? 'Salvando…' : 'Salvar Alterações de Perfil'}
              </button>
            </form>
          </div>
        ) : (
          <div className="settings-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Configurações de Áudio</h2>
              <button className="picker-close-btn" style={{ margin: 0, padding: '6px 12px' }} onClick={onRefreshDevices}>
                🔄 Detectar Dispositivos
              </button>
            </div>
            <p>Configure os dispositivos de entrada e saída de som do seu sistema.</p>

            {audioError && (
              <div className="friend-search-notice error" style={{ margin: '8px 0' }}>
                <strong>Aviso do Sistema:</strong> {audioError}
                <br />
                <span style={{ fontSize: '11px', opacity: 0.85 }}>
                  Verifique se o seu microfone está conectado e se o acesso ao microfone está habilitado nas Configurações de Privacidade do Windows.
                </span>
              </div>
            )}
            
            <div className="device-selectors-grid">
              <div className="selector-card">
                <label>Microfone (Entrada)</label>
                <select value={selectedInputId} onChange={(e) => onInputDeviceChange(e.target.value)}>
                  <option value="default">Microfone padrão do sistema</option>
                  {audioInputs.map(input => (
                    <option key={input.deviceId} value={input.deviceId}>
                      {input.label || `Microfone (${input.deviceId.slice(0, 5)})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="selector-card">
                <label>Dispositivo de Saída (Fones / Alto-falante)</label>
                <select value={selectedOutputId} onChange={(e) => onOutputDeviceChange(e.target.value)}>
                  <option value="default">Saída padrão do sistema</option>
                  {audioOutputs.map(output => (
                    <option key={output.deviceId} value={output.deviceId}>
                      {output.label || `Saída (${output.deviceId.slice(0, 5)})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mic-test-panel">
              <h3>Testar Microfone</h3>
              <p>Fale no seu microfone para conferir se o Echo está capturando a sua voz.</p>
              <div className="mic-test-row">
                <button 
                  type="button" 
                  className={`mic-test-btn ${testingMic ? 'testing' : ''}`} 
                  onClick={toggleMicTest}
                >
                  {testingMic ? 'Parar Teste' : 'Testar Mic'}
                </button>
                <div className="volume-meter-bg">
                  <div className="volume-meter-fill" style={{ width: `${testVolume}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </section>
  )
}

function AudioLevelMeter({ stream }: { stream: MediaStream | null }) {
  const [level, setLevel] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0)
      return
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateLevel = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength
        // Normalize level (average is 0-255)
        setLevel(Math.min(100, Math.round((average / 128) * 100)))
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch (e) {
      console.error('Failed to create audio level meter:', e)
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
      analyserRef.current = null
    }
  }, [stream])

  const hasAudio = stream && stream.getAudioTracks().length > 0

  return (
    <div className="audio-level-meter" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.6)', fontSize: '11px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
      <span>🔊 Captando Som:</span>
      {hasAudio ? (
        <div style={{ width: '80px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${level}%`, height: '100%', background: level > 50 ? '#ff4757' : '#2ed573', transition: 'width 0.05s ease' }} />
        </div>
      ) : (
        <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Não Detectado (Sem som)</span>
      )}
    </div>
  )
}
