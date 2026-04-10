import { useRef, useEffect } from 'react'
import ChatHistory from './components/ChatHistory'
import InputToolbar from './components/InputToolbar'
import { useGenerate } from './hooks/useGenerate'

export default function App() {
  const { messages, submit, clearHistory } = useGenerate()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isLoading = messages.some(m => m.role === 'assistant' && m.status === 'loading')

  const handleRegenerate = (msg) => {
    // _submitParams may be absent for messages loaded from localStorage
    if (!msg._submitParams) return
    submit(msg._submitParams)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: 'var(--bg)',
      position: 'relative',
    }}>
      {/* Ambient radial glow */}
      <div style={{
        position: 'fixed',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 300,
        background: 'radial-gradient(ellipse, rgba(197,164,94,0.045) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo mark */}
          <div style={{
            width: 28,
            height: 28,
            border: '1px solid var(--gold)',
            borderRadius: 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.85,
          }}>
            <div style={{ width: 8, height: 8, background: 'var(--gold)', borderRadius: 2 }} />
          </div>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--text-1)',
            letterSpacing: '0.03em',
          }}>Seed Studio</span>
        </div>

        <button
          onClick={clearHistory}
          style={{
            fontFamily: 'var(--ff-body)',
            fontSize: 11,
            color: 'var(--text-3)',
            letterSpacing: '0.06em',
            padding: '5px 10px',
            border: '1px solid transparent',
            borderRadius: 8,
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'transparent' }}
        >
          清空记录
        </button>
      </header>

      {/* Chat scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <ChatHistory
            messages={messages}
            onRegenerate={handleRegenerate}
            onEdit={() => {}} // TODO: fill toolbar
          />
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating toolbar */}
      <div style={{ position: 'relative', zIndex: 50 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <InputToolbar onSubmit={submit} disabled={isLoading} />
        </div>
      </div>

      {/* Spin animation for video spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
