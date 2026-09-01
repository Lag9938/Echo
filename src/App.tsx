import { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { useVoiceChannel } from './lib/useVoiceChannel'
import type { VoiceParticipant } from './lib/useVoiceChannel'
import './App.css'
import { THEMES } from './lib/themes'



type Page = 'Amigos' | 'Mensagens' | 'Servidores' | 'Descobrir' | 'Configurações'

export interface RolePermissions {
  administrator?: boolean;
  manageChannels?: boolean;
  manageMessages?: boolean;
  kickMembers?: boolean;
  muteMembers?: boolean;
  sendInAnnouncementChannels?: boolean;
}

export interface ServerRole {
  id: string;
  name: string;
  color: string;
  position: number;
  permissions: RolePermissions;
}

export interface ServerAuditLog {
  id: string;
  timestamp: string;
  author_name: string;
  action: string;
  details?: string;
}

export interface ServerEmoji {
  id: string;
  name: string;
  url: string;
  created_at: string;
  creator_id?: string;
}

export interface PinnedMessage {
  id: string;
  channel_id: string;
  message_id: string;
  body: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  pinned_at: string;
  pinned_by_name: string;
  attachment_url?: string;
  attachment_type?: string;
}

type Space = { 
  id: string; 
  name: string; 
  description: string; 
  creator_id: string; 
  created_at?: string;
  icon_url?: string;
  banner_url?: string;
  banner_theme?: string;
  welcome_channel_id?: string;
  roles?: ServerRole[];
  emojis?: ServerEmoji[];
}

type Channel = { 
  id: string; 
  name: string; 
  type: 'text' | 'voice'; 
  space_id: string;
  topic?: string;
  position?: number;
  is_announcement?: boolean;
  user_limit?: number;
  slowmode_seconds?: number;
  category?: string;
}

const DEFAULT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛',
  '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
  '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
  '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
  '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡',
  '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
  '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
  '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '⚡', '💥', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇',
  '🚀', '🛸', '⭐', '🌟', '💫', '👑', '💎', '🎮', '🕹️', '🎧'
]

const SERVER_BANNER_PRESETS = [
  { id: 'dark', name: 'Dark Void', style: 'linear-gradient(135deg, #2b3240, #181b22)' },
  { id: 'magenta', name: 'Neon Pink', style: 'linear-gradient(135deg, #ff007f, #aa0055)' },
  { id: 'red', name: 'Ruby Crimson', style: 'linear-gradient(135deg, #e0554c, #8b1d16)' },
  { id: 'orange', name: 'Sunset Orange', style: 'linear-gradient(135deg, #f97316, #c2410c)' },
  { id: 'gold', name: 'Golden Glow', style: 'linear-gradient(135deg, #eab308, #a16207)' },
  { id: 'purple', name: 'Cyber Violet', style: 'linear-gradient(135deg, #8b5cf6, #5b21b6)' },
  { id: 'cyan', name: 'Electric Cyan', style: 'linear-gradient(135deg, #06b6d4, #0e7490)' },
  { id: 'teal', name: 'Ocean Aqua', style: 'linear-gradient(135deg, #14b8a6, #0f766e)' },
  { id: 'forest', name: 'Emerald Forest', style: 'linear-gradient(135deg, #22c55e, #15803d)' },
  { id: 'slate', name: 'Steel Gray', style: 'linear-gradient(135deg, #64748b, #334155)' }
]

const ROLE_COLOR_PRESETS = [
  '#99aab5',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#14b8a6'
]
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
function MicIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function MicOffIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.18 1.57"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function HeadphonesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  )
}

function HeadphonesOffIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M8.83 4.28A9 9 0 0 1 21 12v6a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a9 9 0 0 1 .52-3"/>
    </svg>
  )
}

function CrownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
    </svg>
  )
}

function UserMinusIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="18" y1="11" x2="23" y2="11"/>
    </svg>
  )
}

function ShieldIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function ArrowUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

function ArrowDownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function CameraIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function BellOffIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
      <path d="M18 8a6 6 0 0 0-9.33-5"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function BellIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
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

function MegaphoneIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z"/>
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  )
}

function PaletteIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  )
}

function FileTextIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}

function TrashIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  )
}

function SparklesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
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

function ClockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a3 3 0 0 0-6 0v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z" />
    </svg>
  )
}

function SearchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function SmileIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  )
}

function FolderIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}

function ChevronDownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronRightIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function formatMessageText(text: string, userDisplayName?: string, serverEmojis?: ServerEmoji[]): React.ReactNode {
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

          // Format bold, italic, strikethrough, inline code, custom emojis and mentions
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

          // Custom Server Emojis: :emoji_name:
          if (serverEmojis && serverEmojis.length > 0) {
            const emojiNames = serverEmojis.map(e => e.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
            if (emojiNames) {
              const emojiRegex = new RegExp(`:(${emojiNames}):`, 'g');
              subParts = subParts.flatMap(sp => {
                if (typeof sp !== 'string') return sp;
                const emParts = sp.split(emojiRegex);
                return emParts.map((emp, i) => {
                  if (i % 2 === 1) {
                    const matchEmoji = serverEmojis.find(e => e.name.toLowerCase() === emp.toLowerCase());
                    if (matchEmoji) {
                      return (
                        <img 
                          key={`em-${i}`} 
                          src={matchEmoji.url} 
                          alt={`:${matchEmoji.name}:`} 
                          title={`:${matchEmoji.name}:`} 
                          className="custom-chat-emoji"
                          style={{ width: '22px', height: '22px', objectFit: 'contain', verticalAlign: 'middle', margin: '0 2px' }} 
                        />
                      );
                    }
                  }
                  return emp;
                });
              });
            }
          }

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
      navigator.clipboard.writeText(text).catch(err => {
        console.warn("Async clipboard write failed, trying fallback", err);
        fallbackCopyToClipboard(text);
      });
      return true;
    }
  } catch (e) {
    console.warn("navigator.clipboard failed, trying fallback", e);
  }
  return fallbackCopyToClipboard(text);
}

