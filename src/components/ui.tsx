import React from 'react'

// ── BUTTON ────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}
export function Btn({ variant = 'secondary', size = 'md', className = '', children, ...props }: BtnProps) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all cursor-pointer border-none'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
  const variants = {
    primary: 'bg-accent text-white hover:bg-[#6a58e8] hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-px',
    secondary: 'bg-[var(--bg3)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)]',
    success: 'bg-success/10 text-[var(--success)] border border-success/20 hover:bg-success/20',
    danger: 'bg-error/10 text-[var(--error)] border border-error/20 hover:bg-error/20',
    ghost: 'bg-transparent text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]',
  }
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: 'var(--font-body)' }}
      {...props}
    >
      {children}
    </button>
  )
}

// ── CARD ──────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-6 mb-5 ${className}`}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex items-center gap-2 mb-1"
      style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  )
}

export function CardSubtitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-5" style={{ color: 'var(--text2)', fontSize: '0.82rem' }}>{children}</div>
}

// ── FORM GROUP ───────────────────────────────────────────────
export function FormGroup({ label, required, helper, children }: {
  label: string; required?: boolean; helper?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text2)', letterSpacing: '0.3px' }}>
        {label} {required && <span style={{ color: 'var(--accent4)' }}>*</span>}
      </label>
      {children}
      {helper && (
        <div className="flex gap-2 rounded-r-lg p-2.5" style={{
          background: 'rgba(124,106,247,0.08)',
          borderLeft: '3px solid var(--accent)',
          fontSize: '0.78rem', color: 'var(--text2)'
        }}>
          <span>💡</span><span>{helper}</span>
        </div>
      )}
    </div>
  )
}

// ── TAG ───────────────────────────────────────────────────────
export function Tag({ children, color = 'purple' }: { children: React.ReactNode; color?: 'purple' | 'orange' | 'green' | 'red' }) {
  const styles = {
    purple: { background: 'rgba(124,106,247,0.15)', color: 'var(--accent)', border: '1px solid rgba(124,106,247,0.25)' },
    orange: { background: 'rgba(247,162,106,0.15)', color: 'var(--accent2)', border: '1px solid rgba(247,162,106,0.25)' },
    green: { background: 'rgba(106,247,184,0.15)', color: 'var(--accent3)', border: '1px solid rgba(106,247,184,0.25)' },
    red: { background: 'rgba(247,106,138,0.15)', color: 'var(--accent4)', border: '1px solid rgba(247,106,138,0.25)' },
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5"
      style={{ ...styles[color], fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.3px' }}>
      {children}
    </span>
  )
}

// ── TABLE UTILS ───────────────────────────────────────────────
export function IconBtn({ onClick, variant = 'add', title }: { onClick: () => void; variant?: 'add' | 'del'; title?: string }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem', transition: 'all 0.18s',
        background: variant === 'add' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
        color: variant === 'add' ? 'var(--success)' : 'var(--error)',
      }}>
      {variant === 'add' ? '＋' : '✕'}
    </button>
  )
}

// ── HELPER TEXT ───────────────────────────────────────────────
export function Helper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(124,106,247,0.08)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: '0 8px 8px 0',
      padding: '8px 12px',
      fontSize: '0.78rem', color: 'var(--text2)',
      display: 'flex', gap: 8, marginTop: 4,
    }}>
      <span>💡</span><span>{children}</span>
    </div>
  )
}

// ── DIVIDER ───────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
}

// ── KPI CARD ─────────────────────────────────────────────────
export function KpiCard({ value, label, color = 'var(--accent)' }: { value: string; label: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

// ── TOAST ─────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warn' | 'info'
let _addToast: ((msg: string, type: ToastType) => void) | null = null
export function registerToast(fn: (msg: string, type: ToastType) => void) { _addToast = fn }
export function toast(msg: string, type: ToastType = 'info') { _addToast?.(msg, type) }

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<{ id: number; msg: string; type: ToastType }[]>([])
  React.useEffect(() => {
    registerToast((msg, type) => {
      const id = Date.now()
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    })
  }, [])
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: '💡' }
  const colors = { success: 'var(--success)', error: 'var(--error)', warn: 'var(--warn)', info: 'var(--accent)' }
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9998, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--bg2)', border: `1px solid var(--border)`,
          borderLeft: `3px solid ${colors[t.type]}`,
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.85rem', minWidth: 260, maxWidth: 340,
          boxShadow: 'var(--shadow)', animation: 'slideIn 0.3s ease',
        }}>
          <span>{icons[t.type]}</span><span>{t.msg}</span>
        </div>
      ))}
      <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}
