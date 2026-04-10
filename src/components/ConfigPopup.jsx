const IMAGE_RATIOS = [
  { label: '智能',  value: 'auto',  w: 32, h: 32 },
  { label: '21:9',  value: '21:9',  w: 36, h: 15 },
  { label: '16:9',  value: '16:9',  w: 32, h: 18 },
  { label: '3:2',   value: '3:2',   w: 30, h: 20 },
  { label: '4:3',   value: '4:3',   w: 28, h: 21 },
  { label: '1:1',   value: '1:1',   w: 24, h: 24 },
  { label: '3:4',   value: '3:4',   w: 21, h: 28 },
  { label: '2:3',   value: '2:3',   w: 20, h: 30 },
  { label: '9:16',  value: '9:16',  w: 18, h: 32 },
]

/* Video ratios — visual rect icons */
const VIDEO_RATIOS = [
  { label: '21:9', value: '21:9', vw: 36, vh: 15 },
  { label: '16:9', value: '16:9', vw: 32, vh: 18 },
  { label: '4:3',  value: '4:3',  vw: 28, vh: 21 },
  { label: '1:1',  value: '1:1',  vw: 24, vh: 24 },
  { label: '3:4',  value: '3:4',  vw: 21, vh: 28 },
  { label: '9:16', value: '9:16', vw: 18, vh: 32 },
]

const VIDEO_RESOLUTIONS = ['720p', '480p']

export const REFERENCE_MODES = [
  { label: '全能参考', value: 'all',        desc: '综合参考所有素材' },
  { label: '首尾帧',   value: 'first_last', desc: '固定起始与结束帧' },
]

const DURATIONS = Array.from({ length: 12 }, (_, i) => i + 4)

const panel = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border-2)',
  borderRadius: 16,
  padding: '18px 16px',
  width: 320,
  boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
}

function Label({ children }) {
  return (
    <p style={{
      fontFamily: 'var(--ff-mono)',
      fontSize: 9,
      color: 'var(--text-3)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: 10,
    }}>{children}</p>
  )
}

/* Visual rectangle representing an aspect ratio */
function RatioRect({ vw, vh, active }) {
  const scale = 0.72
  const w = Math.round(vw * scale)
  const h = Math.round(vh * scale)
  return (
    <div style={{
      width: w,
      height: h,
      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--text-3)'}`,
      borderRadius: 3,
      transition: 'border-color 0.15s',
      minWidth: 10,
      minHeight: 10,
      flexShrink: 0,
    }} />
  )
}

export default function ConfigPopup({ mode, config, onChange }) {
  if (mode === 'image') {
    return (
      <div style={panel}>
        <Label>选择比例</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16 }}>
          {IMAGE_RATIOS.map(r => {
            const active = config.ratio === r.value
            return (
              <button
                key={r.value}
                onClick={() => onChange({ ...config, ratio: r.value })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  padding: '8px 4px', borderRadius: 10,
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
              >
                <RatioRect vw={r.w} vh={r.h} active={active} />
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: active ? 'var(--accent)' : 'var(--text-2)', letterSpacing: '0.03em' }}>{r.label}</span>
              </button>
            )
          })}
        </div>

        <Label>选择分辨率</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['2K'].map(res => {
            const active = config.resolution === res
            return (
              <button
                key={res}
                onClick={() => onChange({ ...config, resolution: res })}
                style={{
                  padding: '10px 0', borderRadius: 10,
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  fontFamily: 'var(--ff-body)', fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'all 0.15s', gridColumn: '1 / -1',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
              >
                高清 {res}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Video
  return (
    <div style={panel}>
      <Label>选择比例</Label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {VIDEO_RATIOS.map(r => {
          const active = config.ratio === r.value
          return (
            <button
              key={r.value}
              onClick={() => onChange({ ...config, ratio: r.value })}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '8px 10px', borderRadius: 10, flex: '1 0 auto',
                border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
            >
              <RatioRect vw={r.vw} vh={r.vh} active={active} />
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: active ? 'var(--accent)' : 'var(--text-2)', letterSpacing: '0.03em' }}>{r.label}</span>
            </button>
          )
        })}
      </div>

      <Label>选择清晰度</Label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
        {VIDEO_RESOLUTIONS.map(res => {
          const active = (config.videoResolution || '720p') === res
          return (
            <button
              key={res}
              onClick={() => onChange({ ...config, videoResolution: res })}
              style={{
                padding: '8px 0', borderRadius: 8, textAlign: 'center',
                border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                fontFamily: 'var(--ff-mono)', fontSize: 11,
                color: active ? 'var(--accent)' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
            >{res}</button>
          )
        })}
      </div>

      <Label>选择时长</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
        {DURATIONS.map(d => {
          const active = config.duration === d
          return (
            <button
              key={d}
              onClick={() => onChange({ ...config, duration: d })}
              style={{
                padding: '7px 0', borderRadius: 8,
                border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                fontFamily: 'var(--ff-mono)', fontSize: 11,
                color: active ? 'var(--accent)' : 'var(--text-2)',
                textAlign: 'center', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
            >{d}s</button>
          )
        })}
      </div>
    </div>
  )
}