function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
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
      <div className="auth-bg-blob auth-bg-blob-1"></div>
      <div className="auth-bg-blob auth-bg-blob-2"></div>
      <div className="auth-bg-blob auth-bg-blob-3"></div>

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
  const [editingSpaceIconUrl, setEditingSpaceIconUrl] = useState('')
  const [editingSpaceBannerUrl, setEditingSpaceBannerUrl] = useState('')
  const [editingSpaceBannerTheme, setEditingSpaceBannerTheme] = useState('dark')
  const [editingSpaceWelcomeChannelId, setEditingSpaceWelcomeChannelId] = useState('')
  const [uploadingSpaceIcon, setUploadingSpaceIcon] = useState(false)
  const [uploadingSpaceBanner, setUploadingSpaceBanner] = useState(false)
  const [activeSpaceTab, setActiveSpaceTab] = useState<'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger'>('geral')
  const [editingSpaceMembers, setEditingSpaceMembers] = useState<any[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [loadingEditingMembers, setLoadingEditingMembers] = useState(false)
  const [showSpaceSettingsModal, setShowSpaceSettingsModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null)
  
  // Roles Management States
  const [serverRoles, setServerRoles] = useState<ServerRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [memberRoleMap, setMemberRoleMap] = useState<Record<string, string[]>>({}) // userId -> roleIds[]

  // Emojis States
  const [serverEmojis, setServerEmojis] = useState<ServerEmoji[]>([])
  const [newEmojiName, setNewEmojiName] = useState('')
  const [uploadingEmoji, setUploadingEmoji] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerTab, setEmojiPickerTab] = useState<'default' | 'server'>('default')

  // Pinned Messages States
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, PinnedMessage[]>>({})
  const [showPinnedMessagesPanel, setShowPinnedMessagesPanel] = useState(false)

  // Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)

  // Slowmode & Categories States
  const [newChannelSlowmode, setNewChannelSlowmode] = useState<number>(0)
  const [newChannelCategory, setNewChannelCategory] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [slowmodeCooldown, setSlowmodeCooldown] = useState<number>(0)
  const [spaceVoiceUsers, setSpaceVoiceUsers] = useState<Record<string, VoiceParticipant[]>>({})

  // Inspected Member Card Popover
  const [inspectedMember, setInspectedMember] = useState<{ user: { id: string; display_name: string; avatar_url?: string }; joined_at?: string; roleName?: string; roleColor?: string; roles?: ServerRole[] } | null>(null)

  // Audit Logs States
  const [serverAuditLogs, setServerAuditLogs] = useState<ServerAuditLog[]>([])

  // Channel Customization States
  const [newChannelTopic, setNewChannelTopic] = useState('')
  const [newChannelIsAnnouncement, setNewChannelIsAnnouncement] = useState(false)
  const [newChannelUserLimit, setNewChannelUserLimit] = useState<number>(0)

  const [mutedSpaces, setMutedSpaces] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('echo-muted-spaces')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [spaceMembers, setSpaceMembers] = useState<any[]>([])
  const [showMembersList, setShowMembersList] = useState(true)
  const [showVoiceChat, setShowVoiceChat] = useState(false)
  const [showVoiceMembers, setShowVoiceMembers] = useState(false)
  const [customStatus, setCustomStatus] = useState(() => localStorage.getItem('echo-custom-status') || '')
  const [presenceData, setPresenceData] = useState<Record<string, any>>({})
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set())
  const selectedChannelRef = useRef(selectedChannel)
  const mutedSpacesRef = useRef(mutedSpaces)
  const spaceChannelsRef = useRef(spaceChannels)
  const presenceChannelRef = useRef<any>(null)
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'idle' | 'dnd' | 'invisible'>(() => (localStorage.getItem('echo-presence-status') as any) || 'online')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(() => localStorage.getItem('echo-noise-suppression') !== 'false')
  const [echoCancellationEnabled, setEchoCancellationEnabled] = useState(() => localStorage.getItem('echo-echo-cancellation') !== 'false')
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(() => localStorage.getItem('echo-noise-gate-enabled') !== 'false')
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(() => parseFloat(localStorage.getItem('echo-noise-gate-threshold') || '-45'))
  const [showScreenshareModal, setShowScreenshareModal] = useState(false)
  const [sfxVolume, setSfxVolume] = useState(() => {
    const val = localStorage.getItem('echo-sfx-volume')
    return val !== null ? parseFloat(val) : 0.5
  })

  // Auto-update state
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'downloading' | 'ready'>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)

  async function updatePresenceStatus(status: 'online' | 'idle' | 'dnd' | 'invisible') {
    setPresenceStatus(status)
    localStorage.setItem('echo-presence-status', status)
    if (presenceChannelRef.current) {
      const savedStatus = localStorage.getItem('echo-custom-status') || ''
      await presenceChannelRef.current.track({
        user_id: user.id,
        display_name: profileDisplayName,
        online_at: new Date().toISOString(),
        custom_status: savedStatus,
        presence_status: status
      })
    }
  }

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

  // Request desktop notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  const displayName = (user.user_metadata.display_name as string | undefined) || user.email?.split('@')[0] || 'Você'

  // Theme state
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('echo-theme') || 'light'
  })

  // Premium & Subscription state (Mocked / Local)
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(() => {
    return localStorage.getItem('echo-premium') === 'true'
  })
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [pendingTheme, setPendingTheme] = useState<string | null>(null)

  useEffect(() => {
    // Clear all theme classes
    THEMES.forEach(t => {
      document.body.classList.remove(t.className)
    })
    // Add current theme class
    const activeTheme = THEMES.find(t => t.id === theme)
    if (activeTheme) {
      document.body.classList.add(activeTheme.className)
    }
    localStorage.setItem('echo-theme', theme)
  }, [theme])

  function selectTheme(themeId: string) {
    const selected = THEMES.find(t => t.id === themeId)
    if (!selected) return

    if (selected.isPremium && !isPremiumUser) {
      setPendingTheme(themeId)
      setShowSubscriptionModal(true)
    } else {
      setTheme(themeId)
    }
  }

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  function handleSimulateSubscription() {
    setIsPremiumUser(true)
    localStorage.setItem('echo-premium', 'true')
    setShowSubscriptionModal(false)
    if (pendingTheme) {
      setTheme(pendingTheme)
      setPendingTheme(null)
    }
  }

  // Auto-update listener
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onUpdateAvailable) return
    api.onUpdateAvailable((info: { version: string }) => {
      setUpdateStatus('downloading')
      setUpdateVersion(info.version)
    })
    api.onUpdateProgress((progress: { percent: number }) => {
      setUpdateProgress(progress.percent)
    })
    api.onUpdateReady((info: { version: string }) => {
      setUpdateStatus('ready')
      setUpdateVersion(info.version)
    })
  }, [])

  // Voice hook and state
  const { 
    participants, 
    isMuted, 
    isDeafened,
    isConnected, 
    localScreenStream,
    rtcStats,
    joinVoice, 
    leaveVoice, 
    toggleMute,
    toggleDeafen,
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
  const [screenPickerTab, setScreenPickerTab] = useState<'windows' | 'screens'>('windows')
  const [isScreenFullScreen, setIsScreenFullScreen] = useState(false)

  // Exit fullscreen / settings on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSpaceSettingsModal) {
          setShowSpaceSettingsModal(false)
        } else {
          setIsScreenFullScreen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSpaceSettingsModal])

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
    changeInputDevice(id, noiseSuppressionEnabled, echoCancellationEnabled)
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

  // Subscrição em tempo real para visualizar participantes em todos os canais de voz mesmo sem entrar
  useEffect(() => {
    const sb = supabase
    if (!sb || spaces.length === 0) return

    const activeSubscriptions: any[] = []

    spaces.forEach(sp => {
      const channel = sb.channel(`space-voice-${sp.id}`, {
        config: { presence: { key: user.id } }
      })

      const handlePresenceSync = () => {
        const state = channel.presenceState()
        const byChannel: Record<string, VoiceParticipant[]> = {}

        Object.values(state).forEach(presences => {
          for (const pres of presences as any[]) {
            if (pres && pres.channel_id) {
              if (!byChannel[pres.channel_id]) {
                byChannel[pres.channel_id] = []
              }
              if (!byChannel[pres.channel_id].some(u => u.userId === pres.user_id)) {
                byChannel[pres.channel_id].push({
                  userId: pres.user_id,
                  displayName: pres.display_name || 'Membro',
                  avatarUrl: pres.avatar_url,
                  isSpeaking: !!pres.is_speaking,
                  isMuted: !!pres.is_muted,
                  isDeafened: !!pres.is_deafened,
                  screenStream: pres.has_screen ? (new MediaStream()) : undefined
                })
              }
            }
          }
        })

        setSpaceVoiceUsers(prev => {
          const next = { ...prev }
          const spaceChs = spaceChannels[sp.id] || []
          spaceChs.forEach(c => {
            if (c.type === 'voice') {
              if (byChannel[c.id]) {
                next[c.id] = byChannel[c.id]
              } else {
                delete next[c.id]
              }
            }
          })
          return { ...next, ...byChannel }
        })
      }

      channel
        .on('presence', { event: 'sync' }, handlePresenceSync)
        .on('presence', { event: 'join' }, handlePresenceSync)
        .on('presence', { event: 'leave' }, handlePresenceSync)
        .subscribe()

      activeSubscriptions.push(channel)
    })

    return () => {
      activeSubscriptions.forEach(ch => {
        sb.removeChannel(ch)
      })
    }
  }, [spaces, spaceChannels, user.id])

  async function handleJoinVoice(channelId: string) {
    const spaceId = Object.keys(spaceChannels).find(sId => (spaceChannels[sId] || []).some(c => c.id === channelId))
    await joinVoice(channelId, user.id, profileDisplayName, profileAvatarUrl, selectedInputId, selectedOutputId, noiseSuppressionEnabled, echoCancellationEnabled, spaceId)
    setActiveVoiceChannelId(channelId)
  }

  function handleLeaveVoice() {
    leaveVoice()
    setActiveVoiceChannelId(null)
  }

  function handleToggleMute() {
    toggleMute()
  }

  function handleToggleDeafen() {
    toggleDeafen()
  }

  async function loadEditingSpaceMembers(spaceId: string) {
    if (!supabase) return
    setLoadingEditingMembers(true)
    const { data, error: qErr } = await supabase
      .from('space_members')
      .select('role, joined_at, user:profiles(id, display_name, avatar_url)')
      .eq('space_id', spaceId)

    if (qErr) {
      console.warn("loadEditingSpaceMembers error", qErr)
      setLoadingEditingMembers(false)
      return
    }

    const members = (data ?? []).map((row: any) => ({
      role: row.role,
      joined_at: row.joined_at,
      user: Array.isArray(row.user) ? row.user[0] : row.user
    })).filter(m => m.user !== null)

    setEditingSpaceMembers(members)
    setLoadingEditingMembers(false)
  }

  function addAuditLog(spaceId: string, action: string, details?: string) {
    const newEntry: ServerAuditLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      author_name: profileDisplayName || 'Você',
      action,
      details
    }
    let logsMap: Record<string, ServerAuditLog[]> = {}
    try {
      logsMap = JSON.parse(localStorage.getItem('echo-spaces-audit-logs') || '{}')
    } catch {
      logsMap = {}
    }
    const currentLogs = logsMap[spaceId] || []
    const updated = [newEntry, ...currentLogs].slice(0, 100)
    logsMap[spaceId] = updated
    localStorage.setItem('echo-spaces-audit-logs', JSON.stringify(logsMap))
    if (editingSpace?.id === spaceId) {
      setServerAuditLogs(updated)
    }
  }

  function loadSpaceAuditLogs(spaceId: string) {
    try {
      const logsMap = JSON.parse(localStorage.getItem('echo-spaces-audit-logs') || '{}')
      setServerAuditLogs(logsMap[spaceId] || [])
    } catch {
      setServerAuditLogs([])
    }
  }

  function loadSpaceRoles(spaceId: string): ServerRole[] {
    let rolesMap: Record<string, ServerRole[]> = {}
    try {
      rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
    } catch {
      rolesMap = {}
    }
    let roles = rolesMap[spaceId]
    if (!roles || roles.length === 0) {
      roles = [
        {
          id: 'role-owner',
          name: '👑 Dono',
          color: '#eab308',
          position: 0,
          permissions: {
            administrator: true,
            manageChannels: true,
            manageMessages: true,
            kickMembers: true,
            muteMembers: true,
            sendInAnnouncementChannels: true
          }
        },
        {
          id: 'role-mod',
          name: '🛡️ Moderador',
          color: '#3b82f6',
          position: 1,
          permissions: {
            manageChannels: true,
            manageMessages: true,
            kickMembers: true,
            muteMembers: true,
            sendInAnnouncementChannels: true
          }
        },
        {
          id: 'role-member',
          name: '👤 Membro',
          color: '#99aab5',
          position: 2,
          permissions: {
            sendInAnnouncementChannels: false
          }
        }
      ]
      rolesMap[spaceId] = roles
      localStorage.setItem('echo-spaces-roles', JSON.stringify(rolesMap))
    }
    setServerRoles(roles)
    if (!selectedRoleId || !roles.some(r => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id)
    }
    return roles
  }

  function loadMemberRoles(spaceId: string) {
    try {
      const map = JSON.parse(localStorage.getItem(`echo-member-roles-${spaceId}`) || '{}')
      setMemberRoleMap(map)
    } catch {
      setMemberRoleMap({})
    }
  }

  function saveRolesForSpace(spaceId: string, updatedRoles: ServerRole[]) {
    let rolesMap: Record<string, ServerRole[]> = {}
    try {
      rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
    } catch {
      rolesMap = {}
    }
    rolesMap[spaceId] = updatedRoles
    localStorage.setItem('echo-spaces-roles', JSON.stringify(rolesMap))
    setServerRoles(updatedRoles)
  }

  function handleCreateRole() {
    if (!editingSpace) return
    const newRole: ServerRole = {
      id: `role-${Date.now()}`,
      name: 'Novo Cargo',
      color: ROLE_COLOR_PRESETS[Math.floor(Math.random() * ROLE_COLOR_PRESETS.length)],
      position: serverRoles.length,
      permissions: {
        manageChannels: false,
        manageMessages: false,
        kickMembers: false,
        muteMembers: false,
        sendInAnnouncementChannels: false
      }
    }
    const updated = [...serverRoles, newRole]
    saveRolesForSpace(editingSpace.id, updated)
    setSelectedRoleId(newRole.id)
    addAuditLog(editingSpace.id, `Criou o cargo "${newRole.name}"`)
    showToast("Cargo Criado!", `Cargo "${newRole.name}" foi adicionado.`, "info")
  }

  function handleUpdateRole(roleId: string, updates: Partial<ServerRole>) {
    if (!editingSpace) return
    const updated = serverRoles.map(r => r.id === roleId ? { ...r, ...updates } : r)
    saveRolesForSpace(editingSpace.id, updated)
  }

  function handleDeleteRole(roleId: string) {
    if (!editingSpace) return
    const roleToDelete = serverRoles.find(r => r.id === roleId)
    if (!roleToDelete) return
    if (roleToDelete.id === 'role-owner' || roleToDelete.id === 'role-member') {
      showToast("Ação Bloqueada", "Cargos essenciais do sistema não podem ser excluídos.", "info")
      return
    }
    const updated = serverRoles.filter(r => r.id !== roleId)
    saveRolesForSpace(editingSpace.id, updated)
    if (selectedRoleId === roleId) {
      setSelectedRoleId(updated[0]?.id || null)
    }
    // Remove from member roles
    const memberMap = { ...memberRoleMap }
    Object.keys(memberMap).forEach(uid => {
      memberMap[uid] = memberMap[uid].filter(id => id !== roleId)
    })
    setMemberRoleMap(memberMap)
    localStorage.setItem(`echo-member-roles-${editingSpace.id}`, JSON.stringify(memberMap))
    addAuditLog(editingSpace.id, `Excluiu o cargo "${roleToDelete.name}"`)
    showToast("Cargo Excluído", `O cargo "${roleToDelete.name}" foi removido.`, "info")
  }

  function moveRole(roleId: string, direction: 'up' | 'down') {
    if (!editingSpace) return
    const list = [...serverRoles]
    const index = list.findIndex(r => r.id === roleId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === list.length - 1) return
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const temp = list[index]
    list[index] = list[targetIdx]
    list[targetIdx] = temp
    list.forEach((r, idx) => { r.position = idx })
    saveRolesForSpace(editingSpace.id, list)
  }

  function toggleMemberRole(memberUserId: string, roleId: string, memberName?: string) {
    if (!editingSpace) return
    const currentList = memberRoleMap[memberUserId] || []
    let nextList: string[] = []
    const roleObj = serverRoles.find(r => r.id === roleId)
    if (currentList.includes(roleId)) {
      nextList = currentList.filter(id => id !== roleId)
      addAuditLog(editingSpace.id, `Removeu o cargo "${roleObj?.name || roleId}" de ${memberName || memberUserId}`)
    } else {
      nextList = [...currentList, roleId]
      addAuditLog(editingSpace.id, `Atribuiu o cargo "${roleObj?.name || roleId}" para ${memberName || memberUserId}`)
    }
    const updatedMap = { ...memberRoleMap, [memberUserId]: nextList }
    setMemberRoleMap(updatedMap)
    localStorage.setItem(`echo-member-roles-${editingSpace.id}`, JSON.stringify(updatedMap))
  }

  function getUserHighestRole(spaceId: string, userId: string): ServerRole | null {
    const space = spaces.find(s => s.id === spaceId)
    let rolesMap: Record<string, ServerRole[]> = {}
    try {
      rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
    } catch {
      rolesMap = {}
    }
    const roles = rolesMap[spaceId] || []
    
    // If user is owner
    if (space && space.creator_id === userId) {
      const ownerRole = roles.find(r => r.id === 'role-owner' || r.permissions?.administrator)
      if (ownerRole) return ownerRole
      return {
        id: 'role-owner',
        name: '👑 Dono',
        color: '#eab308',
        position: 0,
        permissions: { administrator: true }
      }
    }

    let memberRoles: Record<string, string[]> = {}
    try {
      memberRoles = JSON.parse(localStorage.getItem(`echo-member-roles-${spaceId}`) || '{}')
    } catch {
      memberRoles = {}
    }
    const assignedIds = memberRoles[userId] || []
    if (assignedIds.length === 0) return null

    const matched = roles.filter(r => assignedIds.includes(r.id)).sort((a, b) => a.position - b.position)
    return matched[0] || null
  }

  function canUserDo(spaceId: string, userId: string, permissionKey: keyof RolePermissions): boolean {
    const space = spaces.find(s => s.id === spaceId)
    if (space && space.creator_id === userId) return true

    let rolesMap: Record<string, ServerRole[]> = {}
    try {
      rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
    } catch {
      rolesMap = {}
    }
    const roles = rolesMap[spaceId] || []

    let memberRoles: Record<string, string[]> = {}
    try {
      memberRoles = JSON.parse(localStorage.getItem(`echo-member-roles-${spaceId}`) || '{}')
    } catch {
      memberRoles = {}
    }
    const assignedIds = memberRoles[userId] || []
    const userRoles = roles.filter(r => assignedIds.includes(r.id))

    return userRoles.some(r => r.permissions?.administrator || r.permissions?.[permissionKey])
  }

  async function handleSpaceIconUpload(file: File) {
    if (!editingSpace) return
    setUploadingSpaceIcon(true)
    try {
      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `spaces/${editingSpace.id}/icon_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          setEditingSpaceIconUrl(urlData.publicUrl)
          setUploadingSpaceIcon(false)
          addAuditLog(editingSpace.id, "Alterou o ícone/avatar do servidor")
          return
        }
      }
      // Fallback to FileReader data URL
      const reader = new FileReader()
      reader.onload = () => {
        setEditingSpaceIconUrl(reader.result as string)
        setUploadingSpaceIcon(false)
        addAuditLog(editingSpace.id, "Alterou o ícone/avatar do servidor")
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showToast("Erro", err.message || "Erro ao carregar imagem", "info")
      setUploadingSpaceIcon(false)
    }
  }

  function handleRemoveSpaceIcon() {
    setEditingSpaceIconUrl('')
    if (editingSpace) addAuditLog(editingSpace.id, "Removeu o ícone do servidor")
  }

  async function handleSpaceBannerUpload(file: File) {
    if (!editingSpace) return
    setUploadingSpaceBanner(true)
    try {
      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `spaces/${editingSpace.id}/banner_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          setEditingSpaceBannerUrl(urlData.publicUrl)
          setUploadingSpaceBanner(false)
          addAuditLog(editingSpace.id, "Alterou o banner/capa do servidor")
          return
        }
      }
      // Fallback to FileReader data URL
      const reader = new FileReader()
      reader.onload = () => {
        setEditingSpaceBannerUrl(reader.result as string)
        setUploadingSpaceBanner(false)
        addAuditLog(editingSpace.id, "Alterou o banner/capa do servidor")
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showToast("Erro", err.message || "Erro ao carregar banner", "info")
      setUploadingSpaceBanner(false)
    }
  }

  function handleRemoveSpaceBanner() {
    setEditingSpaceBannerUrl('')
    if (editingSpace) addAuditLog(editingSpace.id, "Removeu o banner personalizado do servidor")
  }

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

  function loadPinnedMessages(channelId: string) {
    try {
      const saved = localStorage.getItem(`echo-pinned-messages-${channelId}`)
      const list: PinnedMessage[] = saved ? JSON.parse(saved) : []
      setPinnedMessages(prev => ({ ...prev, [channelId]: list }))
    } catch {
      setPinnedMessages(prev => ({ ...prev, [channelId]: [] }))
    }
  }

  function togglePinMessage(msg: Message, spaceId: string, channelId: string) {
    const currentList = pinnedMessages[channelId] || []
    const isAlreadyPinned = currentList.some(p => p.message_id === msg.id)
    let updated: PinnedMessage[] = []
    if (isAlreadyPinned) {
      updated = currentList.filter(p => p.message_id !== msg.id)
      addAuditLog(spaceId, `Desafixou uma mensagem no canal`)
      showToast("Mensagem Desafixada", "A mensagem foi removida dos fixados.", "info")
    } else {
      const newPin: PinnedMessage = {
        id: `pin-${Date.now()}`,
        channel_id: channelId,
        message_id: msg.id,
        body: msg.body,
        author_name: msg.profile?.display_name || 'Membro',
        author_avatar: msg.profile?.avatar_url,
        created_at: msg.created_at,
        pinned_at: new Date().toISOString(),
        pinned_by_name: profileDisplayName,
        attachment_url: msg.attachment_url,
        attachment_type: msg.attachment_type
      }
      updated = [newPin, ...currentList]
      addAuditLog(spaceId, `Fixou uma mensagem de ${msg.profile?.display_name || 'Membro'}`)
      showToast("Mensagem Fixada!", "A mensagem foi adicionada aos fixados do canal.", "info")
    }
    setPinnedMessages(prev => ({ ...prev, [channelId]: updated }))
    localStorage.setItem(`echo-pinned-messages-${channelId}`, JSON.stringify(updated))
  }

  function toggleCategoryCollapse(spaceId: string, category: string) {
    const key = `${spaceId}::${category}`
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleRoleChange(memberUserId: string, newRole: 'owner' | 'moderator' | 'member', memberName: string) {
    if (!editingSpace || !supabase) return
    const client = supabase
    const currentSpace = editingSpace

    if (currentSpace.creator_id !== user.id) {
      showToast("Permissão Negada", "Apenas o Dono pode alterar cargos ou transferir a posse.", "info")
      return
    }

    if (newRole === 'owner') {
      setConfirmModalConfig({
        isOpen: true,
        title: "Transferir Posse do Servidor",
        message: `Tem certeza de que deseja transferir a posse do servidor "${currentSpace.name}" para "${memberName}"? Você deixará de ser o Dono e passará a ser um Moderador.`,
        onConfirm: async () => {
          await client.from('spaces').update({ creator_id: memberUserId }).eq('id', currentSpace.id)
          await client.from('space_members').update({ role: 'owner' }).eq('space_id', currentSpace.id).eq('user_id', memberUserId)
          await client.from('space_members').update({ role: 'moderator' }).eq('space_id', currentSpace.id).eq('user_id', user.id)
          
          addAuditLog(currentSpace.id, `Transferiu a posse do servidor para ${memberName}`)
          showToast("Posse Transferida!", `${memberName} agora é o dono do servidor.`, "info")
          setEditingSpace(prev => prev ? { ...prev, creator_id: memberUserId } : null)
          await loadEditingSpaceMembers(currentSpace.id)
          await loadSpaces()
          setConfirmModalConfig(null)
        }
      })
      return
    }

    client.from('space_members').update({ role: newRole }).eq('space_id', currentSpace.id).eq('user_id', memberUserId).then(({ error }) => {
      if (error) {
        showToast("Erro ao mudar cargo", error.message, "info")
      } else {
        addAuditLog(currentSpace.id, `Alterou o cargo básico de ${memberName} para ${newRole === 'moderator' ? 'Moderador' : 'Membro'}`)
        showToast("Cargo Atualizado", `O cargo de ${memberName} foi alterado para ${newRole === 'moderator' ? 'Moderador' : 'Membro'}.`, "info")
        loadEditingSpaceMembers(currentSpace.id)
        loadSpaceMembers(currentSpace.id)
      }
    })
  }

  function handleKickMember(memberUserId: string, memberName: string) {
    if (!editingSpace || !supabase) return
    const client = supabase
    const currentSpace = editingSpace

    const canKick = canUserDo(currentSpace.id, user.id, 'kickMembers') || currentSpace.creator_id === user.id
    if (!canKick) {
      showToast("Permissão Negada", "Você não tem permissão para expulsar membros deste servidor.", "info")
      return
    }

    setConfirmModalConfig({
      isOpen: true,
      title: "Expulsar Membro",
      message: `Tem certeza de que deseja expulsar "${memberName}" do servidor "${currentSpace.name}"? O usuário precisará de um convite para retornar.`,
      onConfirm: async () => {
        const { error: kickErr } = await client
          .from('space_members')
          .delete()
          .eq('space_id', currentSpace.id)
          .eq('user_id', memberUserId)

        if (kickErr) {
          showToast("Erro ao expulsar", kickErr.message, "info")
        } else {
          addAuditLog(currentSpace.id, `Expulsou o membro "${memberName}" do servidor`)
          showToast("Membro Expulso", `${memberName} foi removido do servidor.`, "info")
          await loadEditingSpaceMembers(currentSpace.id)
          await loadSpaceMembers(currentSpace.id)
        }
        setConfirmModalConfig(null)
      }
    })
  }

  async function moveChannel(channelId: string, direction: 'up' | 'down') {
    if (!editingSpace) return
    const currentList = [...(spaceChannels[editingSpace.id] ?? [])]
    const index = currentList.findIndex(c => c.id === channelId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === currentList.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = currentList[index]
    currentList[index] = currentList[targetIndex]
    currentList[targetIndex] = temp

    currentList.forEach((c, idx) => {
      c.position = idx
    })

    const localChannelMeta: Record<string, { topic?: string; position?: number; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string }> = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
    currentList.forEach(c => {
      localChannelMeta[c.id] = { ...localChannelMeta[c.id], position: c.position }
      if (supabase) {
        supabase.from('channels').update({ position: c.position }).eq('id', c.id).then(() => {})
      }
    })
    localStorage.setItem('echo-channels-metadata', JSON.stringify(localChannelMeta))

    setSpaceChannels(prev => ({ ...prev, [editingSpace.id]: currentList }))
  }

  function updateChannelSettings(channelId: string, updates: { topic?: string; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string }) {
    const localChannelMeta: Record<string, { topic?: string; position?: number; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string }> = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
    localChannelMeta[channelId] = { ...localChannelMeta[channelId], ...updates }
    localStorage.setItem('echo-channels-metadata', JSON.stringify(localChannelMeta))

    if (editingSpace) {
      setSpaceChannels(prev => ({
        ...prev,
        [editingSpace.id]: (prev[editingSpace.id] ?? []).map(c => c.id === channelId ? { ...c, ...updates } : c)
      }))
    }
    if (selectedChannel?.id === channelId) {
      setSelectedChannel(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  function toggleMuteSpace(spaceId: string) {
    setMutedSpaces(prev => {
      const next = new Set(prev)
      if (next.has(spaceId)) {
        next.delete(spaceId)
        showToast("Notificações Ativadas", "Você voltará a receber alertas deste servidor.", "info")
      } else {
        next.add(spaceId)
        showToast("Servidor Silenciado", "As notificações deste servidor foram silenciadas.", "info")
      }
      localStorage.setItem('echo-muted-spaces', JSON.stringify(Array.from(next)))
      return next
    })
  }

  function triggerDesktopNotification(title: string, body: string) {
    if (Notification.permission === 'granted') {
      try {
        if ((window as any).electronAPI?.showNotification) {
          (window as any).electronAPI.showNotification({ title, body })
        } else {
          new Notification(title, { body, icon: '/favicon.ico' })
        }
      } catch (e) {
        console.warn("Failed to trigger desktop notification:", e)
      }
    }
  }

  function openSpaceSettings(space: Space) {
    setEditingSpace(space)
    setEditingSpaceName(space.name)
    setEditingSpaceDescription(space.description || '')
    setEditingSpaceIconUrl(space.icon_url || '')
    setEditingSpaceBannerUrl(space.banner_url || '')
    setEditingSpaceBannerTheme(space.banner_theme || 'dark')
    setEditingSpaceWelcomeChannelId(space.welcome_channel_id || '')
    setActiveSpaceTab('geral')
    setMemberSearchQuery('')
    loadEditingSpaceMembers(space.id)
    loadSpaceRoles(space.id)
    loadMemberRoles(space.id)
    loadSpaceAuditLogs(space.id)
    loadSpaceEmojis(space.id)
    setShowSpaceSettingsModal(true)
  }

  async function handleSaveSpaceSettings(event: FormEvent) {
    event.preventDefault(); if (!supabase || !editingSpace || !editingSpaceName.trim()) return
    setError('')

    // Save to local space metadata
    let localMeta: Record<string, { icon_url?: string; banner_url?: string; banner_theme?: string; welcome_channel_id?: string }> = {}
    try {
      localMeta = JSON.parse(localStorage.getItem('echo-spaces-metadata') || '{}')
    } catch {
      localMeta = {}
    }
    localMeta[editingSpace.id] = {
      icon_url: editingSpaceIconUrl,
      banner_url: editingSpaceBannerUrl,
      banner_theme: editingSpaceBannerTheme,
      welcome_channel_id: editingSpaceWelcomeChannelId
    }
    localStorage.setItem('echo-spaces-metadata', JSON.stringify(localMeta))

    addAuditLog(editingSpace.id, `Atualizou as configurações gerais do servidor`)

    // Update in Supabase
    try {
      await supabase
        .from('spaces')
        .update({ 
          name: editingSpaceName.trim(),
          description: editingSpaceDescription.trim()
        })
        .eq('id', editingSpace.id)
    } catch (e) {
      console.warn("Update spaces DB error:", e)
    }

    showToast("Servidor Atualizado!", "Configurações do servidor salvas com sucesso.", "info")
    setShowSpaceSettingsModal(false)
    await loadSpaces()
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


  async function startScreenShareWithConfig(quality: '720p' | '1080p' | 'native', fps: 15 | 30 | 60) {
    setScreenQuality(quality)
    setScreenFps(fps)
    setShowScreenshareModal(false)
    setTimeout(async () => {
      await openScreenPickerHelper(quality, fps)
    }, 150)
  }

  async function openScreenPickerHelper(quality: '720p' | '1080p' | 'native', fps: 15 | 30 | 60) {
    if ((window as any).electronAPI) {
      try {
        const sources = await (window as any).electronAPI.getSources()
        setScreenSources(sources)
        setShowScreenPicker(true)
      } catch (err) {
        setError('Não foi possível capturar as telas: ' + err)
      }
    } else {
      const { w, h } = getQualityDimensions(quality)
      await startScreenShare(undefined, w, h, fps)
    }
  }

  async function openScreenPicker() {
    if (localScreenStream) {
      setShowScreenMenu(prev => !prev)
      return
    }
    await openScreenPickerHelper(screenQuality, screenFps)
  }

  async function forceOpenScreenPicker() {
    setShowScreenMenu(false)
    await openScreenPickerHelper(screenQuality, screenFps)
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
    const { data, error: queryError } = await supabase.from('space_members').select('spaces(*)').eq('user_id', user.id)
    if (queryError) { setError(queryError.message); return }

    let localMeta: Record<string, { icon_url?: string; banner_url?: string; banner_theme?: string; welcome_channel_id?: string }> = {}
    try {
      localMeta = JSON.parse(localStorage.getItem('echo-spaces-metadata') || '{}')
    } catch {
      localMeta = {}
    }

    const result = (data ?? []).map((row: any) => {
      const sp = Array.isArray(row.spaces) ? row.spaces[0] : row.spaces
      if (!sp) return null
      return {
        ...sp,
        icon_url: sp.icon_url || localMeta[sp.id]?.icon_url || '',
        banner_url: sp.banner_url || localMeta[sp.id]?.banner_url || '',
        banner_theme: sp.banner_theme || localMeta[sp.id]?.banner_theme || 'dark',
        welcome_channel_id: sp.welcome_channel_id || localMeta[sp.id]?.welcome_channel_id || ''
      }
    }).filter((space): space is Space => Boolean(space))

    setSpaces(result)
    if (result.length > 0 && !expandedSpace) {
      setExpandedSpace(result[0].id)
    }
  }

  async function loadChannelsForSpace(spaceId: string) {
    if (!supabase) return
    const { data, error: queryError } = await supabase.from('channels').select('*').eq('space_id', spaceId).order('position')
    if (queryError) { setError(queryError.message); return }

    let localChannelMeta: Record<string, { topic?: string; position?: number; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string }> = {}
    try {
      localChannelMeta = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
    } catch {
      localChannelMeta = {}
    }

    const result = ((data ?? []) as any[]).map((ch, idx) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      space_id: ch.space_id,
      topic: ch.topic || localChannelMeta[ch.id]?.topic || '',
      position: ch.position !== undefined ? ch.position : (localChannelMeta[ch.id]?.position !== undefined ? localChannelMeta[ch.id]?.position : idx),
      is_announcement: ch.is_announcement !== undefined ? ch.is_announcement : (localChannelMeta[ch.id]?.is_announcement || false),
      user_limit: ch.user_limit !== undefined ? ch.user_limit : (localChannelMeta[ch.id]?.user_limit || 0),
      slowmode_seconds: ch.slowmode_seconds !== undefined ? ch.slowmode_seconds : (localChannelMeta[ch.id]?.slowmode_seconds || 0),
      category: ch.category || localChannelMeta[ch.id]?.category || ''
    }))

    result.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

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
          const userPresence = state[key]
          if (userPresence && userPresence.length > 0) {
            const p = userPresence[0] as any
            pData[key] = p
            if (p.presence_status !== 'invisible') {
              online.add(key)
            }
          }
        })
        
        setPresenceData(pData)
        setOnlineUsers(online)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const savedStatus = localStorage.getItem('echo-custom-status') || ''
          const savedPresStatus = localStorage.getItem('echo-presence-status') || 'online'
          await presenceChannel.track({
            user_id: user.id,
            display_name: displayName,
            online_at: new Date().toISOString(),
            custom_status: savedStatus,
            presence_status: savedPresStatus
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
          
          const isSpaceMuted = Object.entries(spaceChannelsRef.current).some(([sId, chList]) => 
            mutedSpacesRef.current.has(sId) && chList.some(c => c.id === newMsg.channel_id)
          )

          if (!document.hasFocus() && !isSpaceMuted) {
            triggerDesktopNotification('Nova mensagem', newMsg.body || '')
          }
        }
      })
      .subscribe()

    return () => {
      client.removeChannel(presenceChannel)
      client.removeChannel(globalMessagesChannel)
    }
  }, [])

  useEffect(() => {
    selectedChannelRef.current = selectedChannel
  }, [selectedChannel])

  useEffect(() => {
    mutedSpacesRef.current = mutedSpaces
  }, [mutedSpaces])

  useEffect(() => {
    spaceChannelsRef.current = spaceChannels
  }, [spaceChannels])

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
        if (newMsg.receiver_id === user.id && !document.hasFocus()) {
          const friendObj = friendships.find(f => f.user.id === newMsg.sender_id)
          const senderName = friendObj?.user.display_name || 'Um amigo'
          triggerDesktopNotification(`Mensagem de ${senderName}`, newMsg.body || '')
        }

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
    const { data: createdCh, error: channelError } = await supabase.from('channels').insert({
      space_id: spaceId,
      name: newChannelName.trim(),
      type: newChannelType,
      position: currentChannels.length,
    }).select().single()
    if (channelError) { setError(channelError.message); return }

    if (createdCh) {
      let localChannelMeta: Record<string, { topic?: string; position?: number; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string }> = {}
      try {
        localChannelMeta = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
      } catch {
        localChannelMeta = {}
      }
      localChannelMeta[createdCh.id] = {
        ...localChannelMeta[createdCh.id],
        topic: newChannelTopic.trim(),
        is_announcement: newChannelIsAnnouncement,
        user_limit: newChannelUserLimit,
        slowmode_seconds: newChannelSlowmode,
        category: newChannelCategory.trim()
      }
      localStorage.setItem('echo-channels-metadata', JSON.stringify(localChannelMeta))
    }

    addAuditLog(spaceId, `Criou o canal "${newChannelName.trim()}" (${newChannelType === 'text' ? 'Texto' : 'Voz'})`)
    setNewChannelName(''); setNewChannelTopic(''); setNewChannelIsAnnouncement(false); setNewChannelUserLimit(0); setNewChannelSlowmode(0); setNewChannelCategory(''); setShowNewChannel(null); setNewChannelType('text')
    await loadChannelsForSpace(spaceId)
  }

  useEffect(() => {
    if (slowmodeCooldown <= 0) return
    const interval = setInterval(() => {
      setSlowmodeCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [slowmodeCooldown])

  useEffect(() => {
    if (selectedChannel) {
      loadPinnedMessages(selectedChannel.id)
      if (selectedChannel.space_id) {
        loadSpaceEmojis(selectedChannel.space_id)
      }
    }
  }, [selectedChannel?.id])

  async function send(event: FormEvent) {
    event.preventDefault(); if (!supabase || !selectedChannel || !draft.trim()) return
    const currentSp = getSpaceForChannel(selectedChannel)
    if (currentSp && selectedChannel.is_announcement && !canUserDo(currentSp.id, user.id, 'sendInAnnouncementChannels')) {
      showToast("Canal de Anúncios", "Apenas administradores e moderadores podem enviar mensagens neste canal.", "info")
      return
    }
    const isImmuneToSlowmode = currentSp && (canUserDo(currentSp.id, user.id, 'administrator') || canUserDo(currentSp.id, user.id, 'manageChannels'))
    if (selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 && !isImmuneToSlowmode) {
      if (slowmodeCooldown > 0) {
        showToast("Modo Lento", `Aguarde ${slowmodeCooldown}s antes de enviar outra mensagem.`, "info")
        return
      }
    }
    const { error: sendError } = await supabase.from('messages').insert({ channel_id: selectedChannel.id, author_id: user.id, body: draft.trim() })
    if (sendError) {
      setError(sendError.message)
    } else {
      setDraft('')
      if (selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 && !isImmuneToSlowmode) {
        setSlowmodeCooldown(selectedChannel.slowmode_seconds)
      }
    }
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
      {updateStatus !== 'idle' && (
        <div className="update-banner">
          {updateStatus === 'downloading' ? (
            <>
              <span>⬇️ Baixando atualização v{updateVersion}... {updateProgress}%</span>
              <div className="update-progress-bar">
                <div className="update-progress-fill" style={{ width: `${updateProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <span>✅ Atualização v{updateVersion} pronta!</span>
              <button className="update-restart-btn" onClick={() => (window as any).electronAPI?.installUpdate()}>
                Reiniciar para atualizar
              </button>
            </>
          )}
        </div>
      )}

      {showSubscriptionModal && (
        <div className="screen-picker-overlay" onClick={() => setShowSubscriptionModal(false)} style={{ zIndex: 10000 }}>
          <div className="screen-picker-modal" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Echo Premium</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Desbloqueie personalização completa! Assinando o Echo Premium você tem acesso a temas exclusivos, transmissões em alta qualidade e muito mais.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="voice-join-submit-btn" 
                style={{ width: '100%', padding: '12px', fontWeight: 'bold', margin: 0 }}
                onClick={handleSimulateSubscription}
              >
                Simular Assinatura (Grátis para Testes)
              </button>
              <button 
                className="ch-create-btn" 
                style={{ width: '100%', padding: '12px', fontWeight: 'bold', margin: 0, background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                onClick={() => setShowSubscriptionModal(false)}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

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

                // Grouping by category
                const categoriesMap: Record<string, Channel[]> = {}
                const uncategorizedText: Channel[] = []
                const uncategorizedVoice: Channel[] = []

                channels.forEach(ch => {
                  if (ch.category && ch.category.trim()) {
                    const cat = ch.category.trim()
                    if (!categoriesMap[cat]) categoriesMap[cat] = []
                    categoriesMap[cat].push(ch)
                  } else if (ch.type === 'text') {
                    uncategorizedText.push(ch)
                  } else {
                    uncategorizedVoice.push(ch)
                  }
                })

                const categoryEntries = Object.entries(categoriesMap)

                const renderChannelNode = (ch: Channel) => {
                  if (ch.type === 'text') {
                    return (
                      <button key={ch.id} className={`channel-item ${selectedChannel?.id === ch.id ? 'active' : ''} ${unreadChannels.has(ch.id) ? 'unread' : ''}`} onClick={() => setSelectedChannel(ch)}>
                        <span className="ch-icon">{ch.is_announcement ? <MegaphoneIcon style={{ color: 'var(--accent-color)' }} /> : <HashtagIcon />}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                        {ch.is_announcement && <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: 'var(--accent-color)', color: '#fff', textTransform: 'uppercase' }}>Avisos</span>}
                      </button>
                    )
                  }

                  const isActive = activeVoiceChannelId === ch.id
                  const channelVoiceUsers = isActive ? participants : (spaceVoiceUsers[ch.id] || [])

                  return (
                    <div key={ch.id} className="voice-channel-node">
                      <button className={`channel-item voice-item ${selectedChannel?.id === ch.id ? 'active' : ''}`} onClick={() => setSelectedChannel(ch)}>
                        <span className="ch-icon"><VolumeIcon /></span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                        {ch.user_limit && ch.user_limit > 0 ? (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: 'var(--bg-primary)' }}>
                            {channelVoiceUsers.length}/{ch.user_limit}
                          </span>
                        ) : channelVoiceUsers.length > 0 ? (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, padding: '2px 6px', borderRadius: '10px', background: 'var(--bg-primary)' }}>
                            {channelVoiceUsers.length}
                          </span>
                        ) : null}
                      </button>
                      {channelVoiceUsers.length > 0 && (
                        <div className="sidebar-voice-users">
                          {channelVoiceUsers.map(p => (
                            <div 
                              key={p.userId} 
                              className={`sidebar-voice-user ${p.isSpeaking ? 'speaking' : ''}`}
                              onClick={() => {
                                if (isActive && p.userId !== user.id) {
                                  setVolumeControlUser(p)
                                }
                              }}
                              style={{ cursor: (isActive && p.userId !== user.id) ? 'pointer' : 'default' }}
                              title={(isActive && p.userId !== user.id) ? "Ajustar volume de áudio" : p.displayName}
                            >
                              <div className="sidebar-voice-avatar">
                                {p.avatarUrl ? (
                                  <img src={p.avatarUrl} alt={p.displayName} className="sidebar-avatar-img" />
                                ) : (
                                  p.displayName.slice(0, 1).toUpperCase()
                                )}
                              </div>
                              <span className="sidebar-voice-name">{p.displayName}</span>
                              <div className="sidebar-voice-user-icons" style={{ marginLeft: 'auto', display: 'flex', gap: '3px', alignItems: 'center' }}>
                                {p.isDeafened ? (
                                  <span title="Ensurdecido" style={{ color: '#e0554c', display: 'inline-flex' }}><HeadphonesOffIcon style={{ width: '13px', height: '13px' }} /></span>
                                ) : p.isMuted ? (
                                  <span title="Mutado" style={{ color: '#e0554c', display: 'inline-flex' }}><MicOffIcon style={{ width: '13px', height: '13px' }} /></span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div className="space-node" key={space.id}>
                    <div className="space-header-container">
                      <button className={`space-header ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleSpace(space.id)}>
                        <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>
                        <div className="space-avatar-mini" style={{ overflow: 'hidden' }}>
                          {space.icon_url ? (
                            <img src={space.icon_url} alt={space.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            space.name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span className="space-name">{space.name}</span>
                        {mutedSpaces.has(space.id) && (
                          <span style={{ marginLeft: 'auto', marginRight: '4px', opacity: 0.6, display: 'flex' }} title="Servidor Silenciado">
                            <BellOffIcon style={{ width: '12px', height: '12px' }} />
                          </span>
                        )}
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
                      <button 
                        className="space-settings-trigger" 
                        onClick={(e) => { e.stopPropagation(); openSpaceSettings(space) }}
                        title="Configurações do Servidor"
                      >
                        <SettingsIcon />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="space-children">
                        {uncategorizedText.length > 0 && (
                          <div className="channel-group">
                            <span className="channel-group-label">TEXTO</span>
                            {uncategorizedText.map(renderChannelNode)}
                          </div>
                        )}
                        {uncategorizedVoice.length > 0 && (
                          <div className="channel-group">
                            <span className="channel-group-label">VOZ</span>
                            {uncategorizedVoice.map(renderChannelNode)}
                          </div>
                        )}

                        {/* Categorias */}
                        {categoryEntries.map(([catName, catChannels]) => {
                          const isCatCollapsed = collapsedCategories.has(`${space.id}::${catName}`)
                          return (
                            <div key={catName} className="channel-category-group">
                              <button 
                                type="button" 
                                className="channel-category-header" 
                                onClick={() => toggleCategoryCollapse(space.id, catName)}
                              >
                                <span className="category-chevron">
                                  {isCatCollapsed ? <ChevronRightIcon style={{ width: '11px', height: '11px' }} /> : <ChevronDownIcon style={{ width: '11px', height: '11px' }} />}
                                </span>
                                <FolderIcon style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
                                <span className="category-name">{catName.toUpperCase()}</span>
                              </button>
                              {!isCatCollapsed && (
                                <div className="category-channels-list">
                                  {catChannels.map(renderChannelNode)}
                                </div>
                              )}
                            </div>
                          )
                        })}

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
                  <div className="connection-quality-indicator" style={{ position: 'relative', cursor: 'pointer' }}>
                    <div className={`connection-bars ${rtcStats && rtcStats.ping < 100 ? 'good' : rtcStats && rtcStats.ping < 200 ? 'medium' : 'bad'}`}>
                      <i /><i /><i />
                    </div>
                    
                    {/* Tooltip de Estatísticas RTC */}
                    <div className="connection-stats-tooltip">
                      <strong>Conexão RTC</strong>
                      <div className="stat-row"><span>Latência (Ping):</span> <strong>{rtcStats ? `${rtcStats.ping} ms` : 'Medindo...'}</strong></div>
                      <div className="stat-row"><span>Jitter:</span> <strong>{rtcStats ? `${rtcStats.jitter} ms` : '0 ms'}</strong></div>
                      <div className="stat-row"><span>Perda de Pacotes:</span> <strong>{rtcStats ? `${rtcStats.packetLoss} %` : '0 %'}</strong></div>
                    </div>
                  </div>
                  <div className="voice-status-text">
                    <span className="voice-status-label">Voz conectada</span>
                    <span className="voice-status-channel">{activeVoiceChannel?.name}</span>
                  </div>
                </div>
                <div className="voice-status-actions">
                  <button className={`voice-action-btn ${isMuted ? 'muted' : ''}`} onClick={handleToggleMute} title={isMuted ? "Desmutar microfone" : "Mutar microfone"}>
                    {isMuted ? <MicOffIcon /> : <MicIcon />}
                  </button>
                  <button className={`voice-action-btn ${isDeafened ? 'muted' : ''}`} onClick={handleToggleDeafen} title={isDeafened ? "Desensurdecer" : "Ensurdecer (Mutar todos)"}>
                    {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                  </button>
                  <button className="voice-action-btn disconnect-btn" onClick={handleLeaveVoice} title="Desconectar">
                    <PhoneOffIcon />
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="sidebar-profile-footer">
            <div className="profile-footer-info" onClick={() => setShowStatusMenu(!showStatusMenu)} style={{ cursor: 'pointer', position: 'relative' }}>
              <div className="profile-footer-avatar" style={{ position: 'relative' }}>
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt={profileDisplayName} />
                ) : (
                  profileDisplayName.slice(0, 1).toUpperCase()
                )}
                <span className={`my-status-dot ${presenceStatus}`} />
              </div>
              <div className="profile-footer-meta">
                <span className="profile-footer-name" title={profileDisplayName}>{profileDisplayName}</span>
                <span className="profile-footer-status">
                  {presenceStatus === 'online' ? '🟢 Online' :
                   presenceStatus === 'idle' ? '🟡 Ausente' :
                   presenceStatus === 'dnd' ? '🔴 Não Perturbe' : '⚪ Invisível'}
                </span>
              </div>

              {showStatusMenu && (
                <div className="status-picker-popover" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('online'); setShowStatusMenu(false); }}>
                    <span className="status-dot-bullet online" />
                    <div className="status-meta">
                      <strong>Online</strong>
                      <span>Disponível</span>
                    </div>
                  </button>
                  <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('idle'); setShowStatusMenu(false); }}>
                    <span className="status-dot-bullet idle" />
                    <div className="status-meta">
                      <strong>Ausente</strong>
                      <span>Inativo</span>
                    </div>
                  </button>
                  <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('dnd'); setShowStatusMenu(false); }}>
                    <span className="status-dot-bullet dnd" />
                    <div className="status-meta">
                      <strong>Não perturbe</strong>
                      <span>Silenciar</span>
                    </div>
                  </button>
                  <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('invisible'); setShowStatusMenu(false); }}>
                    <span className="status-dot-bullet offline" />
                    <div className="status-meta">
                      <strong>Invisível</strong>
                      <span>Aparecer offline</span>
                    </div>
                  </button>
                </div>
              )}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h1><span className="header-icon"><HashtagIcon /></span> {selectedChannel.name}</h1>
                        {selectedChannel.topic && (
                          <>
                            <span style={{ color: 'var(--border-color)', margin: '0 4px' }}>|</span>
                            <span className="channel-topic-header-text" title={selectedChannel.topic}>
                              {selectedChannel.topic}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 ? (
                        <span className="channel-slowmode-badge" title={`Modo lento: ${selectedChannel.slowmode_seconds}s por mensagem`}>
                          <ClockIcon style={{ width: '12px', height: '12px' }} />
                          <span>{selectedChannel.slowmode_seconds}s</span>
                        </span>
                      ) : null}

                      {/* Search messages in channel */}
                      <div className="channel-search-box-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {showSearchInput ? (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
                            <SearchIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar mensagens ou de:@autor..."
                              autoFocus
                              style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 6px', outline: 'none', width: '160px' }}
                            />
                            {searchQuery && (
                              <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
                            )}
                            <button type="button" onClick={() => { setShowSearchInput(false); setSearchQuery('') }} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', marginLeft: '4px' }}>✕</button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            className="profile-footer-btn" 
                            onClick={() => setShowSearchInput(true)} 
                            title="Buscar no canal"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <SearchIcon />
                          </button>
                        )}
                      </div>

                      {/* Pinned Messages Button */}
                      <button 
                        type="button" 
                        className={`profile-footer-btn ${(pinnedMessages[selectedChannel.id]?.length || 0) > 0 ? 'active' : ''}`}
                        onClick={() => setShowPinnedMessagesPanel(!showPinnedMessagesPanel)}
                        title="Mensagens Fixadas"
                        style={{ position: 'relative', border: 'none', background: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <PinIcon />
                        {(pinnedMessages[selectedChannel.id]?.length || 0) > 0 && (
                          <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'var(--accent-color)', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 4px', borderRadius: '8px', minWidth: '14px', textAlign: 'center' }}>
                            {pinnedMessages[selectedChannel.id]?.length}
                          </span>
                        )}
                      </button>

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
                  <div className="chat-workspace-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                    <div className="chat-area-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <div className="messages-area">
                        {(() => {
                          const filtered = messages.filter(m => {
                            if (!searchQuery.trim()) return true
                            const q = searchQuery.toLowerCase().trim()
                            if (q.startsWith('de:') || q.startsWith('from:')) {
                              const authorQ = q.slice(3).trim().replace('@', '')
                              return (m.profile?.display_name || '').toLowerCase().includes(authorQ)
                            }
                            return m.body.toLowerCase().includes(q) || (m.profile?.display_name || '').toLowerCase().includes(q)
                          })

                          if (filtered.length === 0) {
                            return (
                              <div className="no-messages">
                                <span className="no-msg-icon">{searchQuery ? '🔍' : '✉'}</span>
                                <p>{searchQuery ? `Nenhuma mensagem encontrada para "${searchQuery}"` : 'Ainda não há mensagens.\nDiga olá!'}</p>
                              </div>
                            )
                          }

                          return filtered.map((message) => {
                            const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
                            const msgRole = currentSpace ? getUserHighestRole(currentSpace.id, message.author_id) : null
                            const isPinned = (pinnedMessages[selectedChannel.id] || []).some(p => p.message_id === message.id)
                            const canManagePins = currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id)

                            return (
                              <article className={`msg-card ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''}`} key={message.id}>
                                <div 
                                  className={`msg-avatar ${message.author_id === user.id ? 'avatar-self' : 'avatar-other'}`} 
                                  style={{ overflow: 'hidden', cursor: 'pointer' }}
                                  onClick={() => {
                                    if (currentSpace) {
                                      const memRoles = memberRoleMap[message.author_id] || []
                                      const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                      setInspectedMember({
                                        user: {
                                          id: message.author_id,
                                          display_name: message.profile?.display_name || 'Membro',
                                          avatar_url: message.profile?.avatar_url
                                        },
                                        roleName: msgRole?.name,
                                        roleColor: msgRole?.color,
                                        roles: matchingRoles
                                      })
                                    }
                                  }}
                                  title="Ver perfil do membro"
                                >
                                  {message.profile?.avatar_url ? (
                                    <img src={message.profile.avatar_url} alt={message.profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                                  ) : (
                                    (message.profile?.display_name ?? 'E').slice(0, 1).toUpperCase()
                                  )}
                                </div>
                                <div className="msg-body">
                                  <div className="msg-meta">
                                    <strong 
                                      style={{ color: msgRole?.color || 'var(--text-primary)', cursor: 'pointer' }}
                                      onClick={() => {
                                        if (currentSpace) {
                                          const memRoles = memberRoleMap[message.author_id] || []
                                          const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                          setInspectedMember({
                                            user: {
                                              id: message.author_id,
                                              display_name: message.profile?.display_name || 'Membro',
                                              avatar_url: message.profile?.avatar_url
                                            },
                                            roleName: msgRole?.name,
                                            roleColor: msgRole?.color,
                                            roles: matchingRoles
                                          })
                                        }
                                      }}
                                    >
                                      {message.profile?.display_name ?? 'Membro'}
                                    </strong>
                                    {msgRole && (
                                      <span 
                                        style={{ 
                                          fontSize: '10px', 
                                          fontWeight: 700, 
                                          padding: '1px 6px', 
                                          borderRadius: '4px', 
                                          color: msgRole.color, 
                                          background: `${msgRole.color}18`, 
                                          border: `1px solid ${msgRole.color}44` 
                                        }}
                                      >
                                        {msgRole.name}
                                      </span>
                                    )}
                                    <time>{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                    
                                    {isPinned && (
                                      <span title="Mensagem Fixada" style={{ fontSize: '11px', color: 'var(--accent-color)', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        📌 <span style={{ fontSize: '10px', fontWeight: 700 }}>Fixada</span>
                                      </span>
                                    )}

                                    {/* Action button to Pin/Unpin */}
                                    {canManagePins && (
                                      <button 
                                        type="button" 
                                        onClick={() => togglePinMessage(message, currentSpace.id, selectedChannel.id)}
                                        title={isPinned ? "Desafixar Mensagem" : "Fixar Mensagem no Canal"}
                                        style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5, padding: '2px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                                      >
                                        <PinIcon style={{ width: '12px', height: '12px', color: isPinned ? 'var(--accent-color)' : 'inherit' }} />
                                      </button>
                                    )}
                                  </div>
                                  {message.attachment_url && message.attachment_type === 'image' ? (
                                    <img src={message.attachment_url} alt="anexo" className="msg-attachment-img" onClick={() => window.open(message.attachment_url, '_blank')} />
                                  ) : message.attachment_url && message.attachment_type !== 'image' ? (
                                    <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="msg-attachment-file">📎 {message.body}</a>
                                  ) : (
                                    <p>{formatMessageText(message.body, profileDisplayName, serverEmojis)}</p>
                                  )}
                                </div>
                              </article>
                            )
                          })
                        })()}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Announcement / Read-only Channel check */}
                      {selectedChannel.is_announcement && currentSpace && !canUserDo(currentSpace.id, user.id, 'sendInAnnouncementChannels') ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', margin: '0 16px 16px 16px' }}>
                          <MegaphoneIcon style={{ color: 'var(--accent-color)' }} />
                          <span>📢 Canal de Anúncios — Apenas administradores e moderadores podem enviar mensagens neste canal.</span>
                        </div>
                      ) : (
                        <form className="composer" onSubmit={send} style={{ position: 'relative' }}>
                          <input type="file" id="chat-file-input" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChatFileUpload(f); e.target.value = '' }} />
                          <button type="button" className="dm-attach-btn" onClick={() => document.getElementById('chat-file-input')?.click()} disabled={isUploading} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px 0 0' }}>
                            {isUploading ? '⏳' : '📎'}
                          </button>

                          {/* Emoji Picker Button */}
                          <button 
                            type="button" 
                            className="dm-attach-btn" 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                            title="Escolher Emoji"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmojiPicker ? 'var(--accent-color)' : 'var(--text-muted)', padding: '0 6px 0 0', display: 'flex', alignItems: 'center' }}
                          >
                            <SmileIcon />
                          </button>

                          <input 
                            value={draft} 
                            onChange={(e) => setDraft(e.target.value)} 
                            placeholder={slowmodeCooldown > 0 ? `Modo Lento ativo: aguarde ${slowmodeCooldown}s para digitar…` : `Mensagem em #${selectedChannel.name}…`} 
                            disabled={slowmodeCooldown > 0}
                          />

                          {slowmodeCooldown > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#e0554c', fontWeight: 700, paddingRight: '8px' }}>
                              <ClockIcon style={{ width: '12px', height: '12px' }} />
                              <span>{slowmodeCooldown}s</span>
                            </div>
                          ) : (
                            <button type="submit" className="send-btn" disabled={!draft.trim() && !isUploading}>
                              <span>↑</span>
                            </button>
                          )}

                          {/* Emoji Picker Popover */}
                          {showEmojiPicker && (
                            <div className="emoji-picker-popover">
                              <div className="emoji-picker-tabs">
                                <button 
                                  type="button" 
                                  className={`emoji-tab-btn ${emojiPickerTab === 'default' ? 'active' : ''}`}
                                  onClick={() => setEmojiPickerTab('default')}
                                >
                                  😀 Padrão
                                </button>
                                <button 
                                  type="button" 
                                  className={`emoji-tab-btn ${emojiPickerTab === 'server' ? 'active' : ''}`}
                                  onClick={() => setEmojiPickerTab('server')}
                                >
                                  🌟 Servidor ({serverEmojis.length})
                                </button>
                              </div>

                              <div className="emoji-picker-body">
                                {emojiPickerTab === 'default' ? (
                                  <div className="emoji-picker-grid">
                                    {DEFAULT_EMOJIS.map(em => (
                                      <button 
                                        key={em} 
                                        type="button" 
                                        className="emoji-item-btn"
                                        onClick={() => { setDraft(prev => prev + em); setShowEmojiPicker(false) }}
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="emoji-picker-grid-custom">
                                    {serverEmojis.map(em => (
                                      <button 
                                        key={em.id} 
                                        type="button" 
                                        className="emoji-custom-item-btn"
                                        onClick={() => { setDraft(prev => prev + `:${em.name}: `); setShowEmojiPicker(false) }}
                                        title={`:${em.name}:`}
                                      >
                                        <img src={em.url} alt={em.name} />
                                        <span>:{em.name}:</span>
                                      </button>
                                    ))}
                                    {serverEmojis.length === 0 && (
                                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                        Nenhum emoji personalizado neste servidor.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </form>
                      )}
                    </div>

                    {/* Pinned Messages Drawer */}
                    {showPinnedMessagesPanel && (
                      <aside className="pinned-messages-drawer">
                        <div className="pinned-drawer-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PinIcon style={{ color: 'var(--accent-color)' }} />
                            <h3>Mensagens Fixadas</h3>
                          </div>
                          <button type="button" className="settings-close-btn" onClick={() => setShowPinnedMessagesPanel(false)}>✕</button>
                        </div>
                        <div className="pinned-messages-list">
                          {(pinnedMessages[selectedChannel.id] || []).length === 0 ? (
                            <div className="no-pinned-messages">
                              <PinIcon style={{ width: '32px', height: '32px', opacity: 0.3, margin: '0 auto 8px auto' }} />
                              <p>Nenhuma mensagem fixada neste canal.</p>
                            </div>
                          ) : (
                            (pinnedMessages[selectedChannel.id] || []).map(pin => (
                              <div key={pin.id} className="pinned-msg-item">
                                <div className="pinned-msg-author-row">
                                  <div className="pinned-avatar">
                                    {pin.author_avatar ? (
                                      <img src={pin.author_avatar} alt={pin.author_name} />
                                    ) : (
                                      pin.author_name.slice(0, 1).toUpperCase()
                                    )}
                                  </div>
                                  <strong className="pinned-author-name">{pin.author_name}</strong>
                                  <time className="pinned-time">{new Date(pin.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                  {currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id) && (
                                    <button 
                                      type="button" 
                                      className="unpin-action-btn"
                                      onClick={() => {
                                        const originalMsg = messages.find(m => m.id === pin.message_id) || ({ id: pin.message_id, body: pin.body, author_id: '', channel_id: selectedChannel.id, created_at: pin.created_at } as Message)
                                        togglePinMessage(originalMsg, currentSpace.id, selectedChannel.id)
                                      }}
                                      title="Desafixar mensagem"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                                <div className="pinned-msg-content">
                                  {pin.attachment_url && pin.attachment_type === 'image' ? (
                                    <img src={pin.attachment_url} alt="anexo fixado" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
                                  ) : null}
                                  <p>{formatMessageText(pin.body, profileDisplayName, serverEmojis)}</p>
                                </div>
                                <div className="pinned-by-meta">
                                  Fixado por {pin.pinned_by_name || 'Moderador'}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </aside>
                    )}

                    {showMembersList && currentSpace && (
                      <aside className="members-sidebar">
                        <div className="members-sidebar-inner">
                          <div className="members-group-label">Membros ({spaceMembers.length})</div>
                          <div className="members-list">
                            {spaceMembers.map((member) => {
                              const isCreator = currentSpace.creator_id === member.user.id
                              const isVoiceUser = participants.some(p => p.userId === member.user.id)
                              const isOnline = onlineUsers.has(member.user.id)
                              const userPresenceStatus = isOnline ? (presenceData[member.user.id]?.presence_status || 'online') : 'offline'
                              const memberRole = getUserHighestRole(currentSpace.id, member.user.id)

                              return (
                                <div 
                                  className="member-card" 
                                  key={member.user.id}
                                  onClick={() => {
                                    const memRoles = memberRoleMap[member.user.id] || []
                                    const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                    setInspectedMember({
                                      user: member.user,
                                      roleName: memberRole?.name,
                                      roleColor: memberRole?.color,
                                      roles: matchingRoles
                                    })
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  title="Ver perfil"
                                >
                                  <div className="member-avatar-container">
                                    <div className="member-avatar">
                                      {member.user.avatar_url ? (
                                        <img src={member.user.avatar_url} alt={member.user.display_name} />
                                      ) : (
                                        member.user.display_name.slice(0, 1).toUpperCase()
                                      )}
                                    </div>
                                    <span className={`member-status-dot ${isVoiceUser ? 'voice-active' : userPresenceStatus}`} />
                                  </div>
                                  <div className="member-info">
                                    <div className="member-name-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span className="member-name" style={{ color: memberRole?.color || 'var(--text-primary)', fontWeight: 700 }}>
                                        {member.user.display_name}
                                      </span>
                                      {isCreator ? (
                                        <span className="member-badge creator"><CrownIcon style={{ width: '11px', height: '11px' }} /> Dono</span>
                                      ) : memberRole ? (
                                        <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', color: memberRole.color, background: `${memberRole.color}18`, border: `1px solid ${memberRole.color}44` }}>
                                          {memberRole.name}
                                        </span>
                                      ) : null}
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
                                    <div className="participant-avatar-large" style={{ position: 'relative' }}>
                                      {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt={p.displayName} className="round-avatar-img-large" />
                                      ) : (
                                        <span className="avatar-initial-large">
                                          {p.displayName.slice(0, 1).toUpperCase()}
                                        </span>
                                      )}
                                      {(p.isDeafened || p.isMuted) && (
                                        <div className="participant-avatar-badge" style={{
                                          position: 'absolute',
                                          bottom: '-4px',
                                          right: '-4px',
                                          background: '#e0554c',
                                          borderRadius: '50%',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#fff',
                                          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                          border: '2px solid var(--bg-primary)'
                                        }}>
                                          {p.isDeafened ? <HeadphonesOffIcon style={{ width: '13px', height: '13px' }} /> : <MicOffIcon style={{ width: '13px', height: '13px' }} />}
                                        </div>
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
                                onClick={handleToggleMute}
                                title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
                              >
                                {isMuted ? <MicOffIcon /> : <MicIcon />}
                              </button>

                              <button 
                                className={`control-btn deafen-btn ${isDeafened ? 'muted' : ''}`} 
                                onClick={handleToggleDeafen}
                                title={isDeafened ? "Desensurdecer" : "Ensurdecer (Silenciar chamada)"}
                              >
                                {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                              </button>
                              
                              <div className="screen-control-wrapper" style={{ position: 'relative' }}>
                                <button 
                                  className={`control-btn screen-btn ${localScreenStream ? 'sharing' : ''}`} 
                                  onClick={() => {
                                    if (localScreenStream) {
                                      openScreenPicker()
                                    } else {
                                      setShowScreenshareModal(true)
                                    }
                                  }}
                                  title={localScreenStream ? "Opções de Transmissão" : "Transmitir Tela"}
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
                              const isOnline = onlineUsers.has(member.user.id)
                              const userPresenceStatus = isOnline ? (presenceData[member.user.id]?.presence_status || 'online') : 'offline'
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
                                    <span className={`member-status-dot ${isVoiceUser ? 'voice-active' : userPresenceStatus}`} />
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
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu}
          updatePresenceStatus={updatePresenceStatus}
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
          selectTheme={selectTheme}
          isPremiumUser={isPremiumUser}
          setPage={setPage}
          onSignOut={() => supabase?.auth.signOut()}
          noiseSuppressionEnabled={noiseSuppressionEnabled}
          echoCancellationEnabled={echoCancellationEnabled}
          onNoiseSuppressionChange={(val) => {
            setNoiseSuppressionEnabled(val)
            localStorage.setItem('echo-noise-suppression', val ? 'true' : 'false')
            if (activeVoiceChannelId) {
              changeInputDevice(selectedInputId, val, echoCancellationEnabled)
            }
          }}
          onEchoCancellationChange={(val) => {
            setEchoCancellationEnabled(val)
            localStorage.setItem('echo-echo-cancellation', val ? 'true' : 'false')
            if (activeVoiceChannelId) {
              changeInputDevice(selectedInputId, noiseSuppressionEnabled, val)
            }
          }}
          sfxVolume={sfxVolume}
          onSfxVolumeChange={(val) => {
            setSfxVolume(val)
            localStorage.setItem('echo-sfx-volume', val.toString())
          }}
          noiseGateEnabled={noiseGateEnabled}
          noiseGateThreshold={noiseGateThreshold}
          onNoiseGateEnabledChange={(val) => {
            setNoiseGateEnabled(val)
            localStorage.setItem('echo-noise-gate-enabled', val ? 'true' : 'false')
          }}
          onNoiseGateThresholdChange={(val) => {
            setNoiseGateThreshold(val)
            localStorage.setItem('echo-noise-gate-threshold', val.toString())
          }}
        />
      </div>

      <div style={{ display: page === 'Descobrir' ? undefined : 'none' }}>
        <Placeholder page={'Descobrir'} />
      </div>

      {/* Modal de Qualidade de Transmissão de Tela */}
      {showScreenshareModal && (
        <div className="screen-picker-overlay" onClick={() => setShowScreenshareModal(false)}>
          <div className="screen-picker-modal" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Qualidade da Transmissão</h2>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Selecione as configurações ideais para o compartilhamento da sua tela.
            </p>

            <div className="screenshare-options-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                type="button" 
                className="screenshare-quality-option" 
                onClick={() => startScreenShareWithConfig('720p', 30)}
              >
                <div className="quality-icon">⚡</div>
                <div className="quality-meta">
                  <strong>Otimizado (720p @ 30 FPS)</strong>
                  <span>Recomendado para conexões normais</span>
                </div>
              </button>

              <button 
                type="button" 
                className="screenshare-quality-option" 
                onClick={() => startScreenShareWithConfig('720p', 60)}
              >
                <div className="quality-icon">🎮</div>
                <div className="quality-meta">
                  <strong>Fluido (720p @ 60 FPS)</strong>
                  <span>Ideal para transmissão de jogos rápidos</span>
                </div>
              </button>

              <button 
                type="button" 
                className="screenshare-quality-option" 
                onClick={() => startScreenShareWithConfig('1080p', 30)}
              >
                <div className="quality-icon">🖥️</div>
                <div className="quality-meta">
                  <strong>Alta Definição (1080p @ 30 FPS)</strong>
                  <span>Melhor legibilidade para leitura e código</span>
                </div>
              </button>

              <button 
                type="button" 
                className="screenshare-quality-option" 
                onClick={() => startScreenShareWithConfig('1080p', 60)}
              >
                <div className="quality-icon">🔥</div>
                <div className="quality-meta">
                  <strong>Fidelidade Máxima (1080p @ 60 FPS)</strong>
                  <span>Qualidade e fluidez profissionais (Exige banda)</span>
                </div>
              </button>
            </div>

            <button 
              type="button" 
              className="picker-close-btn" 
              style={{ width: '100%', marginTop: '20px', fontWeight: 'bold' }} 
              onClick={() => setShowScreenshareModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
        <div className="screen-picker-overlay" onClick={() => setShowScreenPicker(false)}>
          <div className="screen-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="screen-picker-header">
              <div className="screen-picker-header-info">
                <h2>Transmitir Tela ou Jogo</h2>
                <p>Escolha o que você gostaria de transmitir com áudio estéreo a 60 FPS.</p>
              </div>
              <button className="screen-picker-close-x" onClick={() => setShowScreenPicker(false)}>×</button>
            </div>

            <div className="screen-picker-tabs">
              <button 
                type="button"
                className={`screen-picker-tab-btn ${screenPickerTab === 'windows' ? 'active' : ''}`}
                onClick={() => setScreenPickerTab('windows')}
              >
                <span>🪟 Janelas de Jogos e Apps</span>
                <span className="picker-tab-count">
                  {screenSources.filter(s => s.type === 'window' || s.id.startsWith('window:')).length}
                </span>
              </button>
              <button 
                type="button"
                className={`screen-picker-tab-btn ${screenPickerTab === 'screens' ? 'active' : ''}`}
                onClick={() => setScreenPickerTab('screens')}
              >
                <span>🖥️ Telas Inteiras</span>
                <span className="picker-tab-count">
                  {screenSources.filter(s => s.type === 'screen' || s.id.startsWith('screen:')).length}
                </span>
              </button>
            </div>

            <div className="sources-list">
              {screenSources
                .filter(s => screenPickerTab === 'windows' ? (s.type === 'window' || s.id.startsWith('window:')) : (s.type === 'screen' || s.id.startsWith('screen:')))
                .map(source => (
                  <button key={source.id} className="source-card" onClick={() => selectScreenSource(source.id)}>
                    <div className="source-card-thumb-wrap">
                      {source.thumbnail ? (
                        <img src={source.thumbnail} alt={source.name} className="source-thumb-img" />
                      ) : source.appIcon ? (
                        <div className="source-thumb-icon-placeholder">
                          <img src={source.appIcon} alt="" className="source-placeholder-icon" />
                        </div>
                      ) : (
                        <div className="source-thumb-icon-placeholder">
                          <span className="source-placeholder-emoji">{screenPickerTab === 'screens' ? '🖥️' : '🪟'}</span>
                        </div>
                      )}
                      {source.appIcon && source.thumbnail && (
                        <img src={source.appIcon} alt="" className="source-app-icon-badge" />
                      )}
                    </div>
                    <div className="source-card-info">
                      {source.appIcon && <img src={source.appIcon} alt="" className="source-card-title-icon" />}
                      <span title={source.name}>{source.name}</span>
                    </div>
                  </button>
                ))}
              {screenSources.filter(s => screenPickerTab === 'windows' ? (s.type === 'window' || s.id.startsWith('window:')) : (s.type === 'screen' || s.id.startsWith('screen:'))).length === 0 && (
                <div className="sources-empty-state">
                  Nenhuma {screenPickerTab === 'windows' ? 'janela aberta' : 'tela'} encontrada no momento.
                </div>
              )}
            </div>

            <div className="screen-picker-game-tip">
              <span className="tip-icon">💡</span>
              <div className="tip-text">
                <strong>Dica para jogos em tela cheia com anti-cheat (ex: Valorant, CS2, Fortnite):</strong> Se a janela direta não for detectada pelo anti-cheat ou ficar preta, selecione a aba <strong>Telas Inteiras</strong>. Ela captura o monitor diretamente a 60 FPS com aceleração de hardware pela GPU sem perda de desempenho!
              </div>
            </div>

            <div className="screen-picker-footer">
              <button className="picker-close-btn" onClick={() => setShowScreenPicker(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Discord-Style Fullscreen Server Settings */}
      {showSpaceSettingsModal && editingSpace && (
        <div className="space-settings-fullscreen-overlay">
          <aside className="space-settings-discord-sidebar">
            <div className="space-settings-sidebar-inner">
              <div className="space-settings-nav-group">
                <span className="space-settings-nav-header">
                  SERVIDOR DE {editingSpace.name.toUpperCase()}
                </span>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'geral' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('geral')}
                >
                  <SettingsIcon />
                  <span>Visão Geral</span>
                </button>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'roles' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('roles')}
                >
                  <ShieldIcon />
                  <span>Cargos</span>
                  <span className="nav-badge">{serverRoles.length}</span>
                </button>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'emojis' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSpaceTab('emojis')
                    loadSpaceEmojis(editingSpace.id)
                  }}
                >
                  <SmileIcon />
                  <span>Emojis</span>
                  <span className="nav-badge">{serverEmojis.length}</span>
                </button>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'channels' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('channels')}
                >
                  <HashtagIcon />
                  <span>Canais</span>
                  <span className="nav-badge">{(spaceChannels[editingSpace.id] ?? []).length}</span>
                </button>
              </div>

              <div className="space-settings-nav-divider" />

              <div className="space-settings-nav-group">
                <span className="space-settings-nav-header">PESSOAS</span>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'members' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSpaceTab('members')
                    loadEditingSpaceMembers(editingSpace.id)
                  }}
                >
                  <UsersIcon />
                  <span>Membros</span>
                  <span className="nav-badge">{editingSpaceMembers.length || 1}</span>
                </button>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'audit' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('audit')}
                >
                  <FileTextIcon />
                  <span>Registro de Auditoria</span>
                </button>
                <button 
                  type="button" 
                  className={`space-settings-nav-item ${activeSpaceTab === 'invites' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('invites')}
                >
                  <LinkIcon />
                  <span>Convites</span>
                </button>
              </div>

              {editingSpace.creator_id === user.id && (
                <>
                  <div className="space-settings-nav-divider" />
                  <div className="space-settings-nav-group">
                    <span className="space-settings-nav-header">MODERAÇÃO</span>
                    <button 
                      type="button" 
                      className={`space-settings-nav-item danger ${activeSpaceTab === 'danger' ? 'active' : ''}`}
                      onClick={() => setActiveSpaceTab('danger')}
                    >
                      <UserMinusIcon />
                      <span>Excluir Servidor</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>

          <main className="space-settings-discord-main">
            <div className="space-settings-discord-content">
              {/* ABA 1: VISÃO GERAL */}
              {activeSpaceTab === 'geral' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Visão Geral do Servidor</h2>
                    <p>Personalize a identidade visual, banners animados (GIFs), foto e preferências do seu servidor.</p>
                  </div>

                  <div className="space-profile-layout">
                    <form onSubmit={handleSaveSpaceSettings} className="space-profile-form">
                      {/* Server Avatar / Icon Section */}
                      <div className="server-icon-edit-section" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div className="server-avatar-large" style={{ width: '68px', height: '68px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--accent-color), #c75a4a)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '22px', fontWeight: 800, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                          {editingSpaceIconUrl ? (
                            <img src={editingSpaceIconUrl} alt="Ícone do servidor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (editingSpaceName || 'S').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Ícone do Servidor (Suporta GIFs)</span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Envie uma imagem estática ou um <strong>GIF animado</strong> (.gif, .png, .jpg, .webp).</span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <input 
                              type="file" 
                              id="server-icon-file-input" 
                              style={{ display: 'none' }} 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleSpaceIconUpload(file)
                                e.target.value = ''
                              }} 
                            />
                            <button 
                              type="button" 
                              className="ch-create-btn" 
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => document.getElementById('server-icon-file-input')?.click()}
                              disabled={uploadingSpaceIcon}
                            >
                              <CameraIcon style={{ width: '14px', height: '14px' }} />
                              <span>{uploadingSpaceIcon ? 'Enviando...' : 'Alterar Foto / GIF'}</span>
                            </button>
                            {editingSpaceIconUrl && (
                              <button 
                                type="button" 
                                className="settings-channel-delete-btn" 
                                style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
                                onClick={handleRemoveSpaceIcon}
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Server Banner / GIF Section */}
                      <div className="selector-card" style={{ marginBottom: '18px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Faixa do Servidor (Banner / GIF Animado)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', marginBottom: '12px' }}>
                          <input 
                            type="file" 
                            id="server-banner-file-input" 
                            style={{ display: 'none' }} 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleSpaceBannerUpload(file)
                              e.target.value = ''
                            }} 
                          />
                          <button 
                            type="button" 
                            className="ch-create-btn" 
                            style={{ padding: '8px 16px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => document.getElementById('server-banner-file-input')?.click()}
                            disabled={uploadingSpaceBanner}
                          >
                            <SparklesIcon style={{ width: '15px', height: '15px' }} />
                            <span>{uploadingSpaceBanner ? 'Enviando...' : 'Enviar Imagem ou GIF para o Banner'}</span>
                          </button>
                          {editingSpaceBannerUrl && (
                            <button 
                              type="button" 
                              className="settings-channel-delete-btn" 
                              style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }}
                              onClick={handleRemoveSpaceBanner}
                            >
                              Remover Banner Personalizado
                            </button>
                          )}
                        </div>

                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Ou escolha um tema de gradiente padrão:</span>
                        <div className="server-banner-swatches" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                          {SERVER_BANNER_PRESETS.map(preset => (
                            <button 
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setEditingSpaceBannerTheme(preset.id)
                                setEditingSpaceBannerUrl('')
                              }}
                              style={{
                                height: '36px',
                                borderRadius: '8px',
                                background: preset.style,
                                border: (!editingSpaceBannerUrl && editingSpaceBannerTheme === preset.id) ? '2.5px solid #fff' : '1px solid var(--border-color)',
                                boxShadow: (!editingSpaceBannerUrl && editingSpaceBannerTheme === preset.id) ? '0 0 0 2px var(--accent-color)' : 'none',
                                cursor: 'pointer',
                                transition: 'transform .15s ease',
                              }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="selector-card">
                        <label>Nome do Servidor</label>
                        <input 
                          value={editingSpaceName} 
                          onChange={(e) => setEditingSpaceName(e.target.value)} 
                          placeholder="Nome do servidor"
                          required 
                          minLength={2}
                          maxLength={80}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            outline: 'none',
                            width: '100%'
                          }}
                        />
                      </div>

                      <div className="selector-card" style={{ marginTop: '16px' }}>
                        <label>Descrição do Servidor</label>
                        <textarea 
                          value={editingSpaceDescription} 
                          onChange={(e) => setEditingSpaceDescription(e.target.value)} 
                          placeholder="Fale um pouco sobre o que é este servidor..."
                          className="space-settings-textarea"
                          maxLength={280}
                          style={{ minHeight: '90px' }}
                        />
                      </div>

                      {/* Welcome System Channel */}
                      <div className="selector-card" style={{ marginTop: '16px' }}>
                        <label>Canal de Boas-Vindas do Sistema</label>
                        <select 
                          value={editingSpaceWelcomeChannelId} 
                          onChange={(e) => setEditingSpaceWelcomeChannelId(e.target.value)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                            width: '100%'
                          }}
                        >
                          <option value="">Nenhum canal selecionado</option>
                          {(spaceChannels[editingSpace.id] ?? []).filter(c => c.type === 'text').map(ch => (
                            <option key={ch.id} value={ch.id}># {ch.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Server Notifications toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {mutedSpaces.has(editingSpace.id) ? <BellOffIcon style={{ color: '#e0554c' }} /> : <BellIcon style={{ color: 'var(--text-primary)' }} />}
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>Silenciar Notificações</span>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Desative alertas sonoros e de área de trabalho para este servidor.</span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="ch-create-btn" 
                          style={{ padding: '6px 14px', fontSize: '12px', background: mutedSpaces.has(editingSpace.id) ? '#e0554c' : 'var(--bg-tertiary)', color: mutedSpaces.has(editingSpace.id) ? '#fff' : 'var(--text-primary)' }}
                          onClick={() => toggleMuteSpace(editingSpace.id)}
                        >
                          {mutedSpaces.has(editingSpace.id) ? 'Silenciado' : 'Ativo'}
                        </button>
                      </div>

                      <button type="submit" className="add-space-modal-submit-btn" style={{ marginTop: '24px', width: 'auto', padding: '12px 28px', fontSize: '14px' }}>
                        Salvar Alterações
                      </button>
                    </form>

                    {/* Discord-style Server Card Live Preview */}
                    <div className="discord-server-preview-column">
                      <label className="preview-label">PRÉ-VISUALIZAÇÃO DO SERVIDOR</label>
                      <div className="discord-server-preview-card">
                        <div 
                          className="preview-banner-bg" 
                          style={{ 
                            background: editingSpaceBannerUrl ? `url(${editingSpaceBannerUrl}) center/cover no-repeat` : (SERVER_BANNER_PRESETS.find(p => p.id === editingSpaceBannerTheme) || SERVER_BANNER_PRESETS[0]).style 
                          }}
                        />
                        <div className="preview-card-body">
                          <div className="preview-server-avatar" style={{ overflow: 'hidden' }}>
                            {editingSpaceIconUrl ? (
                              <img src={editingSpaceIconUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (editingSpaceName || 'S').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <h3 className="preview-server-name">{editingSpaceName || 'Nome do Servidor'}</h3>
                          <p className="preview-server-desc">{editingSpaceDescription || 'Nenhuma descrição adicionada ainda.'}</p>
                          
                          <div className="preview-server-stats">
                            <span className="stat-bullet">🟢 1 online</span>
                            <span className="stat-bullet">👥 {editingSpaceMembers.length || 1} membros</span>
                          </div>

                          <div className="preview-server-footer">
                            <span>Servidor no Echo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: CARGOS E PERMISSÕES (NOVA ABA DEDICADA) */}
              {activeSpaceTab === 'roles' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2>Cargos do Servidor</h2>
                      <p>Crie cargos personalizados, defina cores vibrantes e gerencie permissões detalhadas para seus membros.</p>
                    </div>
                    <button 
                      type="button" 
                      className="add-space-card-btn" 
                      style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={handleCreateRole}
                    >
                      <PlusIcon />
                      <span>Criar Cargo</span>
                    </button>
                  </div>

                  <div className="roles-management-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', marginTop: '16px' }}>
                    {/* Lista de Cargos na esquerda */}
                    <div className="roles-sidebar-list" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', display: 'block', marginBottom: '8px' }}>
                        CARGOS ({serverRoles.length})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {serverRoles.map((role, idx) => {
                          const isSelected = selectedRoleId === role.id
                          return (
                            <div 
                              key={role.id} 
                              className={`role-list-item ${isSelected ? 'active' : ''}`}
                              onClick={() => setSelectedRoleId(role.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                                border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all .15s ease'
                              }}
                            >
                              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: role.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {role.name}
                              </span>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                <button 
                                  type="button" 
                                  className="settings-channel-delete-btn" 
                                  style={{ width: '22px', height: '22px', padding: 0 }} 
                                  onClick={(e) => { e.stopPropagation(); moveRole(role.id, 'up') }}
                                  disabled={idx === 0}
                                  title="Mover cargo para cima"
                                >
                                  <ArrowUpIcon style={{ width: '12px', height: '12px' }} />
                                </button>
                                <button 
                                  type="button" 
                                  className="settings-channel-delete-btn" 
                                  style={{ width: '22px', height: '22px', padding: 0 }} 
                                  onClick={(e) => { e.stopPropagation(); moveRole(role.id, 'down') }}
                                  disabled={idx === serverRoles.length - 1}
                                  title="Mover cargo para baixo"
                                >
                                  <ArrowDownIcon style={{ width: '12px', height: '12px' }} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Editor do Cargo Selecionado na direita */}
                    {(() => {
                      const currentRole = serverRoles.find(r => r.id === selectedRoleId) || serverRoles[0]
                      if (!currentRole) return null

                      return (
                        <div className="role-editor-pane" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: currentRole.color }} />
                              Editar Cargo: {currentRole.name}
                            </h3>
                            {currentRole.id !== 'role-owner' && currentRole.id !== 'role-member' && (
                              <button 
                                type="button" 
                                className="settings-channel-delete-btn" 
                                style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', color: '#e0554c' }}
                                onClick={() => handleDeleteRole(currentRole.id)}
                              >
                                <TrashIcon style={{ width: '13px', height: '13px' }} />
                                <span>Excluir Cargo</span>
                              </button>
                            )}
                          </div>

                          <div className="selector-card" style={{ marginBottom: '16px' }}>
                            <label>Nome do Cargo</label>
                            <input 
                              type="text" 
                              value={currentRole.name} 
                              onChange={(e) => handleUpdateRole(currentRole.id, { name: e.target.value })}
                              placeholder="Nome do cargo"
                              disabled={currentRole.id === 'role-owner' || currentRole.id === 'role-member'}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: '1.5px solid var(--border-color)',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '13.5px',
                                fontWeight: 600,
                                outline: 'none',
                                width: '100%'
                              }}
                            />
                          </div>

                          {/* Role Color Picker */}
                          <div className="selector-card" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <PaletteIcon />
                              <span>Cor do Cargo</span>
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                              {ROLE_COLOR_PRESETS.map(c => (
                                <button 
                                  key={c}
                                  type="button"
                                  onClick={() => handleUpdateRole(currentRole.id, { color: c })}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: c,
                                    border: currentRole.color === c ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                    boxShadow: currentRole.color === c ? '0 0 0 2px var(--accent-color)' : 'none',
                                    cursor: 'pointer'
                                  }}
                                />
                              ))}
                              <input 
                                type="color" 
                                value={currentRole.color} 
                                onChange={(e) => handleUpdateRole(currentRole.id, { color: e.target.value })}
                                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '50%', background: 'transparent', cursor: 'pointer' }}
                                title="Cor personalizada"
                              />
                            </div>
                          </div>

                          {/* Permissões Switches */}
                          <div className="role-permissions-section">
                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                              PERMISSÕES DO CARGO
                            </span>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {/* Permissão 1: Administrador */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>🛡️ Administrador</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Membros com este cargo têm todas as permissões e ignoram quaisquer restrições de canais.</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={!!currentRole.permissions?.administrator} 
                                  disabled={currentRole.id === 'role-owner'}
                                  onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, administrator: e.target.checked } })}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </div>

                              {/* Permissão 2: Gerenciar Canais */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>📁 Gerenciar Canais</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Permite criar, renomear, reordenar e excluir canais de texto e voz.</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={!!currentRole.permissions?.manageChannels || !!currentRole.permissions?.administrator} 
                                  disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                                  onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, manageChannels: e.target.checked } })}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </div>

                              {/* Permissão 3: Gerenciar Mensagens */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>💬 Gerenciar Mensagens</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Permite apagar ou moderar mensagens de outros membros no chat.</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={!!currentRole.permissions?.manageMessages || !!currentRole.permissions?.administrator} 
                                  disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                                  onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, manageMessages: e.target.checked } })}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </div>

                              {/* Permissão 4: Expulsar Membros */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>👢 Expulsar Membros</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Permite remover membros do servidor.</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={!!currentRole.permissions?.kickMembers || !!currentRole.permissions?.administrator} 
                                  disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                                  onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, kickMembers: e.target.checked } })}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </div>

                              {/* Permissão 5: Moderação de Voz */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>🔇 Moderação de Voz</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Permite silenciar e gerenciar outros membros em salas de voz.</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={!!currentRole.permissions?.muteMembers || !!currentRole.permissions?.administrator} 
                                  disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                                  onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, muteMembers: e.target.checked } })}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </div>

                              {/* Permissão 6: Postar em Canais de Anúncios */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>📢 Postar em Canais de Anúncios</strong>
                                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Permite enviar mensagens em canais configurados como Somente Leitura.</span>
                                </div>
                                <input 
                                  type="checkbox" 
                                  checked={!!currentRole.permissions?.sendInAnnouncementChannels || !!currentRole.permissions?.administrator} 
                                  disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                                  onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, sendInAnnouncementChannels: e.target.checked } })}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ABA: EMOJIS DO SERVIDOR */}
              {activeSpaceTab === 'emojis' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Emojis e Figurinhas do Servidor</h2>
                    <p>Envie imagens estáticas ou <strong>GIFs animados</strong> com código :nome: para membros usarem no chat deste servidor.</p>
                  </div>

                  {/* Form de Criação de Emoji */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Adicionar Novo Emoji ou GIF</h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        value={newEmojiName} 
                        onChange={(e) => setNewEmojiName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="Nome do emoji (ex: pepe, hype, gg)"
                        maxLength={32}
                        style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
                      />
                      <input 
                        type="file" 
                        id="server-emoji-file-input" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) {
                            if (!newEmojiName.trim()) {
                              const autoName = f.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
                              handleCreateEmoji(f, autoName)
                            } else {
                              handleCreateEmoji(f, newEmojiName)
                            }
                          }
                          e.target.value = ''
                        }}
                      />
                      <button 
                        type="button" 
                        className="add-space-card-btn" 
                        style={{ width: 'auto', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        disabled={uploadingEmoji}
                        onClick={() => {
                          if (!newEmojiName.trim()) {
                            showToast("Nome do Emoji", "Digite um nome para o emoji antes de escolher o arquivo.", "info")
                            return
                          }
                          document.getElementById('server-emoji-file-input')?.click()
                        }}
                      >
                        <SmileIcon />
                        <span>{uploadingEmoji ? 'Enviando...' : 'Carregar Imagem / GIF'}</span>
                      </button>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Formatos suportados: .png, .gif, .jpg, .webp (Recomendado: 128x128px com fundo transparente).</span>
                  </div>

                  {/* Grid de Emojis do Servidor */}
                  <div className="server-emojis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                    {serverEmojis.map(emoji => (
                      <div key={emoji.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <img src={emoji.url} alt={emoji.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            :{emoji.name}:
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {new Date(emoji.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="settings-channel-delete-btn" 
                          onClick={() => handleDeleteEmoji(emoji.id)}
                          title="Excluir Emoji"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {serverEmojis.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <SmileIcon style={{ width: '36px', height: '36px', margin: '0 auto 10px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>Nenhum emoji personalizado cadastrado ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 3: CANAIS */}
              {activeSpaceTab === 'channels' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Canais do Servidor</h2>
                    <p>Gerencie categorias, renomeie, ordene, configure tópicos, modo lento e limites de voz.</p>
                  </div>

                  <div className="space-settings-channels-list-full">
                    {(spaceChannels[editingSpace.id] ?? []).map((ch, idx) => (
                      <div key={ch.id} className="settings-channel-item-full" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="ch-type-indicator">
                            {ch.is_announcement ? <MegaphoneIcon style={{ color: 'var(--accent-color)' }} /> : ch.type === 'text' ? <HashtagIcon /> : <VolumeIcon />}
                          </div>
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
                            placeholder="Nome do canal"
                            style={{ fontWeight: 700, fontSize: '14px', flex: 1, padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                          />

                          {/* Reordering Up/Down controls */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              type="button" 
                              className="settings-channel-delete-btn" 
                              onClick={() => moveChannel(ch.id, 'up')}
                              disabled={idx === 0}
                              style={{ opacity: idx === 0 ? 0.3 : 1 }}
                              title="Mover para cima"
                            >
                              <ArrowUpIcon />
                            </button>
                            <button 
                              type="button" 
                              className="settings-channel-delete-btn" 
                              onClick={() => moveChannel(ch.id, 'down')}
                              disabled={idx === (spaceChannels[editingSpace.id] ?? []).length - 1}
                              style={{ opacity: idx === (spaceChannels[editingSpace.id] ?? []).length - 1 ? 0.3 : 1 }}
                              title="Mover para baixo"
                            >
                              <ArrowDownIcon />
                            </button>
                          </div>

                          {ch.name !== 'Geral' ? (
                            <button 
                              type="button"
                              className="settings-channel-delete-btn" 
                              onClick={() => deleteChannel(ch.id)}
                              title="Excluir Canal"
                            >
                              🗑️
                            </button>
                          ) : (
                            <span className="default-channel-badge">Padrão</span>
                          )}
                        </div>

                        {/* Additional Channel Options */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', paddingLeft: '24px' }}>
                          {/* Categoria */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FolderIcon style={{ color: 'var(--text-muted)' }} />
                            <input 
                              type="text"
                              defaultValue={ch.category || ''}
                              onBlur={(e) => updateChannelSettings(ch.id, { category: e.target.value.trim() })}
                              placeholder="Categoria (ex: Geral, Jogos)"
                              style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', width: '150px' }}
                            />
                          </div>

                          {ch.type === 'text' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Tópico:</span>
                                <input 
                                  type="text"
                                  defaultValue={ch.topic || ''}
                                  onBlur={(e) => updateChannelSettings(ch.id, { topic: e.target.value.trim() })}
                                  placeholder="Descrição do canal..."
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    flex: 1,
                                    outline: 'none'
                                  }}
                                />
                              </div>

                              {/* Modo Lento */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ClockIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                                <select 
                                  value={ch.slowmode_seconds || 0}
                                  onChange={(e) => updateChannelSettings(ch.id, { slowmode_seconds: parseInt(e.target.value, 10) })}
                                  style={{ fontSize: '11.5px', padding: '3px 6px', borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                  title="Intervalo de envio entre mensagens"
                                >
                                  <option value="0">Modo Lento: Off</option>
                                  <option value="5">5 segundos</option>
                                  <option value="10">10 segundos</option>
                                  <option value="15">15 segundos</option>
                                  <option value="30">30 segundos</option>
                                  <option value="60">1 minuto</option>
                                  <option value="120">2 minutos</option>
                                  <option value="300">5 minutos</option>
                                </select>
                              </div>

                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={!!ch.is_announcement} 
                                  onChange={(e) => updateChannelSettings(ch.id, { is_announcement: e.target.checked })}
                                />
                                <span>📢 Somente Leitura (Anúncios)</span>
                              </label>
                            </>
                          )}

                          {ch.type === 'voice' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Limite de Usuários:</span>
                              <select 
                                value={ch.user_limit || 0}
                                onChange={(e) => updateChannelSettings(ch.id, { user_limit: parseInt(e.target.value, 10) })}
                                style={{
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <option value="0">Ilimitado</option>
                                <option value="2">2 usuários (Duplas)</option>
                                <option value="4">4 usuários (Squad)</option>
                                <option value="8">8 usuários</option>
                                <option value="10">10 usuários</option>
                                <option value="25">25 usuários</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault()
                      await createChannel(e, editingSpace.id)
                    }}
                    className="settings-channel-create-full-form"
                  >
                    <h4>Criar Novo Canal</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="create-channel-inline-row">
                        <input 
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          placeholder="Nome do canal (ex: avisos, jogos)"
                          required
                          minLength={2}
                          maxLength={60}
                          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
                        />
                        <select 
                          value={newChannelType} 
                          onChange={(e) => setNewChannelType(e.target.value as 'text' | 'voice')}
                          className="channel-type-select"
                        >
                          <option value="text"># Canal de Texto</option>
                          <option value="voice">🔊 Canal de Voz</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                          value={newChannelCategory}
                          onChange={(e) => setNewChannelCategory(e.target.value)}
                          placeholder="Categoria (ex: Bate-Papo, Jogos, Call)"
                          maxLength={40}
                          style={{ width: '220px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '12.5px' }}
                        />

                        {newChannelType === 'text' && (
                          <>
                            <input 
                              value={newChannelTopic}
                              onChange={(e) => setNewChannelTopic(e.target.value)}
                              placeholder="Tópico / descrição do canal (opcional)"
                              maxLength={120}
                              style={{ flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '12.5px' }}
                            />

                            <select 
                              value={newChannelSlowmode}
                              onChange={(e) => setNewChannelSlowmode(parseInt(e.target.value, 10))}
                              style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                              title="Modo Lento"
                            >
                              <option value="0">Modo Lento: Off</option>
                              <option value="5">5s de intervalo</option>
                              <option value="10">10s de intervalo</option>
                              <option value="30">30s de intervalo</option>
                              <option value="60">1m de intervalo</option>
                            </select>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <input 
                                type="checkbox" 
                                checked={newChannelIsAnnouncement} 
                                onChange={(e) => setNewChannelIsAnnouncement(e.target.checked)}
                              />
                              <span>📢 Anúncios</span>
                            </label>
                          </>
                        )}

                        {newChannelType === 'voice' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Limite de Vagas:</span>
                            <select 
                              value={newChannelUserLimit}
                              onChange={(e) => setNewChannelUserLimit(parseInt(e.target.value, 10))}
                              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '12px' }}
                            >
                              <option value="0">Ilimitado</option>
                              <option value="2">2 participantes</option>
                              <option value="4">4 participantes</option>
                              <option value="8">8 participantes</option>
                              <option value="10">10 participantes</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <button type="submit" className="add-space-card-btn" style={{ width: 'auto', alignSelf: 'flex-start', padding: '10px 24px', marginTop: '6px' }}>
                        Criar Canal
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ABA 4: MEMBROS E ATRIBUIÇÃO DE CARGOS */}
              {activeSpaceTab === 'members' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Membros do Servidor</h2>
                    <p>Total de {editingSpaceMembers.length} membro(s) cadastrados no servidor <strong>{editingSpace.name}</strong>.</p>
                  </div>

                  <div className="members-search-wrapper">
                    <input 
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Buscar membros no servidor..."
                      className="members-search-input"
                    />
                  </div>

                  {loadingEditingMembers ? (
                    <div className="members-loading-state" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Carregando lista de membros...
                    </div>
                  ) : (
                    <div className="space-settings-members-list-full">
                      {editingSpaceMembers
                        .filter(m => !memberSearchQuery.trim() || m.user?.display_name?.toLowerCase().includes(memberSearchQuery.toLowerCase().trim()))
                        .map(member => {
                          const isOwner = member.user?.id === editingSpace.creator_id
                          const isSelf = member.user?.id === user.id
                          const highestRole = getUserHighestRole(editingSpace.id, member.user?.id)
                          const assignedRoleIds = memberRoleMap[member.user?.id] || []
                          const assignedRoles = serverRoles.filter(r => assignedRoleIds.includes(r.id))
                          const canKick = (editingSpace.creator_id === user.id && !isOwner && !isSelf) || (canUserDo(editingSpace.id, user.id, 'kickMembers') && !isOwner && !isSelf)

                          return (
                            <div key={member.user?.id} className="settings-member-item-full" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                              <div className="settings-member-avatar-full">
                                {member.user?.avatar_url ? (
                                  <img src={member.user.avatar_url} alt={member.user.display_name} />
                                ) : (
                                  <span>{(member.user?.display_name || '?')[0].toUpperCase()}</span>
                                )}
                              </div>
                              
                              <div className="settings-member-info-full" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="settings-member-name-full" style={{ color: highestRole?.color || 'var(--text-primary)', fontWeight: 700, fontSize: '14px' }}>
                                    {member.user?.display_name}
                                  </span>
                                  {isSelf && <span className="self-tag">(Você)</span>}
                                </div>
                                <span className="settings-member-joined" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                  {member.joined_at ? `Entrou em ${new Date(member.joined_at).toLocaleDateString('pt-BR')}` : 'Membro'}
                                </span>
                              </div>

                              {/* Cargos Badges & Selector */}
                              <div className="settings-member-role-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                {isOwner && (
                                  <span className="role-badge role-owner" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CrownIcon /> Dono
                                  </span>
                                )}

                                {assignedRoles.map(r => (
                                  <span 
                                    key={r.id}
                                    style={{ 
                                      background: `${r.color}22`, 
                                      color: r.color, 
                                      border: `1px solid ${r.color}66`, 
                                      padding: '3px 8px', 
                                      borderRadius: '6px', 
                                      fontSize: '11px', 
                                      fontWeight: 700, 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: '4px' 
                                    }}
                                  >
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.color }} />
                                    {r.name}
                                    {!isOwner && (
                                      <button 
                                        type="button" 
                                        onClick={() => toggleMemberRole(member.user?.id, r.id, member.user?.display_name)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', fontSize: '10px' }}
                                        title="Remover cargo"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))}

                                {/* Dropdown de Atribuir Cargo */}
                                {!isOwner && (
                                  <select 
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value === 'TRANSFER_OWNERSHIP') {
                                        handleRoleChange(member.user?.id, 'owner', member.user?.display_name)
                                        e.target.value = ''
                                        return
                                      }
                                      if (e.target.value) {
                                        toggleMemberRole(member.user?.id, e.target.value, member.user?.display_name)
                                        e.target.value = ''
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      border: '1px dashed var(--border-color)',
                                      background: 'var(--bg-primary)',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="">+ Gerenciar Cargos</option>
                                    {serverRoles.filter(r => r.id !== 'role-owner').map(r => (
                                      <option key={r.id} value={r.id}>
                                        {assignedRoleIds.includes(r.id) ? `✓ ${r.name} (Remover)` : `+ ${r.name}`}
                                      </option>
                                    ))}
                                    {editingSpace.creator_id === user.id && (
                                      <option value="TRANSFER_OWNERSHIP">👑 Transferir Posse do Servidor</option>
                                    )}
                                  </select>
                                )}
                              </div>

                              {canKick && (
                                <button 
                                  type="button" 
                                  className="settings-member-kick-btn"
                                  onClick={() => handleKickMember(member.user?.id, member.user?.display_name)}
                                  title={`Expulsar ${member.user?.display_name} do servidor`}
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  <UserMinusIcon />
                                  <span>Expulsar</span>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      {editingSpaceMembers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                          Nenhum membro encontrado.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 5: REGISTRO DE AUDITORIA (AUDIT LOGS) */}
              {activeSpaceTab === 'audit' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Registro de Auditoria do Servidor</h2>
                    <p>Histórico cronológico em tempo real de eventos de moderação e alterações realizadas no servidor.</p>
                  </div>

                  <div className="audit-logs-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    {serverAuditLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <FileTextIcon style={{ width: '32px', height: '32px', margin: '0 auto 12px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>Nenhum evento registrado recentemente neste servidor.</p>
                      </div>
                    ) : (
                      serverAuditLogs.map(log => (
                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'grid', placeItems: 'center', color: 'var(--accent-color)' }}>
                              <FileTextIcon style={{ width: '16px', height: '16px' }} />
                            </div>
                            <div>
                              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                                <strong>{log.author_name}</strong> {log.action}
                              </span>
                              {log.details && (
                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{log.details}</span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ABA 6: CONVITES */}
              {activeSpaceTab === 'invites' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Convites do Servidor</h2>
                    <p>Compartilhe o código abaixo para que seus amigos possam entrar no seu servidor.</p>
                  </div>

                  <div className="invites-card-container">
                    <label className="invite-field-label">CÓDIGO DE ACESSO DIRETO</label>
                    <div className="invite-input-row">
                      <input 
                        type="text" 
                        value={editingSpace.id} 
                        readOnly 
                        className="invite-code-input"
                      />
                      <button 
                        type="button" 
                        className="ch-create-btn" 
                        style={{ padding: '10px 20px', fontSize: '13px' }}
                        onClick={() => {
                          copyToClipboard(editingSpace.id)
                          showToast("Código Copiado!", "Código de convite copiado com sucesso.", "info")
                        }}
                      >
                        Copiar Código
                      </button>
                    </div>

                    <div className="invite-divider" />

                    <label className="invite-field-label">MENSAGEM DE CONVITE COMPLETA</label>
                    <button 
                      type="button" 
                      className="invite-message-btn"
                      onClick={() => {
                        const inviteMsg = `Venha participar do meu servidor "${editingSpace.name}" no Echo! Use o código: ${editingSpace.id}`
                        copyToClipboard(inviteMsg)
                        showToast("Mensagem Copiada!", "Texto de convite copiado para a área de transferência.", "info")
                      }}
                    >
                      📋 Copiar Mensagem de Convite Pronta
                    </button>

                    <div className="invite-help-box">
                      <span style={{ fontSize: '16px' }}>💡</span>
                      <p>
                        <strong>Como funciona:</strong> Qualquer amigo pode abrir o Echo, clicar no botão <strong>+</strong> na aba Servidores, escolher "Entrar em um servidor" e colar esse código para entrar imediatamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 7: ZONA DE PERIGO */}
              {activeSpaceTab === 'danger' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2 style={{ color: '#e0554c' }}>Zona de Perigo</h2>
                    <p>Ações irreversíveis para este servidor.</p>
                  </div>

                  <div className="danger-zone-full">
                    <div className="danger-zone-header">
                      <h3>Excluir Servidor</h3>
                      <p>Ao excluir este servidor, todos os canais, mensagens e participantes associados a ele serão deletados permanentemente. Esta ação não pode ser desfeita.</p>
                    </div>
                    <button 
                      type="button" 
                      className="dropdown-action-btn danger" 
                      style={{ width: 'auto', padding: '12px 24px', fontWeight: 'bold', fontSize: '14px' }} 
                      onClick={handleDeleteSpace}
                    >
                      Excluir Servidor Permanentemente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Discord Close / ESC Button */}
            <div className="space-settings-esc-container">
              <button 
                type="button" 
                className="space-settings-esc-btn" 
                onClick={() => setShowSpaceSettingsModal(false)}
                title="Fechar (Esc)"
              >
                ✕
              </button>
              <span className="space-settings-esc-text">ESC</span>
            </div>
          </main>
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

      {/* Discord-Style Member Profile Card Modal */}
      {inspectedMember && (
        <div className="screen-picker-overlay member-profile-overlay" onClick={() => setInspectedMember(null)}>
          <div className="member-profile-card-modal" onClick={(e) => e.stopPropagation()}>
            <div 
              className="member-profile-banner" 
              style={{
                background: inspectedMember.roleColor 
                  ? `linear-gradient(135deg, ${inspectedMember.roleColor}dd, var(--bg-tertiary))` 
                  : 'linear-gradient(135deg, var(--accent-color), var(--bg-tertiary))'
              }}
            >
              <button type="button" className="member-profile-close-btn" onClick={() => setInspectedMember(null)}>✕</button>
            </div>

            <div className="member-profile-body">
              <div className="member-profile-avatar-row">
                <div className="member-profile-avatar-large">
                  {inspectedMember.user.avatar_url ? (
                    <img src={inspectedMember.user.avatar_url} alt={inspectedMember.user.display_name} />
                  ) : (
                    inspectedMember.user.display_name.slice(0, 1).toUpperCase()
                  )}
                  <span className={`member-profile-status-ring ${onlineUsers.has(inspectedMember.user.id) ? (presenceData[inspectedMember.user.id]?.presence_status || 'online') : 'offline'}`} />
                </div>
              </div>

              <div className="member-profile-header-info">
                <h3 className="member-profile-display-name">{inspectedMember.user.display_name}</h3>
                <span className="member-profile-handle">@{inspectedMember.user.display_name.toLowerCase().replace(/\s+/g, '')}</span>
                {presenceData[inspectedMember.user.id]?.custom_status && (
                  <p className="member-profile-custom-status">💬 {presenceData[inspectedMember.user.id].custom_status}</p>
                )}
              </div>

              <div className="member-profile-divider" />

              {/* Roles Section */}
              <div className="member-profile-roles-section">
                <span className="member-profile-section-title">CARGOS NO SERVIDOR</span>
                <div className="member-profile-roles-wrap">
                  {inspectedMember.roles && inspectedMember.roles.length > 0 ? (
                    inspectedMember.roles.map(r => (
                      <span 
                        key={r.id} 
                        className="member-role-pill" 
                        style={{ color: r.color, borderColor: `${r.color}66`, background: `${r.color}15` }}
                      >
                        <span className="role-dot" style={{ background: r.color }} />
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="member-role-pill default">
                      <span className="role-dot" />
                      {inspectedMember.roleName || 'Membro'}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Section */}
              <div className="member-profile-actions">
                {inspectedMember.user.id !== user.id && (
                  <button 
                    type="button" 
                    className="member-profile-action-btn primary"
                    onClick={() => {
                      const targetId = inspectedMember.user.id
                      setInspectedMember(null)
                      setPage('Amigos')
                      setSelectedDMUserId(targetId)
                      setUnreadDMs(prev => { const next = { ...prev }; delete next[targetId]; return next })
                      loadDirectMessages(targetId)
                    }}
                  >
                    <MessageSquareIcon />
                    <span>Conversar no Privado</span>
                  </button>
                )}

                {participants.some(p => p.userId === inspectedMember.user.id) && inspectedMember.user.id !== user.id && (
                  <button 
                    type="button" 
                    className="member-profile-action-btn secondary"
                    onClick={() => {
                      const peer = participants.find(p => p.userId === inspectedMember.user.id)
                      if (peer) {
                        setVolumeControlUser(peer)
                        setInspectedMember(null)
                      }
                    }}
                  >
                    <VolumeIcon />
                    <span>Ajustar Volume</span>
                  </button>
                )}
              </div>
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
  onSignOut,
  presenceStatus,
  showStatusMenu,
  setShowStatusMenu,
  updatePresenceStatus
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
  theme: string
  toggleTheme: () => void
  setPage: (page: Page) => void
  onSignOut: () => void
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu: boolean
  setShowStatusMenu: (val: boolean) => void
  updatePresenceStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
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
          <div className="profile-footer-info" onClick={() => setShowStatusMenu(!showStatusMenu)} style={{ cursor: 'pointer', position: 'relative' }}>
            <div className="profile-footer-avatar" style={{ position: 'relative' }}>
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt={profileDisplayName} />
              ) : (
                profileDisplayName.slice(0, 1).toUpperCase()
              )}
              <span className={`my-status-dot ${presenceStatus}`} />
            </div>
            <div className="profile-footer-meta">
              <span className="profile-footer-name" title={profileDisplayName}>{profileDisplayName}</span>
              <span className="profile-footer-status">
                {presenceStatus === 'online' ? '🟢 Online' :
                 presenceStatus === 'idle' ? '🟡 Ausente' :
                 presenceStatus === 'dnd' ? '🔴 Não Perturbe' : '⚪ Invisível'}
              </span>
            </div>

            {showStatusMenu && (
              <div className="status-picker-popover" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('online'); setShowStatusMenu(false); }}>
                  <span className="status-dot-bullet online" />
                  <div className="status-meta">
                    <strong>Online</strong>
                    <span>Disponível</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('idle'); setShowStatusMenu(false); }}>
                  <span className="status-dot-bullet idle" />
                  <div className="status-meta">
                    <strong>Ausente</strong>
                    <span>Inativo</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('dnd'); setShowStatusMenu(false); }}>
                  <span className="status-dot-bullet dnd" />
                  <div className="status-meta">
                    <strong>Não perturbe</strong>
                    <span>Silenciar</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('invisible'); setShowStatusMenu(false); }}>
                  <span className="status-dot-bullet offline" />
                  <div className="status-meta">
                    <strong>Invisível</strong>
                    <span>Aparecer offline</span>
                  </div>
                </button>
              </div>
            )}
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
                      <span className={`online-indicator ${presenceData[friend.user.id]?.presence_status || 'online'}`} />
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
                        <span className={`online-indicator ${isOnline ? (presenceData[friend.user.id]?.presence_status || 'online') : 'offline'}`} />
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
  selectTheme,
  isPremiumUser,
  setPage,
  onSignOut,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  onNoiseSuppressionChange,
  onEchoCancellationChange,
  sfxVolume,
  onSfxVolumeChange,
  noiseGateEnabled,
  noiseGateThreshold,
  onNoiseGateEnabledChange,
  onNoiseGateThresholdChange
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
  theme: string
  toggleTheme: () => void
  selectTheme: (themeId: string) => void
  isPremiumUser: boolean
  setPage: (page: Page) => void
  onSignOut: () => void
  noiseSuppressionEnabled: boolean
  echoCancellationEnabled: boolean
  onNoiseSuppressionChange: (val: boolean) => void
  onEchoCancellationChange: (val: boolean) => void
  sfxVolume: number
  onSfxVolumeChange: (val: number) => void
  noiseGateEnabled: boolean
  noiseGateThreshold: number
  onNoiseGateEnabledChange: (val: boolean) => void
  onNoiseGateThresholdChange: (val: number) => void
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'audio' | 'appearance'>('profile')
  
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
            <button 
              className={`menu-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('appearance')}
            >
              <span className="menu-icon">🎨</span>
              <span>Aparência</span>
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
        {activeSettingsTab === 'profile' && (
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
        )}

        {activeSettingsTab === 'audio' && (
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

            <div className="mic-test-panel" style={{ marginTop: '20px' }}>
              <h3>Preferências de Voz</h3>
              <p>Habilite filtros de redução de ruído e eco para melhorar a sua voz.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <label className="checkbox-setting-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={noiseSuppressionEnabled} 
                    onChange={(e) => onNoiseSuppressionChange(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Supressão de Ruído</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Filtra ruídos de fundo como ventiladores e digitação</span>
                  </div>
                </label>

                <label className="checkbox-setting-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    checked={echoCancellationEnabled} 
                    onChange={(e) => onEchoCancellationChange(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Cancelamento de Eco</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Impede que a voz de outras pessoas nos speakers retorne ao seu microfone</span>
                  </div>
                </label>

                <label className="checkbox-setting-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    checked={noiseGateEnabled} 
                    onChange={(e) => onNoiseGateEnabledChange(e.target.checked)} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Portão de Ruído (Noise Gate)</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Corta o som do microfone automaticamente quando você está em silêncio</span>
                  </div>
                </label>

                {noiseGateEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '28px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Limiar de Sensibilidade:</span>
                      <strong>{noiseGateThreshold} dB</strong>
                    </div>
                    <input 
                      type="range" 
                      min="-60" 
                      max="-25" 
                      step="1" 
                      value={noiseGateThreshold} 
                      onChange={(e) => onNoiseGateThresholdChange(parseFloat(e.target.value))} 
                      className="slider-setting"
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Valores menores (ex: -55 dB) abrem o portão com sons mais baixos. Padrão: -45 dB.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mic-test-panel" style={{ marginTop: '20px' }}>
              <h3>Efeitos Sonoros</h3>
              <p>Ajuste o volume dos avisos sonoros de conexão, mudo e transmissão.</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px' }}>
                <span style={{ fontSize: '18px' }}>{sfxVolume === 0 ? '🔈' : sfxVolume < 0.4 ? '🔉' : '🔊'}</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => onSfxVolumeChange(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer', height: '6px', borderRadius: '3px' }}
                />
                <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === 'appearance' && (
          <div className="settings-container">
            <h2>Aparência</h2>
            <p>Personalize o visual do Echo com temas exclusivos. Assinantes premium têm acesso a temas personalizados.</p>

            <div className="themes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
              {THEMES.map(t => {
                const isSelected = theme === t.id
                return (
                  <div 
                    key={t.id}
                    onClick={() => selectTheme(t.id)}
                    className={`theme-card ${isSelected ? 'selected' : ''}`}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'var(--bg-secondary)',
                      border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {t.previewColors.map((color, i) => (
                        <span 
                          key={i} 
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: color,
                            border: '1px solid rgba(0,0,0,0.1)'
                          }} 
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{t.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {t.isPremium ? (isPremiumUser ? 'Premium 👑 (Ativo)' : 'Premium 👑') : 'Gratuito'}
                      </span>
                    </div>

                    {isSelected && (
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'var(--accent-color)',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </span>
                    )}
                  </div>
                )
              })}
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
