import type { ReactNode } from 'react'
import type { ServerEmoji } from '../types'

export function formatChatDateDivider(date: Date): string {
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

export function formatMessageText(text: string, userDisplayName?: string, serverEmojis?: ServerEmoji[]): ReactNode {
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
          let subParts: (string | ReactNode)[] = [part];

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
