import { useState } from 'react'

export default function MessageBubble({ message, onRegenerate, onEdit }) {
  const [promptExpanded, setPromptExpanded] = useState(false)

  if (message.role === 'user') return <UserBubble message={message} />
  return (
    <AssistantBubble
      message={message}
      promptExpanded={promptExpanded}
      setPromptExpanded={setPromptExpanded}
      onRegenerate={onRegenerate}
      onEdit={onEdit}
    />
  )
}

function UserBubble({ message }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[80%]">
        {message.mediaItems?.length > 0 && (
          <div className="flex gap-2 mb-2 justify-end flex-wrap">
            {message.mediaItems.map((item, i) => (
              <MediaThumb key={i} item={item} />
            ))}
          </div>
        )}
        <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.text}</p>
          <div className="flex gap-2 mt-1 text-xs text-gray-400 flex-wrap">
            {message.config?.modelLabel && <span>{message.config.modelLabel}</span>}
            {message.config?.ratio && <span>· {message.config.ratio}</span>}
            {message.config?.resolution && <span>· {message.config.resolution}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function AssistantBubble({ message, promptExpanded, setPromptExpanded, onRegenerate, onEdit }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full">
        {/* Loading */}
        {message.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
            <LoadingDots />
            <span>{message.loadingText || '生成中...'}</span>
          </div>
        )}

        {/* Image results */}
        {message.type === 'image' && message.status === 'done' && (
          <div className={`grid gap-2 mb-2 ${message.imageUrls?.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {message.imageUrls?.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="rounded-xl w-full object-cover cursor-pointer hover:opacity-95 transition"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        )}

        {/* Video result */}
        {message.type === 'video' && message.status === 'done' && message.videoUrl && (
          <video
            src={message.videoUrl}
            controls
            className="rounded-xl w-full mb-2"
          />
        )}

        {/* Error */}
        {message.status === 'error' && (
          <div className="bg-gray-50 rounded-xl p-4 mb-2 flex items-center gap-2 text-sm text-gray-400">
            <span>⚠</span>
            <span>生成失败，请重试</span>
          </div>
        )}

        {/* Action buttons */}
        {(message.status === 'done' || message.status === 'error') && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full px-3 py-1.5 transition"
            >
              重新编辑
            </button>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full px-3 py-1.5 transition"
            >
              再次生成
            </button>
          </div>
        )}

        {/* Prompt toggle */}
        {message.prompt && (
          <div className="mt-2">
            <button
              onClick={() => setPromptExpanded(!promptExpanded)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
            >
              {promptExpanded ? '▾' : '▸'} 查看提示词
            </button>
            {promptExpanded && (
              <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">
                {message.prompt}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MediaThumb({ item }) {
  if (item.type === 'image') {
    return (
      <img
        src={item.localUrl || item.url}
        alt=""
        className="w-16 h-16 rounded-lg object-cover"
      />
    )
  }
  if (item.type === 'video') {
    return (
      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-lg">
        🎬
      </div>
    )
  }
  return (
    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-lg">
      🎵
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
