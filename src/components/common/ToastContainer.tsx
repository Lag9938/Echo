import type { Toast } from '../../types'

export interface ToastContainerProps {
  toasts: Toast[]
  onRemoveToast: (id: string) => void
  onToastClick?: (toast: Toast) => void
}

export function ToastContainer({ toasts, onRemoveToast, onToastClick }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const isClickable = Boolean(toast.onClick || onToastClick || toast.data)
        const handleClick = () => {
          if (toast.onClick) {
            toast.onClick()
          } else if (onToastClick) {
            onToastClick(toast)
          }
          onRemoveToast(toast.id)
        }

        return (
          <div 
            key={toast.id} 
            className={`toast-item toast-${toast.type || 'info'} ${isClickable ? 'is-clickable' : ''}`}
            onClick={isClickable ? handleClick : undefined}
            style={isClickable ? { cursor: 'pointer' } : undefined}
            title={isClickable ? 'Clique para ir até a mensagem' : undefined}
          >
            <div className="toast-content">
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </div>
            <button 
              className="toast-close" 
              onClick={(e) => {
                e.stopPropagation()
                onRemoveToast(toast.id)
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
