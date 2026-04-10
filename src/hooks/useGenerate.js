import { useState, useCallback } from 'react'

const API = import.meta.env.VITE_API_BASE || '/api'
const STORAGE_KEY = 'seed_chat_history'

function genId() { return crypto.randomUUID() }

async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.url
}

async function generatePrompt(userText, mediaUrls, targetType) {
  const res = await fetch(`${API}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_text: userText, media_urls: mediaUrls, target_type: targetType }),
  })
  if (!res.ok) throw new Error('Prompt generation failed')
  const data = await res.json()
  return data.prompt
}

async function generateImage(prompt, imageUrls, config) {
  const res = await fetch(`${API}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      size: config.resolution || '2K',
      aspect_ratio: config.ratio || '1:1',
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[image] API error:', res.status, body)
    throw new Error(`Image generation failed (${res.status}): ${body.detail || body.error || ''}`)
  }
  const data = await res.json()
  return data.urls
}

async function submitVideo(prompt, mediaItems, config, model) {
  const res = await fetch(`${API}/video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      media_items: mediaItems.map(i => ({ url: i.url, type: i.type })),
      model,
      ratio: config.ratio || '16:9',
      duration: config.duration || 5,
      generate_audio: true,
    }),
  })
  if (!res.ok) throw new Error('Video submit failed')
  const data = await res.json()
  return data.task_id
}

async function pollTask(taskId) {
  const res = await fetch(`${API}/task/${taskId}`)
  if (!res.ok) throw new Error('Task poll failed')
  return res.json()
}

function saveHistory(msgs) {
  // Only save serializable parts (no File objects)
  const toSave = msgs.map(m => ({
    ...m,
    mediaItems: m.mediaItems?.map(i => ({ type: i.type, url: i.url, localUrl: i.url || i.localUrl })),
    _submitParams: undefined,
  }))
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)) } catch {}
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

export function useGenerate() {
  const [messages, setMessages] = useState(loadHistory)

  const addMsg = useCallback((msg) => {
    setMessages(prev => {
      const next = [...prev, msg]
      saveHistory(next)
      return next
    })
  }, [])

  const updateMsg = useCallback((id, patch) => {
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m)
      saveHistory(next)
      return next
    })
  }, [])

  const submit = useCallback(async ({ text, mediaItems, genType, model, config, enhancePrompt = false }) => {
    const submitParams = { text, mediaItems, genType, model, config, enhancePrompt }

    // 1. User message
    const userMsg = {
      id: genId(),
      role: 'user',
      text,
      mediaItems: mediaItems.map(i => ({ type: i.type, localUrl: i.localUrl, url: i.url })),
      config: {
        modelLabel: model,
        ratio: config.ratio,
        resolution: genType === 'image' ? config.resolution : null,
      },
      _submitParams: submitParams,
    }
    addMsg(userMsg)

    // 2. Pending AI message
    const aiId = genId()
    const aiMsg = {
      id: aiId,
      role: 'assistant',
      type: genType,
      status: 'loading',
      loadingText: mediaItems.some(i => !i.url) ? '正在上传素材...' : (enhancePrompt ? '正在增强提示词...' : `正在生成${genType === 'image' ? '图片' : '视频'}...`),
      prompt: null,
      imageUrls: null,
      videoUrl: null,
    }
    addMsg(aiMsg)

    try {
      // 3. Upload any unuploaded files
      const uploadedItems = await Promise.all(
        mediaItems.map(async (item) => {
          if (item.url) return item
          const url = await uploadFile(item.file)
          return { ...item, url }
        })
      )
      const uploadedUrls = uploadedItems.map(i => i.url).filter(Boolean)

      // 4. Prompt: enhance with Seed Pro if toggled, otherwise use text directly
      let prompt = text
      if (enhancePrompt) {
        updateMsg(aiId, { loadingText: '✦ Seed Pro 增强提示词中...' })
        prompt = await generatePrompt(text, uploadedUrls, genType)
        updateMsg(aiId, { prompt })
      }
      updateMsg(aiId, { loadingText: `正在生成${genType === 'image' ? '图片' : '视频'}...` })

      if (genType === 'image') {
        // 5a. Image
        const imageUrls = await generateImage(prompt, uploadedUrls, config)
        updateMsg(aiId, { status: 'done', imageUrls })
      } else {
        // 5b. Video — submit task then poll
        const taskId = await submitVideo(prompt, uploadedItems, config, model)
        updateMsg(aiId, { taskId, loadingText: '视频生成中，请稍候...' })

        const poll = async () => {
          try {
            const result = await pollTask(taskId)
            if (result.status === 'succeeded' || result.status === 'completed') {
              updateMsg(aiId, { status: 'done', videoUrl: result.video_url })
            } else if (result.status === 'failed') {
              updateMsg(aiId, { status: 'error' })
            } else {
              setTimeout(poll, 3000)
            }
          } catch {
            setTimeout(poll, 5000)
          }
        }
        poll()
      }
    } catch (err) {
      console.error(err)
      updateMsg(aiId, { status: 'error' })
    }
  }, [addMsg, updateMsg])

  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { messages, submit, clearHistory }
}
