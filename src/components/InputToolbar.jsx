import { useState } from 'react'
import RefUploader from './RefUploader'
import ConfigPopup, { REFERENCE_MODES } from './ConfigPopup'
import Popover from './Popover'

const IMAGE_MODELS = [
  { label: '图片 5.0 Lite', value: 'lite' },
  { label: '图片 5.0',      value: 'seedream' },
]
const VIDEO_MODELS = [
  { label: 'Seedance 2.0 Fast', value: 'fast' },
  { label: 'Seedance 2.0 Pro',  value: 'pro' },
]

const DEF_IMG_CFG = { ratio: '1:1', resolution: '2K' }
const DEF_VID_CFG = { ratio: '16:9', duration: 5, refMode: 'all' }

/* ── DropMenu: a Popover-wrapped dropdown menu ──────────────────── */
function DropMenu({ label, open, onToggle, onClose, items, activeValue, onSelect, align }) {
  return (
    <Popover open={open} onClose={onClose} align={align} trigger={
      <button
        onClick={onToggle}
        style={dropBtnStyle(open)}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = 'var(--text-1)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--text-2)' }}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 3, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '9px 14px',
                background: active ? 'var(--gold-dim)' : 'transparent',
                color: active ? 'var(--gold)' : 'var(--text-2)',
                fontFamily: 'var(--ff-body)',
                fontSize: 13,
                transition: 'background 0.1s, color 0.1s',
                borderRadius: 8,
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = active ? 'var(--gold-dim)' : 'transparent'; e.currentTarget.style.color = active ? 'var(--gold)' : 'var(--text-2)' } }}
            >
              {item.label}
              {active && <span style={{ fontSize: 10, color: 'var(--gold)' }}>●</span>}
            </button>
          )
        })}
      </div>
    </Popover>
  )
}

/* ── Main component ──────────────────────────────────────────────── */
export default function InputToolbar({ onSubmit, disabled }) {
  const [genType,    setGenType]    = useState('image')
  const [imgModel,   setImgModel]   = useState('seedream')
  const [vidModel,   setVidModel]   = useState('fast')
  const [imgCfg,     setImgCfg]     = useState(DEF_IMG_CFG)
  const [vidCfg,     setVidCfg]     = useState(DEF_VID_CFG)
  const [media,      setMedia]      = useState([])
  const [text,       setText]       = useState('')

  // One active dropdown at a time
  const [openDD, setOpenDD] = useState(null)
  const toggle = (name) => setOpenDD(o => o === name ? null : name)
  const close  = ()     => setOpenDD(null)

  const config    = genType === 'image' ? imgCfg : vidCfg
  const setConfig = genType === 'image' ? setImgCfg : setVidCfg
  const model     = genType === 'image' ? imgModel : vidModel
  const models    = genType === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const modelLabel = models.find(m => m.value === model)?.label || ''

  const cfgLabel = genType === 'image'
    ? `${imgCfg.ratio}  ${imgCfg.resolution}`
    : `${vidCfg.ratio}  ${vidCfg.duration}s`

  const refLabel = REFERENCE_MODES.find(r => r.value === vidCfg.refMode)?.label || '全能参考'

  const canSubmit = !disabled && (text.trim().length > 0 || media.length > 0)

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ text, mediaItems: media, genType, model, config })
    setText('')
    setMedia([])
  }

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
        background: 'rgba(18,18,20,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-2)',
        borderRadius: 20,
        boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
        overflow: 'visible',
      }}>
        {/* Text + media area */}
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <RefUploader items={media} onChange={setMedia} />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
            placeholder={
              genType === 'image'
                ? '描述你想要的画面，或上传参考图…'
                : '描述你想要的视频，或上传参考图、视频、音频…'
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
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0 0' }} />

        {/* Control bar — no overflow:auto here, it clips the popups */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px 10px',
          gap: 4,
          flexWrap: 'wrap',
        }}>
          {/* Gen type */}
          <DropMenu
            label={<><span style={{ marginRight: 4, fontSize: 12 }}>{genType === 'image' ? '🖼' : '🎬'}</span>{genType === 'image' ? '图片生成' : '视频生成'}</>}
            open={openDD === 'type'}
            onToggle={() => toggle('type')}
            onClose={close}
            items={[
              { label: '🖼  图片生成', value: 'image' },
              { label: '🎬  视频生成', value: 'video' },
            ]}
            activeValue={genType}
            onSelect={v => { setGenType(v); close() }}
          />

          <Divider />

          {/* Model */}
          <DropMenu
            label={<><GemIcon /><span style={{ marginLeft: 5 }}>{modelLabel}</span></>}
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
                style={{
                  ...dropBtnStyle(openDD === 'config'),
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 11,
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={e => { if (openDD !== 'config') e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseLeave={e => { if (openDD !== 'config') e.currentTarget.style.color = 'var(--text-2)' }}
              >
                {cfgLabel}
              </button>
            }
          >
            <ConfigPopup mode={genType} config={config} onChange={setConfig} />
          </Popover>

          <div style={{ flex: 1 }} />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: canSubmit ? 'var(--gold)' : 'var(--bg-4)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
              flexShrink: 0,
              boxShadow: canSubmit ? '0 2px 12px var(--gold-glow)' : 'none',
            }}
            onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 4px 20px var(--gold-glow)' } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = canSubmit ? '0 2px 12px var(--gold-glow)' : 'none' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M7 2L3 6M7 2L11 6" stroke={canSubmit ? '#09090B' : 'var(--text-3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Style helpers ───────────────────────────────────────────────── */
function dropBtnStyle(active) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--ff-body)',
    fontSize: 13,
    color: active ? 'var(--gold)' : 'var(--text-2)',
    padding: '5px 8px',
    borderRadius: 8,
    background: active ? 'var(--gold-dim)' : 'transparent',
    border: 'none',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s, background 0.15s',
  }
}

const menuStyle = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border-2)',
  borderRadius: 14,
  padding: 6,
  minWidth: 160,
  boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(16px)',
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
}

function GemIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--gold)' }}>
      <path d="M6 1L10 4.5L6 11L2 4.5L6 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M2 4.5H10" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}
