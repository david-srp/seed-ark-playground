import { useRef, useEffect, useState } from 'react'
import ChatHistory from './components/ChatHistory'
import InputToolbar from './components/InputToolbar'
import { useGenerate } from './hooks/useGenerate'

export default function App() {
  const { messages, submit, clearHistory } = useGenerate()
  const [genType, setGenType] = useState('image')
  const [pendingText, setPendingText] = useState('')   // suggestion → toolbar
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isLoading = messages.some(m => m.role === 'assistant' && m.status === 'loading')

  const handleRegenerate = (msg) => {
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
      zIndex: 1,
    }}>
      {/* Ambient red glow */}
      <div style={{
        position: 'fixed',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 700,
        height: 280,
        background: 'radial-gradient(ellipse, rgba(230,57,70,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        zIndex: 10,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <div style={{
            width: 26,
            height: 26,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="7" cy="7" r="1.5" fill="white"/>
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-1)',
            letterSpacing: '0.02em',
          }}>Seed Studio</span>
        </div>

        <button
          onClick={clearHistory}
          style={{
            fontFamily: 'var(--ff-body)',
            fontSize: 11,
            color: 'var(--text-3)',
            letterSpacing: '0.04em',
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
            genType={genType}
            onRegenerate={handleRegenerate}
            onEdit={() => {}}
            onSuggestionSelect={setPendingText}
          />
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating toolbar */}
      <div style={{ position: 'relative', zIndex: 50 }}>
        <InputToolbar
          onSubmit={submit}
          disabled={isLoading}
          genType={genType}
          onGenTypeChange={setGenType}
          pendingText={pendingText}
          onPendingTextConsumed={() => setPendingText('')}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
