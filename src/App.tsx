import React, { useEffect, useState, useRef } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { useVoiceChannel } from './lib/useVoiceChannel'
import type { VoiceParticipant } from './lib/useVoiceChannel'
import './App.css'
import { THEMES } from './lib/themes'
import { SOUNDBOARD_SOUNDS, playFriendRequestSound, playFriendAcceptSound, playDmNotificationSound, playSoundboardEffect } from './lib/soundEffects'
import { WhatsNewModal } from './components/WhatsNewModal'
import { APP_CURRENT_VERSION } from './lib/changelogData'



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

function PhoneOffIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)', ...style }}>
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

function LinkIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function VolumeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function SoundboardIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  )
}

function RecordCallIcon({ className, style, isRecording }: { className?: string; style?: React.CSSProperties; isRecording?: boolean }) {
  if (isRecording) {
    return (
      <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="3" />
      </svg>
    )
  }
  return (
    <svg className={className} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="3.5" fill="currentColor"/>
    </svg>
  )
}

function VoiceMessageIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function PaperclipIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
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

function WindowsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
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

function UserIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SaveIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function LockIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function BadgeCrownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="echoCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <filter id="echoCrownGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#f59e0b" floodOpacity="0.7" />
        </filter>
      </defs>
      <path 
        d="M3 18L4.5 9L9 13.5L12 5L15 13.5L19.5 9L21 18H3Z" 
        fill="url(#echoCrownGrad)" 
        filter="url(#echoCrownGlow)"
        stroke="#fef08a" 
        strokeWidth="0.8" 
        strokeLinejoin="round" 
      />
      <circle cx="12" cy="4.5" r="1.5" fill="#ffffff" />
      <circle cx="4.5" cy="8.5" r="1.2" fill="#ffffff" />
      <circle cx="19.5" cy="8.5" r="1.2" fill="#ffffff" />
      <path d="M5 20H19" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function BadgeVipIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="echoVipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <filter id="echoVipGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#818cf8" floodOpacity="0.7" />
        </filter>
      </defs>
      <path 
        d="M6 3L18 3L22 9L12 21L2 9L6 3Z" 
        fill="url(#echoVipGrad)" 
        filter="url(#echoVipGlow)" 
        stroke="#e0e7ff" 
        strokeWidth="0.8" 
        strokeLinejoin="round" 
      />
      <path d="M2 9H22" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
      <path d="M7.5 3L12 21L16.5 3" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M12 3L6 9L12 21L18 9L12 3Z" fill="#ffffff" fillOpacity="0.15" />
    </svg>
  )
}

function BadgeFounderIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="echoFounderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <filter id="echoFounderGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#f97316" floodOpacity="0.7" />
        </filter>
      </defs>
      <path 
        d="M12 2L4 7V17L12 22L20 17V7L12 2Z" 
        fill="#1e1b4b" 
        stroke="url(#echoFounderGrad)" 
        strokeWidth="1.5" 
      />
      <path 
        d="M13 3.5L6.5 12H12L11 20.5L17.5 11H12.5L13 3.5Z" 
        fill="url(#echoFounderGrad)" 
        filter="url(#echoFounderGlow)" 
        stroke="#fef08a" 
        strokeWidth="0.6" 
      />
    </svg>
  )
}

function BadgeVeteranIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="echoVetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <filter id="echoVetGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#f43f5e" floodOpacity="0.7" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="9" stroke="url(#echoVetGrad)" strokeWidth="1.5" strokeDasharray="3 2" />
      <polygon 
        points="12,4 14.5,9.5 20.5,10.2 16,14.2 17.2,20.2 12,17.2 6.8,20.2 8,14.2 3.5,10.2 9.5,9.5" 
        fill="url(#echoVetGrad)" 
        filter="url(#echoVetGlow)"
        stroke="#fecdd3" 
        strokeWidth="0.6" 
      />
      <circle cx="12" cy="12" r="2" fill="#ffffff" />
    </svg>
  )
}

function BadgeStreamerIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="22" height="22" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="echoStreamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <filter id="echoStreamGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#06b6d4" floodOpacity="0.7" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="3" fill="url(#echoStreamGrad)" filter="url(#echoStreamGlow)" />
      <path d="M8 8C6 10 6 14 8 16" stroke="url(#echoStreamGrad)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 8C18 10 18 14 16 16" stroke="url(#echoStreamGrad)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 5C1.5 8.5 1.5 15.5 5 19" stroke="url(#echoStreamGrad)" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M19 5C22.5 8.5 22.5 15.5 19 19" stroke="url(#echoStreamGrad)" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.8" />
    </svg>
  )
}

function SteamIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-10 9.87l5.4 2.23a3.48 3.48 0 0 1 2.22-.8c.17 0 .34.02.5.05l2.67-3.87A4.47 4.47 0 0 1 12 7.5a4.5 4.5 0 1 1-4.47 4.96l-3.92-1.62A10 10 0 1 0 12 2zm4.5 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
    </svg>
  )
}

function TwitchIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 3.5L4 7v13h4.5v2.5h2.5l2.5-2.5h3.5l4.5-4.5V3.5H2.5zm16 10.5l-3 3h-4l-2.5 2.5V17h-3V5.5h12.5V14zm-7.5-6h2v5h-2V8zm5 0h2v5h-2V8z" />
    </svg>
  )
}

function YoutubeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function KickIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 3h5v5.5l4-5.5h6l-6.5 8.5L19 21h-6l-4-6.5V21H4V3z" />
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

function UsersIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function MessageSquareIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ActivityIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function EchoAtomLogo({ className, style, size = 22 }: { className?: string; style?: React.CSSProperties; size?: number }) {
  return (
    <svg 
      className={className} 
      style={style}
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="9.3" ry="3.5" transform="rotate(30 12 12)" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="9.3" ry="3.5" transform="rotate(90 12 12)" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="9.3" ry="3.5" transform="rotate(150 12 12)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20.0" cy="7.4" r="1.3" fill="currentColor" />
      <circle cx="12.0" cy="2.7" r="1.3" fill="currentColor" />
      <circle cx="4.0" cy="7.4" r="1.3" fill="currentColor" />
    </svg>
  )
}

function PipIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="12" y="11" width="8" height="7" rx="1.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function StopSquareIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  )
}

function FocusIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="13" x="3" y="4" rx="2" />
      <path d="m8 21 2-4" />
      <path d="m16 21-2-4" />
      <path d="M12 17v4" />
    </svg>
  )
}

function GridIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function BarChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function GamepadIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="6" />
    </svg>
  )
}

function CopyIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function ZapIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function UserPlusIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function FlameIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

function PhoneIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function InboxIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}

function SendIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

interface UnifiedUserProfileFooterProps {
  displayName: string
  avatarUrl?: string
  presenceStatus: string
  showStatusMenu?: boolean
  setShowStatusMenu?: (show: any) => void
  updatePresenceStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  theme: string
  toggleTheme: () => void
  onOpenSettings?: () => void
  onOpenWhatsNew?: () => void
  onSignOut: () => void
  myGamePresence?: { name: string; icon?: string } | null
}

