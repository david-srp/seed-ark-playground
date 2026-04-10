const IMAGE_RATIOS = [
  { label: '智能', value: 'auto', icon: '⊞' },
  { label: '21:9', value: '21:9', icon: '▬' },
  { label: '16:9', value: '16:9', icon: '▭' },
  { label: '3:2',  value: '3:2',  icon: '▭' },
  { label: '4:3',  value: '4:3',  icon: '□' },
  { label: '1:1',  value: '1:1',  icon: '■' },
  { label: '3:4',  value: '3:4',  icon: '▯' },
  { label: '2:3',  value: '2:3',  icon: '▯' },
  { label: '9:16', value: '9:16', icon: '▮' },
]

const VIDEO_RATIOS = [
  { label: '21:9', value: '21:9' },
  { label: '16:9', value: '16:9' },
  { label: '4:3',  value: '4:3'  },
  { label: '1:1',  value: '1:1'  },
  { label: '3:4',  value: '3:4'  },
  { label: '9:16', value: '9:16' },
]

export const REFERENCE_MODES = [
  { label: '全能参考', value: 'all',        icon: '⊛' },
  { label: '首尾帧',   value: 'first_last', icon: '⊟' },
  { label: '智能多帧', value: 'multi',      icon: '⊞' },
]

const DURATIONS = Array.from({ length: 12 }, (_, i) => i + 4) // 4..15

export default function ConfigPopup({ mode, config, onChange }) {
  if (mode === 'image') {
    return (
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-80 z-50">
        <p className="text-sm text-gray-500 mb-3">选择比例</p>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {IMAGE_RATIOS.map(r => (
            <button
              key={r.value}
              onClick={() => onChange({ ...config, ratio: r.value })}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition
                ${config.ratio === r.value
                  ? 'bg-gray-900 text-white'
                  : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="text-sm">{r.icon}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-2">选择分辨率</p>
        <div className="grid grid-cols-2 gap-2">
          {['2K', '4K'].map(res => (
            <button
              key={res}
              onClick={() => onChange({ ...config, resolution: res })}
              className={`py-2.5 rounded-xl text-sm font-medium transition
                ${config.resolution === res
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
            >
              {res === '4K' ? '超清 4K ✦' : '高清 2K'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Video mode
  return (
    <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-80 z-50">
      <p className="text-sm text-gray-500 mb-3">选择比例</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {VIDEO_RATIOS.map(r => (
          <button
            key={r.value}
            onClick={() => onChange({ ...config, ratio: r.value })}
            className={`px-3 py-1.5 rounded-xl text-xs transition
              ${config.ratio === r.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-2">选择时长</p>
      <div className="grid grid-cols-6 gap-1.5">
        {DURATIONS.map(d => (
          <button
            key={d}
            onClick={() => onChange({ ...config, duration: d })}
            className={`py-1.5 rounded-lg text-xs transition
              ${config.duration === d
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
          >
            {d}s
          </button>
        ))}
      </div>
    </div>
  )
}
