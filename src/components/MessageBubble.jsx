import { useState } from 'react'

export default function MessageBubble({ message, onRegenerate, onEdit }) {
  const [promptOpen, setPromptOpen] = useState(false)
  if (message.role === 'user') return <UserBubble msg={message} />
  return (
    <AssistantBubble
      msg={message}
      promptOpen={promptOpen}
      setPromptOpen={setPromptOpen}
      onRegenerate={onRegenerate}
      onEdit={onEdit}
    />
  )
}

/* ── User bubble ──────────────────────────────────────────────────── */
function UserBubble({ msg }) {
  return (
    <div className="fade-up" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
      <div style={{ maxWidth: 520 }}>
        {/* Media thumbnails */}
        {msg.mediaItems?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
            {msg.mediaItems.map((item, i) => <MediaThumb key={i} item={item} />)}
          </div>
        )}
        {/* Text bubble */}
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border-2)',
          borderRadius: '16px 16px 4px 16px',
          padding: '12px 16px',
        }}>
          <p style={{
            fontFamily: 'var(--ff-body)',
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--text-1)',
            whiteSpace: 'pre-wrap',
          }}>{msg.text}</p>
          {/* Meta tags */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {msg.config?.modelLabel && (
              <Tag>{msg.config.modelLabel}</Tag>
            )}
            {msg.config?.ratio && <Tag>{msg.config.ratio}</Tag>}
            {msg.config?.resolution && <Tag>{msg.config.resolution}</Tag>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Assistant bubble ─────────────────────────────────────────────── */
function AssistantBubble({ msg, promptOpen, setPromptOpen, onRegenerate, onEdit }) {
  return (
    <div className="fade-up" style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Loading state */}
        {msg.status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0' }}>
            <LoadingDots />
            <span style={{
              fontFamily: 'var(--ff-mono)',
              fontSize: 11,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
            }}>{msg.loadingText || 'Generating...'}</span>
          </div>
        )}

        {/* Image grid */}
        {msg.type === 'image' && msg.status === 'done' && msg.imageUrls?.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: msg.imageUrls.length > 1 ? '1fr 1fr' : '1fr',
            gap: 8,
            marginBottom: 10,
          }}>
            {msg.imageUrls.map((url, i) => (
              <ImageResult key={i} url={url} delay={i * 0.1} />
            ))}
          </div>
        )}

        {/* Video result */}
        {msg.type === 'video' && msg.status === 'done' && msg.videoUrl && (
          <div className="img-reveal" style={{ marginBottom: 10 }}>
            <video
              src={msg.videoUrl}
              controls
              style={{
                width: '100%',
                borderRadius: 16,
                background: 'var(--bg-2)',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Video polling */}
        {msg.type === 'video' && msg.status === 'loading' && msg.taskId && (
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 16px',
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <VideoSpinner />
              <div>
                <p style={{ fontFamily: 'var(--ff-body)', fontSize: 13, color: 'var(--text-1)' }}>
                  视频生成中
                </p>
                <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                  task: {msg.taskId?.slice(0, 16)}...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {msg.status === 'error' && (
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid rgba(220,80,80,0.2)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>⚠</span>
            <span style={{ fontFamily: 'var(--ff-body)', fontSize: 13, color: '#E07070' }}>
              生成失败，请重试
            </span>
          </div>
        )}

        {/* Actions */}
        {(msg.status === 'done' || msg.status === 'error') && (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <ActionBtn onClick={onEdit}>重新编辑</ActionBtn>
            <ActionBtn onClick={onRegenerate}>再次生成</ActionBtn>
          </div>
        )}

        {/* Prompt toggle */}
        {msg.prompt && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setPromptOpen(!promptOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--ff-mono)',
                fontSize: 10,
                color: 'var(--text-3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              <span style={{ transition: 'transform 0.2s', transform: promptOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
              {promptOpen ? 'Hide Prompt' : 'View Prompt'}
            </button>
            {promptOpen && (
              <div style={{
                marginTop: 8,
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderLeft: '2px solid var(--gold)',
                borderRadius: '0 8px 8px 0',
                padding: '10px 14px',
              }}>
                <p style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 11,
                  color: 'var(--text-2)',
                  lineHeight: 1.7,
                  letterSpacing: '0.01em',
                }}>{msg.prompt}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────── */
function ImageResult({ url, delay = 0 }) {
  return (
    <div
      className="img-reveal"
      style={{ animationDelay: `${delay}s`, position: 'relative', cursor: 'pointer' }}
      onClick={() => window.open(url, '_blank')}
    >
      <img
        src={url}
        alt=""
        style={{
          width: '100%',
          display: 'block',
          borderRadius: 14,
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.015)'
          e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.6)`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

function MediaThumb({ item }) {
  const base = {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid var(--border-2)',
    flexShrink: 0,
    background: 'var(--bg-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  }
  if (item.type === 'image') {
    return (
      <div style={base}>
        <img src={item.localUrl || item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return <div style={base}>{item.type === 'video' ? '🎬' : '🎵'}</div>
}

function Tag({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--ff-mono)',
      fontSize: 10,
      color: 'var(--text-3)',
      background: 'var(--bg-3)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '2px 6px',
      letterSpacing: '0.04em',
    }}>{children}</span>
  )
}

function ActionBtn({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--ff-body)',
        fontSize: 12,
        color: 'var(--text-2)',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '5px 14px',
        transition: 'color 0.2s, border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text-1)'
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.background = 'var(--bg-3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-2)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-2)'
      }}
    >{children}</button>
  )
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="dot-pulse"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--gold)',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}

function VideoSpinner() {
  return (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: '50%',
      border: '2px solid var(--bg-3)',
      borderTop: '2px solid var(--gold)',
      animation: 'spin 1s linear infinite',
    }} />
  )
}
