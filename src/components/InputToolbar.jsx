import { useState, useRef, useCallback, useEffect } from 'react'
import RefUploader from './RefUploader'
import ConfigPopup, { REFERENCE_MODES } from './ConfigPopup'
import Popover from './Popover'
import MentionTextarea, { assignDisplayNames } from './MentionTextarea'

/* Only Lite model for image */
const IMAGE_MODELS = [
  { label: '图片 5.0 Lite', value: 'lite' },
]
const VIDEO_MODELS = [
  { label: 'Seedance 2.0 Fast', value: 'fast' },
  { label: 'Seedance 2.0 Pro',  value: 'pro' },
]

const DEF_IMG_CFG = { ratio: '1:1', resolution: '2K' }
const DEF_VID_CFG = { ratio: '16:9', duration: 5, refMode: 'all', videoResolution: '720p' }

/* ── Icons ──────────────────────────────────────── */
function IconImage() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}
function IconVideo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  )
}
function IconModel() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
function IconChevron({ open }) {
  return (
    <svg width="9" height="5" viewBox="0 0 9 5" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
      <path d="M1 1L4.5 4L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function IconAt() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
    </svg>
  )
}

/* ── DropMenu ────────────────────────────────────── */
function DropMenu({ label, open, onToggle, onClose, items, activeValue, onSelect }) {
  return (
    <Popover open={open} onClose={onClose} trigger={
      <button onClick={onToggle} style={dropBtnStyle(open)}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = 'var(--text-1)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--text-2)' }}
      >
        {label}
        <IconChevron open={open} />
      </button>
    }>
      <div style={menuStyle}>
        {items.map(item => {
          const active = item.value === activeValue
          return (
            <button
              key={item.value}
              onClick={() => { onSelect(item.value); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 14px',
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                fontFamily: 'var(--ff-body)', fontSize: 13,
                transition: 'background 0.1s, color 0.1s', borderRadius: 8, textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' } }}
            >
              {item.label}
              {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    </Popover>
  )
}

/* ── Prompt Enhance Toggle ───────────────────────── */
function PromptEnhanceToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? 'Seed Pro 将优化你的描述' : '开启后用 Seed Pro 优化描述'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 8px',
        borderRadius: 20,
        border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        background: enabled ? 'var(--accent-dim)' : 'transparent',
        fontFamily: 'var(--ff-mono)',
        fontSize: 10,
        letterSpacing: '0.04em',
        color: enabled ? 'var(--accent)' : 'var(--text-3)',
        transition: 'all 0.2s',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!enabled) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' } }}
      onMouseLeave={e => { if (!enabled) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' } }}
    >
      {/* Toggle switch */}
      <div style={{
        width: 24,
        height: 13,
        borderRadius: 7,
        background: enabled ? 'var(--accent)' : 'var(--bg-4)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: 2,
          left: enabled ? 13 : 2,
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
      Prompt Enhance
    </button>
  )
}

/* ── Main component ──────────────────────────────── */
export default function InputToolbar({
  onSubmit, disabled,
  genType, onGenTypeChange,
  pendingText, onPendingTextConsumed,
}) {
  const [imgModel, setImgModel] = useState('lite')
  const [vidModel, setVidModel] = useState('fast')
  const [imgCfg,   setImgCfg]   = useState(DEF_IMG_CFG)
  const [vidCfg,   setVidCfg]   = useState(DEF_VID_CFG)
  const [media,    setMedia]    = useState([])
  const [text,     setText]     = useState('')
  const [enhance,  setEnhance]  = useState(false)
  const [openDD,   setOpenDD]   = useState(null)
  const mentionRef = useRef(null)

  // Consume pending text from suggestion clicks
  useEffect(() => {
    if (pendingText) {
      setText(pendingText)
      onPendingTextConsumed?.()
    }
  }, [pendingText, onPendingTextConsumed])

  const toggle = (name) => setOpenDD(o => o === name ? null : name)
  const close  = () => setOpenDD(null)

  const config    = genType === 'image' ? imgCfg : vidCfg
  const setConfig = genType === 'image' ? setImgCfg : setVidCfg
  const model     = genType === 'image' ? imgModel : vidModel
  const models    = genType === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const modelLabel = models.find(m => m.value === model)?.label || ''
  const refMode    = vidCfg.refMode
  const isAllMode  = genType === 'video' && refMode === 'all'
  const isFirstLast = genType === 'video' && refMode === 'first_last'

  const cfgLabel = genType === 'image'
    ? `${imgCfg.ratio}  ${imgCfg.resolution}`
    : `${vidCfg.ratio}  ${vidCfg.duration}s`

  const refLabel = REFERENCE_MODES.find(r => r.value === vidCfg.refMode)?.label || '全能参考'
  const uploaderMode = isFirstLast ? 'first_last' : isAllMode ? 'all' : 'image'

  const canSubmit = !disabled && (text.trim().length > 0 || media.length > 0)
  const canSend = isAllMode ? !disabled : canSubmit

  const handleTextSubmit = () => {
    if (!canSubmit) return
    onSubmit({ text, mediaItems: media, genType, model, config, enhancePrompt: enhance })
    setText('')
    setMedia([])
  }

  const handleMentionSubmit = useCallback(({ text: t, chipMedia }) => {
    const allMedia = [...media]
    for (const chip of chipMedia) {
      if (!allMedia.find(m => m.id === chip.id)) allMedia.push(chip)
    }
    onSubmit({ text: t, mediaItems: allMedia, genType, model, config, enhancePrompt: enhance })
    setMedia([])
  }, [media, genType, model, config, enhance, onSubmit])

  const handleSubmit = isAllMode
    ? () => { mentionRef.current?._getContent && handleMentionSubmit(mentionRef.current._getContent()); mentionRef.current?._clear?.() }
    : handleTextSubmit

  const namedMedia = isAllMode ? assignDisplayNames(media) : media

  return (
    <div style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 16px 20px',
      zIndex: 100,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 720,
        background: 'rgba(8,8,9,0.96)',
        border: '1px solid var(--border-2)',
        borderRadius: 20,
        boxShadow: '0 8px 48px rgba(0,0,0,0.8)',
        overflow: 'visible',
      }}>
        {/* Text + media area */}
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <RefUploader items={media} onChange={setMedia} mode={uploaderMode} />

          {isAllMode ? (
            <MentionTextarea
              ref={mentionRef}
              media={namedMedia}
              disabled={disabled}
              placeholder="描述你想要的视频，输入 @ 引用已上传素材…"
              onSubmit={handleMentionSubmit}
            />
          ) : (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                  e.preventDefault()
                  handleTextSubmit()
                }
              }}
              placeholder={
                genType === 'image'
                  ? '描述你想要的画面，或上传参考图…'
                  : isFirstLast
                  ? '描述视频内容，上传首帧和尾帧图片…'
                  : '描述你想要的视频内容…'
              }
              rows={2}
              style={{
                flex: 1,
                fontFamily: 'var(--ff-body)',
                fontSize: 14,
                color: 'var(--text-1)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.6,
                minHeight: 50,
                maxHeight: 120,
              }}
            />
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0 0' }} />

        {/* Control bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px 10px',
          gap: 4,
          flexWrap: 'wrap',
        }}>
          {/* Gen type */}
          <DropMenu
            label={<><span style={{ display: 'flex', marginRight: 5, color: 'var(--accent)' }}>{genType === 'image' ? <IconImage /> : <IconVideo />}</span>{genType === 'image' ? '图片生成' : '视频生成'}</>}
            open={openDD === 'type'}
            onToggle={() => toggle('type')}
            onClose={close}
            items={[
              { label: '图片生成', value: 'image' },
              { label: '视频生成', value: 'video' },
            ]}
            activeValue={genType}
            onSelect={v => { onGenTypeChange(v); close() }}
          />

          <Divider />

          {/* Model */}
          <DropMenu
            label={<><span style={{ display: 'flex', color: 'var(--accent)', marginRight: 5 }}><IconModel /></span>{modelLabel}</>}
            open={openDD === 'model'}
            onToggle={() => toggle('model')}
            onClose={close}
            items={models}
            activeValue={model}
            onSelect={v => { if (genType === 'image') setImgModel(v); else setVidModel(v); close() }}
          />

          {/* Video: reference mode */}
          {genType === 'video' && (
            <>
              <Divider />
              <DropMenu
                label={refLabel}
                open={openDD === 'refMode'}
                onToggle={() => toggle('refMode')}
                onClose={close}
                items={REFERENCE_MODES}
                activeValue={vidCfg.refMode}
                onSelect={v => { setVidCfg(c => ({ ...c, refMode: v })); close() }}
              />
            </>
          )}

          <Divider />

          {/* Config popup */}
          <Popover
            open={openDD === 'config'}
            onClose={close}
            trigger={
              <button
                onClick={() => toggle('config')}
                style={{ ...dropBtnStyle(openDD === 'config'), fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.04em' }}
                onMouseEnter={e => { if (openDD !== 'config') e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseLeave={e => { if (openDD !== 'config') e.currentTarget.style.color = 'var(--text-2)' }}
              >
                {cfgLabel}
              </button>
            }
          >
            <ConfigPopup mode={genType} config={config} onChange={setConfig} />
          </Popover>

          {/* @ button (全能参考 only) */}
          {isAllMode && (
            <>
              <Divider />
              <button
                title="在文本框中输入 @ 来引用素材"
                style={{ ...dropBtnStyle(false), color: 'var(--text-3)', padding: '5px 6px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                onClick={() => {
                  mentionRef.current?.focus()
                  document.execCommand('insertText', false, '@')
                }}
              >
                <IconAt />
              </button>
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Prompt Enhance toggle */}
          <PromptEnhanceToggle enabled={enhance} onToggle={() => setEnhance(v => !v)} />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: canSend ? 'var(--accent)' : 'var(--bg-4)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
              flexShrink: 0,
              boxShadow: canSend ? '0 2px 12px var(--accent-glow)' : 'none',
            }}
            onMouseEnter={e => { if (canSend) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-glow)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = canSend ? '0 2px 12px var(--accent-glow)' : 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke={canSend ? '#fff' : 'var(--text-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Style helpers ───────────────────────────────── */
function dropBtnStyle(active) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: 'var(--ff-body)', fontSize: 13,
    color: active ? 'var(--accent)' : 'var(--text-2)',
    padding: '5px 8px', borderRadius: 8,
    background: active ? 'var(--accent-dim)' : 'transparent',
    border: 'none', whiteSpace: 'nowrap',
    transition: 'color 0.15s, background 0.15s',
  }
}

const menuStyle = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border-2)',
  borderRadius: 14,
  padding: 6,
  minWidth: 160,
  boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
}
