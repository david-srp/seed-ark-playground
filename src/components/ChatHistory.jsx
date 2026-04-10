import MessageBubble from './MessageBubble'

export default function ChatHistory({ messages, onRegenerate, onEdit }) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          上传参考素材，输入描述，开始创作
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onRegenerate={() => onRegenerate(msg)}
          onEdit={() => onEdit(msg)}
        />
      ))}
    </div>
  )
}
