import { useRef } from 'react'

const ACCEPT = 'image/*,video/*,audio/*'
const MAX_FILES = 12

export default function RefUploader({ items, onChange }) {
  const inputRef = useRef()

  const handleFiles = (files) => {
    if (items.length >= MAX_FILES) return
    const newItems = [...items]
    for (const file of files) {
      if (newItems.length >= MAX_FILES) break
      newItems.push({
        id: crypto.randomUUID(),
        file,
        localUrl: URL.createObjectURL(file),
        type: file.type.startsWith('image') ? 'image'
            : file.type.startsWith('video') ? 'video'
            : 'audio',
        url: null,
      })
    }
    onChange(newItems)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles([...e.dataTransfer.files])
  }

  const remove = (id) => onChange(items.filter(i => i.id !== id))

  return (
    <div className="flex gap-2 flex-wrap items-start">
      {items.map(item => (
        <div key={item.id} className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 group flex-shrink-0">
          {item.type === 'image' && (
            <img src={item.localUrl} alt="" className="w-full h-full object-cover" />
          )}
          {item.type === 'video' && (
            <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
          )}
          {item.type === 'audio' && (
            <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
          )}
          <button
            onClick={() => remove(item.id)}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center leading-none"
          >
            ×
          </button>
        </div>
      ))}

      {items.length < MAX_FILES && (
        <button
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition cursor-pointer flex-shrink-0"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-[10px] mt-0.5">参考</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={e => handleFiles([...e.target.files])}
      />
    </div>
  )
}
