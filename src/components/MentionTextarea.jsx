import { useRef, useState, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'

/* Assign display names to uploaded media items by category */
export function assignDisplayNames(items) {
  let img = 0, vid = 0, aud = 0
  return items.map(item => ({
    ...item,
    displayName: item.type === 'image' ? `图片${++img}`
               : item.type === 'video' ? `视频${++vid}`
               : `音频${++aud}`,
  }))
}

/* Extract text + chip references from contentEditable element */
function extractContent(el) {
  let text = ''
  const chipItems = []

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node instanceof Element && node.dataset.mediaId) {
      text += `[@${node.dataset.name}]`
      const id = node.dataset.mediaId
      if (!chipItems.find(c => c.id === id)) {
        chipItems.push({ id, displayName: node.dataset.name })
      }
    } else {
      for (const child of node.childNodes) walk(child)
    }
  }
  walk(el)
  return { text: text.trim(), chipItemIds: chipItems.map(c => c.id) }
}

function buildChipEl(item) {
  const chip = document.createElement('span')
  chip.contentEditable = 'false'
  chip.dataset.mediaId = item.id
  chip.dataset.name = item.displayName
  chip.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'gap:3px',
    'padding:1px 7px 1px 3px',
    'background:rgba(13,148,136,0.14)',
    'border:1px solid rgba(13,148,136,0.35)',
    'border-radius:6px',
    'font-size:12px',
    'color:#0d9488',
    'vertical-align:middle',
    'margin:0 2px',
    'cursor:default',
    'user-select:none',
    'white-space:nowrap',
  ].join(';')

  if (item.type === 'image' && item.localUrl) {
    const img = document.createElement('img')
    img.src = item.localUrl
    img.style.cssText = 'width:16px;height:16px;border-radius:3px;object-fit:cover;flex-shrink:0;'
    chip.appendChild(img)
  } else {
    const icon = document.createElement('span')
    icon.textContent = item.type === 'video' ? '▶' : '♪'
    icon.style.fontSize = '9px'
    chip.appendChild(icon)
  }

  const label = document.createTextNode(item.displayName)
  chip.appendChild(label)
  return chip
}

/* @-picker popup */
function AtPicker({ items, onSelect, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-at-picker]')) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!items.length) return null

  return (
    <div
      data-at-picker=""
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 8,
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 14,
        padding: 6,
        minWidth: 200,
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        backdropFilter: 'blur(16px)',
        zIndex: 200,
        maxHeight: 280,
        overflowY: 'auto',
      }}
    >
      <p style={{
        fontFamily: 'var(--ff-mono)',
        fontSize: 9,
        color: 'var(--text-3)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '4px 10px 8px',
      }}>可能@的内容</p>
      {items.map(item => (
        <button
          key={item.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--text-1)',
            fontFamily: 'var(--ff-body)',
            fontSize: 13,
            transition: 'background 0.1s',
            textAlign: 'left',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Thumbnail */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--bg-3)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>
            {item.type === 'image' && item.localUrl ? (
              <img src={item.localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{item.type === 'video' ? '▶' : '♪'}</span>
            )}
          </div>
          <span>{item.displayName}</span>
        </button>
      ))}
    </div>
  )
}

const MentionTextarea = forwardRef(function MentionTextarea({ media, onSubmit, placeholder, disabled }, ref) {
  const editorRef = useRef(null)
  const [showPicker, setShowPicker] = useState(false)

  const namedMedia = useMemo(() => assignDisplayNames(media), [media])

  const closePicker = useCallback(() => setShowPicker(false), [])

  const insertChip = useCallback((item) => {
    const el = editorRef.current
    if (!el) return

    el.focus()
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return

    const range = sel.getRangeAt(0)
    const node = range.startContainer

    // Remove the @ character that triggered the picker
    if (node.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
      const charBefore = node.textContent[range.startOffset - 1]
      if (charBefore === '@') {
        const delRange = document.createRange()
        delRange.setStart(node, range.startOffset - 1)
        delRange.setEnd(node, range.startOffset)
        delRange.deleteContents()
      }
    }

    const chip = buildChipEl(item)
    const curRange = sel.getRangeAt(0)
    curRange.insertNode(chip)

    // Move cursor after chip
    const after = document.createRange()
    after.setStartAfter(chip)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)

    setShowPicker(false)
  }, [])

  const handleInput = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    const node = range.startContainer
    if (node.nodeType === Node.TEXT_NODE) {
      const charBefore = node.textContent[range.startOffset - 1]
      if (charBefore === '@' && namedMedia.length > 0) {
        setShowPicker(true)
      } else {
        setShowPicker(false)
      }
    } else {
      setShowPicker(false)
    }
  }, [namedMedia])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setShowPicker(false); return }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      handleSubmitInternal()
    }
  }, []) // eslint-disable-line

  const handleSubmitInternal = useCallback(() => {
    const el = editorRef.current
    if (!el || disabled) return
    const { text, chipItemIds } = extractContent(el)
    const chipMedia = chipItemIds.map(id => namedMedia.find(m => m.id === id)).filter(Boolean)
    onSubmit({ text, chipMedia })
    el.innerHTML = ''
    setShowPicker(false)
  }, [disabled, namedMedia, onSubmit])

  // Expose API to parent via ref
  useImperativeHandle(ref, () => ({
    _getContent: () => {
      const { text, chipItemIds } = extractContent(editorRef.current)
      return { text, chipMedia: chipItemIds.map(id => namedMedia.find(m => m.id === id)).filter(Boolean) }
    },
    _clear: () => { if (editorRef.current) editorRef.current.innerHTML = '' },
    focus: () => editorRef.current?.focus(),
  }), [namedMedia])

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{
          flex: 1,
          fontFamily: 'var(--ff-body)',
          fontSize: 14,
          color: 'var(--text-1)',
          background: 'transparent',
          outline: 'none',
          minHeight: 50,
          maxHeight: 120,
          overflowY: 'auto',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
      {/* Placeholder via CSS */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: var(--text-3);
          pointer-events: none;
        }
      `}</style>
      {showPicker && (
        <AtPicker items={namedMedia} onSelect={insertChip} onClose={closePicker} />
      )}
    </div>
  )
})

export default MentionTextarea
