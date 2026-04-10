import { useRef, useEffect } from 'react'

/**
 * Generic popover that closes on outside click.
 * Each instance manages its own event listener — no shared state.
 */
export default function Popover({ open, onClose, trigger, children, align = 'left' }) {
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onClose()
      }
    }
    // Use setTimeout to skip the current click that opened the popover
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: 200,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