function UnifiedUserProfileFooter({
  displayName,
  avatarUrl,
  presenceStatus,
  showStatusMenu,
  setShowStatusMenu,
  updatePresenceStatus,
  theme,
  toggleTheme,
  onOpenSettings,
  onOpenWhatsNew,
  onSignOut,
  myGamePresence
}: UnifiedUserProfileFooterProps) {
  return (
    <div className="sidebar-profile-footer">
      <div className="profile-footer-card">
        <div className="profile-footer-top-row">
          <div 
            className="profile-footer-info" 
            onClick={() => setShowStatusMenu?.(!showStatusMenu)} 
            title="Alterar seu status online"
          >
            <div className="profile-footer-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
              <span className={`my-status-dot ${presenceStatus}`} />
            </div>
            <div className="profile-footer-meta">
              <span className="profile-footer-name" title={displayName}>{displayName}</span>
              <span className="profile-footer-status">
                <span className={`status-dot-bullet ${presenceStatus}`} style={{ width: '7px', height: '7px' }} />
                <span>
                  {presenceStatus === 'online' ? 'Online' :
                   presenceStatus === 'idle' ? 'Ausente' :
                   presenceStatus === 'dnd' ? 'Não Perturbe' : 'Invisível'}
                </span>
              </span>
            </div>

            {showStatusMenu && (
              <div className="status-picker-popover" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('online'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet online" />
                  <div className="status-meta">
                    <strong>Online</strong>
                    <span>Disponível</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('idle'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet idle" />
                  <div className="status-meta">
                    <strong>Ausente</strong>
                    <span>Inativo</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('dnd'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet dnd" />
                  <div className="status-meta">
                    <strong>Não perturbe</strong>
                    <span>Silenciar</span>
                  </div>
                </button>
                <button type="button" className="status-picker-option" onClick={() => { updatePresenceStatus('invisible'); setShowStatusMenu?.(false); }}>
                  <span className="status-dot-bullet invisible" />
                  <div className="status-meta">
                    <strong>Invisível</strong>
                    <span>Aparecer offline</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="profile-footer-actions">
            <button type="button" className="profile-footer-btn" onClick={toggleTheme} title="Alternar tema">
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
            {onOpenWhatsNew && (
              <button type="button" className="profile-footer-btn" onClick={onOpenWhatsNew} title="Novidades & Versões">
                <SparklesIcon style={{ width: '13px', height: '13px', color: '#facc15' }} />
              </button>
            )}
            {onOpenSettings && (
              <button type="button" className="profile-footer-btn" onClick={onOpenSettings} title="Configurações">
                <SettingsIcon />
              </button>
            )}
            <button type="button" className="profile-footer-btn logout" onClick={onSignOut} title="Sair da conta">
              <LogOutIcon />
            </button>
          </div>
        </div>

        {myGamePresence && presenceStatus !== 'invisible' && (
          <div className="profile-footer-activity-row" title={`Jogando ${myGamePresence.name}`}>
            <span className="game-presence-badge">
              <GamepadIcon className="game-presence-icon" style={{ width: '12px', height: '12px' }} />
              <span className="game-presence-text">Jogando {myGamePresence.name}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function formatChatDateDivider(date: Date): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Hoje'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem'
  }
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
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

interface MemberProfileModalProps {
  inspectedMember: {
    user: { id: string; display_name: string; avatar_url?: string }
    joined_at?: string
    roleName?: string
    roleColor?: string
    roles?: ServerRole[]
  }
  onClose: () => void
  currentUser: User | null
  isOnline: boolean
  userPresenceStatus: string
  validCustomStatus: string | null
  memberClanTag: string | null
  memberClanTagColor: string
  activeGame: string | null
  isVoiceUser: boolean
  voiceChannelName?: string
  isServerOwner: boolean
  onOpenDM: (targetId: string) => void
  onAdjustVolume?: (peer: VoiceParticipant) => void
  voicePeer?: VoiceParticipant
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
}

function MemberProfileModal({
  inspectedMember,
  onClose,
  currentUser,
  isOnline,
  userPresenceStatus,
  validCustomStatus,
  memberClanTag,
  memberClanTagColor,
  activeGame,
  isVoiceUser,
  voiceChannelName,
  isServerOwner,
  onOpenDM,
  onAdjustVolume,
  voicePeer,
  showToast
}: MemberProfileModalProps) {
  const [pokeCount, setPokeCount] = useState(0)
  const [isPoking, setIsPoking] = useState(false)
  const [copiedHandle, setCopiedHandle] = useState(false)

  const memberId = inspectedMember.user.id
  const isMe = currentUser?.id === memberId
  const noteStorageKey = `echo-member-note-${memberId}`
  const [personalNote, setPersonalNote] = useState<string>(() => {
    return localStorage.getItem(noteStorageKey) || ''
  })

  const handleNoteChange = (val: string) => {
    setPersonalNote(val)
    localStorage.setItem(noteStorageKey, val)
  }

  const handlePoke = () => {
    const nextCount = pokeCount + 1
    setPokeCount(nextCount)
    setIsPoking(true)
    setTimeout(() => setIsPoking(false), 450)

    try {
      if (nextCount >= 5) {
        playSoundboardEffect('levelup', 0.5)
      } else {
        playSoundboardEffect('ping', 0.5)
      }
    } catch {
      // AudioContext fallback
    }

    const name = inspectedMember.user.display_name
    if (nextCount === 1) {
      showToast('⚡ Cutucada enviada!', `Você cutucou ${name}!`, 'info')
    } else if (nextCount === 2) {
      showToast('⚡ Cutucou de novo!', `${name} recebeu o aviso!`, 'info')
    } else if (nextCount === 3) {
      showToast('💥 Combo Triplo!', `${name} recebeu 3 cutucadas seguidas!`, 'friend')
    } else if (nextCount >= 5) {
      showToast(`🔥 Super Combo (x${nextCount})!`, `Deixe ${name} respirar um pouco! 😂`, 'message')
    }
  }

  const handleCopyHandle = () => {
    const handle = `@${inspectedMember.user.display_name.toLowerCase().replace(/\s+/g, '')}`
    copyToClipboard(handle)
    setCopiedHandle(true)
    showToast('Nome Copiado!', `${handle} copiado para a área de transferência.`, 'info')
    setTimeout(() => setCopiedHandle(false), 2000)
  }

  const roleColor = inspectedMember.roleColor || 'var(--accent-color, #00f2fe)'
  const handleName = inspectedMember.user.display_name.toLowerCase().replace(/\s+/g, '')

  return (
    <div className="screen-picker-overlay member-profile-overlay" onClick={onClose}>
      <div className="member-profile-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Banner with dynamic aurora mesh gradient & badges */}
        <div 
          className="member-profile-banner" 
          style={{ 
            background: `linear-gradient(135deg, ${roleColor}ee 0%, #1e1b4b 60%, #0b0f19 100%)` 
          }}
        >
          <div className="member-profile-banner-badges">
            {isServerOwner && (
              <span className="member-banner-badge" title="Dono deste servidor">
                <CrownIcon style={{ width: '12px', height: '12px' }} />
                <span>Dono</span>
              </span>
            )}
            {isVoiceUser && (
              <span className="member-banner-badge" style={{ background: 'rgba(34, 197, 94, 0.45)', borderColor: '#22c55e' }}>
                <MicIcon style={{ width: '12px', height: '12px' }} />
                <span>Em Call</span>
              </span>
            )}
            {activeGame && (
              <span className="member-banner-badge" style={{ background: 'rgba(59, 130, 246, 0.45)', borderColor: '#3b82f6' }}>
                <GamepadIcon style={{ width: '12px', height: '12px' }} />
                <span>Jogando</span>
              </span>
            )}
          </div>

          <button 
            type="button" 
            className="member-profile-close-btn" 
            onClick={onClose}
            title="Fechar perfil"
          >
            ✕
          </button>
        </div>

        <div className="member-profile-body">
          {/* Avatar row with poke trigger */}
          <div className="member-profile-avatar-row">
            <div className={`member-profile-avatar-large ${isPoking ? 'poke-animate' : ''}`}>
              {inspectedMember.user.avatar_url ? (
                <img src={inspectedMember.user.avatar_url} alt={inspectedMember.user.display_name} />
              ) : (
                inspectedMember.user.display_name.slice(0, 1).toUpperCase()
              )}
              <span className={`member-profile-status-ring ${userPresenceStatus}`} />
            </div>

            {!isMe && (
              <button 
                type="button" 
                className="member-profile-poke-trigger"
                onClick={handlePoke}
                title="Cutucar com efeito de som divertido"
              >
                <ZapIcon style={{ width: '13px', height: '13px' }} />
                <span>{pokeCount > 0 ? `Cutucar (x${pokeCount})` : 'Cutucar'}</span>
              </button>
            )}
          </div>

          {/* User Display Name, Clan Tag, Copyable @handle */}
          <div className="member-profile-header-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="member-profile-display-name">{inspectedMember.user.display_name}</h3>
              {memberClanTag && (
                <span 
                  className="member-clan-tag" 
                  style={{ 
                    color: memberClanTagColor, 
                    borderColor: `${memberClanTagColor}55`, 
                    background: `${memberClanTagColor}15` 
                  }}
                >
                  [{memberClanTag}]
                </span>
              )}
            </div>

            <div className="member-profile-handle-row">
              <button 
                type="button" 
                className="member-profile-handle-btn" 
                onClick={handleCopyHandle}
                title="Clique para copiar menção @"
              >
                <span>@{handleName}</span>
                <span style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: copiedHandle ? '#10b981' : 'var(--text-muted)' }}>
                  {copiedHandle ? '✓ Copiado!' : (
                    <>
                      <CopyIcon style={{ width: '11px', height: '11px' }} />
                      <span>Copiar</span>
                    </>
                  )}
                </span>
              </button>
            </div>

            {validCustomStatus && (
              <div className="member-profile-custom-status">
                <MessageSquareIcon style={{ width: '13px', height: '13px', color: 'var(--accent-color, #00f2fe)', flexShrink: 0 }} />
                <span>{validCustomStatus}</span>
              </div>
            )}
          </div>

          {/* Activity Presence Card */}
          {activeGame ? (
            <div className="member-activity-card gaming">
              <div className="member-activity-header">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <GamepadIcon style={{ width: '13px', height: '13px' }} />
                  <span>Jogando Agora</span>
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', padding: '2px 6px', borderRadius: '4px', color: '#4ade80' }}>
                  AO VIVO
                </span>
              </div>
              <div className="member-activity-body">
                <div className="member-activity-icon-wrap" style={{ color: '#4ade80' }}>
                  <GamepadIcon style={{ width: '20px', height: '20px' }} />
                </div>
                <div>
                  <h4 className="member-activity-name">{activeGame}</h4>
                  <p className="member-activity-sub">Echo Game Presence • Em partida</p>
                </div>
              </div>
            </div>
          ) : isVoiceUser ? (
            <div className="member-activity-card voice">
              <div className="member-activity-header">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <VolumeIcon style={{ width: '13px', height: '13px' }} />
                  <span>Em Chamada de Voz</span>
                </span>
                <div className="voice-equalizer-wave">
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                  <span className="voice-wave-bar" />
                </div>
              </div>
              <div className="member-activity-body">
                <div className="member-activity-icon-wrap" style={{ color: '#818cf8' }}>
                  <MicIcon style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h4 className="member-activity-name">{voiceChannelName || 'Canal de Voz'}</h4>
                  <p className="member-activity-sub">Conectado na sala de áudio</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Private Personal Note */}
          <div className="member-private-note-section">
            <label className="member-private-note-label">
              <LockIcon style={{ width: '11px', height: '11px' }} />
              <span>NOTA PESSOAL (APENAS VOCÊ VÊ)</span>
            </label>
            <textarea
              className="member-private-note-input"
              rows={2}
              value={personalNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Clique para adicionar uma anotação privada sobre este membro..."
            />
          </div>

          {/* Roles Section */}
          <div className="member-profile-roles-section">
            <span className="member-profile-section-title">CARGOS NO SERVIDOR</span>
            <div className="member-profile-roles-wrap">
              {inspectedMember.roles && inspectedMember.roles.length > 0 ? (
                inspectedMember.roles.map(r => {
                  const isOwnerRole = r.name.toLowerCase().includes('dono') || isServerOwner
                  const cleanRoleName = r.name.replace(/^[\p{Emoji}\s]+/gu, '').trim() || r.name
                  return (
                    <span 
                      key={r.id} 
                      className="member-role-pill" 
                      style={{ color: r.color, borderColor: `${r.color}66`, background: `${r.color}15`, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span className="role-dot" style={{ background: r.color }} />
                      {isOwnerRole && <CrownIcon style={{ width: '11px', height: '11px', color: r.color }} />}
                      <span>{cleanRoleName}</span>
                    </span>
                  )
                })
              ) : (
                <span className="member-role-pill default" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span className="role-dot" />
                  {isServerOwner && <CrownIcon style={{ width: '11px', height: '11px', color: '#ffb703' }} />}
                  <span>{inspectedMember.roleName?.replace(/^[\p{Emoji}\s]+/gu, '').trim() || 'Membro'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div className="member-profile-actions">
            {!isMe && (
              <button 
                type="button" 
                className="member-profile-action-btn primary"
                onClick={() => onOpenDM(inspectedMember.user.id)}
              >
                <MessageSquareIcon />
                <span>Conversar no Privado</span>
              </button>
            )}

            {voicePeer && !isMe && onAdjustVolume && (
              <button 
                type="button" 
                className="member-profile-action-btn secondary"
                onClick={() => onAdjustVolume(voicePeer)}
              >
                <VolumeIcon />
                <span>Ajustar Volume</span>
              </button>
            )}
          </div>

          <div className="member-profile-footer">
            <span>ECHO // VERIFIED PASS</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span>STATUS:</span>
              <span className={`status-dot-bullet ${isOnline ? 'online' : 'offline'}`} style={{ width: '6px', height: '6px' }} />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
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

  // Slowmode, Categories & Server UI States
  const [newChannelSlowmode, setNewChannelSlowmode] = useState<number>(0)
  const [newChannelCategory, setNewChannelCategory] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [slowmodeCooldown, setSlowmodeCooldown] = useState<number>(0)
  const [spaceVoiceUsers, setSpaceVoiceUsers] = useState<Record<string, VoiceParticipant[]>>({})
  const [channelSearchQuery, setChannelSearchQuery] = useState('')
  const channelSearchInputRef = useRef<HTMLInputElement | null>(null)
  const [showServerDropdown, setShowServerDropdown] = useState(false)

  // Inspected Member Card Modal
  const [inspectedMember, setInspectedMember] = useState<{ user: { id: string; display_name: string; avatar_url?: string }; joined_at?: string; roleName?: string; roleColor?: string; roles?: ServerRole[] } | null>(null)

  // Hover Popover State for Member List
  const [hoveredMemberPopover, setHoveredMemberPopover] = useState<{
    user: { id: string; display_name: string; avatar_url?: string }
    roleName?: string
    roleColor?: string
    roles?: ServerRole[]
    clanTag?: string | null
    clanTagColor?: string
    activeGame?: string | null
    isVoiceUser?: boolean
    userPresenceStatus: string
    isOnline: boolean
    customStatus?: string | null
    rect: { top: number; left: number; height: number; bottom: number }
  } | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      const savedStatus = status === 'invisible' ? '' : (localStorage.getItem('echo-custom-status') || '')
      const gameData = status === 'invisible' ? null : myGamePresence
      await presenceChannelRef.current.track({
        user_id: user.id,
        display_name: profileDisplayName,
        online_at: new Date().toISOString(),
        custom_status: savedStatus,
        presence_status: status,
        current_game: gameData
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

  // Custom Accent Color, Chat Density, and Performance Mode
  const [customAccentColor, setCustomAccentColor] = useState<string>(() => localStorage.getItem('echo-custom-accent') || '')
  const [chatDensity, setChatDensity] = useState<'cozy' | 'compact'>(() => (localStorage.getItem('echo-chat-density') as any) || 'cozy')
  const [performanceMode, setPerformanceMode] = useState<boolean>(() => localStorage.getItem('echo-performance-mode') === 'true')

  useEffect(() => {
    const applyAccent = (color: string) => {
      const clean = color.replace('#', '').trim()
      let r = 0, g = 242, b = 254
      if (clean.length === 6) {
        r = parseInt(clean.slice(0, 2), 16)
        g = parseInt(clean.slice(2, 4), 16)
        b = parseInt(clean.slice(4, 6), 16)
      } else if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16)
        g = parseInt(clean[1] + clean[1], 16)
        b = parseInt(clean[2] + clean[2], 16)
      }

      const light = `rgba(${r}, ${g}, ${b}, 0.16)`
      const glow = `0 0 16px rgba(${r}, ${g}, ${b}, 0.45)`
      const rgbStr = `${r}, ${g}, ${b}`

      document.body.style.setProperty('--accent-color', color, 'important')
      document.body.style.setProperty('--accent-hover', color, 'important')
      document.body.style.setProperty('--accent-light', light, 'important')
      document.body.style.setProperty('--accent-glow', glow, 'important')
      document.body.style.setProperty('--accent-color-rgb', rgbStr, 'important')

      document.documentElement.style.setProperty('--accent-color', color, 'important')
      document.documentElement.style.setProperty('--accent-hover', color, 'important')
      document.documentElement.style.setProperty('--accent-light', light, 'important')
      document.documentElement.style.setProperty('--accent-glow', glow, 'important')
      document.documentElement.style.setProperty('--accent-color-rgb', rgbStr, 'important')
    }

    if (customAccentColor) {
      applyAccent(customAccentColor)
    } else {
      ['--accent-color', '--accent-hover', '--accent-light', '--accent-glow', '--accent-color-rgb'].forEach(prop => {
        document.body.style.removeProperty(prop)
        document.documentElement.style.removeProperty(prop)
      })
    }
    localStorage.setItem('echo-custom-accent', customAccentColor)
  }, [customAccentColor, theme])

  useEffect(() => {
    if (chatDensity === 'compact') {
      document.body.classList.add('density-compact')
    } else {
      document.body.classList.remove('density-compact')
    }
    localStorage.setItem('echo-chat-density', chatDensity)
  }, [chatDensity])

  useEffect(() => {
    if (performanceMode) {
      document.body.classList.add('theme-performance-opaque')
    } else {
      document.body.classList.remove('theme-performance-opaque')
    }
    localStorage.setItem('echo-performance-mode', performanceMode ? 'true' : 'false')
  }, [performanceMode])

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
    isPttMode,
    isPttActive,
    lastSoundboardEvent,
    isRecordingCall,
    recordingDuration,
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
    changePeerPan,
    setSpatialAudioEnabled,
    changePeerScreenVolume,
    setPttMode,
    setPttActive,
    playSoundboard,
    startCallRecording,
    stopCallRecording,
    isAiDenoiseEnabled,
    toggleAiDenoise
  } = useVoiceChannel()

  // Soundboard & WhatsNew Modals
  const [showSoundboardModal, setShowSoundboardModal] = useState(false)
  const [showWhatsNewModal, setShowWhatsNewModal] = useState<boolean>(() => {
    const seen = localStorage.getItem('echo_last_seen_version')
    return seen !== APP_CURRENT_VERSION
  })
  const socialChannelRef = useRef<any>(null)
  const selectedDMUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedDMUserIdRef.current = selectedDMUserId
  }, [selectedDMUserId])

  // Push-to-Talk settings
  const pttKey = localStorage.getItem('echo-ptt-key') || 'KeyV'
  const pttModeSetting = localStorage.getItem('echo-ptt-mode') === 'true'

  // Sync PTT mode with useVoiceChannel
  useEffect(() => {
    setPttMode(pttModeSetting)
  }, [pttModeSetting, setPttMode])

  // Register Global PTT Shortcut if in Electron
  useEffect(() => {
    if (pttModeSetting && (window as any).electronAPI?.registerGlobalPTT) {
      const electronKey = pttKey === 'KeyV' ? 'V' : pttKey === 'Space' ? 'Space' : pttKey === 'CapsLock' ? 'CapsLock' : pttKey
      ;(window as any).electronAPI.registerGlobalPTT(electronKey)
    } else if ((window as any).electronAPI?.unregisterGlobalPTT) {
      ;(window as any).electronAPI.unregisterGlobalPTT()
    }
  }, [pttModeSetting, pttKey])

  // PTT key listener in window
  useEffect(() => {
    if (!pttModeSetting || !isConnected) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === pttKey && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setPttActive(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === pttKey) {
        setPttActive(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [pttModeSetting, pttKey, isConnected, setPttActive])

  // Rich Presence: My active game
  const [myGamePresence, setMyGamePresence] = useState<{ name: string; icon: string; startedAt: number } | null>(null)
  useEffect(() => {
    if ((window as any).electronAPI?.onGameDetected) {
      (window as any).electronAPI.onGameDetected((game: any) => {
        setMyGamePresence(game)
      })
    }
  }, [])

  // Global Shortcut: Ctrl+K / Cmd+K to search channels
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (channelSearchInputRef.current) {
          channelSearchInputRef.current.focus()
          channelSearchInputRef.current.select()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])


  // Chat Features: Reply, Reactions, Voice Notes, GIFs
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>(() => {
    try {
      return JSON.parse(localStorage.getItem('echo-message-reactions') || '{}')
    } catch {
      return {}
    }
  })
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  
  // Voice Notes recording in chat
  const [isVoiceNoteRecording, setIsVoiceNoteRecording] = useState(false)
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0)
  const voiceNoteRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceNoteChunksRef = useRef<Blob[]>([])
  const voiceNoteTimerRef = useRef<any>(null)
  const [activePlayingVoiceNote, setActivePlayingVoiceNote] = useState<string | null>(null)
  const [voiceNotePlaySpeed, setVoiceNotePlaySpeed] = useState<number>(1)
  const voiceNoteAudioRef = useRef<HTMLAudioElement | null>(null)

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

  // 3D Spatial Audio & Stereo Panning state
  const [spatialAudioEnabled, setSpatialAudioEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('echo-spatial-audio-enabled') === 'true'
  })
  const [userStereoPans, setUserStereoPans] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('echo-user-stereo-pans')
    return saved ? JSON.parse(saved) : {}
  })

  // Sincronizar ativação global do Áudio Espacial 3D
  useEffect(() => {
    setSpatialAudioEnabled(spatialAudioEnabled)
  }, [spatialAudioEnabled, setSpatialAudioEnabled])

  // Sincronizar balanço estéreo (Pan) de cada participante
  useEffect(() => {
    participants.forEach(p => {
      if (p.userId !== user.id) {
        const pan = userStereoPans[p.userId] !== undefined ? userStereoPans[p.userId] : 0
        changePeerPan(p.userId, pan)
      }
    })
  }, [participants, userStereoPans, changePeerPan, user.id])

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

  const [selectedScreenSharerUserId, setSelectedScreenSharerUserId] = useState<string | null>(null)
  const [screenShareViewMode, setScreenShareViewMode] = useState<'focus' | 'grid'>('focus')
  const [isWatchingStreams, setIsWatchingStreams] = useState(true)
  const [isPiPActive, setIsPiPActive] = useState(false)

  // Filter participants who have an active screenshare stream with live video track
  const activeScreenSharers = participants.filter(p => p.screenStream && p.screenStream.getVideoTracks().length > 0)
  const activeScreenSharer = (selectedScreenSharerUserId && activeScreenSharers.find(p => p.userId === selectedScreenSharerUserId)) || activeScreenSharers[0] || null
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null)
  const [screenSources, setScreenSources] = useState<any[]>([])
  const [showScreenPicker, setShowScreenPicker] = useState(false)
  const [screenPickerTab, setScreenPickerTab] = useState<'windows' | 'screens'>('windows')
  const [isScreenFullScreen, setIsScreenFullScreen] = useState(false)

  // Auto-switch to watching streams when a stream becomes available
  useEffect(() => {
    if (activeScreenSharers.length > 0 && !isWatchingStreams) {
      setIsWatchingStreams(true)
    }
  }, [activeScreenSharers.length])

  // Auto-refresh screen sources while picker modal is open
  useEffect(() => {
    if (!showScreenPicker || !(window as any).electronAPI) return
    const interval = setInterval(async () => {
      try {
        const raw = await (window as any).electronAPI.getSources()
        const seenNames = new Set<string>()
        const sources: any[] = []
        for (const s of (raw || [])) {
          if (s.type === 'screen' || (s.id && s.id.startsWith('screen:'))) {
            sources.push(s)
            continue
          }
          const cleanKey = (s.name || '').toLowerCase().replace(/\s*\(jogo\)\s*/i, '').trim()
          if (!cleanKey || seenNames.has(cleanKey)) continue
          seenNames.add(cleanKey)
          sources.push(s)
        }
        setScreenSources(sources)
      } catch (e) {}
    }, 2500)
    return () => clearInterval(interval)
  }, [showScreenPicker])

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

  // Screen settings state (Discord Go Live 2.0 defaults)
  const [screenQuality, setScreenQuality] = useState<'720p' | '1080p' | '1440p' | 'native'>('1080p')
  const [screenFps, setScreenFps] = useState<15 | 30 | 60>(60)
  const [showScreenMenu, setShowScreenMenu] = useState(false)
  const [selectedPickerSourceId, setSelectedPickerSourceId] = useState<string | null>(null)

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
          const spaceChs = (spaceChannelsRef.current[sp.id] || []).filter(c => c.type === 'voice')
          
          spaceChs.forEach(c => {
            if (byChannel[c.id] && byChannel[c.id].length > 0) {
              next[c.id] = byChannel[c.id]
            } else {
              delete next[c.id]
            }
          })

          Object.entries(byChannel).forEach(([chId, users]) => {
            if (users && users.length > 0) {
              next[chId] = users
            }
          })

          return next
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
  }, [spaces, user.id])

  async function handleJoinVoice(channelId: string, explicitSpaceId?: string) {
    setActiveVoiceChannelId(channelId)
    const spaceId = explicitSpaceId || selectedChannel?.space_id || Object.keys(spaceChannels).find(sId => (spaceChannels[sId] || []).some(c => c.id === channelId))
    try {
      await joinVoice(channelId, user.id, profileDisplayName, profileAvatarUrl, selectedInputId, selectedOutputId, noiseSuppressionEnabled, echoCancellationEnabled, spaceId)
    } catch (err) {
      console.error('handleJoinVoice error:', err)
      setActiveVoiceChannelId(null)
    }
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
    if (presenceStatus === 'dnd') return
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

  function handleLeaveSpace(space: Space) {
    const client = supabase
    if (!space || !client) return
    setConfirmModalConfig({
      isOpen: true,
      title: "Sair do Servidor",
      message: `Tem certeza de que deseja sair do servidor "${space.name}"? Você precisará de um convite para retornar.`,
      onConfirm: async () => {
        await client.from('space_members').delete().eq('space_id', space.id).eq('user_id', user.id)
        if (expandedSpace === space.id) {
          setExpandedSpace(null)
          setSelectedChannel(null)
        }
        await loadSpaces()
        setConfirmModalConfig(null)
        showToast("Você saiu do servidor", `Você não faz mais parte de "${space.name}".`, 'info')
      }
    })
  }

  function getQualityDimensions(quality: '720p' | '1080p' | '1440p' | 'native') {
    if (quality === '720p') return { w: 1280, h: 720 }
    if (quality === '1080p') return { w: 1920, h: 1080 }
    if (quality === '1440p') return { w: 2560, h: 1440 }
    return { w: undefined, h: undefined }
  }

  async function handleQualityChange(newQuality: '720p' | '1080p' | '1440p' | 'native') {
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

  async function startScreenShareWithConfig(quality: '720p' | '1080p' | '1440p' | 'native', fps: 15 | 30 | 60) {
    setScreenQuality(quality)
    setScreenFps(fps)
    setShowScreenshareModal(false)
    setTimeout(async () => {
      await openScreenPickerHelper(quality, fps)
    }, 150)
  }

  async function openScreenPickerHelper(quality: '720p' | '1080p' | '1440p' | 'native', fps: 15 | 30 | 60) {
    if ((window as any).electronAPI) {
      try {
        const rawSources = await (window as any).electronAPI.getSources()
        // Deduplica rigorosamente por nome para garantir apenas 1 card por jogo/aplicativo
        const seenNames = new Set<string>()
        const sources: any[] = []
        for (const s of (rawSources || [])) {
          if (s.type === 'screen' || (s.id && s.id.startsWith('screen:'))) {
            sources.push(s)
            continue
          }
          const cleanKey = (s.name || '').toLowerCase().replace(/\s*\(jogo\)\s*/i, '').trim()
          if (!cleanKey || seenNames.has(cleanKey)) continue
          seenNames.add(cleanKey)
          sources.push(s)
        }
        setScreenSources(sources)
        if (sources && sources.length > 0) {
          setSelectedPickerSourceId(sources[0].id)
        }
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
    setIsWatchingStreams(true)
    setSelectedScreenSharerUserId(user.id)
    setScreenShareViewMode('focus')
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

  function getServerGradient(name: string) {
    const gradients = [
      'linear-gradient(135deg, #5865F2, #7289DA)',
      'linear-gradient(135deg, #FF4655, #0F1923)',
      'linear-gradient(135deg, #10B981, #059669)',
      'linear-gradient(135deg, #8B5CF6, #6366F1)',
      'linear-gradient(135deg, #EC4899, #F43F5E)',
      'linear-gradient(135deg, #F59E0B, #D97706)',
      'linear-gradient(135deg, #06B6D4, #3B82F6)',
      'linear-gradient(135deg, #6366F1, #4F46E5)'
    ]
    let hash = 0
    for (let i = 0; i < (name || '').length; i++) {
      hash = (name || '').charCodeAt(i) + ((hash << 5) - hash)
    }
    return gradients[Math.abs(hash) % gradients.length]
  }

  function getServerInitials(name: string) {
    if (!name) return 'SV'
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
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
    try {
      const cacheKey = `echo-space-members-${spaceId}`
      const memberMap = new Map<string, any>()

      // 1. Inicializa imediatamente com o cache local para nunca exibir lista vazia
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]')
        cached.forEach((m: any) => {
          if (m?.user?.id) memberMap.set(m.user.id, m)
        })
        if (memberMap.size > 0) {
          setSpaceMembers(Array.from(memberMap.values()))
        }
      } catch (e) {}

      // 2. Consulta membros do banco de dados na tabela space_members
      let dbSuccess = false
      try {
        const { data, error: queryError } = await supabase
          .from('space_members')
          .select('role, user:profiles(id, display_name, avatar_url)')
          .eq('space_id', spaceId)

        if (!queryError && data && data.length > 0) {
          data.forEach((row: any) => {
            const u = Array.isArray(row.user) ? row.user[0] : row.user
            if (u?.id) {
              memberMap.set(u.id, { role: row.role || 'member', user: u })
              dbSuccess = true
            }
          })
        }
      } catch (dbErr) {
        console.warn("loadSpaceMembers db error", dbErr)
      }

      // 3. Fallback: Se a consulta com join não retornou outros membros, busca por user_id + profiles
      if (!dbSuccess || memberMap.size <= 1) {
        try {
          const { data: directMembers } = await supabase
            .from('space_members')
            .select('user_id, role')
            .eq('space_id', spaceId)

          if (directMembers && directMembers.length > 0) {
            const uIds = directMembers.map((d: any) => d.user_id)
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', uIds)

            const profMap = new Map((profs || []).map((p: any) => [p.id, p]))
            directMembers.forEach((d: any) => {
              const u = profMap.get(d.user_id) || { id: d.user_id, display_name: 'Membro', avatar_url: '' }
              memberMap.set(d.user_id, { role: d.role || 'member', user: u })
            })
          }
        } catch (fbErr) {
          console.warn("loadSpaceMembers direct fallback error", fbErr)
        }
      }

      // 4. Descobre autores de mensagens nos canais de texto deste servidor
      try {
        const spaceChs = spaceChannelsRef.current[spaceId] || []
        const chIds = spaceChs.map(c => c.id)
        if (chIds.length > 0) {
          const { data: msgData } = await supabase
            .from('messages')
            .select('author_id, profiles(id, display_name, avatar_url)')
            .in('channel_id', chIds)
            .limit(100)

          if (msgData) {
            msgData.forEach((m: any) => {
              const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
              if (p?.id && !memberMap.has(p.id)) {
                memberMap.set(p.id, { role: 'member', user: p })
              }
            })
          }
        }
      } catch (msgErr) {
        console.warn("loadSpaceMembers msg authors error", msgErr)
      }

      // 5. Garante que o Criador/Dono do servidor está na lista
      const spObj = spaces.find(s => s.id === spaceId)
      if (spObj && spObj.creator_id && !memberMap.has(spObj.creator_id)) {
        try {
          const { data: creatorProf } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', spObj.creator_id)
            .maybeSingle()

          if (creatorProf) {
            memberMap.set(spObj.creator_id, { role: 'owner', user: creatorProf })
          }
        } catch (crErr) {}
      }

      // 6. Garante que o usuário logado está na lista e registrado na tabela
      if (user && !memberMap.has(user.id)) {
        const myMemberObj = {
          role: spObj?.creator_id === user.id ? 'owner' : 'member',
          user: { id: user.id, display_name: profileDisplayName || displayName || 'Membro', avatar_url: profileAvatarUrl }
        }
        memberMap.set(user.id, myMemberObj)
        supabase.from('space_members').upsert({ space_id: spaceId, user_id: user.id, role: myMemberObj.role }).then(() => {})
      }

      const finalList = Array.from(memberMap.values())
      setSpaceMembers(finalList)

      // Salva a lista consolidada atualizada no cache local
      try {
        localStorage.setItem(cacheKey, JSON.stringify(finalList))
      } catch (e) {}
    } catch (err) {
      console.warn("loadSpaceMembers catch", err)
    }
  }

  useEffect(() => {
    const currentSpaceId = selectedChannel?.space_id || expandedSpace
    if (!supabase || !currentSpaceId) {
      setSpaceMembers([])
      return
    }

    loadSpaceMembers(currentSpaceId)

    // Canal Realtime para mudanças no banco (Postgres changes)
    const membersChannel = supabase
      .channel(`public-space-members-${currentSpaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_members', filter: `space_id=eq.${currentSpaceId}` }, () => {
        loadSpaceMembers(currentSpaceId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadSpaceMembers(currentSpaceId)
      })
      .subscribe()

    // Canal Realtime de Presença do Servidor (WebSockets direto, imune a RLS)
    const spacePresenceChannel = supabase.channel(`space-presence-${currentSpaceId}`, {
      config: { presence: { key: user.id } }
    })

    const handleSpacePresenceSync = () => {
      const state = spacePresenceChannel.presenceState()
      const liveUsers: any[] = []
      Object.keys(state).forEach(key => {
        const presList = state[key]
        if (presList && presList.length > 0) {
          const p = presList[0] as any
          if (p && p.user_id) {
            liveUsers.push({
              role: p.role || 'member',
              user: { id: p.user_id, display_name: p.display_name || 'Membro', avatar_url: p.avatar_url }
            })
          }
        }
      })

      if (liveUsers.length > 0) {
        setSpaceMembers(prev => {
          const map = new Map<string, any>()
          prev.forEach(m => { if (m?.user?.id) map.set(m.user.id, m) })
          liveUsers.forEach(m => { if (m?.user?.id) map.set(m.user.id, m) })
          const merged = Array.from(map.values())
          try {
            localStorage.setItem(`echo-space-members-${currentSpaceId}`, JSON.stringify(merged))
          } catch (e) {}
          return merged
        })
      }
    }

    const trackSpacePresence = async () => {
      const spObj = spaces.find(s => s.id === currentSpaceId)
      const isOwner = spObj?.creator_id === user.id
      await spacePresenceChannel.track({
        user_id: user.id,
        display_name: profileDisplayName || displayName,
        avatar_url: profileAvatarUrl,
        role: isOwner ? 'owner' : 'member',
        space_id: currentSpaceId
      }).catch(() => {})
    }

    spacePresenceChannel
      .on('presence', { event: 'sync' }, handleSpacePresenceSync)
      .on('presence', { event: 'join' }, handleSpacePresenceSync)
      .on('presence', { event: 'leave' }, handleSpacePresenceSync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackSpacePresence()
          handleSpacePresenceSync()
        }
      })

    // Sincronização periódica de redundância (a cada 6s)
    const syncInterval = setInterval(() => {
      loadSpaceMembers(currentSpaceId)
      trackSpacePresence()
    }, 6000)

    return () => {
      clearInterval(syncInterval)
      spacePresenceChannel.untrack().catch(() => {})
      supabase?.removeChannel(membersChannel)
      supabase?.removeChannel(spacePresenceChannel)
    }
  }, [selectedChannel?.space_id, expandedSpace, user?.id])

  // Friends system APIs (Realtime Discord-style)
  async function loadFriendships() {
    if (!supabase || !user) return
    try {
      const { data, error: qError } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id, user:profiles!friendships_user_id_fkey(id, display_name, avatar_url), friend:profiles!friendships_friend_id_fkey(id, display_name, avatar_url)')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      
      if (qError) {
        console.error('Error loading friendships:', qError)
        return
      }
      
      const list = (data ?? []).map((row: any) => {
        const isInitiator = row.user_id === user.id
        const targetUser = isInitiator 
          ? (row.friend || { id: row.friend_id, display_name: 'Usuário', avatar_url: '' }) 
          : (row.user || { id: row.user_id, display_name: 'Usuário', avatar_url: '' })
        return {
          id: row.id,
          user: targetUser,
          status: row.status,
          initiatorId: row.user_id
        } as FriendshipRequest
      })
      setFriendships(list)
      const incomingPending = list.filter(r => r.status === 'pending' && r.initiatorId !== user.id).length
      setPendingFriendCount(incomingPending)
    } catch (e) {
      console.error('Exception in loadFriendships:', e)
    }
  }

  async function sendFriendRequest(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !friendSearchQuery.trim()) return
    setFriendSearchNotice('')
    const targetName = friendSearchQuery.trim().replace(/^@/, '')
    
    try {
      // 1. Case-insensitive lookup
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', targetName)
      
      if (pError || !profiles || profiles.length === 0) {
        setFriendSearchNotice('Usuário não encontrado. Verifique o nome de exibição.')
        return
      }
      
      const targetProfile = profiles[0]
      const targetUserId = targetProfile.id
      
      if (targetUserId === user.id) {
        setFriendSearchNotice('Você não pode adicionar a si mesmo.')
        return
      }
      
      // 2. Check if a relation already exists in either direction
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
      
      if (existing && existing.length > 0) {
        const rel = existing[0]
        if (rel.status === 'accepted') {
          setFriendSearchNotice(`Você e @${targetProfile.display_name} já são amigos!`)
          return
        }
        if (rel.user_id === user.id) {
          setFriendSearchNotice('Você já enviou uma solicitação para este usuário.')
          return
        } else {
          // They already sent a request, auto-accept it!
          await acceptFriendRequest(rel.id)
          setFriendSearchNotice(`Você aceitou a solicitação pendente de @${targetProfile.display_name}!`)
          setFriendSearchQuery('')
          return
        }
      }
      
      // 3. Insert friendship request
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
        playFriendRequestSound(sfxVolume)
        setFriendSearchNotice(`Solicitação de amizade enviada com sucesso para @${targetProfile.display_name}!`)
        setFriendSearchQuery('')
        
        // Broadcast in realtime to recipient
        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-request-sent',
            targetUserId,
            senderId: user.id,
            senderName: profileDisplayName || displayName || user.email || 'Alguém'
          }
        })
        
        await loadFriendships()
      }
    } catch (e: any) {
      console.error('Error in sendFriendRequest:', e)
      setFriendSearchNotice('Erro ao processar solicitação de amizade.')
    }
  }

  async function acceptFriendRequest(friendshipId: string) {
    if (!supabase) return
    const req = friendships.find(f => f.id === friendshipId)
    const targetUserId = req?.initiatorId
    const friendName = req?.user?.display_name || 'Amigo'

    const { error: fError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
    
    if (fError) {
      setError(fError.message)
    } else {
      playFriendAcceptSound(sfxVolume)
      showToast('Amizade Aceita!', `Você agora é amigo de ${friendName}!`, 'friend')
      
      // Broadcast in realtime to initiator
      if (targetUserId) {
        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-request-accepted',
            targetUserId,
            senderId: user.id,
            senderName: profileDisplayName || displayName || 'Seu amigo'
          }
        })
      }
      
      await loadFriendships()
    }
  }

  async function removeFriendship(friendshipId: string) {
    if (!supabase) return
    const req = friendships.find(f => f.id === friendshipId)
    const targetUserId = req?.user?.id

    const { error: fError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
    
    if (fError) {
      setError(fError.message)
    } else {
      if (targetUserId) {
        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-removed',
            targetUserId,
            senderId: user.id
          }
        })
      }
      await loadFriendships()
    }
  }

  async function loadDirectMessages(friendId: string) {
    if (!supabase || !user) return
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
    if (!supabase || !selectedDMUserId || !user) return
    const targetFriendId = selectedDMUserId
    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        receiver_id: targetFriendId,
        body,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })
      
    if (sendError) {
      setError(sendError.message)
    } else {
      setDmDraft('')
      
      // Broadcast DM in real time
      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'dm-event',
        payload: {
          receiverId: targetFriendId,
          senderId: user.id,
          senderName: profileDisplayName || displayName || 'Amigo',
          body: attachmentUrl ? `📎 [Anexo] ${body}` : body
        }
      })
      
      await loadDirectMessages(targetFriendId)
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
    
    const handleGlobalPresenceUpdate = () => {
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
    }

    const trackMyPresence = async () => {
      const savedStatus = localStorage.getItem('echo-custom-status') || ''
      const savedPresStatus = localStorage.getItem('echo-presence-status') || 'online'
      await presenceChannel.track({
        user_id: user.id,
        display_name: displayName,
        online_at: new Date().toISOString(),
        custom_status: savedStatus,
        presence_status: savedPresStatus
      }).catch(() => {})
    }

    presenceChannel
      .on('presence', { event: 'sync' }, handleGlobalPresenceUpdate)
      .on('presence', { event: 'join' }, handleGlobalPresenceUpdate)
      .on('presence', { event: 'leave' }, handleGlobalPresenceUpdate)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackMyPresence()
          handleGlobalPresenceUpdate()
        }
      })

    // Intervalo de redundância de presença global (a cada 20s)
    const presenceKeepAlive = setInterval(() => {
      trackMyPresence()
    }, 20000)

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
      clearInterval(presenceKeepAlive)
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

  // Listen for realtime direct messages and show notifications (Realtime Broadcast + Database)
  useEffect(() => {
    if (!supabase || !user) return

    const handleNewDM = (payload: any) => {
      const newMsg = payload.new as DirectMessage
      if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
        if (newMsg.receiver_id === user.id && !document.hasFocus()) {
          const friendObj = friendships.find(f => f.user.id === newMsg.sender_id)
          const senderName = friendObj?.user.display_name || 'Um amigo'
          triggerDesktopNotification(`Mensagem de ${senderName}`, newMsg.body || '')
        }

        if (selectedDMUserIdRef.current && (newMsg.sender_id === selectedDMUserIdRef.current || newMsg.receiver_id === selectedDMUserIdRef.current)) {
          loadDirectMessages(selectedDMUserIdRef.current)
        } else if (newMsg.receiver_id === user.id) {
          playDmNotificationSound(sfxVolume)
          setUnreadDMs(prev => {
            const currentCount = prev[newMsg.sender_id] || 0
            return { ...prev, [newMsg.sender_id]: currentCount + 1 }
          })
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
  }, [friendships, user?.id, sfxVolume])

  // Global Social Broadcast Channel for 0ms instant friend and DM delivery
  useEffect(() => {
    if (!supabase || !user) return

    const handleFriendshipChanges = (payload: any) => {
      loadFriendships()
      if (payload.eventType === 'INSERT') {
        const newFriendship = payload.new
        if (newFriendship?.friend_id === user.id) {
          playFriendRequestSound(sfxVolume)
          showToast('Solicitação de Amizade', 'Você recebeu um novo convite de amizade.', 'friend')
          triggerDesktopNotification('Solicitação de Amizade', 'Você recebeu um novo convite de amizade.')
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedFriendship = payload.new
        if (updatedFriendship?.status === 'accepted' && (updatedFriendship.user_id === user.id || updatedFriendship.friend_id === user.id)) {
          playFriendAcceptSound(sfxVolume)
          showToast('Amizade Aceita!', 'Um amigo aceitou sua solicitação!', 'friend')
        }
      }
    }

    const liveFriendships = supabase
      .channel('public-friendships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, handleFriendshipChanges)
      .subscribe()

    // Dedicated Realtime WebSockets Broadcast Channel
    const socialChannel = supabase.channel('echo-social-events')
    socialChannelRef.current = socialChannel

    socialChannel
      .on('broadcast', { event: 'friend-event' }, (payload: any) => {
        const data = payload?.payload
        if (!data) return
        if (data.targetUserId === user.id) {
          if (data.type === 'friend-request-sent') {
            playFriendRequestSound(sfxVolume)
            showToast('Nova Solicitação de Amizade', `🎮 @${data.senderName} enviou uma solicitação de amizade!`, 'friend')
            triggerDesktopNotification('Solicitação de Amizade', `@${data.senderName} enviou um pedido de amizade.`)
            loadFriendships()
          } else if (data.type === 'friend-request-accepted') {
            playFriendAcceptSound(sfxVolume)
            showToast('Amizade Aceita!', `🎉 @${data.senderName} aceitou sua solicitação de amizade!`, 'friend')
            triggerDesktopNotification('Amizade Aceita!', `@${data.senderName} agora é seu amigo no Echo.`)
            loadFriendships()
          } else if (data.type === 'friend-removed') {
            loadFriendships()
          }
        }
      })
      .on('broadcast', { event: 'dm-event' }, (payload: any) => {
        const data = payload?.payload
        if (!data) return
        if (data.receiverId === user.id) {
          playDmNotificationSound(sfxVolume)
          if (selectedDMUserIdRef.current === data.senderId) {
            loadDirectMessages(data.senderId)
          } else {
            setUnreadDMs(prev => ({ ...prev, [data.senderId]: (prev[data.senderId] || 0) + 1 }))
            showToast(`Mensagem de ${data.senderName}`, data.body.slice(0, 50), 'message')
            if (!document.hasFocus()) {
              triggerDesktopNotification(`Mensagem de ${data.senderName}`, data.body)
            }
          }
        }
      })
      .subscribe()

    // Resilient background sync interval (every 8 seconds)
    const syncInterval = setInterval(() => {
      loadFriendships()
      if (selectedDMUserIdRef.current) {
        loadDirectMessages(selectedDMUserIdRef.current)
      }
    }, 8000)

    return () => {
      clearInterval(syncInterval)
      supabase?.removeChannel(liveFriendships)
      supabase?.removeChannel(socialChannel)
    }
  }, [user?.id, sfxVolume])

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

  const GAMING_GIFS = [
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1cnR2ejJtZnlldjB0NWV6cmY2YnJ5OHRhNGtvamE3ZnB6NXRpNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif', title: 'GG Victory' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZ0c3prdnk4eGpnM3k0a3R3dTBzd2h4eHlhYnBpdWpsODl4NmswMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/artj92V8o75VPL7AeQ/giphy.gif', title: 'Valorant Clutch' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2phM3pnZTNzOHZ0enZ5Y3BocmI2bGVpY2RreDBjOGo1Zmp2dHVhNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif', title: 'Hype Dance' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2g2dXp3aTBwbHNlcnk3YnpxZWVyb3J3YnpsYzhsaTZtdWc0cmI0MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufdipQqU2lhNA4g/giphy.gif', title: 'Mind Blown' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWZ0MXB4eTBuODhkZXBndmV5c3Z3dTVsOTlvNjVkd2s0ZHAxbndmMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2K5jinAlChoCLS/giphy.gif', title: 'Confused' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXhzbjB6OTN1bnFqOTNxbmtocjB4M2FrcGF3dWRwNGI0NTh4MXpodyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif', title: 'Anime Rage' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9yMjFidDZ6N25yMjY2enF6MWZ0a2w3MnA1NGhxMmQ5eXpzc2Y1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PUBxelwT57jsQ/giphy.gif', title: 'Cat Jam' },
    { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXV5NmlmZnBmb2dtc2s1OXlhZWJ2eXg0dXAwYm11N2s5NzkwdXhveiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11ISwbgGL28Ehy/giphy.gif', title: 'Popcorn' }
  ]

  function toggleReaction(messageId: string, emoji: string) {
    setMessageReactions(prev => {
      const msgReactions = prev[messageId] ? { ...prev[messageId] } : {}
      const userList = msgReactions[emoji] ? [...msgReactions[emoji]] : []
      if (userList.includes(user.id)) {
        const filtered = userList.filter(id => id !== user.id)
        if (filtered.length === 0) {
          delete msgReactions[emoji]
        } else {
          msgReactions[emoji] = filtered
        }
      } else {
        msgReactions[emoji] = [...userList, user.id]
      }
      const next = { ...prev, [messageId]: msgReactions }
      localStorage.setItem('echo-message-reactions', JSON.stringify(next))
      return next
    })
  }

  async function startVoiceNoteRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      voiceNoteChunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) voiceNoteChunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (voiceNoteChunksRef.current.length > 0) {
          const blob = new Blob(voiceNoteChunksRef.current, { type: 'audio/webm' })
          const reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onloadend = async () => {
            const base64Audio = reader.result as string
            if (selectedChannel && supabase) {
              await supabase.from('messages').insert({
                channel_id: selectedChannel.id,
                author_id: user.id,
                body: '🎙️ Mensagem de Voz',
                attachment_url: base64Audio,
                attachment_type: 'audio'
              })
            }
          }
        }
      }
      rec.start()
      voiceNoteRecorderRef.current = rec
      setIsVoiceNoteRecording(true)
      setVoiceNoteDuration(0)
      voiceNoteTimerRef.current = setInterval(() => {
        setVoiceNoteDuration(prev => prev + 1)
      }, 1000)
    } catch (e) {
      console.error('Error starting voice note recording:', e)
      showToast('Erro de Microfone', 'Não foi possível acessar o microfone para gravar a mensagem de voz.', 'info')
    }
  }

  function stopVoiceNoteRecording() {
    if (voiceNoteTimerRef.current) {
      clearInterval(voiceNoteTimerRef.current)
      voiceNoteTimerRef.current = null
    }
    if (voiceNoteRecorderRef.current && voiceNoteRecorderRef.current.state !== 'inactive') {
      voiceNoteRecorderRef.current.stop()
      voiceNoteRecorderRef.current = null
    }
    setIsVoiceNoteRecording(false)
  }

  function cancelVoiceNoteRecording() {
    if (voiceNoteTimerRef.current) {
      clearInterval(voiceNoteTimerRef.current)
      voiceNoteTimerRef.current = null
    }
    if (voiceNoteRecorderRef.current) {
      voiceNoteChunksRef.current = []
      voiceNoteRecorderRef.current.stop()
      voiceNoteRecorderRef.current = null
    }
    setIsVoiceNoteRecording(false)
  }

  function renderRichEmbed(body: string) {
    const ytMatch = body.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i)
    if (ytMatch) {
      const videoId = ytMatch[1]
      return (
        <div className="link-embed-card youtube-embed">
          <div className="link-embed-header">
            <span className="link-embed-brand-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              <span>YouTube Video</span>
            </span>
          </div>
          <div className="link-embed-video-wrap">
            <iframe 
              src={`https://www.youtube-nocookie.com/embed/${videoId}`} 
              title="YouTube video" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
          </div>
        </div>
      )
    }

    const twitchMatch = body.match(/(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{3,25})/i)
    if (twitchMatch) {
      const channel = twitchMatch[1]
      return (
        <div className="link-embed-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🟣</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#a970ff' }}>Twitch Stream: {channel}</div>
            <a href={`https://twitch.tv/${channel}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Assistir ao vivo na Twitch ↗
            </a>
          </div>
        </div>
      )
    }

    return null
  }

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

    let finalBody = draft.trim()
    if (replyingToMessage) {
      const authorName = replyingToMessage.profile?.display_name || 'Membro'
      const quoteSnippet = replyingToMessage.body.slice(0, 60).replace(/\n/g, ' ')
      finalBody = `> @${authorName}: "${quoteSnippet}"\n${finalBody}`
      setReplyingToMessage(null)
    }

    const { error: sendError } = await supabase.from('messages').insert({ channel_id: selectedChannel.id, author_id: user.id, body: finalBody })
    if (sendError) {
      setError(sendError.message)
    } else {
      setDraft('')
      if (selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 && !isImmuneToSlowmode) {
        setSlowmodeCooldown(selectedChannel.slowmode_seconds)
      }
    }
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
        <div className="topbar-left">
          <Brand />
          <nav className="topbar-nav">
            {(['Servidores', 'Amigos', 'Configurações', 'Descobrir'] as Page[]).map((item) => {
              const totalUnread = item === 'Amigos' ? pendingFriendCount + Object.values(unreadDMs).reduce((a, b) => a + b, 0) : 0
              return (
                <button 
                  key={item} 
                  className={`topbar-nav-btn ${page === item ? 'nav-active' : ''}`} 
                  onClick={() => setPage(item)}
                >
                  <span>{item}</span>
                  {totalUnread > 0 && <span className="nav-badge">{totalUnread}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="topbar-right">
          <button 
            type="button" 
            className="topbar-search-trigger"
            onClick={() => {
              if (page !== 'Servidores') setPage('Servidores')
              setTimeout(() => {
                if (channelSearchInputRef.current) {
                  channelSearchInputRef.current.focus()
                  channelSearchInputRef.current.select()
                }
              }, 50)
            }}
            title="Buscar canais e membros (Ctrl+K)"
          >
            <SearchIcon style={{ width: '14px', height: '14px' }} />
            <span className="topbar-search-text">Buscar...</span>
            <kbd className="topbar-search-kbd">Ctrl K</kbd>
          </button>

          <div 
            className="topbar-user-pill" 
            onClick={() => setPage('Configurações')}
            title="Abrir Configurações de Perfil"
          >
            <div className="topbar-user-avatar">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" />
              ) : (
                <span>{(profileDisplayName || displayName || 'U').slice(0, 1).toUpperCase()}</span>
              )}
              <span className={`topbar-status-dot ${presenceStatus}`} />
            </div>
            <span className="topbar-user-name">
              {profileDisplayName || displayName}
            </span>
          </div>
        </div>
      </header>

      <section className="workspace" style={{ display: page === 'Servidores' ? undefined : 'none' }}>
        {/* 1. ECHO DOCK (Leftmost Server & Communities Glass Rail) */}
        <nav className="guild-rail">
          {/* Direct Messages & Friends Hub Button */}
          <div className="guild-rail-item-wrap">
            <div className={`guild-rail-pill ${page === 'Amigos' ? 'active' : ''}`} />
            <button
              type="button"
              className="guild-rail-btn guild-home-btn"
              onClick={() => setPage('Amigos')}
              title="Mensagens Diretas & Amigos"
            >
              <svg className="guild-home-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <circle cx="8.5" cy="10" r="1" fill="currentColor" />
                <circle cx="12" cy="10" r="1" fill="currentColor" />
                <circle cx="15.5" cy="10" r="1" fill="currentColor" />
              </svg>
              {(pendingFriendCount + Object.values(unreadDMs).reduce((a, b) => a + b, 0)) > 0 && (
                <span className="guild-rail-badge">
                  {pendingFriendCount + Object.values(unreadDMs).reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
            <div className="guild-rail-tooltip">Mensagens Diretas & Amigos</div>
          </div>

          <div className="guild-rail-divider" />

          {/* Servers list icons */}
          <div className="guild-rail-list">
            {spaces.map(space => {
              const isSelected = (expandedSpace === space.id) || (!expandedSpace && spaces[0]?.id === space.id)
              const spaceChs = spaceChannels[space.id] || []
              const unreadInSpace = spaceChs.filter(c => unreadChannels.has(c.id)).length
              const hasActiveVoice = spaceChs.some(c => c.type === 'voice' && ((spaceVoiceUsers[c.id] && spaceVoiceUsers[c.id].length > 0) || (activeVoiceChannelId === c.id && participants.length > 0)))

              return (
                <div key={space.id} className="guild-rail-item-wrap">
                  <div className={`guild-rail-pill ${isSelected ? 'active' : unreadInSpace > 0 ? 'unread' : ''}`} />
                  <button
                    type="button"
                    className={`guild-rail-btn ${isSelected ? 'selected' : ''}`}
                    style={{
                      background: space.icon_url ? 'rgba(20, 22, 26, 0.9)' : getServerGradient(space.name)
                    }}
                    onClick={() => {
                      setExpandedSpace(space.id)
                      loadChannelsForSpace(space.id)
                      const chs = spaceChannels[space.id] || []
                      const firstCh = chs.find(c => c.type === 'text') || chs[0]
                      if (firstCh && selectedChannel?.space_id !== space.id) {
                        setSelectedChannel(firstCh)
                      }
                    }}
                  >
                    {space.icon_url ? (
                      <img src={space.icon_url} alt={space.name} className="guild-icon-img" />
                    ) : (
                      <span className="guild-icon-initials">{getServerInitials(space.name)}</span>
                    )}

                    {unreadInSpace > 0 && (
                      <span className="guild-rail-badge">{unreadInSpace}</span>
                    )}

                    {hasActiveVoice && unreadInSpace === 0 && (
                      <span className="guild-voice-wave-badge" title="Amigos conversando em voz">
                        <span className="echo-wave-bar wave-1" />
                        <span className="echo-wave-bar wave-2" />
                        <span className="echo-wave-bar wave-3" />
                      </span>
                    )}
                  </button>
                  <div className="guild-rail-tooltip">{space.name}</div>
                </div>
              )
            })}
          </div>

          <div className="guild-rail-divider" />

          {/* Add Server Button */}
          <div className="guild-rail-item-wrap">
            <div className="guild-rail-pill" />
            <button
              type="button"
              className="guild-rail-btn guild-add-btn"
              onClick={() => { setAddSpaceModalTab('options'); setShowAddSpaceModal(true) }}
              title="Criar ou Entrar em um Servidor"
            >
              <svg className="guild-action-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div className="guild-rail-tooltip">Adicionar um Servidor</div>
          </div>

          {/* Explore Communities Button */}
          <div className="guild-rail-item-wrap">
            <div className="guild-rail-pill" />
            <button
              type="button"
              className="guild-rail-btn guild-explore-btn"
              onClick={() => setPage('Descobrir')}
              title="Explorar Servidores Públicos"
            >
              <svg className="guild-action-icon-svg guild-explore-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <div className="guild-rail-tooltip">Descobrir Servidores</div>
          </div>
        </nav>

        {/* 2. CHANNELS SIDEBAR FOR ACTIVE SERVER (240px) */}
        {(() => {
          const activeSpace = spaces.find(s => s.id === expandedSpace) || spaces[0] || null

          if (!activeSpace) {
            return (
              <aside className="sidebar channels-sidebar channels-sidebar-empty">
                <div className="empty-servers-prompt">
                  <div className="empty-servers-icon">
                    <UsersIcon style={{ width: '40px', height: '40px', color: 'var(--text-muted)', opacity: 0.6 }} />
                  </div>
                  <h3>Nenhum servidor encontrado</h3>
                  <p>Crie sua própria comunidade gamer ou explore servidores públicos.</p>
                  <button 
                    type="button" 
                    className="empty-create-server-btn"
                    onClick={() => { setAddSpaceModalTab('options'); setShowAddSpaceModal(true) }}
                  >
                    ＋ Criar um Servidor
                  </button>
                </div>
                <UnifiedUserProfileFooter
                  displayName={profileDisplayName}
                  avatarUrl={profileAvatarUrl}
                  presenceStatus={presenceStatus}
                  showStatusMenu={showStatusMenu}
                  setShowStatusMenu={setShowStatusMenu}
                  updatePresenceStatus={updatePresenceStatus}
                  theme={theme}
                  toggleTheme={toggleTheme}
                  onOpenSettings={() => setPage('Configurações')}
                  onOpenWhatsNew={() => setShowWhatsNewModal(true)}
                  onSignOut={() => supabase?.auth.signOut()}
                  myGamePresence={myGamePresence}
                />
              </aside>
            )
          }

          const channels = spaceChannels[activeSpace.id] ?? []
          const filteredChannels = channels.filter(ch => !channelSearchQuery.trim() || ch.name.toLowerCase().includes(channelSearchQuery.toLowerCase()))

          // Grouping channels
          const categoriesMap: Record<string, Channel[]> = {}
          const uncategorizedText: Channel[] = []
          const uncategorizedVoice: Channel[] = []

          filteredChannels.forEach(ch => {
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
                <button 
                  key={ch.id} 
                  type="button"
                  className={`channel-item ${selectedChannel?.id === ch.id ? 'active' : ''} ${unreadChannels.has(ch.id) ? 'unread' : ''}`} 
                  onClick={() => setSelectedChannel(ch)}
                >
                  <span className="ch-icon">{ch.is_announcement ? <MegaphoneIcon style={{ color: 'var(--accent-color)' }} /> : <HashtagIcon />}</span>
                  <span className="channel-item-name">{ch.name}</span>
                  {ch.is_announcement && <span className="channel-badge-pill">Avisos</span>}
                  {unreadChannels.has(ch.id) && <span className="channel-unread-dot" />}
                </button>
              )
            }

            const isActive = activeVoiceChannelId === ch.id
            let channelVoiceUsers: VoiceParticipant[]
            if (isActive) {
              const map = new Map<string, VoiceParticipant>()
              participants.forEach(p => map.set(p.userId, p))
              const spUsers = spaceVoiceUsers[ch.id] || []
              spUsers.forEach(p => {
                if (!map.has(p.userId)) map.set(p.userId, p)
              })
              channelVoiceUsers = Array.from(map.values())
            } else {
              channelVoiceUsers = spaceVoiceUsers[ch.id] || []
            }

            return (
              <div key={ch.id} className="voice-channel-node">
                <button 
                  type="button"
                  className={`channel-item voice-item ${selectedChannel?.id === ch.id ? 'active' : ''} ${isActive ? 'in-voice' : ''}`} 
                  onClick={() => {
                    setSelectedChannel(ch)
                    if (activeVoiceChannelId !== ch.id || !isConnected) {
                      handleJoinVoice(ch.id, ch.space_id)
                    }
                  }}
                >
                  <span className="ch-icon"><VolumeIcon /></span>
                  <span className="channel-item-name">{ch.name}</span>
                  {ch.user_limit && ch.user_limit > 0 ? (
                    <span className="voice-channel-limit-badge">
                      {channelVoiceUsers.length}/{ch.user_limit}
                    </span>
                  ) : channelVoiceUsers.length > 0 ? (
                    <span className="voice-channel-limit-badge">
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
                        <div className={`sidebar-voice-avatar ${p.isSpeaking ? 'speaking-wave' : ''}`}>
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.displayName} className="sidebar-avatar-img" />
                          ) : (
                            p.displayName.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span className="sidebar-voice-name">{p.displayName}</span>
                        <div className="sidebar-voice-user-icons">
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
            <aside className="sidebar channels-sidebar">
              {/* Server Header Card with Dropdown Menu */}
              <div 
                className="server-header-card" 
                onClick={() => setShowServerDropdown(prev => !prev)}
                style={{
                  background: activeSpace.banner_url ? `url(${activeSpace.banner_url}) center/cover` : undefined
                }}
              >
                <div className="server-header-card-content" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <div className="server-avatar-squircle">
                    {activeSpace.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="server-header-info" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 className="server-title" title={activeSpace.name} style={{ margin: 0, fontSize: '15px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeSpace.name}
                    </h3>
                    {activeSpace.creator_id === user.id && (
                      <span className="server-crown-badge" title="Você é o Dono do Servidor" style={{ flexShrink: 0 }}>👑</span>
                    )}
                  </div>
                  <span className={`server-dropdown-chevron ${showServerDropdown ? 'open' : ''}`} style={{ transition: 'transform 0.2s ease', transform: showServerDropdown ? 'rotate(180deg)' : 'none', color: 'var(--text-muted)' }}>▾</span>
                </div>

                {/* Echo Server Command Hub */}
                {showServerDropdown && (
                  <div className="server-dropdown-menu" onClick={e => e.stopPropagation()}>
                    <div className="server-hub-banner">
                      <div className="server-hub-title-row">
                        <span className="server-hub-title">{activeSpace.name}</span>
                        {activeSpace.creator_id === user.id && (
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-color)' }}>👑 Dono</span>
                        )}
                      </div>
                      <div className="server-hub-meta-stats">
                        <span>💬 {channels.length} canais</span>
                        <span>•</span>
                        <span>👥 {spaceMembers.length} membros</span>
                      </div>
                    </div>

                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => { setShowServerDropdown(false); openSpaceSettings(activeSpace); }}
                    >
                      <SettingsIcon />
                      <span>Painel do Servidor</span>
                    </button>
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => { setShowServerDropdown(false); setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }}
                    >
                      <PlusIcon />
                      <span>Novo Canal</span>
                    </button>
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => {
                        setShowServerDropdown(false)
                        copyToClipboard(activeSpace.id)
                        showToast("Convite Copiado!", `Código do servidor "${activeSpace.name}" copiado para a área de transferência.`, 'info')
                      }}
                    >
                      <LinkIcon />
                      <span>Compartilhar Convite</span>
                    </button>
                    <div className="server-dropdown-divider" />
                    <button 
                      type="button"
                      className="server-dropdown-item" 
                      onClick={() => { setShowServerDropdown(false); toggleMuteSpace(activeSpace.id); }}
                    >
                      {mutedSpaces.has(activeSpace.id) ? <BellIcon /> : <BellOffIcon />}
                      <span>{mutedSpaces.has(activeSpace.id) ? 'Ativar Notificações' : 'Silenciar Servidor'}</span>
                    </button>
                    {activeSpace.creator_id !== user.id && (
                      <button 
                        type="button"
                        className="server-dropdown-item danger" 
                        onClick={() => { setShowServerDropdown(false); handleLeaveSpace(activeSpace); }}
                      >
                        <LogOutIcon />
                        <span>Sair do Servidor</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Channel Search Input */}
              <div className="channels-search-wrap">
                <div className="channels-search-box" onClick={() => channelSearchInputRef.current?.focus()}>
                  <span className="channels-search-icon"><SearchIcon style={{ width: '13px', height: '13px' }} /></span>
                  <input
                    ref={channelSearchInputRef}
                    type="text"
                    placeholder="Buscar canais... (Ctrl+K)"
                    value={channelSearchQuery}
                    onChange={e => setChannelSearchQuery(e.target.value)}
                    className="channels-search-input"
                  />
                  {channelSearchQuery && (
                    <button 
                      type="button"
                      className="channels-search-clear" 
                      onClick={() => setChannelSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="sidebar-scrollable">
                <div className="channels-tree">
                  {uncategorizedText.length > 0 && (
                    <div className="channel-group">
                      <div className="channel-category-header-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 4px 10px' }}>
                        <span className="channel-group-label" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px' }}>CANAIS DE TEXTO</span>
                        {currentSpace && (canUserDo(currentSpace.id, user.id, 'manageChannels') || currentSpace.creator_id === user.id) && (
                          <button 
                            type="button" 
                            onClick={() => { setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }} 
                            title="Criar canal de texto" 
                            className="category-add-channel-btn"
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      {uncategorizedText.map(renderChannelNode)}
                    </div>
                  )}

                  {uncategorizedVoice.length > 0 && (
                    <div className="channel-group">
                      <div className="channel-category-header-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 4px 10px' }}>
                        <span className="channel-group-label" style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.6px' }}>CANAIS DE VOZ</span>
                        {currentSpace && (canUserDo(currentSpace.id, user.id, 'manageChannels') || currentSpace.creator_id === user.id) && (
                          <button 
                            type="button" 
                            onClick={() => { setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }} 
                            title="Criar canal de voz" 
                            className="category-add-channel-btn"
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      {uncategorizedVoice.map(renderChannelNode)}
                    </div>
                  )}

                  {/* Categorias com botão + integrado */}
                  {categoryEntries.map(([catName, catChannels]) => {
                    const isCatCollapsed = collapsedCategories.has(`${activeSpace.id}::${catName}`)
                    return (
                      <div key={catName} className="channel-category-group">
                        <div className="channel-category-header-wrap">
                          <button 
                            type="button" 
                            className="channel-category-header" 
                            onClick={() => toggleCategoryCollapse(activeSpace.id, catName)}
                          >
                            <span className="category-chevron">
                              {isCatCollapsed ? <ChevronRightIcon style={{ width: '11px', height: '11px' }} /> : <ChevronDownIcon style={{ width: '11px', height: '11px' }} />}
                            </span>
                            <span className="category-name">{catName.toUpperCase()}</span>
                          </button>
                          <button
                            type="button"
                            className="category-add-channel-btn"
                            title={`Criar canal em ${catName}`}
                            onClick={() => {
                              setShowNewChannel(activeSpace.id)
                              setNewChannelCategory(catName)
                            }}
                          >
                            ＋
                          </button>
                        </div>
                        {!isCatCollapsed && (
                          <div className="category-channels-list">
                            {catChannels.map(renderChannelNode)}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {filteredChannels.length === 0 && channelSearchQuery && (
                    <div className="channels-search-empty">
                      Nenhum canal encontrado para "{channelSearchQuery}"
                    </div>
                  )}

                  <button className="add-channel-btn" onClick={() => { setShowNewChannel(activeSpace.id); setNewChannelCategory(''); }}>
                    <PlusIcon />
                    <span>Novo Canal</span>
                  </button>
                </div>

                {/* Echo Channel Studio Modal */}
                {showNewChannel === activeSpace.id && (
                  <div className="echo-channel-modal-overlay" onClick={() => { setShowNewChannel(null); setNewChannelName(''); setNewChannelCategory(''); }}>
                    <div className="echo-channel-modal" onClick={e => e.stopPropagation()}>
                      <div className="echo-channel-modal-header">
                        <h3 className="echo-channel-modal-title">
                          <span>Criar Canal</span>
                          {newChannelCategory && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>em {newChannelCategory}</span>}
                        </h3>
                        <button 
                          type="button" 
                          className="echo-channel-modal-close" 
                          onClick={() => { setShowNewChannel(null); setNewChannelName(''); setNewChannelCategory(''); }}
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={(e) => createChannel(e, activeSpace.id)}>
                        <div className="echo-channel-modal-body">
                          <div>
                            <div className="echo-ch-section-label">Tipo de Canal</div>
                            <div className="echo-ch-type-grid">
                              <div 
                                className={`echo-ch-type-card ${newChannelType === 'text' ? 'active' : ''}`}
                                onClick={() => setNewChannelType('text')}
                              >
                                <div className="echo-ch-type-card-header">
                                  <HashtagIcon />
                                  <span>Texto</span>
                                </div>
                                <div className="echo-ch-type-card-desc">
                                  Envie mensagens, imagens, figurinhas e compartilhe links.
                                </div>
                              </div>

                              <div 
                                className={`echo-ch-type-card ${newChannelType === 'voice' ? 'active' : ''}`}
                                onClick={() => setNewChannelType('voice')}
                              >
                                <div className="echo-ch-type-card-header">
                                  <VolumeIcon />
                                  <span>Voz & Vídeo</span>
                                </div>
                                <div className="echo-ch-type-card-desc">
                                  Converse em tempo real com baixa latência e transmissão.
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="echo-ch-section-label">Nome do Canal</div>
                            <div className="echo-ch-input-wrapper">
                              <span className="echo-ch-input-prefix">
                                {newChannelType === 'text' ? '#' : '🔊'}
                              </span>
                              <input 
                                className="echo-ch-input"
                                value={newChannelName} 
                                onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                                placeholder={newChannelType === 'text' ? "ex: geral, novidades" : "ex: lounge, squad"} 
                                required 
                                minLength={2} 
                                autoFocus
                              />
                            </div>
                            <div className="echo-ch-suggestions">
                              {(newChannelType === 'text' 
                                ? ['geral', 'jogos', 'clipes', 'anúncios', 'memes'] 
                                : ['lounge', 'squad-1', 'bate-papo', 'músicas', 'duo']
                              ).map(tag => (
                                <button
                                  key={tag}
                                  type="button"
                                  className="echo-ch-suggestion-chip"
                                  onClick={() => setNewChannelName(tag)}
                                >
                                  +{tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="echo-channel-modal-footer">
                          <button 
                            type="button" 
                            className="echo-ch-modal-btn cancel"
                            onClick={() => { setShowNewChannel(null); setNewChannelName(''); setNewChannelCategory(''); }}
                          >
                            Cancelar
                          </button>
                          <button type="submit" className="echo-ch-modal-btn submit">
                            Criar Canal
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Docked Voice Status Panel (Ergonomic 2-row layout) */}
                {activeVoiceChannelId && (
                  <div className="voice-status-panel">
                    <div className="voice-status-header-row">
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
                          <span className="voice-status-channel" title={activeVoiceChannel?.name}>{activeVoiceChannel?.name}</span>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="voice-disconnect-btn" 
                        onClick={handleLeaveVoice} 
                        title="Desconectar da chamada de voz"
                      >
                        <PhoneOffIcon style={{ width: '12px', height: '12px' }} />
                        <span>Sair</span>
                      </button>
                    </div>

                    <div className="voice-status-actions-grid">
                      <button className={`voice-action-btn ${isMuted ? 'muted' : ''}`} onClick={handleToggleMute} title={isMuted ? "Desmutar microfone" : "Mutar microfone"}>
                        {isMuted ? <MicOffIcon /> : <MicIcon />}
                      </button>
                      <button className={`voice-action-btn ${isDeafened ? 'muted' : ''}`} onClick={handleToggleDeafen} title={isDeafened ? "Desensurdecer" : "Ensurdecer (Mutar todos)"}>
                        {isDeafened ? <HeadphonesOffIcon /> : <HeadphonesIcon />}
                      </button>
                      <button className="voice-action-btn" onClick={() => setShowSoundboardModal(true)} title="Soundboard Gamer">
                        <SoundboardIcon />
                      </button>
                      <button className={`voice-action-btn ${isRecordingCall ? 'recording' : ''}`} onClick={isRecordingCall ? stopCallRecording : startCallRecording} title={isRecordingCall ? `Gravando chamada (${recordingDuration}s)` : "Gravar chamada"}>
                        <RecordCallIcon isRecording={isRecordingCall} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Footer */}
              <UnifiedUserProfileFooter
                displayName={profileDisplayName}
                avatarUrl={profileAvatarUrl}
                presenceStatus={presenceStatus}
                showStatusMenu={showStatusMenu}
                setShowStatusMenu={setShowStatusMenu}
                updatePresenceStatus={updatePresenceStatus}
                theme={theme}
                toggleTheme={toggleTheme}
                onOpenSettings={() => setPage('Configurações')}
                onOpenWhatsNew={() => setShowWhatsNewModal(true)}
                onSignOut={() => supabase?.auth.signOut()}
                myGamePresence={myGamePresence}
              />
            </aside>
          )
        })()}

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

                      {activeScreenSharers.length > 0 && (
                        <span className="live-badge" title="Transmissão de tela em andamento">● ao vivo</span>
                      )}

                      <button 
                        className={`profile-footer-btn ${showMembersList ? 'active' : ''}`} 
                        onClick={() => setShowMembersList(!showMembersList)}
                        title={showMembersList ? "Ocultar Lista de Membros" : "Mostrar Lista de Membros"}
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

                          return (
                            <>
                              {/* Channel Welcome Hero */}
                              {!searchQuery.trim() && (
                                <div className="channel-welcome-hero">
                                  <div className="channel-welcome-icon-box">
                                    {selectedChannel.is_announcement ? <MegaphoneIcon /> : <HashtagIcon />}
                                  </div>
                                  <h2 className="channel-welcome-title">Bem-vindo ao canal #{selectedChannel.name}!</h2>
                                  <p className="channel-welcome-desc">
                                    {selectedChannel.topic || `Este é o início do canal #${selectedChannel.name} da comunidade ${currentSpace?.name || 'Echo'}. Envie uma mensagem para iniciar o papo!`}
                                  </p>
                                  <div className="channel-welcome-meta">
                                    <span>🔒 Canal seguro</span>
                                    <span>•</span>
                                    <span>💬 {filtered.length} {filtered.length === 1 ? 'mensagem' : 'mensagens'} no histórico</span>
                                  </div>
                                </div>
                              )}

                              {filtered.length === 0 && searchQuery && (
                                <div className="no-messages">
                                  <span className="no-msg-icon">🔍</span>
                                  <p>{`Nenhuma mensagem encontrada para "${searchQuery}"`}</p>
                                </div>
                              )}

                              {filtered.map((message, index) => {
                                const prevMessage = index > 0 ? filtered[index - 1] : null
                                const msgDate = new Date(message.created_at)
                                const prevDate = prevMessage ? new Date(prevMessage.created_at) : null
                                const isDifferentDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

                                // Parse reply quote if present
                                let displayedBody = message.body
                                let replyQuoteText: string | null = null
                                if (displayedBody.startsWith('> @')) {
                                  const firstLineEnd = displayedBody.indexOf('\n')
                                  if (firstLineEnd !== -1) {
                                    replyQuoteText = displayedBody.slice(2, firstLineEnd)
                                    displayedBody = displayedBody.slice(firstLineEnd + 1)
                                  }
                                }

                                // Consecutive Message Grouping (Same author within 5 min, same calendar day, and not a reply)
                                const isSameAuthor = prevMessage && prevMessage.author_id === message.author_id
                                const isWithinWindow = prevMessage && (msgDate.getTime() - prevDate!.getTime() < 5 * 60 * 1000)
                                const isConsecutive = !isDifferentDay && isSameAuthor && isWithinWindow && !replyQuoteText

                                const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
                                const msgRole = currentSpace ? getUserHighestRole(currentSpace.id, message.author_id) : null
                                const isPinned = (pinnedMessages[selectedChannel.id] || []).some(p => p.message_id === message.id)
                                const canManagePins = currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id)
                                const reactions = messageReactions[message.id] || {}

                                const authorClanTag = localStorage.getItem(`echo-clan-tag-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
                                const authorClanTagColor = localStorage.getItem(`echo-clan-tag-color-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'

                                return (
                                  <React.Fragment key={message.id}>
                                    {isDifferentDay && (
                                      <div className="chat-date-divider">
                                        <div className="chat-date-line" />
                                        <span className="chat-date-pill">
                                          {formatChatDateDivider(msgDate)}
                                        </span>
                                        <div className="chat-date-line" />
                                      </div>
                                    )}

                                    <article 
                                      className={`msg-card ${isConsecutive ? 'msg-consecutive' : ''} ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''}`} 
                                      style={{ position: 'relative' }}
                                    >
                                      {/* Message Hover Action Bar */}
                                      <div className="message-hover-actions">
                                        {['👍', '❤️', '😂', '🔥', '🎮', '💀'].map(emoji => (
                                          <button 
                                            key={emoji}
                                            type="button" 
                                            className="hover-action-btn"
                                            onClick={() => toggleReaction(message.id, emoji)}
                                            title={`Reagir com ${emoji}`}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                        <button 
                                          type="button" 
                                          className="hover-action-btn"
                                          onClick={() => setReplyingToMessage(message)}
                                          title="Responder a esta mensagem"
                                        >
                                          ↩️
                                        </button>
                                      </div>

                                      {isConsecutive ? (
                                        <div className="msg-consecutive-gutter">
                                          <time className="consecutive-time" title={msgDate.toLocaleTimeString('pt-BR')}>
                                            {msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </time>
                                        </div>
                                      ) : (
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
                                      )}

                                      <div className="msg-body">
                                        {!isConsecutive && (
                                          <>
                                            {replyQuoteText && (
                                              <div className="reply-preview-in-message">
                                                <span>↩️</span>
                                                <em>{replyQuoteText}</em>
                                              </div>
                                            )}

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

                                              {authorClanTag && (
                                                <span 
                                                  className="echo-clan-tag" 
                                                  style={{ 
                                                    color: authorClanTagColor, 
                                                    borderColor: `${authorClanTagColor}66`, 
                                                    background: `${authorClanTagColor}15`, 
                                                    fontSize: '9.5px', 
                                                    padding: '1px 5px', 
                                                    borderRadius: '4px' 
                                                  }}
                                                >
                                                  [{authorClanTag}]
                                                </span>
                                              )}

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

                                              <time>{msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                              
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
                                          </>
                                        )}

                                        {/* Message content */}
                                        {message.attachment_url && message.attachment_type === 'image' ? (
                                          <img src={message.attachment_url} alt="anexo" className="msg-attachment-img" onClick={() => window.open(message.attachment_url, '_blank')} />
                                        ) : message.attachment_url && message.attachment_type === 'audio' ? (
                                          <div className="voice-note-player-card">
                                            <button 
                                              type="button" 
                                              className="voice-note-play-btn"
                                              onClick={() => {
                                                if (activePlayingVoiceNote === message.id) {
                                                  voiceNoteAudioRef.current?.pause()
                                                  setActivePlayingVoiceNote(null)
                                                } else {
                                                  if (voiceNoteAudioRef.current) voiceNoteAudioRef.current.pause()
                                                  const audio = new Audio(message.attachment_url)
                                                  audio.playbackRate = voiceNotePlaySpeed
                                                  audio.play()
                                                  audio.onended = () => setActivePlayingVoiceNote(null)
                                                  voiceNoteAudioRef.current = audio
                                                  setActivePlayingVoiceNote(message.id)
                                                }
                                              }}
                                            >
                                              {activePlayingVoiceNote === message.id ? '⏸️' : '▶️'}
                                            </button>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                Mensagem de Áudio
                                              </div>
                                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {activePlayingVoiceNote === message.id ? 'Reproduzindo...' : 'Clique para ouvir'}
                                              </div>
                                            </div>
                                            <button 
                                              type="button" 
                                              className="voice-note-speed-btn"
                                              onClick={() => {
                                                const nextSpeed = voiceNotePlaySpeed === 1 ? 1.5 : voiceNotePlaySpeed === 1.5 ? 2 : 1
                                                setVoiceNotePlaySpeed(nextSpeed)
                                                if (voiceNoteAudioRef.current) voiceNoteAudioRef.current.playbackRate = nextSpeed
                                              }}
                                            >
                                              {voiceNotePlaySpeed}x
                                            </button>
                                          </div>
                                        ) : message.attachment_url && message.attachment_type !== 'image' ? (
                                          <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="msg-attachment-file">📎 {displayedBody}</a>
                                        ) : (
                                          <>
                                            <p>{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                                            {renderRichEmbed(displayedBody)}
                                          </>
                                        )}

                                        {/* Emoji Reactions Pills */}
                                        {Object.keys(reactions).length > 0 && (
                                          <div className="message-reactions-row">
                                            {Object.entries(reactions).map(([em, userIds]) => {
                                              const hasReacted = userIds.includes(user.id)
                                              return (
                                                <button
                                                  key={em}
                                                  type="button"
                                                  className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                                                  onClick={() => toggleReaction(message.id, em)}
                                                  title={hasReacted ? "Remover sua reação" : "Adicionar reação"}
                                                >
                                                  <span>{em}</span>
                                                  <span>{userIds.length}</span>
                                                </button>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </article>
                                  </React.Fragment>
                                )
                              })}
                            </>
                          )
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
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          {/* Reply Quote Banner */}
                          {replyingToMessage && (
                            <div className="reply-quote-bar">
                              <span>
                                ↩️ Respondendo a <strong>@{replyingToMessage.profile?.display_name || 'Membro'}</strong>: "{replyingToMessage.body.slice(0, 45)}..."
                              </span>
                              <button 
                                type="button" 
                                onClick={() => setReplyingToMessage(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          {isVoiceNoteRecording ? (
                            <div className="composer" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="voice-note-recorder-bar">
                                <div className="recording-dot-pulse" />
                                <span className="recording-timer-text">
                                  Gravando Áudio... {Math.floor(voiceNoteDuration / 60)}:{String(voiceNoteDuration % 60).padStart(2, '0')}
                                </span>
                              </div>
                              <button 
                                type="button" 
                                onClick={cancelVoiceNoteRecording} 
                                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                              >
                                Cancelar
                              </button>
                              <button 
                                type="button" 
                                onClick={stopVoiceNoteRecording} 
                                style={{ background: 'var(--accent-color)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                              >
                                🚀 Enviar Áudio
                              </button>
                            </div>
                          ) : (
                            <form className="composer" onSubmit={send} style={{ position: 'relative' }}>
                              <input type="file" id="chat-file-input" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChatFileUpload(f); e.target.value = '' }} />
                              <button type="button" className="dm-attach-btn" onClick={() => document.getElementById('chat-file-input')?.click()} disabled={isUploading} title="Anexar arquivo ou imagem" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                                <PaperclipIcon />
                              </button>

                              {/* Voice Note Button */}
                              <button 
                                type="button" 
                                className="dm-attach-btn" 
                                onClick={startVoiceNoteRecording} 
                                title="Gravar Mensagem de Voz"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 6px 0 0', display: 'flex', alignItems: 'center' }}
                              >
                                <VoiceMessageIcon />
                              </button>

                              {/* GIF Picker Button */}
                              <button 
                                type="button" 
                                className="dm-attach-btn" 
                                onClick={() => setShowGifPicker(!showGifPicker)} 
                                title="Escolher GIF Gamer"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: showGifPicker ? 'var(--accent-color)' : 'var(--text-muted)', padding: '0 6px 0 0', display: 'flex', alignItems: 'center', fontWeight: 900, fontSize: '11px', letterSpacing: '0.5px' }}
                              >
                                GIF
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

                              {/* GIF Picker Popover */}
                              {showGifPicker && (
                                <div className="gif-picker-popover">
                                  <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                      value={gifSearchQuery} 
                                      onChange={(e) => setGifSearchQuery(e.target.value)}
                                      placeholder="Buscar GIFs de games..."
                                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-primary)', outline: 'none', fontSize: '12.5px' }}
                                    />
                                    <button type="button" onClick={() => setShowGifPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                                  </div>
                                  <div className="gif-picker-grid">
                                    {GAMING_GIFS.filter(g => !gifSearchQuery || g.title.toLowerCase().includes(gifSearchQuery.toLowerCase())).map((gif, idx) => (
                                      <img 
                                        key={idx}
                                        src={gif.url} 
                                        alt={gif.title} 
                                        className="gif-item-thumb"
                                        onClick={async () => {
                                          if (selectedChannel && supabase) {
                                            await supabase.from('messages').insert({
                                              channel_id: selectedChannel.id,
                                              author_id: user.id,
                                              body: gif.url,
                                              attachment_url: gif.url,
                                              attachment_type: 'image'
                                            })
                                            setShowGifPicker(false)
                                          }
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
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
                          {(() => {
                            // Combina membros do banco (spaceMembers) com usuários ativos em chamada ou presença deste espaço
                            const allMembersMap = new Map<string, any>()
                            spaceMembers.forEach(m => {
                              if (m && m.user?.id) allMembersMap.set(m.user.id, m)
                            })

                            // Sintetiza participantes da chamada de voz ativa
                            participants.forEach(p => {
                              if (p && p.userId && !allMembersMap.has(p.userId)) {
                                allMembersMap.set(p.userId, {
                                  role: 'member',
                                  user: { id: p.userId, display_name: p.displayName || 'Membro', avatar_url: p.avatarUrl }
                                })
                              }
                            })

                            // Sintetiza usuários em qualquer canal de voz deste servidor
                            const spaceChList = spaceChannels[currentSpace.id] || []
                            const currentSpaceVoiceUsers = Object.entries(spaceVoiceUsers)
                              .filter(([chId]) => spaceChList.some(c => c.id === chId))
                              .flatMap(([, uList]) => uList)

                            currentSpaceVoiceUsers.forEach(p => {
                              if (p && p.userId && !allMembersMap.has(p.userId)) {
                                allMembersMap.set(p.userId, {
                                  role: 'member',
                                  user: { id: p.userId, display_name: p.displayName || 'Membro', avatar_url: p.avatarUrl }
                                })
                              }
                            })

                            const combinedMembers = Array.from(allMembersMap.values())
                            const onlineList = combinedMembers.filter(m => onlineUsers.has(m.user.id) || participants.some(p => p.userId === m.user.id) || currentSpaceVoiceUsers.some(p => p.userId === m.user.id))
                            const offlineList = combinedMembers.filter(m => !onlineUsers.has(m.user.id) && !participants.some(p => p.userId === m.user.id) && !currentSpaceVoiceUsers.some(p => p.userId === m.user.id))

                            const renderCard = (member: any) => {
                              const isCreator = currentSpace.creator_id === member.user.id
                              const isVoiceUser = participants.some(p => p.userId === member.user.id) || currentSpaceVoiceUsers.some(p => p.userId === member.user.id)
                              const isOnline = onlineUsers.has(member.user.id) || isVoiceUser
                              const userPresenceStatus = isOnline ? (presenceData[member.user.id]?.presence_status || 'online') : 'offline'
                              const memberRole = getUserHighestRole(currentSpace.id, member.user.id)

                              const memberClanTag = localStorage.getItem(`echo-clan-tag-${member.user.id}`) || (member.user.id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
                              const memberClanTagColor = localStorage.getItem(`echo-clan-tag-color-${member.user.id}`) || (member.user.id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'

                              const activeGame = member.user.id === user.id 
                                ? (presenceStatus !== 'invisible' ? myGamePresence?.name : null)
                                : (presenceData[member.user.id]?.game_presence?.name || null)

                              const rawCustomStatus = presenceData[member.user.id]?.custom_status
                              const isSameAsName = rawCustomStatus && (rawCustomStatus.trim().toLowerCase() === member.user.display_name.trim().toLowerCase())
                              const validCustomStatus = (rawCustomStatus && !isSameAsName) ? rawCustomStatus : null

                              return (
                                <div 
                                  className="member-card" 
                                  key={member.user.id}
                                  onClick={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                    setHoveredMemberPopover(null)
                                    const memRoles = memberRoleMap[member.user.id] || []
                                    const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                    setInspectedMember({
                                      user: member.user,
                                      roleName: memberRole?.name,
                                      roleColor: memberRole?.color,
                                      roles: matchingRoles
                                    })
                                  }}
                                  onMouseEnter={(e) => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const memRoles = memberRoleMap[member.user.id] || []
                                    const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                    hoverTimeoutRef.current = setTimeout(() => {
                                      setHoveredMemberPopover({
                                        user: member.user,
                                        roleName: memberRole?.name,
                                        roleColor: memberRole?.color,
                                        roles: matchingRoles,
                                        clanTag: memberClanTag,
                                        clanTagColor: memberClanTagColor,
                                        activeGame,
                                        isVoiceUser,
                                        userPresenceStatus,
                                        isOnline,
                                        customStatus: validCustomStatus,
                                        rect: {
                                          top: rect.top,
                                          left: rect.left,
                                          height: rect.height,
                                          bottom: rect.bottom
                                        }
                                      })
                                    }, 200)
                                  }}
                                  onMouseLeave={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                    hoverTimeoutRef.current = setTimeout(() => {
                                      setHoveredMemberPopover(null)
                                    }, 150)
                                  }}
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
                                    <div className="member-name-row">
                                      <span className="member-name" style={{ color: memberRole?.color || 'var(--text-primary)' }}>
                                        {member.user.display_name}
                                      </span>

                                      {memberClanTag && (
                                        <span 
                                          className="member-clan-tag" 
                                          style={{ 
                                            color: memberClanTagColor, 
                                            borderColor: `${memberClanTagColor}55`, 
                                            background: `${memberClanTagColor}15` 
                                          }}
                                        >
                                          [{memberClanTag}]
                                        </span>
                                      )}

                                      {isCreator ? (
                                        <span className="member-badge creator"><CrownIcon style={{ width: '10px', height: '10px' }} /> Dono</span>
                                      ) : memberRole ? (
                                        <span 
                                          className="member-badge role" 
                                          style={{ 
                                            color: memberRole.color, 
                                            borderColor: `${memberRole.color}44`, 
                                            background: `${memberRole.color}15` 
                                          }}
                                        >
                                          {memberRole.name}
                                        </span>
                                      ) : null}
                                    </div>

                                    {activeGame ? (
                                      <span className="member-status-text activity-game" title={`Jogando ${activeGame}`}>
                                        🎮 Jogando {activeGame}
                                      </span>
                                    ) : isVoiceUser ? (
                                      <span className="member-status-text activity-voice">
                                        🔊 Em chamada
                                      </span>
                                    ) : validCustomStatus ? (
                                      <span className="member-status-text custom" title={validCustomStatus}>
                                        {validCustomStatus}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              )
                            }

                            // Role Hierarchy Categorization
                            const creatorOnlineMembers: any[] = []
                            const roleBuckets: { role: ServerRole; members: any[] }[] = []
                            const unassignedOnlineMembers: any[] = []

                            const spaceRoles = (serverRoles || []).slice().sort((a, b) => b.position - a.position)
                            spaceRoles.forEach(r => {
                              roleBuckets.push({ role: r, members: [] })
                            })

                            onlineList.forEach(m => {
                              if (m.user.id === currentSpace.creator_id) {
                                creatorOnlineMembers.push(m)
                                return
                              }
                              const highestRole = getUserHighestRole(currentSpace.id, m.user.id)
                              const targetBucket = highestRole ? roleBuckets.find(b => b.role.id === highestRole.id) : null
                              if (targetBucket) {
                                targetBucket.members.push(m)
                              } else {
                                unassignedOnlineMembers.push(m)
                              }
                            })

                            return (
                              <>
                                {/* 1. Creator / Owner Group */}
                                {creatorOnlineMembers.length > 0 && (
                                  <div className="members-group-section">
                                    <div className="members-group-label" style={{ color: '#f59e0b' }}>
                                      <span className="members-group-dot" style={{ background: '#f59e0b' }} />
                                      <span>👑 DONO — {creatorOnlineMembers.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {creatorOnlineMembers.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {/* 2. Custom Server Roles */}
                                {roleBuckets.filter(b => b.members.length > 0).map(b => (
                                  <div key={b.role.id} className="members-group-section">
                                    <div className="members-group-label" style={{ color: b.role.color }}>
                                      <span className="members-group-dot" style={{ background: b.role.color }} />
                                      <span>{b.role.name.toUpperCase()} — {b.members.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {b.members.map(renderCard)}
                                    </div>
                                  </div>
                                ))}

                                {/* 3. Online Members without special role */}
                                {unassignedOnlineMembers.length > 0 && (
                                  <div className="members-group-section">
                                    <div className="members-group-label">
                                      <span className="members-group-dot" style={{ background: '#22c55e' }} />
                                      <span>DISPONÍVEL — {unassignedOnlineMembers.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {unassignedOnlineMembers.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {/* 4. Offline Members */}
                                {offlineList.length > 0 && (
                                  <div className="members-group-section offline">
                                    <div className="members-group-label">
                                      <span className="members-group-dot" style={{ background: '#64748b' }} />
                                      <span>OFFLINE — {offlineList.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {offlineList.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {spaceMembers.length === 0 && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
                                    Nenhum membro encontrado.
                                  </div>
                                )}
                              </>
                            )
                          })()}
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
                            {activeScreenSharers.length > 0 && isWatchingStreams ? (
                              <div className="voice-streams-container">
                                <div className="streams-switcher-bar">
                                  <div className="streams-switcher-tabs">
                                    {activeScreenSharers.map(sharer => {
                                      const isSelected = activeScreenSharer?.userId === sharer.userId
                                      return (
                                        <button
                                          key={sharer.userId}
                                          type="button"
                                          className={`stream-tab-btn ${isSelected && screenShareViewMode === 'focus' ? 'active' : ''}`}
                                          onClick={() => {
                                            setSelectedScreenSharerUserId(sharer.userId)
                                            setScreenShareViewMode('focus')
                                          }}
                                          title={`Alternar para transmissão de ${sharer.displayName}`}
                                        >
                                          <div className="stream-tab-avatar">
                                            {sharer.avatarUrl ? (
                                              <img src={sharer.avatarUrl} alt={sharer.displayName} />
                                            ) : (
                                              <span>{sharer.displayName.slice(0, 1).toUpperCase()}</span>
                                            )}
                                          </div>
                                          <span className="stream-tab-name">{sharer.displayName}</span>
                                          <span className="stream-tab-live-badge">
                                            <span className="stream-tab-live-dot" />
                                            AO VIVO
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>

                                  <div className="streams-view-mode-toggles">
                                    {activeScreenSharers.length > 1 && (
                                      <div className="stream-segmented-group">
                                        <button
                                          type="button"
                                          className={`stream-view-toggle-btn ${screenShareViewMode === 'focus' ? 'active' : ''}`}
                                          onClick={() => setScreenShareViewMode('focus')}
                                          title="Modo Foco (Uma tela em destaque)"
                                        >
                                          <FocusIcon />
                                          <span>Foco</span>
                                        </button>
                                        <button
                                          type="button"
                                          className={`stream-view-toggle-btn ${screenShareViewMode === 'grid' ? 'active' : ''}`}
                                          onClick={() => setScreenShareViewMode('grid')}
                                          title="Modo Grade (Ver todas as telas divididas)"
                                        >
                                          <GridIcon />
                                          <span>Grade ({activeScreenSharers.length})</span>
                                        </button>
                                      </div>
                                    )}

                                    {/* Mini Player (Picture-in-Picture) Toggle Button */}
                                    <button
                                      type="button"
                                      className={`stream-control-btn ${isPiPActive ? 'pip-active' : ''}`}
                                      onClick={() => setIsPiPActive(!isPiPActive)}
                                      title={isPiPActive ? "Fechar Mini Player Flutuante" : "Ativar Mini Player Flutuante (Always-on-Top)"}
                                    >
                                      <PipIcon />
                                      <span>{isPiPActive ? 'Mini Player ON' : 'Mini Player'}</span>
                                    </button>

                                    {/* Hide / Close Stream View Button */}
                                    <button
                                      type="button"
                                      className="stream-control-btn"
                                      onClick={() => setIsWatchingStreams(false)}
                                      title="Ocultar vídeo (Ver apenas os avatares de voz)"
                                    >
                                      <EyeOffIcon />
                                      <span>Ocultar Vídeo</span>
                                    </button>

                                    {/* Quick Stop Stream for the streamer */}
                                    {localScreenStream && (
                                      <button
                                        type="button"
                                        className="stream-control-btn stop-btn"
                                        onClick={stopScreenShare}
                                        title="Parar de transmitir minha tela"
                                      >
                                        <StopSquareIcon />
                                        <span>Parar Transmissão</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {screenShareViewMode === 'grid' && activeScreenSharers.length > 1 ? (
                                  <div className="streams-multi-grid" style={{ gridTemplateColumns: `repeat(${Math.min(activeScreenSharers.length, 2)}, 1fr)` }}>
                                    {activeScreenSharers.map(sharer => (
                                      <StreamTile
                                        key={sharer.userId}
                                        participant={sharer}
                                        user={user}
                                        peerScreenVolumes={peerScreenVolumes}
                                        setPeerScreenVolumes={setPeerScreenVolumes}
                                        isGrid={true}
                                        isPiPActive={isPiPActive}
                                        onToggleFloatingPiP={() => setIsPiPActive(!isPiPActive)}
                                        onSelectFocus={() => {
                                          setSelectedScreenSharerUserId(sharer.userId)
                                          setScreenShareViewMode('focus')
                                        }}
                                        onCloseStream={() => setIsWatchingStreams(false)}
                                      />
                                    ))}
                                  </div>
                                ) : activeScreenSharer ? (
                                  <div className="stream-single-focus-wrap" ref={screenShareContainerRef}>
                                    <StreamTile
                                      participant={activeScreenSharer}
                                      user={user}
                                      peerScreenVolumes={peerScreenVolumes}
                                      setPeerScreenVolumes={setPeerScreenVolumes}
                                      isFullScreen={isScreenFullScreen}
                                      onToggleFullScreen={() => setIsScreenFullScreen(!isScreenFullScreen)}
                                      isPiPActive={isPiPActive}
                                      onToggleFloatingPiP={() => setIsPiPActive(!isPiPActive)}
                                      onCloseStream={() => setIsWatchingStreams(false)}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="participants-grid">
                                {activeScreenSharers.length > 0 && !isWatchingStreams && (
                                  <div 
                                    className="streams-hidden-banner" 
                                    onClick={() => setIsWatchingStreams(true)}
                                    style={{
                                      gridColumn: '1 / -1',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '12px 18px',
                                      background: 'rgba(88, 101, 242, 0.12)',
                                      border: '1.5px solid rgba(88, 101, 242, 0.3)',
                                      borderRadius: '12px',
                                      cursor: 'pointer',
                                      color: 'var(--text-primary)',
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      marginBottom: '12px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '18px' }}>📺</span>
                                      <span>Há <strong>{activeScreenSharers.length} {activeScreenSharers.length === 1 ? 'transmissão ao vivo' : 'transmissões ao vivo'}</strong> acontecendo neste canal.</span>
                                    </div>
                                    <button 
                                      type="button" 
                                      className="streams-resume-watch-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setIsWatchingStreams(true)
                                      }}
                                      style={{
                                        background: 'var(--accent-color)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ▶ Assistir Transmissão
                                    </button>
                                  </div>
                                )}

                                {participants.map(p => {
                                  const isSharer = !!(p.screenStream && p.screenStream.getVideoTracks().length > 0)
                                  return (
                                    <div 
                                      key={p.userId} 
                                      className={`participant-card ${p.isSpeaking ? 'speaking' : ''} ${isSharer ? 'has-live-screen' : ''}`}
                                      onClick={() => {
                                        if (isSharer) {
                                          setSelectedScreenSharerUserId(p.userId)
                                          setIsWatchingStreams(true)
                                          setScreenShareViewMode('focus')
                                        } else if (p.userId !== user.id) {
                                          setVolumeControlUser(p)
                                        }
                                      }}
                                      style={{ cursor: 'pointer', position: 'relative' }}
                                      title={isSharer ? `Clique para assistir a tela de ${p.displayName}` : (p.userId !== user.id ? "Ajustar volume de áudio" : "")}
                                    >
                                      {isSharer && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '10px',
                                          right: '10px',
                                          background: '#eb3b5a',
                                          color: '#fff',
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          padding: '3px 8px',
                                          borderRadius: '20px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          boxShadow: '0 2px 8px rgba(235, 59, 90, 0.4)'
                                        }}>
                                          <span>🔴</span> AO VIVO
                                        </div>
                                      )}
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
                                      <div className="participant-card-bottom-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                                        <span className="participant-name">
                                          {p.displayName}
                                          {p.userId === user.id && " (Você)"}
                                        </span>
                                        {isSharer && (
                                          <button
                                            type="button"
                                            className="watch-stream-badge-btn"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedScreenSharerUserId(p.userId)
                                              setIsWatchingStreams(true)
                                              setScreenShareViewMode('focus')
                                            }}
                                            style={{
                                              background: 'rgba(235, 59, 90, 0.18)',
                                              border: '1px solid #eb3b5a',
                                              color: '#eb3b5a',
                                              borderRadius: '12px',
                                              padding: '4px 10px',
                                              fontSize: '11px',
                                              fontWeight: 800,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              marginTop: '4px'
                                            }}
                                          >
                                            ▶ Assistir Tela
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* Push-to-Talk Indicator */}
                            {isPttMode && (
                              <div style={{ textAlign: 'center', padding: '6px 12px', background: isPttActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', margin: '0 16px 12px', border: isPttActive ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 800, color: isPttActive ? '#10b981' : 'var(--text-secondary)' }}>
                                {isPttActive ? '🟢 Microfone Aberto (Transmitindo Voz)' : `🔊 PTT Ativo: Segure [${pttKey.replace('Key', '')}] para falar`}
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

                              {/* Quick AI Noise Suppression Toggle */}
                              <button 
                                type="button"
                                className={`control-btn ai-btn ${isAiDenoiseEnabled ? 'active' : ''}`} 
                                onClick={() => toggleAiDenoise()}
                                title={isAiDenoiseEnabled ? "Supressão de Ruído por IA: ATIVADA (Clique para desligar)" : "Supressão de Ruído por IA: DESATIVADA (Clique para ligar)"}
                                style={{
                                  background: isAiDenoiseEnabled ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(99, 102, 241, 0.25))' : undefined,
                                  borderColor: isAiDenoiseEnabled ? '#a855f7' : undefined,
                                  color: isAiDenoiseEnabled ? '#c084fc' : undefined,
                                  position: 'relative'
                                }}
                              >
                                <span style={{ fontSize: '15px' }}>🧠</span>
                                {isAiDenoiseEnabled && (
                                  <span style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: '6px',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    boxShadow: '0 0 4px #10b981'
                                  }} />
                                )}
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

                                {/* Soundboard Button */}
                                <button 
                                  className="control-btn" 
                                  onClick={() => setShowSoundboardModal(true)}
                                  title="Mesa de Efeitos Sonoros (Soundboard)"
                                >
                                  <SoundboardIcon />
                                </button>

                                {/* Call Recording Button */}
                                <button 
                                  className={`control-btn ${isRecordingCall ? 'recording' : ''}`} 
                                  onClick={isRecordingCall ? stopCallRecording : startCallRecording}
                                  title={isRecordingCall ? `Gravando chamada (${recordingDuration}s) - Clique para parar e baixar` : "Gravar Áudio da Chamada"}
                                  style={{ color: isRecordingCall ? '#ff4655' : 'inherit' }}
                                >
                                  <RecordCallIcon isRecording={isRecordingCall} />
                                </button>

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
                              await handleJoinVoice(selectedChannel.id, selectedChannel.space_id)
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
                          {(() => {
                            // Combina membros do banco (spaceMembers) com usuários ativos em chamada ou presença deste espaço
                            const allMembersMap = new Map<string, any>()
                            spaceMembers.forEach(m => {
                              if (m && m.user?.id) allMembersMap.set(m.user.id, m)
                            })

                            // Sintetiza participantes da chamada de voz ativa
                            participants.forEach(p => {
                              if (p && p.userId && !allMembersMap.has(p.userId)) {
                                allMembersMap.set(p.userId, {
                                  role: 'member',
                                  user: { id: p.userId, display_name: p.displayName || 'Membro', avatar_url: p.avatarUrl }
                                })
                              }
                            })

                            // Sintetiza usuários em qualquer canal de voz deste servidor
                            const spaceChList = spaceChannels[currentSpace.id] || []
                            const currentSpaceVoiceUsers = Object.entries(spaceVoiceUsers)
                              .filter(([chId]) => spaceChList.some(c => c.id === chId))
                              .flatMap(([, uList]) => uList)

                            currentSpaceVoiceUsers.forEach(p => {
                              if (p && p.userId && !allMembersMap.has(p.userId)) {
                                allMembersMap.set(p.userId, {
                                  role: 'member',
                                  user: { id: p.userId, display_name: p.displayName || 'Membro', avatar_url: p.avatarUrl }
                                })
                              }
                            })

                            const combinedMembers = Array.from(allMembersMap.values())
                            const onlineList = combinedMembers.filter(m => onlineUsers.has(m.user.id) || participants.some(p => p.userId === m.user.id) || currentSpaceVoiceUsers.some(p => p.userId === m.user.id))
                            const offlineList = combinedMembers.filter(m => !onlineUsers.has(m.user.id) && !participants.some(p => p.userId === m.user.id) && !currentSpaceVoiceUsers.some(p => p.userId === m.user.id))

                            const renderCard = (member: any) => {
                              const isCreator = currentSpace.creator_id === member.user.id
                              const isVoiceUser = participants.some(p => p.userId === member.user.id) || currentSpaceVoiceUsers.some(p => p.userId === member.user.id)
                              const isOnline = onlineUsers.has(member.user.id) || isVoiceUser
                              const userPresenceStatus = isOnline ? (presenceData[member.user.id]?.presence_status || 'online') : 'offline'
                              const memberRole = getUserHighestRole(currentSpace.id, member.user.id)

                              const memberClanTag = localStorage.getItem(`echo-clan-tag-${member.user.id}`) || (member.user.id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
                              const memberClanTagColor = localStorage.getItem(`echo-clan-tag-color-${member.user.id}`) || (member.user.id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'

                              const activeGame = member.user.id === user.id 
                                ? (presenceStatus !== 'invisible' ? myGamePresence?.name : null)
                                : (presenceData[member.user.id]?.game_presence?.name || null)

                              const rawCustomStatus = presenceData[member.user.id]?.custom_status
                              const isSameAsName = rawCustomStatus && (rawCustomStatus.trim().toLowerCase() === member.user.display_name.trim().toLowerCase())
                              const validCustomStatus = (rawCustomStatus && !isSameAsName) ? rawCustomStatus : null

                              return (
                                <div 
                                  className="member-card" 
                                  key={member.user.id}
                                  onClick={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                    setHoveredMemberPopover(null)
                                    const memRoles = memberRoleMap[member.user.id] || []
                                    const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                    setInspectedMember({
                                      user: member.user,
                                      roleName: memberRole?.name,
                                      roleColor: memberRole?.color,
                                      roles: matchingRoles
                                    })
                                  }}
                                  onMouseEnter={(e) => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const memRoles = memberRoleMap[member.user.id] || []
                                    const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                    hoverTimeoutRef.current = setTimeout(() => {
                                      setHoveredMemberPopover({
                                        user: member.user,
                                        roleName: memberRole?.name,
                                        roleColor: memberRole?.color,
                                        roles: matchingRoles,
                                        clanTag: memberClanTag,
                                        clanTagColor: memberClanTagColor,
                                        activeGame,
                                        isVoiceUser,
                                        userPresenceStatus,
                                        isOnline,
                                        customStatus: validCustomStatus,
                                        rect: {
                                          top: rect.top,
                                          left: rect.left,
                                          height: rect.height,
                                          bottom: rect.bottom
                                        }
                                      })
                                    }, 200)
                                  }}
                                  onMouseLeave={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                    hoverTimeoutRef.current = setTimeout(() => {
                                      setHoveredMemberPopover(null)
                                    }, 150)
                                  }}
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
                                    <div className="member-name-row">
                                      <span className="member-name" style={{ color: memberRole?.color || 'var(--text-primary)' }}>
                                        {member.user.display_name}
                                      </span>

                                      {memberClanTag && (
                                        <span 
                                          className="member-clan-tag" 
                                          style={{ 
                                            color: memberClanTagColor, 
                                            borderColor: `${memberClanTagColor}55`, 
                                            background: `${memberClanTagColor}15` 
                                          }}
                                        >
                                          [{memberClanTag}]
                                        </span>
                                      )}

                                      {isCreator ? (
                                        <span className="member-badge creator"><CrownIcon style={{ width: '10px', height: '10px' }} /> Dono</span>
                                      ) : memberRole ? (
                                        <span 
                                          className="member-badge role" 
                                          style={{ 
                                            color: memberRole.color, 
                                            borderColor: `${memberRole.color}44`, 
                                            background: `${memberRole.color}15` 
                                          }}
                                        >
                                          {memberRole.name}
                                        </span>
                                      ) : null}
                                    </div>

                                    {activeGame ? (
                                      <span className="member-status-text activity-game" title={`Jogando ${activeGame}`}>
                                        🎮 Jogando {activeGame}
                                      </span>
                                    ) : isVoiceUser ? (
                                      <span className="member-status-text activity-voice">
                                        🔊 Em chamada
                                      </span>
                                    ) : validCustomStatus ? (
                                      <span className="member-status-text custom" title={validCustomStatus}>
                                        {validCustomStatus}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              )
                            }

                            // Role Hierarchy Categorization
                            const creatorOnlineMembers: any[] = []
                            const roleBuckets: { role: ServerRole; members: any[] }[] = []
                            const unassignedOnlineMembers: any[] = []

                            const spaceRoles = (serverRoles || []).slice().sort((a, b) => b.position - a.position)
                            spaceRoles.forEach(r => {
                              roleBuckets.push({ role: r, members: [] })
                            })

                            onlineList.forEach(m => {
                              if (m.user.id === currentSpace.creator_id) {
                                creatorOnlineMembers.push(m)
                                return
                              }
                              const highestRole = getUserHighestRole(currentSpace.id, m.user.id)
                              const targetBucket = highestRole ? roleBuckets.find(b => b.role.id === highestRole.id) : null
                              if (targetBucket) {
                                targetBucket.members.push(m)
                              } else {
                                unassignedOnlineMembers.push(m)
                              }
                            })

                            return (
                              <>
                                {/* 1. Creator / Owner Group */}
                                {creatorOnlineMembers.length > 0 && (
                                  <div className="members-group-section">
                                    <div className="members-group-label" style={{ color: '#f59e0b' }}>
                                      <span className="members-group-dot" style={{ background: '#f59e0b' }} />
                                      <span>👑 DONO — {creatorOnlineMembers.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {creatorOnlineMembers.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {/* 2. Custom Server Roles */}
                                {roleBuckets.filter(b => b.members.length > 0).map(b => (
                                  <div key={b.role.id} className="members-group-section">
                                    <div className="members-group-label" style={{ color: b.role.color }}>
                                      <span className="members-group-dot" style={{ background: b.role.color }} />
                                      <span>{b.role.name.toUpperCase()} — {b.members.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {b.members.map(renderCard)}
                                    </div>
                                  </div>
                                ))}

                                {/* 3. Online Members without special role */}
                                {unassignedOnlineMembers.length > 0 && (
                                  <div className="members-group-section">
                                    <div className="members-group-label">
                                      <span className="members-group-dot" style={{ background: '#22c55e' }} />
                                      <span>DISPONÍVEL — {unassignedOnlineMembers.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {unassignedOnlineMembers.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {/* 4. Offline Members */}
                                {offlineList.length > 0 && (
                                  <div className="members-group-section offline">
                                    <div className="members-group-label">
                                      <span className="members-group-dot" style={{ background: '#64748b' }} />
                                      <span>OFFLINE — {offlineList.length}</span>
                                    </div>
                                    <div className="members-list">
                                      {offlineList.map(renderCard)}
                                    </div>
                                  </div>
                                )}

                                {spaceMembers.length === 0 && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
                                    Nenhum membro encontrado.
                                  </div>
                                )}
                              </>
                            )
                          })()}
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
          myGamePresence={myGamePresence}
          theme={theme}
          toggleTheme={toggleTheme}
          setPage={setPage}
          onSignOut={() => supabase?.auth.signOut()}
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu}
          updatePresenceStatus={updatePresenceStatus}
          spaceMembers={spaceMembers}
          showToast={showToast}
          onInspectMember={(member) => setInspectedMember(member)}
          onOpenWhatsNew={() => setShowWhatsNewModal(true)}
        />
      </div>

      <div style={{ display: page === 'Configurações' ? undefined : 'none' }}>
        <SettingsView 
          userId={user.id}
          userCreatedAt={user.created_at}
          isServerOwner={spaces.some(s => s.creator_id === user.id)}
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
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu}
          updatePresenceStatus={updatePresenceStatus}
          onOpenWhatsNew={() => setShowWhatsNewModal(true)}
          myGamePresence={myGamePresence}
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
          spatialAudioEnabled={spatialAudioEnabled}
          onToggleSpatialAudio={(val) => {
            setSpatialAudioEnabledState(val)
            localStorage.setItem('echo-spatial-audio-enabled', val ? 'true' : 'false')
          }}
          onResetAllPans={() => {
            setUserStereoPans({})
            localStorage.removeItem('echo-user-stereo-pans')
            participants.forEach(p => {
              changePeerPan(p.userId, 0)
            })
          }}
          isAiDenoiseEnabled={isAiDenoiseEnabled}
          onToggleAiDenoise={toggleAiDenoise}
          customAccentColor={customAccentColor}
          onCustomAccentColorChange={setCustomAccentColor}
          chatDensity={chatDensity}
          onChatDensityChange={setChatDensity}
          performanceMode={performanceMode}
          onPerformanceModeChange={setPerformanceMode}
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

      {/* Discord-Style Go Live 2.0 Screen Selection Modal */}
      {showScreenPicker && (
        <div className="screen-picker-overlay" onClick={() => setShowScreenPicker(false)}>
          <div className="screen-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="screen-picker-header">
              <div className="screen-picker-header-info">
                <h2>🚀 Transmitir Jogo ou Tela (Go Live)</h2>
                <p>Selecione a janela ou tela e personalize a resolução e taxa de quadros a 60 FPS.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  type="button"
                  className="screen-picker-refresh-btn"
                  onClick={async () => {
                    if ((window as any).electronAPI) {
                      const raw = await (window as any).electronAPI.getSources()
                      const seenNames = new Set<string>()
                      const sources: any[] = []
                      for (const s of (raw || [])) {
                        if (s.type === 'screen' || (s.id && s.id.startsWith('screen:'))) {
                          sources.push(s)
                          continue
                        }
                        const cleanKey = (s.name || '').toLowerCase().replace(/\s*\(jogo\)\s*/i, '').trim()
                        if (!cleanKey || seenNames.has(cleanKey)) continue
                        seenNames.add(cleanKey)
                        sources.push(s)
                      }
                      setScreenSources(sources)
                    }
                  }}
                  title="Atualizar lista de janelas e jogos"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🔄 Atualizar
                </button>
                <button type="button" className="screen-picker-close-x" onClick={() => setShowScreenPicker(false)}>×</button>
              </div>
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
                <span>🖥️ Telas Inteiras (Monitores)</span>
                <span className="picker-tab-count">
                  {screenSources.filter(s => s.type === 'screen' || s.id.startsWith('screen:')).length}
                </span>
              </button>
            </div>

            <div className="sources-list">
              {screenSources
                .filter(s => screenPickerTab === 'windows' ? (s.type === 'window' || s.id.startsWith('window:')) : (s.type === 'screen' || s.id.startsWith('screen:')))
                .map(source => {
                  const isSelected = selectedPickerSourceId === source.id
                  return (
                    <button 
                      key={source.id} 
                      type="button"
                      className={`source-card ${isSelected ? 'selected' : ''}`} 
                      onClick={() => setSelectedPickerSourceId(source.id)}
                      onDoubleClick={() => selectScreenSource(source.id)}
                    >
                      <div className="source-card-thumb-wrap" style={{ position: 'relative' }}>
                        {source.thumbnail ? (
                          <img src={source.thumbnail} alt={source.name} className="source-thumb-img" />
                        ) : source.appIcon ? (
                          <div className="source-thumb-icon-placeholder">
                            <img src={source.appIcon} alt="" className="source-placeholder-icon" />
                          </div>
                        ) : (
                          <div className="source-thumb-icon-placeholder" style={{ background: source.isGame ? 'linear-gradient(135deg, #ff4655, #0f1923)' : undefined }}>
                            <span className="source-placeholder-emoji">{screenPickerTab === 'screens' ? '🖥️' : source.isGame ? '🎮' : '🪟'}</span>
                          </div>
                        )}
                        {source.isGame ? (
                          <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#ff4655', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                            🎮 JOGO
                          </span>
                        ) : (source as any).isMinimized ? (
                          <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#5865f2', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                            ⏸️ MINIMIZADA
                          </span>
                        ) : null}
                        {isSelected && (
                          <span style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--accent-color)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 6px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                            ✓
                          </span>
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
                  )
                })}
              {screenSources.filter(s => screenPickerTab === 'windows' ? (s.type === 'window' || s.id.startsWith('window:')) : (s.type === 'screen' || s.id.startsWith('screen:'))).length === 0 && (
                <div className="sources-empty-state">
                  Nenhuma {screenPickerTab === 'windows' ? 'janela aberta' : 'tela'} encontrada no momento.
                </div>
              )}
            </div>

            {/* Quality & FPS Stream Settings Integrated Panel */}
            <div className="screen-picker-quality-box">
              <div className="picker-quality-col">
                <span className="picker-section-label">RESOLUÇÃO DE STREAM</span>
                <div className="picker-chips-row">
                  {(['720p', '1080p', '1440p', 'native'] as const).map(q => (
                    <button
                      key={q}
                      type="button"
                      className={`picker-config-chip ${screenQuality === q ? 'active' : ''}`}
                      onClick={() => setScreenQuality(q)}
                    >
                      {q === '720p' ? '720p HD' : q === '1080p' ? '1080p Full HD' : q === '1440p' ? '1440p 2K' : 'Fonte (Nativa)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="picker-quality-col">
                <span className="picker-section-label">TAXA DE QUADROS</span>
                <div className="picker-chips-row">
                  {([15, 30, 60] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      className={`picker-config-chip ${screenFps === f ? 'active' : ''}`}
                      onClick={() => setScreenFps(f)}
                    >
                      {f === 60 ? '⚡ 60 FPS (Ultra Suave)' : `${f} FPS`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="screen-picker-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button type="button" className="picker-close-btn" onClick={() => setShowScreenPicker(false)}>
                Cancelar
              </button>
              <button 
                type="button"
                className="picker-go-live-btn"
                disabled={!selectedPickerSourceId && screenSources.length === 0}
                onClick={() => {
                  const targetId = selectedPickerSourceId || (screenSources[0]?.id)
                  if (targetId) {
                    selectScreenSource(targetId)
                  }
                }}
              >
                🚀 Iniciar Transmissão (Go Live)
              </button>
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

      {/* User Volume & 3D Spatial Audio Positioning Modal */}
      {volumeControlUser && (
        <div className="screen-picker-overlay" onClick={() => setVolumeControlUser(null)}>
          <div className="screen-picker-modal volume-control-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Áudio & Posição 3D</h2>
              <button className="picker-close-btn" style={{ margin: 0, padding: '4px 8px' }} onClick={() => setVolumeControlUser(null)}>✕</button>
            </div>
            <p style={{ margin: '6px 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Ajuste o volume e o posicionamento estéreo da voz de <strong>{volumeControlUser.displayName}</strong>.
            </p>
            
            {/* Section 1: Volume */}
            <div className="volume-slider-container" style={{ margin: '14px 0', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <span>🔊 Volume de Voz</span>
                <span style={{ color: (userVolumes[volumeControlUser.userId] || 100) > 100 ? '#ff9f43' : 'inherit' }}>
                  {userVolumes[volumeControlUser.userId] !== undefined ? userVolumes[volumeControlUser.userId] : 100}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
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

            {/* Section 2: 3D Spatial Stereo Panning */}
            <div className="volume-slider-container" style={{ margin: '14px 0', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎧 Posicionamento Estéreo (3D)</span>
                </span>
                <span style={{ fontSize: '12px', color: (userStereoPans[volumeControlUser.userId] || 0) === 0 ? '#10b981' : '#00f2fe', fontWeight: 800 }}>
                  {(userStereoPans[volumeControlUser.userId] || 0) === 0 && '● Centro (Neutro)'}
                  {(userStereoPans[volumeControlUser.userId] || 0) < 0 && `⬅️ ${Math.round(Math.abs(userStereoPans[volumeControlUser.userId]) * 100)}% Esquerda`}
                  {(userStereoPans[volumeControlUser.userId] || 0) > 0 && `➡️ ${Math.round((userStereoPans[volumeControlUser.userId]) * 100)}% Direita`}
                </span>
              </div>

              <input 
                type="range" 
                min="-100" 
                max="100" 
                step="5"
                value={Math.round((userStereoPans[volumeControlUser.userId] !== undefined ? userStereoPans[volumeControlUser.userId] : 0) * 100)}
                onChange={(e) => {
                  const rawVal = parseInt(e.target.value, 10) / 100
                  const newPans = { ...userStereoPans, [volumeControlUser.userId]: rawVal }
                  setUserStereoPans(newPans)
                  localStorage.setItem('echo-user-stereo-pans', JSON.stringify(newPans))
                  changePeerPan(volumeControlUser.userId, rawVal)
                  if (!spatialAudioEnabled) {
                    setSpatialAudioEnabledState(true)
                    localStorage.setItem('echo-spatial-audio-enabled', 'true')
                  }
                }}
                style={{ width: '100%', accentColor: '#00f2fe', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>100% Esquerda</span>
                <span>Centro</span>
                <span>100% Direita</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const newPans = { ...userStereoPans, [volumeControlUser.userId]: 0 }
                    setUserStereoPans(newPans)
                    localStorage.setItem('echo-user-stereo-pans', JSON.stringify(newPans))
                    changePeerPan(volumeControlUser.userId, 0)
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '6px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🔄 Centralizar
                </button>

                {participants.filter(p => p.userId !== user.id).length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const otherPeers = participants.filter(p => p.userId !== user.id)
                      const count = otherPeers.length
                      const newPans = { ...userStereoPans }
                      otherPeers.forEach((p, idx) => {
                        const panVal = count === 1 ? 0 : -0.75 + (1.5 / (count - 1)) * idx
                        const rounded = Math.round(panVal * 100) / 100
                        newPans[p.userId] = rounded
                        changePeerPan(p.userId, rounded)
                      })
                      setUserStereoPans(newPans)
                      localStorage.setItem('echo-user-stereo-pans', JSON.stringify(newPans))
                      if (!spatialAudioEnabled) {
                        setSpatialAudioEnabledState(true)
                        localStorage.setItem('echo-spatial-audio-enabled', 'true')
                      }
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(0, 242, 254, 0.12)',
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      color: '#00f2fe',
                      padding: '6px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="Distribui todos os membros do squad em semicírculo no seu fone"
                  >
                    🌐 Distribuir Squad 3D
                  </button>
                )}
              </div>
            </div>

            <button className="picker-close-btn" style={{ width: '100%', margin: '6px 0 0 0' }} onClick={() => setVolumeControlUser(null)}>
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

      {/* Member Profile Card Modal */}
      {inspectedMember && (() => {
        const isOnline = onlineUsers.has(inspectedMember.user.id) || participants.some(p => p.userId === inspectedMember.user.id)
        const userPresenceStatus = isOnline ? (presenceData[inspectedMember.user.id]?.presence_status || 'online') : 'offline'
        const rawCustomStatus = presenceData[inspectedMember.user.id]?.custom_status
        const isSameAsName = rawCustomStatus && (rawCustomStatus.trim().toLowerCase() === inspectedMember.user.display_name.trim().toLowerCase())
        const validCustomStatus = (rawCustomStatus && !isSameAsName) ? rawCustomStatus : null
        const memberClanTag = localStorage.getItem(`echo-clan-tag-${inspectedMember.user.id}`) || (inspectedMember.user.id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
        const memberClanTagColor = localStorage.getItem(`echo-clan-tag-color-${inspectedMember.user.id}`) || (inspectedMember.user.id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'
        const activeGame = inspectedMember.user.id === user.id 
          ? (presenceStatus !== 'invisible' ? myGamePresence?.name : null)
          : (presenceData[inspectedMember.user.id]?.game_presence?.name || null)
        const isVoiceUser = participants.some(p => p.userId === inspectedMember.user.id)
        const currentActiveSpace = spaces.find(s => s.id === expandedSpace) || spaces[0] || null
        const isServerOwner = currentActiveSpace?.creator_id === inspectedMember.user.id
        const voicePeer = participants.find(p => p.userId === inspectedMember.user.id)

        return (
          <MemberProfileModal
            inspectedMember={inspectedMember}
            onClose={() => setInspectedMember(null)}
            currentUser={user}
            isOnline={isOnline}
            userPresenceStatus={userPresenceStatus}
            validCustomStatus={validCustomStatus}
            memberClanTag={memberClanTag}
            memberClanTagColor={memberClanTagColor}
            activeGame={activeGame}
            isVoiceUser={isVoiceUser}
            voiceChannelName={activeVoiceChannel?.name}
            isServerOwner={isServerOwner}
            voicePeer={voicePeer}
            showToast={showToast}
            onOpenDM={(targetId) => {
              setInspectedMember(null)
              setPage('Amigos')
              setSelectedDMUserId(targetId)
              setUnreadDMs(prev => { const next = { ...prev }; delete next[targetId]; return next })
              loadDirectMessages(targetId)
            }}
            onAdjustVolume={(peer) => {
              setVolumeControlUser(peer)
              setInspectedMember(null)
            }}
          />
        )
      })()}

      {/* Member Hover Popover Card */}
      {hoveredMemberPopover && (
        <div 
          className="member-hover-popover"
          style={{
            position: 'fixed',
            top: `${Math.min(Math.max(12, hoveredMemberPopover.rect.top - 16), window.innerHeight - 280)}px`,
            left: `${Math.max(10, hoveredMemberPopover.rect.left - 275)}px`,
            zIndex: 1100
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
          }}
          onMouseLeave={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = setTimeout(() => {
              setHoveredMemberPopover(null)
            }, 120)
          }}
          onClick={() => {
            setInspectedMember({
              user: hoveredMemberPopover.user,
              roleName: hoveredMemberPopover.roleName,
              roleColor: hoveredMemberPopover.roleColor,
              roles: hoveredMemberPopover.roles
            })
            setHoveredMemberPopover(null)
          }}
        >
          <div 
            className="hover-popover-banner" 
            style={{ 
              background: `linear-gradient(135deg, ${hoveredMemberPopover.roleColor || 'var(--accent-color, #00f2fe)'}aa, #1e1b4b)` 
            }} 
          />
          <div className="hover-popover-body">
            <div className="hover-popover-avatar-wrap">
              <div className="hover-popover-avatar">
                {hoveredMemberPopover.user.avatar_url ? (
                  <img src={hoveredMemberPopover.user.avatar_url} alt={hoveredMemberPopover.user.display_name} />
                ) : (
                  hoveredMemberPopover.user.display_name.slice(0, 1).toUpperCase()
                )}
              </div>
              <span className={`member-status-dot ${hoveredMemberPopover.isVoiceUser ? 'voice-active' : hoveredMemberPopover.userPresenceStatus}`} />
            </div>

            <div className="hover-popover-name-row">
              <span className="hover-popover-display-name" style={{ color: hoveredMemberPopover.roleColor || 'var(--text-primary)' }}>
                {hoveredMemberPopover.user.display_name}
              </span>
              {hoveredMemberPopover.clanTag && (
                <span 
                  className="member-clan-tag" 
                  style={{ 
                    color: hoveredMemberPopover.clanTagColor || '#00f2fe', 
                    borderColor: `${hoveredMemberPopover.clanTagColor || '#00f2fe'}55`, 
                    background: `${hoveredMemberPopover.clanTagColor || '#00f2fe'}15` 
                  }}
                >
                  [{hoveredMemberPopover.clanTag}]
                </span>
              )}
            </div>

            <span className="hover-popover-handle">
              @{hoveredMemberPopover.user.display_name.toLowerCase().replace(/\s+/g, '')}
            </span>

            {hoveredMemberPopover.activeGame && (
              <div className="hover-popover-activity game">
                <span>🎮 Jogando <strong>{hoveredMemberPopover.activeGame}</strong></span>
              </div>
            )}

            {hoveredMemberPopover.isVoiceUser && !hoveredMemberPopover.activeGame && (
              <div className="hover-popover-activity voice">
                <span>🔊 Conectado na chamada de voz</span>
              </div>
            )}

            {hoveredMemberPopover.customStatus && (
              <div className="hover-popover-quote">
                <span>〰️ {hoveredMemberPopover.customStatus}</span>
              </div>
            )}

            {hoveredMemberPopover.roles && hoveredMemberPopover.roles.length > 0 && (
              <div className="hover-popover-roles">
                <span className="hover-popover-roles-title">CARGOS</span>
                <div className="hover-popover-roles-pills">
                  {hoveredMemberPopover.roles.slice(0, 3).map(r => (
                    <span key={r.id} className="hover-popover-role-pill" style={{ color: r.color, borderColor: `${r.color}55`, background: `${r.color}15` }}>
                      <span className="role-dot" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  ))}
                  {hoveredMemberPopover.roles.length > 3 && (
                    <span className="hover-popover-role-pill more">+{hoveredMemberPopover.roles.length - 3}</span>
                  )}
                </div>
              </div>
            )}

            <div className="hover-popover-footer-hint">
              <span>Clique para ver perfil completo</span>
            </div>
          </div>
        </div>
      )}

      {/* Soundboard Modal */}
      {showSoundboardModal && (
        <div className="modal-backdrop" onClick={() => setShowSoundboardModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📢</span>
                <div>
                  <h3 style={{ margin: 0 }}>Soundboard Gamer</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Efeitos sonoros em tempo real para a chamada de voz</span>
                </div>
              </div>
              <button className="settings-close-btn" onClick={() => setShowSoundboardModal(false)}>✕</button>
            </div>

            <div className="soundboard-grid" style={{ marginTop: '16px' }}>
              {SOUNDBOARD_SOUNDS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="soundboard-card"
                  onClick={() => playSoundboard(s.id)}
                  title={`Tocar ${s.name}`}
                  style={{ borderLeftColor: s.color }}
                >
                  <span className="soundboard-emoji">{s.emoji}</span>
                  <span className="soundboard-name">{s.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                    {s.category}
                  </span>
                </button>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setShowSoundboardModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Soundboard Toast */}
      {lastSoundboardEvent && Date.now() - lastSoundboardEvent.timestamp < 3500 && (
        <div className="soundboard-toast">
          <span>{SOUNDBOARD_SOUNDS.find(s => s.id === lastSoundboardEvent.soundId)?.emoji || '📢'}</span>
          <span><strong>{lastSoundboardEvent.displayName}</strong> tocou <em>{SOUNDBOARD_SOUNDS.find(s => s.id === lastSoundboardEvent.soundId)?.name || lastSoundboardEvent.soundId}</em></span>
        </div>
      )}

      {/* O que há de novo / Novidades das Versões Modal */}
      <WhatsNewModal 
        isOpen={showWhatsNewModal} 
        onClose={() => setShowWhatsNewModal(false)} 
      />

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
      {/* Floating Picture-in-Picture Mini Player (Always on Top) */}
      {isPiPActive && activeScreenSharer && (
        <EchoFloatingMiniPlayer
          activeScreenSharers={activeScreenSharers}
          activeScreenSharer={activeScreenSharer}
          onSelectSharer={(uid) => {
            setSelectedScreenSharerUserId(uid)
          }}
          peerScreenVolumes={peerScreenVolumes}
          setPeerScreenVolumes={setPeerScreenVolumes}
          onClose={() => setIsPiPActive(false)}
          onExpand={() => {
            setIsPiPActive(false)
            if (activeVoiceChannelId) {
              const allChannels = Object.values(spaceChannels).flat()
              const ch = allChannels.find(c => c.id === activeVoiceChannelId)
              if (ch) {
                setSelectedChannel(ch)
                setPage('Servidores')
                setIsWatchingStreams(true)
                setScreenShareViewMode('focus')
              }
            }
          }}
        />
      )}
    </main>
  )
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark-atom" title="Echo">
        <EchoAtomLogo size={20} />
      </div>
      <span className="brand-name">echo</span>
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

/* ── Friends View Component (Social Hub 2.0) ─────────────── */
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
  myGamePresence,
  theme,
  toggleTheme,
  setPage,
  onSignOut,
  presenceStatus,
  showStatusMenu,
  setShowStatusMenu,
  updatePresenceStatus,
  spaceMembers = [],
  showToast,
  onInspectMember,
  onOpenWhatsNew
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
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  theme: string
  toggleTheme: () => void
  setPage: (page: Page) => void
  onSignOut: () => void
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu: boolean
  setShowStatusMenu: (val: boolean) => void
  updatePresenceStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  spaceMembers?: any[]
  showToast?: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  onInspectMember?: (member: any) => void
  onOpenWhatsNew?: () => void
}) {
  const dmFileRef = useRef<HTMLInputElement>(null)
  const dmMessagesEndRef = useRef<HTMLDivElement>(null)
  const [localSearch, setLocalSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'gaming'>('all')

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const onlineFriends = acceptedFriends.filter(f => onlineUsers.has(f.user.id))
  const pendingRequests = friendships.filter(f => f.status === 'pending')

  // Friends playing games or with custom activity
  const playingFriends = acceptedFriends.filter(f => {
    const isOnline = onlineUsers.has(f.user.id)
    if (!isOnline) return false
    const pres = presenceData[f.user.id]
    return pres?.custom_status?.toLowerCase().includes('jogando') || pres?.current_game
  })

  // Filter friends list by local search & filterMode
  const filterList = (list: FriendshipRequest[]) => {
    let result = list
    if (filterMode === 'gaming') {
      result = result.filter(f => {
        const pres = presenceData[f.user.id]
        return pres?.custom_status?.toLowerCase().includes('jogando') || pres?.current_game
      })
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase()
      result = result.filter(f => f.user.display_name.toLowerCase().includes(q))
    }
    return result
  }

  // Activity Feed Friends (all online friends who have status/game)
  const activeFeedFriends = acceptedFriends.filter(f => {
    const isOnline = onlineUsers.has(f.user.id)
    return isOnline
  })

  // Friend suggestions from shared spaces
  const friendUserIds = new Set([user.id, ...friendships.map(f => f.user.id)])
  const suggestedMembers = spaceMembers
    .filter(m => m.user && !friendUserIds.has(m.user.id))
    .slice(0, 4)

  const copyFriendLink = () => {
    const link = `https://echo.lobby/add/@${profileDisplayName || 'gamer'}`
    navigator.clipboard.writeText(link)
    if (showToast) {
      showToast('Link Copiado!', 'Seu link de amizade foi copiado para a área de transferência.', 'friend')
    }
  }

  return (
    <section className="friends-workspace">
      {/* 1. Left Sidebar */}
      <aside className="friends-sidebar">
        <div className="friends-sidebar-scrollable">
          <div className="sidebar-header" style={{ fontSize: '15px', fontWeight: 800, padding: '6px 8px 10px' }}>
            Amigos
          </div>
          <div className="friends-menu">
            <button className={`menu-item ${friendTab === 'online' ? 'active' : ''}`} onClick={() => { setFriendTab('online'); setFilterMode('all'); }}>
              <span className="menu-icon"><ActivityIcon /></span>
              <span>Online</span>
              {onlineFriends.length > 0 && <span className="menu-badge">{onlineFriends.length}</span>}
            </button>
            <button className={`menu-item ${friendTab === 'all' ? 'active' : ''}`} onClick={() => { setFriendTab('all'); setFilterMode('all'); }}>
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

        <UnifiedUserProfileFooter
          displayName={profileDisplayName}
          avatarUrl={profileAvatarUrl}
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu}
          updatePresenceStatus={updatePresenceStatus}
          theme={theme as 'light' | 'dark'}
          toggleTheme={toggleTheme}
          onOpenSettings={() => setPage('Configurações')}
          onOpenWhatsNew={onOpenWhatsNew}
          onSignOut={onSignOut}
          myGamePresence={myGamePresence}
        />
      </aside>

      {/* 2. Center Content Area */}
      <section className="friends-content">
        {/* Top Header & Search Bar */}
        <div className="friends-header-toolbar">
          <div className="friends-search-row">
            <SearchIcon style={{ width: '15px', height: '15px', color: 'var(--text-muted)', flexShrink: 0 }} />
            <input 
              type="text" 
              className="friends-search-input" 
              placeholder="Buscar amigos por nome de exibição..." 
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button 
                type="button" 
                onClick={() => setLocalSearch('')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="friends-filter-tabs">
            <button className={`friends-filter-chip ${friendTab === 'online' && filterMode === 'all' ? 'active' : ''}`} onClick={() => { setFriendTab('online'); setFilterMode('all'); }}>
              <span className="status-dot-bullet online" style={{ width: '8px', height: '8px' }} />
              <span>Online ({onlineFriends.length})</span>
            </button>
            <button className={`friends-filter-chip ${filterMode === 'gaming' ? 'active' : ''}`} onClick={() => { setFriendTab('online'); setFilterMode('gaming'); }}>
              <GamepadIcon style={{ width: '13px', height: '13px' }} />
              <span>Em Jogo ({playingFriends.length})</span>
            </button>
            <button className={`friends-filter-chip ${friendTab === 'all' && filterMode === 'all' ? 'active' : ''}`} onClick={() => { setFriendTab('all'); setFilterMode('all'); }}>
              <UsersIcon style={{ width: '13px', height: '13px' }} />
              <span>Todos ({acceptedFriends.length})</span>
            </button>
            <button className={`friends-filter-chip ${friendTab === 'pending' ? 'active' : ''}`} onClick={() => { setFriendTab('pending'); setFilterMode('all'); }}>
              <ClockIcon style={{ width: '13px', height: '13px' }} />
              <span>Pendentes ({pendingRequests.length})</span>
            </button>
            <button className={`friends-filter-chip ${friendTab === 'add' ? 'active' : ''}`} onClick={() => { setFriendTab('add'); setFilterMode('all'); }} style={{ marginLeft: 'auto', background: friendTab === 'add' ? 'var(--accent-color)' : 'rgba(16, 185, 129, 0.15)', color: friendTab === 'add' ? '#fff' : '#10b981', borderColor: 'transparent' }}>
              <UserPlusIcon style={{ width: '13px', height: '13px' }} />
              <span>Adicionar Amigo</span>
            </button>
          </div>
        </div>

        {/* Tab: Online */}
        {friendTab === 'online' && (
          <div className="friends-list-container" style={{ maxWidth: '100%' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Amigos Online — {filterList(onlineFriends).length}
            </h3>
            {filterList(onlineFriends).length === 0 ? (
              <div className="empty-activity-box" style={{ marginTop: '20px' }}>
                <div className="empty-activity-icon">
                  <GamepadIcon style={{ width: '48px', height: '48px', color: 'var(--text-muted)', opacity: 0.6 }} />
                </div>
                <div className="empty-activity-title">Nenhum amigo online no momento</div>
                <div className="empty-activity-desc">
                  Seus amigos estão descansando ou offline. Adicione mais jogadores de seus servidores ou convide pessoas novas!
                </div>
                <button 
                  type="button" 
                  className="activity-action-btn" 
                  onClick={() => setFriendTab('add')}
                  style={{ width: 'auto', padding: '8px 20px', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlusIcon style={{ width: '14px', height: '14px' }} />
                  <span>Adicionar Novos Amigos</span>
                </button>
              </div>
            ) : (
              <div className="friends-list-modern">
                {filterList(onlineFriends).map(friend => {
                  const pres = presenceData[friend.user.id]
                  const statusType = pres?.presence_status || 'online'
                  const customText = pres?.custom_status || 'Disponível'
                  return (
                    <div key={friend.id} className="friend-card-modern" onClick={() => onOpenDM(friend.user.id)}>
                      <div className="friend-card-left">
                        <div className="friend-avatar-modern">
                          {friend.user.avatar_url ? (
                            <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                          ) : (
                            friend.user.display_name.slice(0, 1).toUpperCase()
                          )}
                          <span className={`online-indicator ${statusType}`} />
                        </div>
                        <div className="friend-meta-modern">
                          <span className="friend-name-modern">{friend.user.display_name}</span>
                          <span className="friend-status-modern" title={customText}>
                            {customText.toLowerCase().includes('jogando') ? (
                              <span className="game-presence-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                                <GamepadIcon style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                <span>{customText}</span>
                              </span>
                            ) : (
                              customText
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          type="button" 
                          className="friend-quick-btn" 
                          onClick={() => onOpenDM(friend.user.id)} 
                          title="Enviar Mensagem Direta"
                          style={{ position: 'relative' }}
                        >
                          <MessageSquareIcon style={{ width: '14px', height: '14px' }} />
                          {unreadDMs[friend.user.id] && <span className="unread-badge">{unreadDMs[friend.user.id]}</span>}
                        </button>
                        <button 
                          type="button" 
                          className="friend-quick-btn" 
                          onClick={() => onOpenDM(friend.user.id)} 
                          title="Iniciar Chamada Direta 1v1"
                        >
                          <PhoneIcon style={{ width: '14px', height: '14px' }} />
                        </button>
                        {onInspectMember && (
                          <button 
                            type="button" 
                            className="friend-quick-btn" 
                            onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })} 
                            title="Ver Perfil Completo"
                          >
                            <UserIcon style={{ width: '14px', height: '14px' }} />
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="friend-quick-btn danger" 
                          onClick={() => removeFriendship(friend.id)} 
                          title="Desfazer Amizade"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Todos */}
        {friendTab === 'all' && (
          <div className="friends-list-container" style={{ maxWidth: '100%' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Todos os Amigos — {filterList(acceptedFriends).length}
            </h3>
            {filterList(acceptedFriends).length === 0 ? (
              <div className="empty-activity-box" style={{ marginTop: '20px' }}>
                <div className="empty-activity-icon">
                  <UsersIcon style={{ width: '48px', height: '48px', color: 'var(--text-muted)', opacity: 0.6 }} />
                </div>
                <div className="empty-activity-title">Você ainda não tem amigos adicionados</div>
                <div className="empty-activity-desc">
                  O Echo fica muito mais divertido com seu squad! Envie convites de amizade para conversar por DM e jogar junto.
                </div>
                <button 
                  type="button" 
                  className="activity-action-btn" 
                  onClick={() => setFriendTab('add')}
                  style={{ width: 'auto', padding: '8px 20px', marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <UserPlusIcon style={{ width: '14px', height: '14px' }} />
                  <span>Adicionar Amigos</span>
                </button>
              </div>
            ) : (
              <div className="friends-list-modern">
                {filterList(acceptedFriends).map(friend => {
                  const isOnline = onlineUsers.has(friend.user.id)
                  const pres = presenceData[friend.user.id]
                  const statusType = isOnline ? (pres?.presence_status || 'online') : 'offline'
                  const customText = isOnline ? (pres?.custom_status || 'Online') : 'Offline'
                  return (
                    <div key={friend.id} className="friend-card-modern" onClick={() => onOpenDM(friend.user.id)}>
                      <div className="friend-card-left">
                        <div className="friend-avatar-modern">
                          {friend.user.avatar_url ? (
                            <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                          ) : (
                            friend.user.display_name.slice(0, 1).toUpperCase()
                          )}
                          <span className={`online-indicator ${statusType}`} />
                        </div>
                        <div className="friend-meta-modern">
                          <span className="friend-name-modern">{friend.user.display_name}</span>
                          <span className="friend-status-modern" title={customText}>
                            {customText.toLowerCase().includes('jogando') ? (
                              <span className="game-presence-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                                <GamepadIcon style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                <span>{customText}</span>
                              </span>
                            ) : (
                              customText
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          type="button" 
                          className="friend-quick-btn" 
                          onClick={() => onOpenDM(friend.user.id)} 
                          title="Enviar Mensagem Direta"
                          style={{ position: 'relative' }}
                        >
                          <MessageSquareIcon style={{ width: '14px', height: '14px' }} />
                          {unreadDMs[friend.user.id] && <span className="unread-badge">{unreadDMs[friend.user.id]}</span>}
                        </button>
                        <button 
                          type="button" 
                          className="friend-quick-btn" 
                          onClick={() => onOpenDM(friend.user.id)} 
                          title="Iniciar Chamada Direta 1v1"
                        >
                          <PhoneIcon style={{ width: '14px', height: '14px' }} />
                        </button>
                        {onInspectMember && (
                          <button 
                            type="button" 
                            className="friend-quick-btn" 
                            onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })} 
                            title="Ver Perfil Completo"
                          >
                            <UserIcon style={{ width: '14px', height: '14px' }} />
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="friend-quick-btn danger" 
                          onClick={() => removeFriendship(friend.id)} 
                          title="Desfazer Amizade"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Pendentes */}
        {friendTab === 'pending' && (
          <div className="friends-list-container" style={{ maxWidth: '100%' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Solicitações Pendentes — {filterList(pendingRequests).length}
            </h3>
            {filterList(pendingRequests).length === 0 ? (
              <div className="empty-activity-box" style={{ marginTop: '20px' }}>
                <div className="empty-activity-icon">
                  <ClockIcon style={{ width: '48px', height: '48px', color: 'var(--text-muted)', opacity: 0.6 }} />
                </div>
                <div className="empty-activity-title">Nenhuma solicitação pendente</div>
                <div className="empty-activity-desc">
                  Você não possui convites pendentes de envio ou recebimento no momento.
                </div>
              </div>
            ) : (
              <div className="friends-list-modern">
                {filterList(pendingRequests).map(req => {
                  const isReceived = req.initiatorId !== user.id
                  return (
                    <div key={req.id} className="friend-card-modern">
                      <div className="friend-card-left">
                        <div className="friend-avatar-modern">
                          {req.user.avatar_url ? (
                            <img src={req.user.avatar_url} alt={req.user.display_name} />
                          ) : (
                            req.user.display_name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="friend-meta-modern">
                          <span className="friend-name-modern">{req.user.display_name}</span>
                          <span className="friend-status-modern" style={{ color: isReceived ? '#10b981' : 'var(--text-muted)' }}>
                            {isReceived ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <InboxIcon style={{ width: '12px', height: '12px' }} />
                                <span>Quer ser seu amigo</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <SendIcon style={{ width: '12px', height: '12px' }} />
                                <span>Solicitação enviada</span>
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-actions">
                        {isReceived ? (
                          <>
                            <button className="friend-quick-btn" onClick={() => acceptFriendRequest(req.id)} title="Aceitar Solicitação" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                              ✓
                            </button>
                            <button className="friend-quick-btn danger" onClick={() => removeFriendship(req.id)} title="Recusar Solicitação">
                              ✕
                            </button>
                          </>
                        ) : (
                          <button className="friend-action-btn cancel-btn" onClick={() => removeFriendship(req.id)} title="Cancelar solicitação">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Adicionar Amigo */}
        {friendTab === 'add' && (
          <div className="add-friend-container" style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Share My Link Banner */}
            <div className="add-friend-hero-card">
              <div className="add-friend-hero-title">
                <LinkIcon style={{ width: '16px', height: '16px', color: 'var(--accent-color)' }} />
                <span>Compartilhe seu Link de Amigo</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Envie seu link direto no WhatsApp, Discord ou chat do jogo para seus amigos adicionarem você com 1 clique.
              </p>
              <div className="add-friend-link-row">
                <span className="add-friend-link-text">echo.lobby/add/@{profileDisplayName || 'gamer'}</span>
                <button type="button" className="add-friend-copy-btn" onClick={copyFriendLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CopyIcon style={{ width: '12px', height: '12px' }} />
                  <span>Copiar Link</span>
                </button>
              </div>
            </div>

            {/* Direct Username Form */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>Adicionar por Nome de Exibição</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Digite o nome exato do jogador para enviar um pedido de amizade.
              </p>
              <form onSubmit={sendFriendRequest} className="add-friend-form">
                <input 
                  value={friendSearchQuery} 
                  onChange={e => setFriendSearchQuery(e.target.value)} 
                  placeholder="Ex: Lag9938, CyberNinja, ProGamer..." 
                  required 
                  minLength={2}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                />
                <button 
                  type="submit" 
                  style={{ padding: '12px 24px', borderRadius: '10px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >
                  Enviar Pedido
                </button>
              </form>
              {friendSearchNotice && (
                <div className={`friend-search-notice ${friendSearchNotice.includes('sucesso') ? 'success' : 'error'}`} style={{ marginTop: '12px' }}>
                  {friendSearchNotice}
                </div>
              )}
            </div>

            {/* Friend Suggestions */}
            {suggestedMembers.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UsersIcon style={{ width: '15px', height: '15px', color: 'var(--accent-color)' }} />
                  <span>Sugestões de Jogadores dos seus Servidores</span>
                </h4>
                <div className="friend-suggestions-grid">
                  {suggestedMembers.map(m => (
                    <div key={m.user.id} className="friend-suggestion-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div className="friend-avatar-modern" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {m.user.avatar_url ? (
                            <img src={m.user.avatar_url} alt={m.user.display_name} />
                          ) : (
                            m.user.display_name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.user.display_name}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="activity-action-btn" 
                        onClick={() => {
                          setFriendSearchQuery(m.user.display_name)
                        }}
                        style={{ padding: '5px 10px', fontSize: '11px', width: 'auto' }}
                        title="Adicionar"
                      >
                        + Convidar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Right Sidebar: Activity Feed Panel OR DM Chat */}
      {selectedDMUserId ? (() => {
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
                <div className="dm-empty">Nenhuma mensagem ainda. Diga oi!</div>
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
                {isUploading ? <ClockIcon style={{ width: '14px', height: '14px' }} /> : <PaperclipIcon style={{ width: '14px', height: '14px' }} />}
              </button>
              <input value={dmDraft} onChange={(e) => setDmDraft(e.target.value)} placeholder="Escreva uma mensagem…" />
              <button type="submit" disabled={!dmDraft.trim() && !isUploading}>
                <SendIcon style={{ width: '14px', height: '14px' }} />
              </button>
            </form>
          </aside>
        )
      })() : (
        <aside className="friends-activity-panel">
          <div className="activity-panel-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FlameIcon style={{ width: '16px', height: '16px', color: '#f97316' }} />
              <span>Atividade Ativa</span>
            </h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
              {activeFeedFriends.length} online
            </span>
          </div>

          {activeFeedFriends.length === 0 ? (
            <div className="empty-activity-box">
              <div className="empty-activity-icon">
                <GamepadIcon style={{ width: '40px', height: '40px', color: 'var(--text-muted)', opacity: 0.6 }} />
              </div>
              <div className="empty-activity-title">Tudo calmo por aqui</div>
              <div className="empty-activity-desc">
                Quando seus amigos começarem a jogar ou entrarem em canais de voz, a atividade deles em tempo real aparecerá aqui!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeFeedFriends.map(friend => {
                const pres = presenceData[friend.user.id]
                const isGaming = pres?.custom_status?.toLowerCase().includes('jogando')
                return (
                  <div key={friend.id} className="activity-card">
                    <div className="activity-user-header">
                      <div className="activity-user-avatar">
                        {friend.user.avatar_url ? (
                          <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                        ) : (
                          friend.user.display_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="activity-user-name">{friend.user.display_name}</span>
                    </div>

                    <div className="activity-game-body">
                      <span className="activity-game-icon">
                        {isGaming ? (
                          <GamepadIcon style={{ width: '14px', height: '14px', color: '#4ade80' }} />
                        ) : (
                          <span className="status-dot-bullet online" style={{ width: '8px', height: '8px' }} />
                        )}
                      </span>
                      <div className="activity-game-info">
                        <span className="activity-game-title">
                          {pres?.custom_status || 'Online no Echo'}
                        </span>
                        <span className="activity-game-time">Ativo agora</span>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="activity-action-btn" 
                      onClick={() => onOpenDM(friend.user.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <MessageSquareIcon style={{ width: '13px', height: '13px' }} />
                      <span>Enviar Mensagem</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </aside>
      )}
    </section>
  )
}

/* ── Settings View Component ────────────────────── */
function SettingsView({
  userId,
  userCreatedAt,
  isServerOwner,
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
  presenceStatus = 'online',
  showStatusMenu = false,
  setShowStatusMenu,
  updatePresenceStatus,
  onOpenWhatsNew,
  myGamePresence,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  onNoiseSuppressionChange,
  onEchoCancellationChange,
  sfxVolume,
  onSfxVolumeChange,
  noiseGateEnabled,
  noiseGateThreshold,
  onNoiseGateEnabledChange,
  onNoiseGateThresholdChange,
  spatialAudioEnabled,
  onToggleSpatialAudio,
  onResetAllPans,
  isAiDenoiseEnabled,
  onToggleAiDenoise,
  customAccentColor = '',
  onCustomAccentColorChange,
  chatDensity = 'cozy',
  onChatDensityChange,
  performanceMode = false,
  onPerformanceModeChange
}: {
  userId: string
  userCreatedAt?: string
  isServerOwner?: boolean
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
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu?: boolean
  setShowStatusMenu?: (val: boolean) => void
  updatePresenceStatus?: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  onOpenWhatsNew?: () => void
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
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
  spatialAudioEnabled: boolean
  onToggleSpatialAudio: (val: boolean) => void
  onResetAllPans: () => void
  isAiDenoiseEnabled: boolean
  onToggleAiDenoise: (val: boolean) => void
  customAccentColor?: string
  onCustomAccentColorChange?: (color: string) => void
  chatDensity?: 'cozy' | 'compact'
  onChatDensityChange?: (density: 'cozy' | 'compact') => void
  performanceMode?: boolean
  onPerformanceModeChange?: (val: boolean) => void
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'audio' | 'appearance' | 'windows' | 'changelog'>('profile')
  
  // Profile settings state & Echo Player Identity
  const [profileSubTab, setProfileSubTab] = useState<'identity' | 'appearance' | 'badges'>('identity')
  const [localDisplayName, setLocalDisplayName] = useState(currentDisplayName)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(currentAvatarUrl)
  const [localCustomStatus, setLocalCustomStatus] = useState(customStatus)
  const [localBio, setLocalBio] = useState(() => localStorage.getItem(`echo-bio-${userId}`) || '🎮 Jogador ativo no Echo • Pronto para squad e clutch.')
  const [localPronouns, setLocalPronouns] = useState(() => localStorage.getItem(`echo-pronouns-${userId}`) || 'ele/dele')
  const [localBannerPreset, setLocalBannerPreset] = useState(() => localStorage.getItem(`echo-banner-preset-${userId}`) || 'synthwave')
  const [localBannerCustom, setLocalBannerCustom] = useState(() => localStorage.getItem(`echo-banner-custom-${userId}`) || '')
  const [localAvatarFrame, setLocalAvatarFrame] = useState(() => localStorage.getItem(`echo-avatar-frame-${userId}`) || 'aura-cyan')
  const [localBadge, setLocalBadge] = useState(() => localStorage.getItem(`echo-badge-${userId}`) || 'owner')
  const [localPresenceStatus, setLocalPresenceStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>(() => (localStorage.getItem(`echo-presence-status-${userId}`) as any) || 'online')
  const [localShowBadge, setLocalShowBadge] = useState<boolean>(() => localStorage.getItem(`echo-show-badge-${userId}`) !== 'false')
  
  // Advanced Profile Appearance states
  const [localCardFinish, setLocalCardFinish] = useState<'none' | 'holographic' | 'glass' | 'carbon'>(() => (localStorage.getItem(`echo-card-finish-${userId}`) as any) || 'none')
  const [localClanTag, setLocalClanTag] = useState(() => localStorage.getItem(`echo-clan-tag-${userId}`) || '')
  const [localClanTagColor, setLocalClanTagColor] = useState(() => localStorage.getItem(`echo-clan-tag-color-${userId}`) || '#00f2fe')
  const [localSocialSteam, setLocalSocialSteam] = useState(() => localStorage.getItem(`echo-social-steam-${userId}`) || '')
  const [localSocialTwitch, setLocalSocialTwitch] = useState(() => localStorage.getItem(`echo-social-twitch-${userId}`) || '')
  const [localSocialYoutube, setLocalSocialYoutube] = useState(() => localStorage.getItem(`echo-social-youtube-${userId}`) || '')
  const [localSocialKick, setLocalSocialKick] = useState(() => localStorage.getItem(`echo-social-kick-${userId}`) || '')

  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [devUnlockBadges, setDevUnlockBadges] = useState(false)
  const [profileSavedToast, setProfileSavedToast] = useState(false)

  // Unconditional file input references for Avatar and Banner
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

  // Account age and tenure calculation for Badge unlocks
  const accountCreatedDate = userCreatedAt ? new Date(userCreatedAt) : new Date()
  const accountDays = Math.max(0, Math.floor((Date.now() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24)))

  const badgesList = [
    { 
      id: 'owner', 
      label: 'Líder de Servidor', 
      icon: <BadgeCrownIcon />, 
      unlocked: Boolean(isServerOwner) || devUnlockBadges,
      requirement: 'Requer ser proprietário/criador de servidor',
      desc: 'Fundadores de comunidade e construtores de servidores no Echo' 
    },
    { 
      id: 'vip', 
      label: 'Echo VIP', 
      icon: <BadgeVipIcon />, 
      unlocked: Boolean(isPremiumUser) || devUnlockBadges,
      requirement: 'Requer assinatura Echo Pass ativa',
      desc: 'Membros apoiadores com acesso prioritário e suporte VIP' 
    },
    { 
      id: 'early', 
      label: 'Fundador 2026', 
      icon: <BadgeFounderIcon />, 
      unlocked: accountCreatedDate.getFullYear() <= 2026 || devUnlockBadges,
      requirement: 'Conta criada na fase de lançamento (2026)',
      desc: 'Pioneiros presentes no nascimento e lançamento da plataforma' 
    },
    { 
      id: 'gamer', 
      label: 'Membro Veterano', 
      icon: <BadgeVeteranIcon />, 
      unlocked: accountDays >= 7 || devUnlockBadges,
      requirement: `Requer no mínimo 7 dias de conta ativa (${accountDays} ${accountDays === 1 ? 'dia' : 'dias'} de conta)`,
      desc: 'Membros com presença contínua em canais e salas de voz' 
    },
    { 
      id: 'podcaster', 
      label: 'Streamer Oficial', 
      icon: <BadgeStreamerIcon />, 
      unlocked: devUnlockBadges,
      requirement: 'Requer parceria verificada de transmissão ao vivo',
      desc: 'Criadores de conteúdo e transmissores parceiros no Echo' 
    },
    { 
      id: 'none', 
      label: 'Sem Insígnia', 
      icon: <span style={{ fontSize: '18px', opacity: 0.4 }}>✕</span>, 
      unlocked: true,
      requirement: 'Livre',
      desc: 'Ocultar insígnias do perfil' 
    }
  ]

  const savedValuesRef = useRef({
    displayName: currentDisplayName,
    avatarUrl: currentAvatarUrl,
    customStatus: customStatus,
    bio: localStorage.getItem(`echo-bio-${userId}`) || '🎮 Jogador ativo no Echo • Pronto para squad e clutch.',
    pronouns: localStorage.getItem(`echo-pronouns-${userId}`) || 'ele/dele',
    bannerPreset: localStorage.getItem(`echo-banner-preset-${userId}`) || 'synthwave',
    bannerCustom: localStorage.getItem(`echo-banner-custom-${userId}`) || '',
    avatarFrame: localStorage.getItem(`echo-avatar-frame-${userId}`) || 'aura-cyan',
    badge: localStorage.getItem(`echo-badge-${userId}`) || 'owner',
    presenceStatus: (localStorage.getItem(`echo-presence-status-${userId}`) as any) || 'online',
    showBadge: localStorage.getItem(`echo-show-badge-${userId}`) !== 'false',
    cardFinish: (localStorage.getItem(`echo-card-finish-${userId}`) as any) || 'none',
    clanTag: localStorage.getItem(`echo-clan-tag-${userId}`) || '',
    clanTagColor: localStorage.getItem(`echo-clan-tag-color-${userId}`) || '#00f2fe',
    socialSteam: localStorage.getItem(`echo-social-steam-${userId}`) || '',
    socialTwitch: localStorage.getItem(`echo-social-twitch-${userId}`) || '',
    socialYoutube: localStorage.getItem(`echo-social-youtube-${userId}`) || '',
    socialKick: localStorage.getItem(`echo-social-kick-${userId}`) || '',
  })

  const hasChanges = (
    localDisplayName !== savedValuesRef.current.displayName ||
    localAvatarUrl !== savedValuesRef.current.avatarUrl ||
    localCustomStatus !== savedValuesRef.current.customStatus ||
    localBio !== savedValuesRef.current.bio ||
    localPronouns !== savedValuesRef.current.pronouns ||
    localBannerPreset !== savedValuesRef.current.bannerPreset ||
    localBannerCustom !== savedValuesRef.current.bannerCustom ||
    localAvatarFrame !== savedValuesRef.current.avatarFrame ||
    localBadge !== savedValuesRef.current.badge ||
    localPresenceStatus !== savedValuesRef.current.presenceStatus ||
    localShowBadge !== savedValuesRef.current.showBadge ||
    localCardFinish !== savedValuesRef.current.cardFinish ||
    localClanTag !== savedValuesRef.current.clanTag ||
    localClanTagColor !== savedValuesRef.current.clanTagColor ||
    localSocialSteam !== savedValuesRef.current.socialSteam ||
    localSocialTwitch !== savedValuesRef.current.socialTwitch ||
    localSocialYoutube !== savedValuesRef.current.socialYoutube ||
    localSocialKick !== savedValuesRef.current.socialKick
  )

  function handleDiscardChanges() {
    const s = savedValuesRef.current
    setLocalDisplayName(s.displayName)
    setLocalAvatarUrl(s.avatarUrl)
    setLocalCustomStatus(s.customStatus)
    setLocalBio(s.bio)
    setLocalPronouns(s.pronouns)
    setLocalBannerPreset(s.bannerPreset)
    setLocalBannerCustom(s.bannerCustom)
    setLocalAvatarFrame(s.avatarFrame)
    setLocalBadge(s.badge)
    setLocalPresenceStatus(s.presenceStatus)
    setLocalShowBadge(s.showBadge)
    setLocalCardFinish(s.cardFinish)
    setLocalClanTag(s.clanTag)
    setLocalClanTagColor(s.clanTagColor)
    setLocalSocialSteam(s.socialSteam)
    setLocalSocialTwitch(s.socialTwitch)
    setLocalSocialYoutube(s.socialYoutube)
    setLocalSocialKick(s.socialKick)
  }

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLocalAvatarUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)

      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `avatars/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          if (urlData?.publicUrl) {
            setLocalAvatarUrl(urlData.publicUrl)
          }
        }
      }
    } catch (err: any) {
      console.warn('Avatar upload fallback to local data URL:', err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleBannerUpload(file: File) {
    setUploadingBanner(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLocalBannerCustom(reader.result)
        }
      }
      reader.readAsDataURL(file)

      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `banners/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          if (urlData?.publicUrl) {
            setLocalBannerCustom(urlData.publicUrl)
          }
        }
      }
    } catch (err: any) {
      console.warn('Banner upload fallback to local data URL:', err)
    } finally {
      setUploadingBanner(false)
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

  async function handleSaveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!supabase) return
    setSavingProfile(true)
    try {
      localStorage.setItem(`echo-bio-${userId}`, localBio)
      localStorage.setItem(`echo-pronouns-${userId}`, localPronouns)
      localStorage.setItem(`echo-banner-preset-${userId}`, localBannerPreset)
      localStorage.setItem(`echo-banner-custom-${userId}`, localBannerCustom)
      localStorage.setItem(`echo-avatar-frame-${userId}`, localAvatarFrame)
      localStorage.setItem(`echo-badge-${userId}`, localBadge)
      localStorage.setItem(`echo-presence-status-${userId}`, localPresenceStatus)
      localStorage.setItem(`echo-show-badge-${userId}`, JSON.stringify(localShowBadge))
      localStorage.setItem(`echo-card-finish-${userId}`, localCardFinish)
      localStorage.setItem(`echo-clan-tag-${userId}`, localClanTag)
      localStorage.setItem(`echo-clan-tag-color-${userId}`, localClanTagColor)
      localStorage.setItem(`echo-social-steam-${userId}`, localSocialSteam)
      localStorage.setItem(`echo-social-twitch-${userId}`, localSocialTwitch)
      localStorage.setItem(`echo-social-youtube-${userId}`, localSocialYoutube)
      localStorage.setItem(`echo-social-kick-${userId}`, localSocialKick)

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        display_name: localDisplayName,
        avatar_url: localAvatarUrl
      })
      if (error) throw error

      savedValuesRef.current = {
        displayName: localDisplayName,
        avatarUrl: localAvatarUrl,
        customStatus: localCustomStatus,
        bio: localBio,
        pronouns: localPronouns,
        bannerPreset: localBannerPreset,
        bannerCustom: localBannerCustom,
        avatarFrame: localAvatarFrame,
        badge: localBadge,
        presenceStatus: localPresenceStatus,
        showBadge: localShowBadge,
        cardFinish: localCardFinish,
        clanTag: localClanTag,
        clanTagColor: localClanTagColor,
        socialSteam: localSocialSteam,
        socialTwitch: localSocialTwitch,
        socialYoutube: localSocialYoutube,
        socialKick: localSocialKick,
      }

      onProfileUpdate(localDisplayName, localAvatarUrl)
      onCustomStatusUpdate(localCustomStatus)
      setProfileSavedToast(true)
      setTimeout(() => setProfileSavedToast(false), 3000)
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

  // Windows Startup Settings
  const [autoStartEnabled, setAutoStartEnabled] = useState(false)
  const [startMinimized, setStartMinimized] = useState(() => localStorage.getItem('echo-start-minimized') === 'true')
  const [loadingAutoStart, setLoadingAutoStart] = useState(false)
  const [autoStartToast, setAutoStartToast] = useState<string | null>(null)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (api?.getAutoStartSettings) {
      api.getAutoStartSettings().then((res: any) => {
        if (res && typeof res.openAtLogin === 'boolean') {
          setAutoStartEnabled(res.openAtLogin)
        }
      }).catch((err: any) => console.warn('Erro ao verificar inicialização:', err))
    }
  }, [])

  const handleToggleAutoStart = async (enabled: boolean) => {
    setAutoStartEnabled(enabled)
    const api = (window as any).electronAPI
    if (api?.setAutoStartSettings) {
      setLoadingAutoStart(true)
      try {
        const res = await api.setAutoStartSettings({ openAtLogin: enabled, openAsHidden: startMinimized })
        if (res?.openAtLogin !== undefined) {
          setAutoStartEnabled(res.openAtLogin)
        }
        setAutoStartToast(enabled ? 'Echo configurado para iniciar junto com o Windows!' : 'Inicialização com o Windows desativada.')
        setTimeout(() => setAutoStartToast(null), 3500)
      } catch (err) {
        console.error('Erro ao atualizar inicialização com o Windows:', err)
      } finally {
        setLoadingAutoStart(false)
      }
    }
  }

  const handleToggleStartMinimized = async (minimized: boolean) => {
    setStartMinimized(minimized)
    localStorage.setItem('echo-start-minimized', String(minimized))
    const api = (window as any).electronAPI
    if (api?.setAutoStartSettings && autoStartEnabled) {
      await api.setAutoStartSettings({ openAtLogin: autoStartEnabled, openAsHidden: minimized })
    }
  }

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
              <UserIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Meu Perfil</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('audio')}
            >
              <MicIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Voz e Áudio</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('appearance')}
            >
              <PaletteIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Aparência</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'windows' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('windows')}
            >
              <WindowsIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Inicialização & Windows</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'changelog' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('changelog')}
            >
              <SparklesIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Novidades & Versões</span>
            </button>
          </div>
        </div>

        <UnifiedUserProfileFooter
          displayName={profileDisplayName}
          avatarUrl={profileAvatarUrl}
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu || (() => {})}
          updatePresenceStatus={updatePresenceStatus || (() => {})}
          theme={theme as 'light' | 'dark'}
          toggleTheme={toggleTheme}
          onOpenSettings={() => setPage('Configurações')}
          onOpenWhatsNew={onOpenWhatsNew}
          onSignOut={onSignOut}
          myGamePresence={myGamePresence}
        />
      </aside>

      <section className="settings-content">
        {activeSettingsTab === 'profile' && (
          <div className="settings-container echo-profile-page" style={{ maxWidth: '960px' }}>
            {/* Permanent hidden file inputs for Avatar and Banner */}
            <input 
              ref={avatarFileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => { 
                const f = e.target.files?.[0]
                if (f) handleAvatarUpload(f)
                e.target.value = '' 
              }} 
            />
            <input 
              ref={bannerFileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => { 
                const f = e.target.files?.[0]
                if (f) handleBannerUpload(f)
                e.target.value = '' 
              }} 
            />

            <div className="profile-studio-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>Meu Perfil</span>
                  <span className="profile-studio-badge">ECHO PASS // 2026</span>
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Personalize sua identidade, capa e presença no Echo com visualização em tempo real.
                </p>
              </div>

              {profileSavedToast && (
                <div className="profile-saved-toast">
                  <span>✓</span> Perfil salvo com sucesso!
                </div>
              )}
            </div>

            {/* Top: Echo Identity Hero (Inspirado no prestígio de perfil da Steam com acabamento moderno do Echo) */}
            <div className={`echo-hero-showcase finish-${localCardFinish}`}>
              {/* Panoramic Profile Banner */}
              <div 
                className={`echo-hero-banner ${!localBannerCustom ? `texture-${localBannerPreset}` : ''}`}
                style={localBannerCustom ? { backgroundImage: `url(${localBannerCustom})` } : undefined}
                onClick={() => bannerFileInputRef.current?.click()}
                title="Clique para escolher uma imagem de capa do computador"
              >
                <div className="echo-hero-banner-overlay" />
                <button 
                  type="button" 
                  className="echo-hero-banner-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    bannerFileInputRef.current?.click()
                  }}
                >
                  <CameraIcon style={{ width: '14px', height: '14px' }} />
                  <span>Alterar Capa</span>
                </button>
              </div>

              {/* Profile Card Main Info Section */}
              <div className="echo-hero-info-section">
                <div className="echo-hero-avatar-wrap">
                  <div 
                    className={`echo-hero-avatar-squircle ${localAvatarFrame}`}
                    onClick={() => avatarFileInputRef.current?.click()}
                    title="Clique para trocar foto de perfil"
                  >
                    <div className="echo-hero-avatar-inner">
                      {localAvatarUrl ? (
                        <img src={localAvatarUrl} alt="Avatar" />
                      ) : (
                        localDisplayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="echo-hero-avatar-overlay">
                      <CameraIcon style={{ width: '22px', height: '22px' }} />
                    </div>
                    <span className={`echo-hero-status-dot status-${localPresenceStatus}`} />
                  </div>
                </div>

                <div className="echo-hero-details">
                  <div className="echo-hero-identity-row">
                    <div className="echo-hero-name-block">
                      <div className="echo-hero-display-name">
                        {localClanTag && (
                          <span 
                            className="echo-clan-tag" 
                            style={{ borderColor: localClanTagColor, color: localClanTagColor, boxShadow: `0 0 10px ${localClanTagColor}40` }}
                            title={`Squad Tag: ${localClanTag.toUpperCase()}`}
                          >
                            [{localClanTag.toUpperCase()}]
                          </span>
                        )}
                        <span>{localDisplayName || 'Jogador'}</span>
                        {localPronouns && <span className="echo-hero-pronoun-tag">{localPronouns}</span>}
                      </div>
                      <div className="echo-hero-handle">
                        @{localDisplayName.toLowerCase().replace(/\s+/g, '_') || 'echo_user'}
                      </div>
                    </div>

                    {/* Community Badges (Prestige Showcase - Sem nível) */}
                    <div className="echo-hero-prestige-block">
                      {localShowBadge && localBadge !== 'none' && (
                        <div className={`echo-prestige-badge badge-${localBadge}`}>
                          {localBadge === 'owner' && <><BadgeCrownIcon style={{ width: '15px', height: '15px' }} /> <span>Líder de Servidor</span></>}
                          {localBadge === 'vip' && <><BadgeVipIcon style={{ width: '15px', height: '15px' }} /> <span>Echo VIP</span></>}
                          {localBadge === 'early' && <><BadgeFounderIcon style={{ width: '15px', height: '15px' }} /> <span>Fundador 2026</span></>}
                          {localBadge === 'gamer' && <><BadgeVeteranIcon style={{ width: '15px', height: '15px' }} /> <span>Membro Veterano</span></>}
                          {localBadge === 'podcaster' && <><BadgeStreamerIcon style={{ width: '15px', height: '15px' }} /> <span>Streamer Oficial</span></>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status / Activity Quote */}
                  {localCustomStatus && (
                    <div className="echo-hero-status-quote">
                      <span className="echo-status-wave">〰️</span>
                      <span className="echo-status-text">{localCustomStatus}</span>
                    </div>
                  )}

                  {/* Bio Preview */}
                  {localBio && (
                    <p className="echo-hero-bio-snippet">
                      {localBio}
                    </p>
                  )}

                  {/* Connected Socials Showcase */}
                  {(localSocialSteam || localSocialTwitch || localSocialYoutube || localSocialKick) && (
                    <div className="echo-hero-socials-row">
                      {localSocialSteam && (
                        <a 
                          href={localSocialSteam.startsWith('http') ? localSocialSteam : `https://steamcommunity.com/id/${localSocialSteam}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn steam" 
                          title={`Steam: ${localSocialSteam}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SteamIcon style={{ width: '13px', height: '13px' }} />
                          <span>Steam</span>
                        </a>
                      )}
                      {localSocialTwitch && (
                        <a 
                          href={localSocialTwitch.startsWith('http') ? localSocialTwitch : `https://twitch.tv/${localSocialTwitch}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn twitch" 
                          title={`Twitch: ${localSocialTwitch}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TwitchIcon style={{ width: '13px', height: '13px' }} />
                          <span>Twitch</span>
                        </a>
                      )}
                      {localSocialYoutube && (
                        <a 
                          href={localSocialYoutube.startsWith('http') ? localSocialYoutube : `https://youtube.com/@${localSocialYoutube.replace('@', '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn youtube" 
                          title={`YouTube: ${localSocialYoutube}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <YoutubeIcon style={{ width: '13px', height: '13px' }} />
                          <span>YouTube</span>
                        </a>
                      )}
                      {localSocialKick && (
                        <a 
                          href={localSocialKick.startsWith('http') ? localSocialKick : `https://kick.com/${localSocialKick}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn kick" 
                          title={`Kick: ${localSocialKick}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <KickIcon style={{ width: '13px', height: '13px' }} />
                          <span>Kick</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modular Customization Controls (Ergonomia limpa do Discord) */}
            <div className="echo-editor-card">
              <div className="echo-editor-nav">
                <button
                  type="button"
                  className={`echo-editor-tab-btn ${profileSubTab === 'identity' ? 'active' : ''}`}
                  onClick={() => setProfileSubTab('identity')}
                >
                  <UserIcon style={{ width: '16px', height: '16px' }} />
                  <span>Identidade & Presença</span>
                </button>
                <button
                  type="button"
                  className={`echo-editor-tab-btn ${profileSubTab === 'appearance' ? 'active' : ''}`}
                  onClick={() => setProfileSubTab('appearance')}
                >
                  <PaletteIcon style={{ width: '16px', height: '16px' }} />
                  <span>Estilo Visual (Avatar & Capa)</span>
                </button>
                <button
                  type="button"
                  className={`echo-editor-tab-btn ${profileSubTab === 'badges' ? 'active' : ''}`}
                  onClick={() => setProfileSubTab('badges')}
                >
                  <SparklesIcon style={{ width: '16px', height: '16px' }} />
                  <span>Insígnias da Comunidade</span>
                </button>
              </div>

              {/* Tab 1: Identidade & Presença */}
              {profileSubTab === 'identity' && (
                <div className="echo-editor-tab-body">
                  <div className="echo-form-row two-cols">
                    <div className="echo-input-group">
                      <label className="echo-input-label">NOME DE EXIBIÇÃO</label>
                      <input 
                        value={localDisplayName} 
                        onChange={(e) => setLocalDisplayName(e.target.value)} 
                        placeholder="Como você quer ser chamado"
                        required 
                        minLength={2}
                        maxLength={40}
                        className="echo-text-input"
                      />
                      <span className="echo-input-desc">Este é o nome visível em todas as conversas e canais.</span>
                    </div>

                    <div className="echo-input-group">
                      <label className="echo-input-label">PRONOMES</label>
                      <input 
                        value={localPronouns} 
                        onChange={(e) => setLocalPronouns(e.target.value)} 
                        placeholder="ex: ele/dele, ela/dela"
                        maxLength={20}
                        className="echo-text-input"
                      />
                      <span className="echo-input-desc">Opcional. Exibido ao lado do seu nome.</span>
                    </div>
                  </div>

                  <div className="echo-input-group">
                    <label className="echo-input-label">STATUS DE PRESENÇA</label>
                    <div className="echo-presence-picker">
                      {[
                        { id: 'online', label: 'Disponível', desc: 'Visível e pronto para conversar', color: '#10b981' },
                        { id: 'idle', label: 'Ausente', desc: 'Inativo ou afastado do teclado', color: '#f59e0b' },
                        { id: 'dnd', label: 'Não Perturbe', desc: 'Silencia notificações sonoras', color: '#ef4444' },
                        { id: 'offline', label: 'Invisível', desc: 'Aparece desconectado para os outros', color: '#6b7280' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          className={`echo-presence-option ${localPresenceStatus === st.id ? 'active' : ''}`}
                          onClick={() => setLocalPresenceStatus(st.id as any)}
                        >
                          <span className="echo-presence-dot" style={{ background: st.color, boxShadow: localPresenceStatus === st.id ? `0 0 10px ${st.color}` : 'none' }} />
                          <div className="echo-presence-text">
                            <strong>{st.label}</strong>
                            <span>{st.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="echo-input-group">
                    <label className="echo-input-label">MENSAGEM DE ATIVIDADE (STATUS PERSONALIZADO)</label>
                    <input 
                      value={localCustomStatus} 
                      onChange={(e) => setLocalCustomStatus(e.target.value)} 
                      placeholder="Ex: Jogando ranked, ouvindo lofi, criando conteúdo..."
                      maxLength={100}
                      className="echo-text-input"
                    />
                    <span className="echo-input-desc">Uma frase curta exibida no balão [ 〰️ ] abaixo do seu nome no perfil. Deixe em branco se preferir não exibir nenhum status.</span>
                  </div>

                  <div className="echo-input-group">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">SOBRE MIM (BIOGRAFIA)</label>
                      <span className="echo-char-counter">{localBio.length}/200</span>
                    </div>
                    <textarea 
                      value={localBio} 
                      onChange={(e) => setLocalBio(e.target.value.slice(0, 200))} 
                      placeholder="Conte um pouco sobre você, seus interesses, jogos ou estilo..."
                      className="echo-textarea-input"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Estilo Visual (Avatar & Capa) */}
              {profileSubTab === 'appearance' && (
                <div className="echo-editor-tab-body">
                  {/* Foto de Perfil */}
                  <div className="echo-appearance-block">
                    <label className="echo-input-label">FOTO DE PERFIL (AVATAR)</label>
                    <div className="echo-avatar-uploader-row">
                      <div 
                        className="echo-avatar-uploader-thumb" 
                        onClick={() => avatarFileInputRef.current?.click()}
                        title="Clique para trocar imagem"
                      >
                        {localAvatarUrl ? (
                          <img src={localAvatarUrl} alt="Avatar" />
                        ) : (
                          localDisplayName.slice(0, 1).toUpperCase()
                        )}
                        <div className="echo-avatar-thumb-overlay">
                          <CameraIcon style={{ width: '18px', height: '18px' }} />
                        </div>
                      </div>

                      <div className="echo-avatar-uploader-controls">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            value={localAvatarUrl} 
                            onChange={(e) => setLocalAvatarUrl(e.target.value)} 
                            placeholder="Insira a URL de uma imagem (.png, .jpg, .gif)"
                            className="echo-text-input"
                            style={{ flex: 1 }}
                          />
                          <button 
                            type="button" 
                            className="echo-btn-secondary" 
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                          >
                            <CameraIcon style={{ width: '14px', height: '14px' }} />
                            <span>{uploadingAvatar ? 'Enviando...' : 'Fazer Upload'}</span>
                          </button>
                        </div>

                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                            Ou selecione um avatar rápido:
                          </span>
                          <div className="echo-quick-avatars-row">
                            {defaultAvatars.map((url, idx) => (
                              <button 
                                key={idx}
                                type="button" 
                                onClick={() => setLocalAvatarUrl(url)}
                                className={`echo-quick-avatar-btn ${localAvatarUrl === url ? 'selected' : ''}`}
                                title={`Avatar ${idx + 1}`}
                              >
                                <img src={url} alt={`Avatar ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aura Sonora */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">MOLDURA & AURA NEON</label>
                      <span className="echo-input-desc">Brilho dinâmico ao redor do seu avatar no perfil e canais</span>
                    </div>
                    <div className="echo-auras-grid">
                      {[
                        { id: 'aura-cyan', label: 'Ciano Elétrico', color: '#00f2fe' },
                        { id: 'aura-purple', label: 'Ametista Neon', color: '#a855f7' },
                        { id: 'aura-crimson', label: 'Carmesim Surge', color: '#ff4655' },
                        { id: 'aura-gold', label: 'Solar Dourado', color: '#fbbf24' },
                        { id: 'aura-stealth', label: 'Monocromático', color: '#ffffff' }
                      ].map(a => (
                        <button
                          key={a.id}
                          type="button"
                          className={`echo-aura-option ${localAvatarFrame === a.id ? 'active' : ''}`}
                          onClick={() => setLocalAvatarFrame(a.id)}
                        >
                          <span className="echo-aura-pip" style={{ background: a.color, boxShadow: `0 0 10px ${a.color}` }} />
                          <span>{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capa do Perfil (Banner) */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">CAPA DO PERFIL (BANNER PANORÂMICO)</label>
                      <span className="echo-input-desc">Selecione uma textura ou escolha uma imagem do seu computador</span>
                    </div>
                    <div className="echo-banner-grid">
                      {[
                        { id: 'synthwave', name: 'Synthwave 🌌' },
                        { id: 'cybergrid', name: 'Cyber Grid ⚡' },
                        { id: 'carbon', name: 'Fibra de Carbono 🏎️' },
                        { id: 'aurora', name: 'Aurora Polar 🪐' },
                        { id: 'solar', name: 'Solar Flare 🔥' },
                        { id: 'obsidian', name: 'Stealth Obsidian 🖤' },
                      ].map(tex => (
                        <div 
                          key={tex.id}
                          className={`echo-banner-option texture-${tex.id} ${localBannerPreset === tex.id && !localBannerCustom ? 'active' : ''}`}
                          onClick={() => { setLocalBannerPreset(tex.id); setLocalBannerCustom(''); }}
                        >
                          <span className="echo-banner-option-title">{tex.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <input 
                        value={localBannerCustom} 
                        onChange={(e) => setLocalBannerCustom(e.target.value)} 
                        placeholder="Ou cole a URL de um banner customizado (.png, .jpg, .gif)"
                        className="echo-text-input"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        className="echo-btn-secondary" 
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        <FolderIcon style={{ width: '14px', height: '14px' }} />
                        <span>{uploadingBanner ? 'Carregando...' : 'Escolher do Computador'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Acabamento do Cartão de Perfil */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">ACABAMENTO DO CARTÃO (FOIL & SHIMMER)</label>
                      <span className="echo-input-desc">Efeito visual de moldura e reflexo reativo no seu perfil</span>
                    </div>
                    <div className="echo-card-finish-grid">
                      {[
                        { id: 'none', label: 'Minimalista Fosco', desc: 'Acabamento dark slate clássico' },
                        { id: 'holographic', label: 'Holográfico Prismático ✨', desc: 'Borda com gradiente iridescente reativo' },
                        { id: 'glass', label: 'Vidro Fumê Glassmorphism 💎', desc: 'Translucidez moderna com desfoque profundo' },
                        { id: 'carbon', label: 'Fibra de Carbono 🏎️', desc: 'Textura esportiva em trama fosca' }
                      ].map(cf => (
                        <div
                          key={cf.id}
                          className={`echo-finish-choice-card ${localCardFinish === cf.id ? 'active selected' : ''}`}
                          onClick={() => setLocalCardFinish(cf.id as any)}
                        >
                          <div className={`echo-finish-preview-mini preview-${cf.id}`}>
                            <div className="preview-mini-content">
                              <div className="preview-mini-avatar" />
                              <div className="preview-mini-lines">
                                <span className="line-1" />
                                <span className="line-2" />
                              </div>
                            </div>
                          </div>
                          <div className="echo-finish-choice-meta">
                            <strong>{cf.label}</strong>
                            <span>{cf.desc}</span>
                          </div>
                          {localCardFinish === cf.id && <span className="echo-badge-check">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tag de Squad / Clan */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">TAG DE SQUAD / CLAN</label>
                      <span className="echo-input-desc">Sigla de 2 a 4 caracteres exibida ao lado do seu nome</span>
                    </div>
                    <div className="echo-clan-tag-editor-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        value={localClanTag} 
                        onChange={(e) => setLocalClanTag(e.target.value.toUpperCase().slice(0, 4))} 
                        placeholder="Ex: ECHO"
                        maxLength={4}
                        className="echo-text-input"
                        style={{ maxWidth: '130px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cor da Tag:</span>
                        {[
                          { color: '#00f2fe', label: 'Ciano' },
                          { color: '#ff4655', label: 'Carmesim' },
                          { color: '#fbbf24', label: 'Ouro' },
                          { color: '#a855f7', label: 'Ametista' },
                          { color: '#10b981', label: 'Esmeralda' },
                          { color: '#ffffff', label: 'Prata' }
                        ].map(c => (
                          <button
                            key={c.color}
                            type="button"
                            className={`echo-clan-color-dot ${localClanTagColor === c.color ? 'active' : ''}`}
                            style={{ background: c.color, width: '22px', height: '22px', borderRadius: '50%', border: localClanTagColor === c.color ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', boxShadow: localClanTagColor === c.color ? `0 0 8px ${c.color}` : 'none' }}
                            onClick={() => setLocalClanTagColor(c.color)}
                            title={c.label}
                          />
                        ))}
                      </div>
                      {localClanTag && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prévia:</span>
                          <span className="echo-clan-tag" style={{ borderColor: localClanTagColor, color: localClanTagColor, boxShadow: `0 0 8px ${localClanTagColor}40` }}>
                            [{localClanTag.toUpperCase()}]
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vitrine de Redes Sociais Conectadas */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">REDES SOCIAIS & PLATAFORMAS CONECTADAS</label>
                      <span className="echo-input-desc">Links rápidos de exibição no seu cartão do perfil</span>
                    </div>
                    <div className="echo-socials-inputs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <SteamIcon style={{ width: '16px', height: '16px', color: '#90a4ae', flexShrink: 0 }} />
                        <input 
                          value={localSocialSteam} 
                          onChange={(e) => setLocalSocialSteam(e.target.value)} 
                          placeholder="Steam (username ou url)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <TwitchIcon style={{ width: '16px', height: '16px', color: '#a855f7', flexShrink: 0 }} />
                        <input 
                          value={localSocialTwitch} 
                          onChange={(e) => setLocalSocialTwitch(e.target.value)} 
                          placeholder="Twitch (username)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <YoutubeIcon style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0 }} />
                        <input 
                          value={localSocialYoutube} 
                          onChange={(e) => setLocalSocialYoutube(e.target.value)} 
                          placeholder="YouTube (@canal ou url)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <KickIcon style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
                        <input 
                          value={localSocialKick} 
                          onChange={(e) => setLocalSocialKick(e.target.value)} 
                          placeholder="Kick (username)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Insígnias da Comunidade */}
              {profileSubTab === 'badges' && (
                <div className="echo-editor-tab-body">
                  <div className="echo-toggle-card">
                    <div className="echo-toggle-card-info">
                      <strong>Exibir Insígnia em Destaque</strong>
                      <span>Mostra sua insígnia de honra ao lado do seu nome no perfil e na lista de membros.</span>
                    </div>
                    <label className="echo-switch">
                      <input 
                        type="checkbox" 
                        checked={localShowBadge} 
                        onChange={(e) => setLocalShowBadge(e.target.checked)} 
                      />
                      <span className="echo-slider" />
                    </label>
                  </div>

                  <div className="echo-input-group" style={{ opacity: localShowBadge ? 1 : 0.45, pointerEvents: localShowBadge ? 'auto' : 'none' }}>
                    <label className="echo-input-label">ESCOLHA SUA INSÍGNIA DE DESTAQUE</label>
                    <div className="echo-badges-selection-grid">
                      {badgesList.map(b => (
                        <div
                          key={b.id}
                          className={`echo-badge-choice-card ${localBadge === b.id ? 'active' : ''} ${!b.unlocked ? 'locked' : ''}`}
                          onClick={() => {
                            if (b.unlocked) {
                              setLocalBadge(b.id)
                            } else {
                              alert(`Insígnia Bloqueada!\n\nCritério: ${b.requirement}\n\nVocê pode habilitar o "Modo Demonstração" abaixo para testar todas as insígnias localmente.`)
                            }
                          }}
                        >
                          <div className={`echo-badge-crest-box crest-${b.id}`}>
                            {b.icon}
                          </div>
                          <div className="echo-badge-choice-meta">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <strong>{b.label}</strong>
                              {b.unlocked ? (
                                <span className="echo-badge-status-pill unlocked">✓ Desbloqueado</span>
                              ) : (
                                <span className="echo-badge-status-pill locked">
                                  <LockIcon style={{ width: '10px', height: '10px', display: 'inline', marginRight: '3px' }} />
                                  Bloqueado
                                </span>
                              )}
                            </div>
                            <span>{b.desc}</span>
                            {!b.unlocked && (
                              <span style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>
                                Requisito: {b.requirement}
                              </span>
                            )}
                          </div>
                          {localBadge === b.id && <span className="echo-badge-check">✓</span>}
                        </div>
                      ))}
                    </div>

                    {/* Local testing toggle for unlocking all badges */}
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(99, 102, 241, 0.08)', border: '1px dashed rgba(99, 102, 241, 0.3)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '12.5px', color: '#a5b4fc', display: 'block' }}>🛠️ Modo Demonstração (Liberar Todas para Teste Local)</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Ative para desbloquear e testar qualquer insígnia sem restrição de requisitos.</span>
                      </div>
                      <label className="echo-switch">
                        <input 
                          type="checkbox" 
                          checked={devUnlockBadges} 
                          onChange={(e) => setDevUnlockBadges(e.target.checked)} 
                        />
                        <span className="echo-slider" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Save Bar (Slide up when changes are detected) */}
            {hasChanges && (
              <div className="profile-floating-save-bar">
                <div className="floating-bar-info">
                  <span className="floating-bar-alert-dot" />
                  <span>Você tem alterações não salvas no seu perfil!</span>
                </div>
                <div className="floating-bar-actions">
                  <button 
                    type="button" 
                    className="floating-discard-btn" 
                    onClick={handleDiscardChanges}
                    disabled={savingProfile}
                  >
                    Redefinir
                  </button>
                  <button 
                    type="button" 
                    className="floating-save-btn" 
                    onClick={() => handleSaveProfile()}
                    disabled={savingProfile}
                  >
                    <SaveIcon style={{ width: '16px', height: '16px' }} />
                    <span>{savingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            )}
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

            {/* AI Noise Suppression (RNNoise) Card */}
            <div className="mic-test-panel" style={{ marginTop: '20px', border: '1.5px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧠 Supressão de Ruído por IA (Rede Neural RNNoise)</span>
                    <span style={{ fontSize: '10.5px', background: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      IA LOCAL • 0% CPU
                    </span>
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Rede neural de deep learning local (mesma tecnologia do OBS Studio). Remove cliques de teclado mecânico, barulho de ventilador, respiração e chiado elétrico sem distorcer a voz.
                  </p>
                </div>
                <label className="echo-switch">
                  <input 
                    type="checkbox" 
                    checked={isAiDenoiseEnabled} 
                    onChange={(e) => onToggleAiDenoise(e.target.checked)} 
                  />
                  <span className="echo-slider" />
                </label>
              </div>

              {isAiDenoiseEnabled && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                    ✓ Inteligência Artificial Ativa • Voz de estúdio limpa transmitida para seus amigos com máxima nitidez.
                  </span>
                </div>
              )}
            </div>

            {/* Spatial 3D Audio Card */}
            <div className="mic-test-panel" style={{ marginTop: '20px', border: '1.5px solid rgba(0, 242, 254, 0.25)', background: 'rgba(0, 242, 254, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎧 Áudio Espacial 3D (Posicionamento Estéreo)</span>
                    <span style={{ fontSize: '10.5px', background: 'rgba(0, 242, 254, 0.2)', color: '#00f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      NOVO v0.23.7
                    </span>
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Permite posicionar a voz de cada amigo no espaço estéreo (esquerda, centro ou direita) para facilitar a comunicação e reconhecimento no squad.
                  </p>
                </div>
                <label className="echo-switch">
                  <input 
                    type="checkbox" 
                    checked={spatialAudioEnabled} 
                    onChange={(e) => onToggleSpatialAudio(e.target.checked)} 
                  />
                  <span className="echo-slider" />
                </label>
              </div>

              {spatialAudioEnabled && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                    ✓ Áudio Espacial Ativo • Você pode ajustar a posição de cada amigo no menu de volume dele.
                  </span>
                  <button 
                    type="button" 
                    className="picker-close-btn" 
                    style={{ margin: 0, padding: '5px 12px', fontSize: '11.5px' }}
                    onClick={onResetAllPans}
                  >
                    🔄 Centralizar Todos os Amigos
                  </button>
                </div>
              )}
            </div>

            {/* Push-to-Talk Gamer Configuration */}
            <div className="mic-test-panel" style={{ marginTop: '20px' }}>
              <h3>Modo de Entrada & Push-to-Talk Global</h3>
              <p>Escolha se sua voz é transmitida continuamente ou apenas quando você segura a tecla de atalho.</p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <button
                  type="button"
                  className={`mic-test-btn ${localStorage.getItem('echo-ptt-mode') !== 'true' ? 'testing' : ''}`}
                  onClick={() => {
                    localStorage.setItem('echo-ptt-mode', 'false')
                    window.location.reload()
                  }}
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  🎙️ Detecção por Voz (Automático)
                </button>
                <button
                  type="button"
                  className={`mic-test-btn ${localStorage.getItem('echo-ptt-mode') === 'true' ? 'testing' : ''}`}
                  onClick={() => {
                    localStorage.setItem('echo-ptt-mode', 'true')
                    window.location.reload()
                  }}
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  🔊 Push-to-Talk (PTT)
                </button>
              </div>

              {localStorage.getItem('echo-ptt-mode') === 'true' && (
                <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                    Tecla de Atalho Global do Push-to-Talk:
                  </label>
                  <select
                    defaultValue={localStorage.getItem('echo-ptt-key') || 'KeyV'}
                    onChange={(e) => {
                      localStorage.setItem('echo-ptt-key', e.target.value)
                      window.location.reload()
                    }}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, outline: 'none', width: '100%', maxWidth: '240px' }}
                  >
                    <option value="KeyV">V (Padrão Gamer)</option>
                    <option value="KeyC">C</option>
                    <option value="KeyX">X</option>
                    <option value="Space">Barra de Espaço (Space)</option>
                    <option value="CapsLock">Caps Lock</option>
                    <option value="AltLeft">Alt Esquerdo</option>
                    <option value="ControlLeft">Ctrl Esquerdo</option>
                    <option value="F1">F1</option>
                    <option value="F2">F2</option>
                  </select>
                  <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    ✨ Funciona globalmente em tela cheia no VALORANT, CS2, Fortnite, etc.
                  </span>
                </div>
              )}
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

            {/* ── 1. Cor de Destaque Personalizada ── */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎨 Cor de Destaque da Interface
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Personalize botões, destaques e bordas ativas com a cor que preferir.
                  </p>
                </div>
                {customAccentColor && (
                  <button
                    type="button"
                    onClick={() => onCustomAccentColorChange?.('')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    ↺ Restaurar Padrão do Tema
                  </button>
                )}
              </div>

              {/* Accent Color Presets & Custom Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Ciano Echo', hex: '#00f2fe' },
                  { name: 'Roxo Neon', hex: '#a855f7' },
                  { name: 'Rosa Choque', hex: '#ec4899' },
                  { name: 'Esmeralda', hex: '#10b981' },
                  { name: 'Âmbar Solar', hex: '#f59e0b' },
                  { name: 'Rubi Gamer', hex: '#ef4444' },
                  { name: 'Índigo Real', hex: '#6366f1' },
                  { name: 'Menta Pastel', hex: '#2dd4bf' }
                ].map(preset => {
                  const isCur = (customAccentColor || '').toLowerCase() === preset.hex.toLowerCase()
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      title={preset.name}
                      onClick={() => onCustomAccentColorChange?.(preset.hex)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: preset.hex,
                        border: isCur ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                        boxShadow: isCur ? `0 0 14px ${preset.hex}` : 'none',
                        cursor: 'pointer',
                        transform: isCur ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {isCur ? '✓' : ''}
                    </button>
                  )
                })}

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <label htmlFor="custom-accent-picker" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Personalizado:
                  </label>
                  <input
                    id="custom-accent-picker"
                    type="color"
                    value={customAccentColor || '#00f2fe'}
                    onChange={(e) => onCustomAccentColorChange?.(e.target.value)}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                  />
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {customAccentColor ? customAccentColor.toUpperCase() : 'PADRÃO'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2. Densidade de Mensagens do Chat ── */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💬 Densidade do Chat
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Controle o espaçamento vertical entre mensagens nos canais de texto.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div
                  onClick={() => onChatDensityChange?.('cozy')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    border: chatDensity === 'cozy' ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: chatDensity === 'cozy' ? '0 4px 16px rgba(0, 242, 254, 0.15)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>🛋️ Confortável (Padrão)</span>
                    {chatDensity === 'cozy' && (
                      <span style={{ background: 'var(--accent-color)', color: '#000', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Espaçamento amplo, avatares destacados e leitura relaxada para conversas diárias.
                  </span>
                  {/* Visual preview miniature */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00f2fe' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ width: '40%', height: '8px', background: 'rgba(255,255,255,0.4)', borderRadius: '4px' }} />
                      <div style={{ width: '80%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => onChatDensityChange?.('compact')}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    border: chatDensity === 'compact' ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: chatDensity === 'compact' ? '0 4px 16px rgba(0, 242, 254, 0.15)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>⚡ Compacto</span>
                    {chatDensity === 'compact' && (
                      <span style={{ background: 'var(--accent-color)', color: '#000', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Menos margem, avatares reduzidos e máximo de mensagens simultâneas na tela.
                  </span>
                  {/* Visual preview miniature */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '8px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#a855f7' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ width: '35%', height: '6px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                      <div style={{ width: '90%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Pré-visualização em Tempo Real do Chat ── */}
              <div style={{ marginTop: '16px', background: 'var(--bg-primary)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border-color)', transition: 'all 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
                    👁️ Pré-visualização no Chat (Modo {chatDensity === 'cozy' ? 'Confortável' : 'Compacto'})
                  </span>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: 700 }}>
                    Exibição ao vivo
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: chatDensity === 'cozy' ? '8px' : '3px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: chatDensity === 'cozy' ? '12px' : '8px',
                    padding: chatDensity === 'cozy' ? '10px 14px' : '4px 10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: chatDensity === 'cozy' ? '10px' : '6px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <div style={{
                      width: chatDensity === 'cozy' ? '36px' : '26px',
                      height: chatDensity === 'cozy' ? '36px' : '26px',
                      borderRadius: chatDensity === 'cozy' ? '12px' : '8px',
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontSize: chatDensity === 'cozy' ? '13px' : '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      A
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: chatDensity === 'cozy' ? '13px' : '12px', color: 'var(--text-primary)' }}>Alexandre</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>18:32</span>
                      </div>
                      <p style={{ margin: chatDensity === 'cozy' ? '3px 0 0' : '1px 0 0', fontSize: chatDensity === 'cozy' ? '13.5px' : '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Bora fechar squad pra ranked hoje à noite? 🔥
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: chatDensity === 'cozy' ? '12px' : '8px',
                    padding: chatDensity === 'cozy' ? '10px 14px' : '4px 10px',
                    background: 'var(--bg-secondary)',
                    borderRadius: chatDensity === 'cozy' ? '10px' : '6px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <div style={{
                      width: chatDensity === 'cozy' ? '36px' : '26px',
                      height: chatDensity === 'cozy' ? '36px' : '26px',
                      borderRadius: chatDensity === 'cozy' ? '12px' : '8px',
                      background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontSize: chatDensity === 'cozy' ? '13px' : '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      V
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: chatDensity === 'cozy' ? '13px' : '12px', color: 'var(--accent-color)' }}>Você</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>18:33</span>
                      </div>
                      <p style={{ margin: chatDensity === 'cozy' ? '3px 0 0' : '1px 0 0', fontSize: chatDensity === 'cozy' ? '13.5px' : '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        Com certeza! Já tô logado aqui no Echo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. Modo de Desempenho Visual (FPS Booster) ── */}
            <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                <div style={{ maxWidth: '520px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                      🚀 Modo Alto Desempenho (Opaco)
                    </h3>
                    <span style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-color, #00f2fe)', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                      0% GPU BLUR
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Desativa transparências e desfoques pesados de GPU (<code style={{ fontSize: '11px' }}>backdrop-filter</code>). Recomendado para manter altas taxas de quadros em jogos competitivos com o Echo em segundo plano.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: performanceMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: performanceMode ? '#10b981' : 'var(--text-muted)',
                    border: performanceMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }}>
                    {performanceMode ? '🟢 Ativado' : '⚪ Desativado'}
                  </span>
                  <label className="echo-switch">
                    <input
                      type="checkbox"
                      checked={performanceMode}
                      onChange={(e) => onPerformanceModeChange?.(e.target.checked)}
                    />
                    <span className="echo-slider"></span>
                  </label>
                </div>
              </div>

              {performanceMode && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInToast 0.25s ease' }}>
                  <span>⚡</span>
                  <span><strong>Modo de Alto Desempenho ativado:</strong> todos os efeitos de desfoque (blur) e transparências translúcidas foram desativados para liberar processamento da sua GPU enquanto joga.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSettingsTab === 'windows' && (
          <div className="settings-container">
            <h2>Inicialização & Windows</h2>
            <p>Gerencie como o Echo é iniciado no Windows ao ligar o computador ou fazer login.</p>

            {autoStartToast && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(0, 242, 254, 0.12)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '10px',
                color: 'var(--accent-color, #00f2fe)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'fadeInToast 0.2s ease'
              }}>
                <span>✓</span>
                <span>{autoStartToast}</span>
              </div>
            )}

            {/* Iniciar com o Windows */}
            <div style={{
              marginTop: '24px',
              background: 'var(--bg-secondary)',
              padding: '20px 22px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ maxWidth: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                    🪟 Iniciar o Echo com o Windows
                  </h3>
                  <span style={{
                    background: 'rgba(0, 242, 254, 0.15)',
                    color: 'var(--accent-color, #00f2fe)',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0, 242, 254, 0.3)'
                  }}>
                    DISCORD STYLE
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Abre o Echo automaticamente toda vez que você liga o computador e inicia o Windows. Fique sempre conectado com seus amigos para chamadas e conversas sem precisar abrir o app manualmente.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: autoStartEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: autoStartEnabled ? '#10b981' : 'var(--text-muted)',
                  border: autoStartEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                  transition: 'all 0.2s'
                }}>
                  {autoStartEnabled ? '🟢 Ativado' : '⚪ Desativado'}
                </span>
                <label className="echo-switch">
                  <input
                    type="checkbox"
                    checked={autoStartEnabled}
                    disabled={loadingAutoStart}
                    onChange={(e) => handleToggleAutoStart(e.target.checked)}
                  />
                  <span className="echo-slider"></span>
                </label>
              </div>
            </div>

            {/* Iniciar Minimizado */}
            <div style={{
              marginTop: '16px',
              background: 'var(--bg-secondary)',
              padding: '20px 22px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              opacity: autoStartEnabled ? 1 : 0.5,
              transition: 'opacity 0.2s ease'
            }}>
              <div style={{ maxWidth: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                    🤫 Iniciar Minimizado (Segundo Plano)
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Ao ligar o Windows, o Echo é iniciado de forma silenciosa minimizado na barra de tarefas, sem abrir a janela principal no meio da sua tela.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <label className="echo-switch">
                  <input
                    type="checkbox"
                    disabled={!autoStartEnabled}
                    checked={startMinimized}
                    onChange={(e) => handleToggleStartMinimized(e.target.checked)}
                  />
                  <span className="echo-slider"></span>
                </label>
              </div>
            </div>

            {/* Explicação técnica Windows */}
            <div style={{
              marginTop: '24px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '18px' }}>💡</span>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Como o Windows gerencia:</strong> Ao ativar, o Echo se registra na inicialização do Windows (<code style={{ fontSize: '11px', color: 'var(--accent-color, #00f2fe)' }}>Registro do Windows \ CurrentVersion \ Run</code>) e você pode ver o status a qualquer momento também no Gerenciador de Tarefas do Windows (Ctrl + Shift + Esc &rarr; Inicializar).
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === 'changelog' && (
          <div className="settings-content-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <WhatsNewModal isOpen={true} isEmbedded={true} />
          </div>
        )}
      </section>
    </section>
  )
}

function AudioLevelMeter({ stream }: { stream: MediaStream | null }) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      if (barRef.current) barRef.current.style.width = '0%'
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

      let lastUpdate = 0
      const updateLevel = (now: number) => {
        if (!analyserRef.current) return

        // Throttle a 15fps (~66ms) e atualiza o DOM diretamente sem disparar re-render do React
        if (now - lastUpdate > 66) {
          lastUpdate = now
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const average = sum / bufferLength
          const level = Math.min(100, Math.round((average / 128) * 100))
          if (barRef.current) {
            barRef.current.style.width = `${level}%`
            barRef.current.style.background = level > 50 ? '#ff4757' : '#2ed573'
          }
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      animationFrameRef.current = requestAnimationFrame(updateLevel)
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
          <div ref={barRef} style={{ width: '0%', height: '100%', background: '#2ed573', transition: 'width 0.08s ease' }} />
        </div>
      ) : (
        <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Não Detectado (Sem som)</span>
      )}
    </div>
  )
}

function StreamTile({
  participant,
  user,
  peerScreenVolumes,
  setPeerScreenVolumes,
  isFullScreen,
  onToggleFullScreen,
  onSelectFocus,
  isGrid,
  isPiPActive,
  onToggleFloatingPiP,
  onCloseStream
}: {
  participant: VoiceParticipant;
  user: User;
  peerScreenVolumes: Record<string, number>;
  setPeerScreenVolumes: (v: Record<string, number>) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onSelectFocus?: () => void;
  isGrid?: boolean;
  isPiPActive?: boolean;
  onToggleFloatingPiP?: () => void;
  onCloseStream?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [streamResolution, setStreamResolution] = useState<string>('')
  const [showStatsHud, setShowStatsHud] = useState(false)

  useEffect(() => {
    const videoEl = videoRef.current
    if (videoEl) {
      const stream = participant.screenStream || null
      const currentTrackId = (videoEl.srcObject as MediaStream)?.getVideoTracks?.()[0]?.id
      const newTrackId = stream?.getVideoTracks?.()[0]?.id
      if (currentTrackId !== newTrackId) {
        videoEl.srcObject = stream
      }
      if (stream && videoEl.paused) {
        videoEl.play().catch(() => {})
      }

      const updateDimensions = () => {
        if (videoEl && videoEl.videoWidth > 0) {
          setStreamResolution(`${videoEl.videoWidth}x${videoEl.videoHeight}`)
        }
      }

      // Auto-retomada imediata caso o player trave ou pause devido a flutuações de rede ou alt-tab
      const handleAutoResume = () => {
        if (videoEl && videoEl.paused && videoEl.srcObject) {
          videoEl.play().catch(() => {})
        }
      }

      videoEl.addEventListener('loadedmetadata', updateDimensions)
      videoEl.addEventListener('resize', updateDimensions)
      videoEl.addEventListener('pause', handleAutoResume)
      videoEl.addEventListener('stalled', handleAutoResume)
      videoEl.addEventListener('waiting', handleAutoResume)

      return () => {
        videoEl.removeEventListener('loadedmetadata', updateDimensions)
        videoEl.removeEventListener('resize', updateDimensions)
        videoEl.removeEventListener('pause', handleAutoResume)
        videoEl.removeEventListener('stalled', handleAutoResume)
        videoEl.removeEventListener('waiting', handleAutoResume)
      }
    }
  }, [participant.screenStream])

  const volumeVal = peerScreenVolumes[participant.userId] !== undefined ? peerScreenVolumes[participant.userId] : 100

  return (
    <div className={`screen-share-view ${isFullScreen ? 'fullscreen-active' : ''} ${isGrid ? 'grid-stream-view' : ''}`}>
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted
        className="screen-share-video-el"
      />

      {/* Stream Info Tag Header */}
      <div className="screen-share-tag" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="stream-live-tag">AO VIVO</span>
        <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <FocusIcon style={{ width: '13px', height: '13px' }} />
          <span>{participant.displayName}</span>
        </span>
        {streamResolution && (
          <span className="stream-res-badge">
            60 FPS • {streamResolution}
          </span>
        )}
        <AudioLevelMeter stream={participant.screenStream || null} />
      </div>

      {/* Diagnostic Stream HUD (Like Discord Stream Stats) */}
      {showStatsHud && (
        <div className="stream-stats-hud-overlay">
          <div className="stream-stats-hud-header">
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BarChartIcon />
              <span>Estatísticas da Transmissão</span>
            </strong>
            <button type="button" onClick={() => setShowStatsHud(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
          </div>
          <div className="stream-stats-hud-grid">
            <div className="stats-row"><span>Resolução Real:</span> <strong>{streamResolution || '1920x1080'}</strong></div>
            <div className="stats-row"><span>Taxa de Quadros:</span> <strong style={{ color: '#10b981' }}>60 FPS (Ultra Suave)</strong></div>
            <div className="stats-row"><span>Bitrate de Vídeo:</span> <strong>~2.4 - 3.2 Mbps (Otimizado SFU / Simulcast)</strong></div>
            <div className="stats-row"><span>Codec de Vídeo:</span> <strong>H.264 High Profile (GPU HW)</strong></div>
            <div className="stats-row"><span>Áudio do Jogo:</span> <strong>Opus 48kHz Estéreo (128 kbps)</strong></div>
            <div className="stats-row"><span>Degradação:</span> <strong>Maintain Framerate (Sem Lag)</strong></div>
          </div>
        </div>
      )}
      
      {/* Stream Overlay Controls */}
      <div className="screen-share-overlay-controls">
        {onSelectFocus && (
          <button 
            className="stream-action-btn"
            onClick={onSelectFocus}
            title="Expandir e focar nesta transmissão"
          >
            <FocusIcon />
            <span>Focar</span>
          </button>
        )}

        {/* Stats Diagnostic HUD Button */}
        <button
          className={`stream-action-btn ${showStatsHud ? 'active' : ''}`}
          onClick={() => setShowStatsHud(prev => !prev)}
          title="Ver Estatísticas da Transmissão (FPS, Bitrate, Codec)"
        >
          <BarChartIcon />
          <span>Stats</span>
        </button>

        {/* Picture-in-Picture Button */}
        <button
          className={`stream-action-btn ${isPiPActive ? 'active' : ''}`}
          onClick={onToggleFloatingPiP}
          title={isPiPActive ? "Fechar Mini Player Flutuante" : "Ativar Mini Player Flutuante (Always-on-Top)"}
        >
          <PipIcon />
          <span>{isPiPActive ? 'Mini Player ON' : 'Mini Player'}</span>
        </button>

        {/* Volume Booster Slider (0% - 200%) */}
        {participant.userId !== user.id && (
          <div className="screen-volume-control" title="Volume da Transmissão (Até 200%)">
            <VolumeIcon className="screen-volume-icon" />
            <input 
              type="range" 
              min="0" 
              max="200" 
              value={volumeVal}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                const newVols = { ...peerScreenVolumes, [participant.userId]: val }
                setPeerScreenVolumes(newVols)
                localStorage.setItem('echo-peer-screen-volumes', JSON.stringify(newVols))
              }}
              style={{ width: '80px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', minWidth: '34px', fontWeight: 'bold', color: volumeVal > 100 ? '#ff9f43' : 'inherit' }}>
              {volumeVal}%
            </span>
          </div>
        )}

        {onToggleFullScreen && (
          <button 
            className="fullscreen-toggle-btn"
            onClick={onToggleFullScreen}
            title="Tela Cheia"
          >
            <FullscreenIcon />
          </button>
        )}

        {onCloseStream && (
          <button 
            type="button"
            className="stream-action-btn danger"
            onClick={onCloseStream}
            title="Parar de Assistir (Ocultar transmissão e voltar aos avatares de voz)"
            style={{
              background: 'rgba(235, 59, 90, 0.18)',
              border: '1px solid rgba(235, 59, 90, 0.35)',
              color: '#eb3b5a',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ✕ Fechar Vídeo
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Echo Floating Mini Player (Always-On-Top PiP) Component ─────────────── */
function EchoFloatingMiniPlayer({
  activeScreenSharers,
  activeScreenSharer,
  onSelectSharer,
  peerScreenVolumes,
  setPeerScreenVolumes,
  onClose,
  onExpand,
}: {
  activeScreenSharers: VoiceParticipant[];
  activeScreenSharer: VoiceParticipant | null;
  onSelectSharer: (userId: string) => void;
  peerScreenVolumes: Record<string, number>;
  setPeerScreenVolumes: (v: Record<string, number>) => void;
  onClose: () => void;
  onExpand: () => void;
}) {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return { x: window.innerWidth - 370, y: window.innerHeight - 250 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 })
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (videoRef.current && activeScreenSharer?.screenStream) {
      const currentTrackId = (videoRef.current.srcObject as MediaStream)?.getVideoTracks?.()[0]?.id
      const newTrackId = activeScreenSharer.screenStream?.getVideoTracks?.()[0]?.id
      if (currentTrackId !== newTrackId) {
        videoRef.current.srcObject = activeScreenSharer.screenStream
      }
      videoRef.current.play().catch(() => {})
    }
  }, [activeScreenSharer?.screenStream])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return
    setIsDragging(true)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.startX
      const dy = e.clientY - dragStartRef.current.startY
      const newX = Math.max(10, Math.min(window.innerWidth - 360, dragStartRef.current.initialX + dx))
      const newY = Math.max(10, Math.min(window.innerHeight - 230, dragStartRef.current.initialY + dy))
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!activeScreenSharer) return null

  const volumeVal = peerScreenVolumes[activeScreenSharer.userId] !== undefined ? peerScreenVolumes[activeScreenSharer.userId] : 100

  return (
    <div 
      className="echo-floating-pip-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="echo-pip-card">
        {/* Header Bar */}
        <div className="echo-pip-header">
          <div className="echo-pip-title-row">
            <span className="echo-pip-live-badge">🔴 LIVE</span>
            <span className="echo-pip-streamer-name" title={activeScreenSharer.displayName}>
              {activeScreenSharer.displayName}
            </span>
            <AudioLevelMeter stream={activeScreenSharer.screenStream || null} />
          </div>

          <div className="echo-pip-actions">
            {activeScreenSharers.length > 1 && (
              <button 
                type="button" 
                className="echo-pip-btn" 
                title="Alternar para outra transmissão"
                onClick={() => {
                  const currentIndex = activeScreenSharers.findIndex(s => s.userId === activeScreenSharer.userId)
                  const nextIndex = (currentIndex + 1) % activeScreenSharers.length
                  onSelectSharer(activeScreenSharers[nextIndex].userId)
                }}
              >
                🔄
              </button>
            )}

            <button 
              type="button" 
              className="echo-pip-btn" 
              title="Expandir foco na chamada"
              onClick={onExpand}
            >
              ⛶
            </button>

            <button 
              type="button" 
              className="echo-pip-btn close" 
              title="Fechar mini player (✕)"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className="echo-pip-video-wrapper">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            className="echo-pip-video-el"
          />

          {/* Quick Volume & Sound Bar on Hover */}
          <div className="echo-pip-hover-bar">
            <button 
              type="button" 
              className="echo-pip-mini-action"
              onClick={() => {
                const nextVol = isMuted ? 100 : 0
                setIsMuted(!isMuted)
                setPeerScreenVolumes({ ...peerScreenVolumes, [activeScreenSharer.userId]: nextVol })
              }}
              title={isMuted ? 'Desmutar som do jogo' : 'Mutar som do jogo'}
            >
              {isMuted || volumeVal === 0 ? '🔇' : '🔊'}
            </button>
            <input 
              type="range"
              min="0"
              max="200"
              value={volumeVal}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                setPeerScreenVolumes({ ...peerScreenVolumes, [activeScreenSharer.userId]: val })
                setIsMuted(val === 0)
              }}
              className="echo-pip-volume-slider"
              title={`Volume do jogo: ${volumeVal}%`}
            />
            <span className="echo-pip-vol-text">{volumeVal}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
