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

const VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

export const REFERENCE_MODES = [
  { label: '全能参考', value: 'all',        desc: '综合参考所有素材' },
  { label: '首尾帧',   value: 'first_last', desc: '固定起始与结束帧' },
  { label: '智能多帧', value: 'multi',      desc: '多帧智能插值' },
]

const DURATIONS = Array.from({ length: 12 }, (_, i) => i + 4)

const panel = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border-2)',
  borderRadius: 16,
  padding: '18px 16px',
  width: 300,
  boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
  backdropFilter: 'blur(16px)',
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
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 4px',
                  borderRadius: 10,
                  border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: active ? 'var(--gold-dim)' : 'transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
              >
                {/* Aspect ratio visual */}
                <div style={{
                  width: Math.round(r.w * 0.72),
                  height: Math.round(r.h * 0.72),
                  border: `1.5px solid ${active ? 'var(--gold)' : 'var(--text-3)'}`,
                  borderRadius: 3,
                  transition: 'border-color 0.15s',
                  minWidth: 10,
                  minHeight: 10,
                }} />
                <span style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: 9,
                  color: active ? 'var(--gold)' : 'var(--text-2)',
                  letterSpacing: '0.03em',
                }}>{r.label}</span>
              </button>
            )
          })}
        </div>

        <Label>选择分辨率</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['2K', '4K'].map(res => {
            const active = config.resolution === res
            return (
              <button
                key={res}
                onClick={() => onChange({ ...config, resolution: res })}
                style={{
                  padding: '10px 0',
                  borderRadius: 10,
                  border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: active ? 'var(--gold-dim)' : 'transparent',
                  fontFamily: 'var(--ff-body)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--gold)' : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
              >
                {res === '4K' ? `超清 ${res} ✦` : `高清 ${res}`}
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
          const active = config.ratio === r
          return (
            <button
              key={r}
              onClick={() => onChange({ ...config, ratio: r })}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
                background: active ? 'var(--gold-dim)' : 'transparent',
                fontFamily: 'var(--ff-mono)',
                fontSize: 11,
                color: active ? 'var(--gold)' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.borderColor = 'var(--border-2)' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' } }}
            >{r}</button>
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
                padding: '7px 0',
                borderRadius: 8,
                border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
                background: active ? 'var(--gold-dim)' : 'transparent',
                fontFamily: 'var(--ff-mono)',
                fontSize: 11,
                color: active ? 'var(--gold)' : 'var(--text-2)',
                textAlign: 'center',
                transition: 'all 0.15s',
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
