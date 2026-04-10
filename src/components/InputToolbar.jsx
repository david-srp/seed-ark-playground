import { useState } from 'react'
import RefUploader from './RefUploader'
import ConfigPopup, { REFERENCE_MODES } from './ConfigPopup'

const IMAGE_MODELS = [
  { label: '图片5.0 Lite', value: 'lite' },
  { label: '图片5.0',      value: 'seedream' },
]
const VIDEO_MODELS = [
  { label: 'Seedance 2.0 Fast', value: 'fast' },
  { label: 'Seedance 2.0 Pro',  value: 'pro'  },
]

const DEFAULT_IMAGE_CONFIG = { ratio: '1:1', resolution: '2K' }
const DEFAULT_VIDEO_CONFIG = { ratio: '16:9', duration: 5, refMode: 'all' }

export default function InputToolbar({ onSubmit, disabled, initialState }) {
  const [genType, setGenType]       = useState(initialState?.genType || 'image')
  const [imageModel, setImageModel] = useState(initialState?.model || 'seedream')
  const [videoModel, setVideoModel] = useState(initialState?.model || 'fast')
  const [imageConfig, setImageConfig] = useState(initialState?.config || DEFAULT_IMAGE_CONFIG)
  const [videoConfig, setVideoConfig] = useState(initialState?.config || DEFAULT_VIDEO_CONFIG)
  const [mediaItems, setMediaItems] = useState([])
  const [text, setText] = useState(initialState?.text || '')
  const [openDropdown, setOpenDropdown] = useState(null)

  const toggle = (name) => (e) => {
    e.stopPropagation()
    setOpenDropdown(o => o === name ? null : name)
  }
  const closeAll = () => setOpenDropdown(null)

  const handleSubmit = () => {
    if (disabled) return
    if (!text.trim() && mediaItems.length === 0) return
    onSubmit({
      text,
      mediaItems,
      genType,
      model: genType === 'image' ? imageModel : videoModel,
      config: genType === 'image' ? imageConfig : videoConfig,
    })
    setText('')
    setMediaItems([])
  }

  const config = genType === 'image' ? imageConfig : videoConfig
  const setConfig = genType === 'image' ? setImageConfig : setVideoConfig
  const currentModel = genType === 'image' ? imageModel : videoModel
  const models = genType === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const modelLabel = models.find(m => m.value === currentModel)?.label || ''

  const configLabel = genType === 'image'
    ? `${imageConfig.ratio} ${imageConfig.resolution}`
    : `${videoConfig.ratio} · ${videoConfig.duration}s`

  return (
    <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-4" onClick={closeAll}>
      {/* Input area */}
      <div className="flex gap-3 mb-3" onClick={e => e.stopPropagation()}>
        <RefUploader items={mediaItems} onChange={setMediaItems} />
        <textarea
          className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent leading-relaxed min-h-[56px] max-h-32"
          placeholder={
            genType === 'image'
              ? '上传参考图，输入文字，生成图片'
              : '上传参考图、视频、音频，输入文字，自由组合生成视频'
          }
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
          rows={2}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto" onClick={e => e.stopPropagation()}>

        {/* Gen type */}
        <div className="relative">
          <button onClick={toggle('type')} className="flex items-center gap-1 text-sm font-medium text-teal-600 whitespace-nowrap px-1">
            {genType === 'image' ? '🖼 图片生成' : '🎬 视频生成'}
            <span className="text-gray-400 text-xs">▾</span>
          </button>
          {openDropdown === 'type' && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[130px]">
              {['image', 'video'].map(t => (
                <button
                  key={t}
                  onClick={() => { setGenType(t); closeAll() }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  {t === 'image' ? '🖼 图片生成' : '🎬 视频生成'}
                  {genType === t && <span className="ml-auto text-gray-900">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-gray-200 text-sm">|</span>

        {/* Model */}
        <div className="relative">
          <button onClick={toggle('model')} className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap px-1">
            <span className="text-teal-500">⬡</span> {modelLabel} <span className="text-teal-400 text-xs">✦</span>
            <span className="text-gray-400 text-xs">▾</span>
          </button>
          {openDropdown === 'model' && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[170px]">
              {models.map(m => (
                <button
                  key={m.value}
                  onClick={() => {
                    if (genType === 'image') setImageModel(m.value)
                    else setVideoModel(m.value)
                    closeAll()
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  {m.label}
                  {currentModel === m.value && <span className="ml-auto text-gray-900">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Video: reference mode */}
        {genType === 'video' && (
          <>
            <span className="text-gray-200 text-sm">|</span>
            <div className="relative">
              <button onClick={toggle('refMode')} className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap px-1">
                <span>⊛</span>
                {REFERENCE_MODES.find(r => r.value === videoConfig.refMode)?.label || '全能参考'}
                <span className="text-gray-400 text-xs">▾</span>
              </button>
              {openDropdown === 'refMode' && (
                <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[140px]">
                  {REFERENCE_MODES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => { setVideoConfig(c => ({ ...c, refMode: r.value })); closeAll() }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      {r.icon} {r.label}
                      {videoConfig.refMode === r.value && <span className="ml-auto text-gray-900">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <span className="text-gray-200 text-sm">|</span>

        {/* Config popup */}
        <div className="relative">
          <button
            onClick={toggle('config')}
            className={`flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap rounded-lg px-2 py-1 transition
              ${openDropdown === 'config' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            □ {configLabel}
          </button>
          {openDropdown === 'config' && (
            <ConfigPopup
              mode={genType}
              config={config}
              onChange={(c) => { setConfig(c) }}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && mediaItems.length === 0)}
          className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center
            hover:bg-gray-900 disabled:bg-gray-200 disabled:cursor-not-allowed transition flex-shrink-0"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
