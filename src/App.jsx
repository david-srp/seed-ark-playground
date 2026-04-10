import { useRef, useEffect } from 'react'
import ChatHistory from './components/ChatHistory'
import InputToolbar from './components/InputToolbar'
import { useGenerate } from './hooks/useGenerate'

export default function App() {
  const { messages, submit, clearHistory, fillFromMessage } = useGenerate()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isLoading = messages.some(m => m.role === 'assistant' && m.status === 'loading')

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-white shadow-sm">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-base font-semibold text-gray-800">Seed 创作工具</h1>
        <button
          onClick={clearHistory}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          清空记录
        </button>
      </header>

      <ChatHistory
        messages={messages}
        onRegenerate={(msg) => submit(msg._submitParams)}
        onEdit={(msg) => fillFromMessage && fillFromMessage(msg)}
      />
      <div ref={bottomRef} />

      <InputToolbar onSubmit={submit} disabled={isLoading} />
    </div>
  )
}
