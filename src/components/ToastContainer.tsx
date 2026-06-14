import React from 'react'
import type { AppToast } from '../types/index'

type Props = { toasts: AppToast[]; onRemove: (id: string) => void }

const ToastContainer: React.FC<Props> = ({ toasts, onRemove }) => (
  <div className="toast-container" aria-live="polite">
    {toasts.map(t => (
      <div key={t.id} className={`toast toast-${t.type}`}>
        <div className="toast-icon">
          {t.type === 'success' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>}
          {t.type === 'error' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>}
          {t.type === 'info' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2v6z" fill="currentColor"/></svg>}
        </div>
        <span className="toast-message">{t.message}</span>
        <button className="toast-close" onClick={() => onRemove(t.id)}>×</button>
      </div>
    ))}
  </div>
)

export default ToastContainer
