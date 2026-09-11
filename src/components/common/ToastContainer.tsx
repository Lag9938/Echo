import type { Toast } from '../../types'

export interface ToastContainerProps {
  toasts: Toast[]
  onRemoveToast: (id: string) => void
}

export function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-item toast-${toast.type || 'info'}`}>
          <div className="toast-content">
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
          <button className="toast-close" onClick={() => onRemoveToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
