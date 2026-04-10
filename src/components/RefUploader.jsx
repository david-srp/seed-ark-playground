import { useRef } from 'react'

const MAX = 12

export default function RefUploader({ items, onChange }) {
  const inputRef = useRef()

  const addFiles = (files) => {
    if (items.length >= MAX) return
    const next = [...items]
    for (const f of files) {
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

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--border-2)',
            background: 'var(--bg-3)',
            flexShrink: 0,
          }}
          className="media-thumb-wrap"
        >
          {item.type === 'image' ? (
            <img src={item.localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {item.type === 'video' ? '🎬' : '🎵'}
            </div>
          )}
          <button
            onClick={() => remove(item.id)}
            style={{
              position: 'absolute',
              top: 2, right: 2,
              width: 16, height: 16,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.72)',
              color: '#fff',
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              opacity: 0,
              transition: 'opacity 0.15s',
            }}
            className="media-thumb-remove"
          >×</button>
        </div>
      ))}

      {items.length < MAX && (
        <button
          onClick={() => inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); addFiles([...e.dataTransfer.files]) }}
          onDragOver={e => e.preventDefault()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            border: '1.5px dashed var(--border-2)',
            background: 'transparent',
            color: 'var(--text-3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            transition: 'border-color 0.2s, color 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--gold)'
            e.currentTarget.style.color = 'var(--gold)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-2)'
            e.currentTarget.style.color = 'var(--text-3)'
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          <span style={{ fontFamily: 'var(--ff-body)', fontSize: 9, letterSpacing: '0.04em' }}>参考</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => addFiles([...e.target.files])}
      />

      <style>{`
        .media-thumb-wrap:hover .media-thumb-remove { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
