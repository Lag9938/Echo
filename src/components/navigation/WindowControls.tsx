import { useEffect, useState } from 'react'

export interface WindowControlsProps {
  className?: string
  isQuitOnClose?: boolean
  onClose?: () => void
}

export function WindowControls({ className = '', isQuitOnClose = false, onClose }: WindowControlsProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!window.electronAPI?.isMaximized) return
    window.electronAPI.isMaximized().then((val) => setIsMaximized(Boolean(val))).catch(() => {})

    const handleResize = () => {
      window.electronAPI?.isMaximized?.().then((val) => setIsMaximized(Boolean(val))).catch(() => {})
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.()
  }

  const handleMaximize = async () => {
    if (window.electronAPI?.maximizeWindow) {
      await window.electronAPI.maximizeWindow()
      const max = await window.electronAPI.isMaximized?.()
      if (typeof max === 'boolean') {
        setIsMaximized(max)
      }
    } else {
      setIsMaximized((prev) => !prev)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
      return
    }
    if (isQuitOnClose && window.electronAPI?.quitApp) {
      window.electronAPI.quitApp()
    } else if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow()
    } else {
      window.close()
    }
  }

  return (
    <div className={`topbar-window-controls ${className}`.trim()}>
      <button
        type="button"
        className="topbar-win-btn win-minimize"
        onClick={handleMinimize}
        title="Minimizar"
        aria-label="Minimizar"
      >
        <svg width="10" height="10" viewBox="0 0 12 12">
          <rect y="5.5" width="12" height="1.2" fill="currentColor" />
        </svg>
      </button>
      <button
        type="button"
        className="topbar-win-btn win-maximize"
        onClick={handleMaximize}
        title={isMaximized ? 'Restaurar' : 'Maximizar'}
        aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 12 12">
            <path
              d="M3.5 1.5h7v7M1.5 3.5h7v7h-7z"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 12 12">
            <rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        )}
      </button>
      <button
        type="button"
        className="topbar-win-btn win-close"
        onClick={handleClose}
        title="Fechar"
        aria-label="Fechar"
      >
        <svg width="10" height="10" viewBox="0 0 12 12">
          <path d="M1.5 1.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
