import { useRef } from 'react'

const MAX = 12
const IMG_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const ALL_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/aac'

/* mode: 'all' | 'first_last' | 'image' (default) */
export default function RefUploader({ items, onChange, mode = 'image' }) {
  const inputRef = useRef()
  const accept = mode === 'all' ? ALL_ACCEPT : IMG_ACCEPT

  const addFiles = (files) => {
    const filtered = [...files].filter(f => {
      if (mode === 'all') return f.type.match(/^(image|video|audio)\//)
      return f.type.match(/^image\//)
    })
    if (items.length >= MAX) return
    const next = [...items]
    for (const f of filtered) {
      if (next.length >= MAX) break
      next.push({
        id: crypto.randomUUID(),
        file: f,
        localUrl: URL.createObjectURL(f),
        type: f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : 'audio',
        url: null,
      })
    }
    onChange(next)
  }

  const remove = (id) => onChange(items.filter(i => i.id !== id))
  const setSlot = (index, file) => {
    if (!file || !file.type.match(/^image\//)) return
    const next = [...items]
    const existing = next[index]
    if (existing) URL.revokeObjectURL(existing.localUrl)
    next[index] = {
      id: existing?.id || crypto.randomUUID(),
      file,
      localUrl: URL.createObjectURL(file),
      type: 'image',
      url: null,
    }
    onChange(next)
  }

  /* ── First/Last frame mode ── */
  if (mode === 'first_last') {
    return (
      <FrameSlots items={items} onSetSlot={setSlot} onRemove={remove} />
    )
  }

  /* ── Normal upload mode ── */
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {items.map(item => (
        <Thumb key={item.id} item={item} onRemove={() => remove(item.id)} />
      ))}

      {items.length < MAX && (
        <AddButton
          onClick={() => inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); addFiles([...e.dataTransfer.files]) }}
          onDragOver={e => e.preventDefault()}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: 'none' }}
        onChange={e => { addFiles([...e.target.files]); e.target.value = '' }}
      />

      <style>{`.media-thumb-wrap:hover .media-thumb-remove { opacity: 1 !important; }`}</style>
    </div>
  )
}

/* ── First/Last frame: 2 fixed slots ── */
function FrameSlots({ items, onSetSlot, onRemove }) {
  const slots = [
    { index: 0, label: '首帧', hint: '开始帧' },
    { index: 1, label: '尾帧', hint: '结束帧' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {slots.map(({ index, label, hint }) => {
        const item = items[index]
        return (
          <FrameSlot
            key={index}
            label={label}
            hint={hint}
            item={item}
            onFile={f => onSetSlot(index, f)}
            onRemove={item ? () => onRemove(item.id) : null}
          />
        )
      })}
      <style>{`.media-thumb-wrap:hover .media-thumb-remove { opacity: 1 !important; }`}</style>
    </div>
  )
}

function FrameSlot({ label, hint, item, onFile, onRemove }) {
  const slotRef = useRef()
  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) onFile(f)
    e.target.value = ''
  }
  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        className="media-thumb-wrap"
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !item && slotRef.current?.click()}
        style={{
          position: 'relative',
          width: 56,
          height: 56,
          borderRadius: 10,
          overflow: 'hidden',
          border: item ? '1px solid var(--border-2)' : '1.5px dashed var(--border-2)',
          background: 'var(--bg-3)',
          flexShrink: 0,
          cursor: item ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => { if (!item) e.currentTarget.style.borderColor = 'var(--accent)' }}
        onMouseLeave={e => { if (!item) e.currentTarget.style.borderColor = 'var(--border-2)' }}
      >
        {item ? (
          <>
            <img src={item.localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <button
              onClick={e => { e.stopPropagation(); onRemove() }}
              className="media-thumb-remove"
              style={{
                position: 'absolute', top: 2, right: 2,
                width: 16, height: 16, borderRadius: '50%',
                background: 'rgba(0,0,0,0.72)', color: '#fff',
                fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.15s',
              }}
            >×</button>
          </>
        ) : (
          <span style={{ fontSize: 18, color: 'var(--text-3)' }}>+</span>
        )}
      </div>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{label}</span>
      <input ref={slotRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

/* ── Shared sub-components ── */
function Thumb({ item, onRemove }) {
  return (
    <div
      className="media-thumb-wrap"
      style={{
        position: 'relative', width: 48, height: 48, borderRadius: 10,
        overflow: 'hidden', border: '1px solid var(--border-2)',
        background: 'var(--bg-3)', flexShrink: 0,
      }}
    >
      {item.type === 'image' ? (
        <img src={item.localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          {item.type === 'video' ? (
            <VideoIcon />
          ) : (
            <AudioIcon />
          )}
        </div>
      )}
      <button
        onClick={onRemove}
        className="media-thumb-remove"
        style={{
          position: 'absolute', top: 2, right: 2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'rgba(0,0,0,0.72)', color: '#fff',
          fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.15s',
        }}
      >×</button>
    </div>
  )
}

function AddButton({ onClick, onDrop, onDragOver }) {
  return (
    <button
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        width: 48, height: 48, borderRadius: 10,
        border: '1.5px dashed var(--border-2)',
        background: 'transparent', color: 'var(--text-3)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 1, transition: 'border-color 0.2s, color 0.2s', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
      <span style={{ fontFamily: 'var(--ff-body)', fontSize: 9, letterSpacing: '0.04em' }}>参考</span>
    </button>
  )
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  )
}

function AudioIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  )
}
