# Seed ARK Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a chat-style web tool that uses Seed 2.0 Pro to generate optimized prompts, then creates images (Seedream 5.0) or videos (Seedance 2.0 Pro/Fast) via ARK API, with a UI modeled after Seedance's own product.

**Architecture:** React+Vite frontend + single FastAPI app (Python) as Vercel serverless backend. Reference files uploaded to `assets.yesy.site` (Cloudflare R2) via proxy, then passed as URLs to ARK. Video generation uses async task polling. Chat history persisted in localStorage.

**Tech Stack:** React 18, Vite, Tailwind CSS, Python 3.11, FastAPI, httpx, openai SDK, Vercel

---

## Environment Variables (set in Vercel + local `.env`)

```
ARK_API_KEY=fe8a175b-12ac-442a-ab11-3a8c57b1cb9f
```

## Model IDs

| Model | ID |
|---|---|
| Seed 2.0 Pro (prompt gen) | `seed-2-0-pro-260328` |
| Seedream 5.0 (image) | `seedream-5-0-260128` |
| Seedance 2.0 Fast (video) | `dreamina-seedance-2-0-fast-260128` |
| Seedance 2.0 Pro (video) | `dreamina-seedance-2-0-260128` |

## API Endpoints

- ARK base: `https://ark.ap-southeast.bytepluses.com/api/v3`
- File upload: `https://assets.yesy.site/api/upload` (multipart POST, no auth)
- Video task: `POST /contents/generations/tasks`
- Task status: `GET /contents/generations/tasks/{task_id}`

---

## Task 1: Project Scaffold

**Files:**
- Create: `seedtest/package.json`
- Create: `seedtest/vite.config.js`
- Create: `seedtest/index.html`
- Create: `seedtest/requirements.txt`
- Create: `seedtest/vercel.json`
- Create: `seedtest/.env.local`
- Create: `seedtest/.gitignore`

**Step 1: Init Vite React project**

```bash
cd /Users/davidlu/Documents/claude_code_test
npm create vite@latest seedtest -- --template react
cd seedtest
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Install Python deps**

```bash
cd /Users/davidlu/Documents/claude_code_test/seedtest
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi httpx openai python-multipart uvicorn
pip freeze > requirements.txt
```

**Step 3: Configure Tailwind** — edit `tailwind.config.js`:

```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Create `vercel.json`**

```json
{
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" },
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.py" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Step 5: Create `.env.local`**

```
VITE_API_BASE=/api
ARK_API_KEY=fe8a175b-12ac-442a-ab11-3a8c57b1cb9f
```

**Step 6: Create `.gitignore`**

```
node_modules/
dist/
.venv/
.env.local
__pycache__/
*.pyc
```

**Step 7: Verify dev server runs**

```bash
npm run dev
```
Expected: Vite dev server at localhost:5173

**Step 8: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Vite+React+Python project"
```

---

## Task 2: Backend — FastAPI App + Upload Endpoint

**Files:**
- Create: `seedtest/api/__init__.py`
- Create: `seedtest/api/index.py`

**Step 1: Create `api/__init__.py`** (empty file)

**Step 2: Create `api/index.py`** with FastAPI app + CORS + upload route:

```python
import os
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ARK_API_KEY = os.environ.get("ARK_API_KEY", "")
ARK_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
ASSETS_UPLOAD_URL = "https://assets.yesy.site/api/upload"


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload reference file to assets.yesy.site R2, return public URL."""
    content = await file.read()
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            ASSETS_UPLOAD_URL,
            files={"file": (file.filename, content, file.content_type)},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Upload to R2 failed")
    data = response.json()
    if not data.get("state"):
        raise HTTPException(status_code=502, detail=data.get("message", "Upload failed"))
    return {"url": data["data"]["url"]}
```

**Step 3: Test upload endpoint locally**

```bash
cd seedtest
uvicorn api.index:app --reload --port 8000
# In another terminal:
curl -X POST http://localhost:8000/api/upload \
  -F "file=@/path/to/test.png"
```
Expected: `{"url": "https://assets.yesy.site/images/2026/04/..."}`

**Step 4: Commit**

```bash
git add api/
git commit -m "feat: add FastAPI backend with file upload endpoint"
```

---

## Task 3: Backend — Prompt Generation (Seed 2.0 Pro)

**Files:**
- Modify: `seedtest/api/index.py`

**Step 1: Add Pydantic models and prompt endpoint to `api/index.py`:**

```python
from pydantic import BaseModel
from openai import AsyncOpenAI
from typing import Optional

openai_client = AsyncOpenAI(
    base_url=f"{ARK_BASE_URL}",
    api_key=ARK_API_KEY,
)

class PromptRequest(BaseModel):
    user_text: str
    media_urls: list[str] = []   # already-uploaded reference URLs
    target_type: str = "image"   # "image" or "video"


@app.post("/api/prompt")
async def generate_prompt(req: PromptRequest):
    """Use Seed 2.0 Pro to convert user's casual description into an optimized prompt."""
    system_msg = (
        "You are a professional prompt engineer for AI image/video generation. "
        "Convert the user's casual description into a detailed, structured English prompt "
        "optimized for high-quality generation. Be specific about style, lighting, composition, "
        "and mood. Return ONLY the prompt text, no explanation."
    )
    # Build multimodal content
    content = []
    for url in req.media_urls[:4]:  # seed 2.0 pro supports images as reference
        ext = url.split(".")[-1].lower()
        if ext in ("jpg", "jpeg", "png", "webp", "gif"):
            content.append({"type": "image_url", "image_url": {"url": url}})
    content.append({
        "type": "text",
        "text": f"Generate a {req.target_type} generation prompt for: {req.user_text}"
    })

    response = await openai_client.chat.completions.create(
        model="seed-2-0-pro-260328",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": content},
        ],
    )
    prompt = response.choices[0].message.content.strip()
    return {"prompt": prompt}
```

**Step 2: Test prompt endpoint**

```bash
curl -X POST http://localhost:8000/api/prompt \
  -H "Content-Type: application/json" \
  -d '{"user_text": "a cat sitting on a rainbow cloud", "target_type": "image"}'
```
Expected: `{"prompt": "A fluffy white cat perched gracefully on a vibrant rainbow-colored cloud..."}`

**Step 3: Commit**

```bash
git add api/index.py
git commit -m "feat: add Seed 2.0 Pro prompt generation endpoint"
```

---

## Task 4: Backend — Image Generation (Seedream 5.0)

**Files:**
- Modify: `seedtest/api/index.py`

**Step 1: Add image generation endpoint:**

```python
class ImageRequest(BaseModel):
    prompt: str
    image_urls: list[str] = []   # reference image URLs
    size: str = "2K"             # "2K" or "4K"
    aspect_ratio: str = "1:1"   # e.g. "1:1", "16:9", "3:4"

# Aspect ratio → size mapping for Seedream
RATIO_SIZE_MAP = {
    "1:1":  {"2K": "2048x2048", "4K": "4096x4096"},
    "16:9": {"2K": "2048x1152", "4K": "4096x2304"},
    "9:16": {"2K": "1152x2048", "4K": "2304x4096"},
    "4:3":  {"2K": "2048x1536", "4K": "4096x3072"},
    "3:4":  {"2K": "1536x2048", "4K": "3072x4096"},
    "3:2":  {"2K": "2048x1365", "4K": "4096x2730"},
    "2:3":  {"2K": "1365x2048", "4K": "2730x4096"},
    "21:9": {"2K": "2048x878",  "4K": "4096x1756"},
}

@app.post("/api/image")
async def generate_image(req: ImageRequest):
    """Generate image via Seedream 5.0."""
    size_str = req.size  # API accepts "2K" or "4K" directly
    extra_body = {"watermark": False, "sequential_image_generation": "disabled"}
    if req.image_urls:
        extra_body["image"] = req.image_urls

    # Run synchronous openai SDK call in thread pool to not block event loop
    import asyncio
    loop = asyncio.get_event_loop()
    
    # Use httpx directly since openai images.generate is sync
    async with httpx.AsyncClient(timeout=120) as client:
        payload = {
            "model": "seedream-5-0-260128",
            "prompt": req.prompt,
            "size": size_str,
            "response_format": "url",
            **extra_body,
        }
        response = await client.post(
            f"{ARK_BASE_URL}/images/generations",
            headers={"Authorization": f"Bearer {ARK_API_KEY}"},
            json=payload,
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Image gen failed: {response.text}")
    data = response.json()
    urls = [item["url"] for item in data.get("data", [])]
    return {"urls": urls}
```

**Step 2: Test image endpoint**

```bash
curl -X POST http://localhost:8000/api/image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A fluffy cat on a rainbow cloud, digital art", "size": "2K", "aspect_ratio": "1:1"}'
```
Expected: `{"urls": ["https://..."]}`

**Step 3: Commit**

```bash
git add api/index.py
git commit -m "feat: add Seedream 5.0 image generation endpoint"
```

---

## Task 5: Backend — Video Generation (Seedance) + Task Polling

**Files:**
- Modify: `seedtest/api/index.py`

**Step 1: Add video submit + task status endpoints:**

```python
class MediaItem(BaseModel):
    url: str
    type: str   # "image", "video", "audio"

class VideoRequest(BaseModel):
    prompt: str
    media_items: list[MediaItem] = []
    model: str = "fast"          # "fast" or "pro"
    ratio: str = "16:9"
    duration: int = 5            # 4-15 seconds
    reference_mode: str = "all"  # "all" | "first_last" | "multi"
    generate_audio: bool = True

MODEL_MAP = {
    "fast": "dreamina-seedance-2-0-fast-260128",
    "pro":  "dreamina-seedance-2-0-260128",
}

@app.post("/api/video")
async def submit_video(req: VideoRequest):
    """Submit Seedance video generation task, return task_id."""
    content = [{"type": "text", "text": req.prompt}]
    for item in req.media_items:
        if item.type == "image":
            content.append({
                "type": "image_url",
                "image_url": {"url": item.url},
                "role": "reference_image",
            })
        elif item.type == "video":
            content.append({
                "type": "video_url",
                "video_url": {"url": item.url},
                "role": "reference_video",
            })
        elif item.type == "audio":
            content.append({
                "type": "audio_url",
                "audio_url": {"url": item.url},
                "role": "reference_audio",
            })

    payload = {
        "model": MODEL_MAP.get(req.model, MODEL_MAP["fast"]),
        "content": content,
        "ratio": req.ratio,
        "duration": req.duration,
        "generate_audio": req.generate_audio,
        "watermark": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{ARK_BASE_URL}/contents/generations/tasks",
            headers={
                "Authorization": f"Bearer {ARK_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Video submit failed: {response.text}")
    data = response.json()
    task_id = data.get("id") or data.get("task_id")
    return {"task_id": task_id}


@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    """Poll Seedance task status. Returns status + video_url when done."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{ARK_BASE_URL}/contents/generations/tasks/{task_id}",
            headers={"Authorization": f"Bearer {ARK_API_KEY}"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Task query failed: {response.text}")
    data = response.json()
    # Normalize response: extract status and video URL
    status = data.get("status", "running")
    video_url = None
    if status in ("succeeded", "completed"):
        # Try common response shapes
        content = data.get("content", [])
        for item in content:
            if item.get("type") == "video_url":
                video_url = item.get("video_url", {}).get("url")
                break
        if not video_url:
            video_url = data.get("video_url") or data.get("url")
    return {"status": status, "video_url": video_url, "raw": data}
```

**Step 2: Test video submit**

```bash
curl -X POST http://localhost:8000/api/video \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A cat jumping in slow motion, cinematic", "ratio": "16:9", "duration": 5}'
```
Expected: `{"task_id": "..."}`

**Step 3: Test task polling**

```bash
curl http://localhost:8000/api/task/<task_id_from_above>
```
Expected: `{"status": "running", "video_url": null}` or `{"status": "succeeded", "video_url": "https://..."}`

**Step 4: Commit**

```bash
git add api/index.py
git commit -m "feat: add Seedance video submit and task polling endpoints"
```

---

## Task 6: Frontend — Base Layout + Global Styles

**Files:**
- Modify: `seedtest/src/App.jsx`
- Modify: `seedtest/src/index.css`
- Create: `seedtest/src/components/ChatHistory.jsx`

**Step 1: Update `src/index.css`** — add custom scrollbar and base styles:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-gray-50 text-gray-900; }
}

@layer utilities {
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { @apply bg-transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { @apply bg-gray-300 rounded-full; }
}
```

**Step 2: Create `src/components/ChatHistory.jsx`:**

```jsx
export default function ChatHistory({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          上传参考素材，输入描述，开始创作
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className="w-full">
          {/* MessageBubble placeholder — filled in Task 7 */}
          <pre className="text-xs text-gray-400">{JSON.stringify(msg, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}
```

**Step 3: Update `src/App.jsx`** — skeleton layout:

```jsx
import { useState } from 'react'
import ChatHistory from './components/ChatHistory'

export default function App() {
  const [messages, setMessages] = useState([])

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-sm">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-gray-100">
        <h1 className="text-lg font-semibold text-gray-800">Seed 创作工具</h1>
      </header>

      {/* Chat area */}
      <ChatHistory messages={messages} />

      {/* Toolbar placeholder — filled in Task 9 */}
      <div className="border-t border-gray-100 p-4 text-center text-gray-400 text-sm">
        底部工具栏（待实现）
      </div>
    </div>
  )
}
```

**Step 4: Verify layout renders**

```bash
npm run dev
```
Expected: Page with header + empty chat area + placeholder toolbar

**Step 5: Commit**

```bash
git add src/
git commit -m "feat: add base layout with ChatHistory skeleton"
```

---

## Task 7: Frontend — MessageBubble Component

**Files:**
- Create: `seedtest/src/components/MessageBubble.jsx`
- Modify: `seedtest/src/components/ChatHistory.jsx`

**Step 1: Create `src/components/MessageBubble.jsx`:**

```jsx
import { useState } from 'react'

export default function MessageBubble({ message, onRegenerate, onEdit }) {
  const [promptExpanded, setPromptExpanded] = useState(false)
  const isUser = message.role === 'user'

  if (isUser) return <UserBubble message={message} />
  return <AssistantBubble
    message={message}
    promptExpanded={promptExpanded}
    setPromptExpanded={setPromptExpanded}
    onRegenerate={onRegenerate}
    onEdit={onEdit}
  />
}

function UserBubble({ message }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[80%]">
        {/* Reference thumbnails */}
        {message.mediaItems?.length > 0 && (
          <div className="flex gap-2 mb-2 justify-end flex-wrap">
            {message.mediaItems.map((item, i) => (
              <MediaThumb key={i} item={item} />
            ))}
          </div>
        )}
        {/* Text + meta */}
        <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-gray-800">{message.text}</p>
          <div className="flex gap-2 mt-1 text-xs text-gray-400">
            <span>{message.config?.modelLabel}</span>
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
    <div className="flex justify-start gap-3">
      <div className="max-w-[85%] w-full">
        {/* Loading state */}
        {message.status === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
            <LoadingDots />
            <span>{message.loadingText || '生成中...'}</span>
          </div>
        )}

        {/* Image results */}
        {message.type === 'image' && message.status === 'done' && (
          <div className="grid grid-cols-2 gap-2 mb-2">
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

        {/* Error state */}
        {message.status === 'error' && (
          <div className="bg-gray-50 rounded-xl p-4 mb-2 text-sm text-gray-400 flex items-center gap-2">
            <span>⚠ 生成失败</span>
          </div>
        )}

        {/* Action buttons */}
        {(message.status === 'done' || message.status === 'error') && (
          <div className="flex gap-2 mt-1">
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full px-3 py-1.5 transition">
              重新编辑
            </button>
            <button onClick={onRegenerate} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full px-3 py-1.5 transition">
              再次生成
            </button>
          </div>
        )}

        {/* Prompt toggle */}
        {message.prompt && (
          <div className="mt-2">
            <button
              onClick={() => setPromptExpanded(!promptExpanded)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
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
    return <img src={item.url} alt="" className="w-16 h-16 rounded-lg object-cover" />
  }
  if (item.type === 'video') {
    return (
      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
        🎬
      </div>
    )
  }
  return (
    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
      🎵
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-1">
      {[0,1,2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
```

**Step 2: Update `ChatHistory.jsx`** to use MessageBubble:

```jsx
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
```

**Step 3: Commit**

```bash
git add src/components/
git commit -m "feat: add MessageBubble with image/video/loading/error states"
```

---

## Task 8: Frontend — RefUploader Component

**Files:**
- Create: `seedtest/src/components/RefUploader.jsx`

**Step 1: Create `src/components/RefUploader.jsx`:**

```jsx
import { useRef } from 'react'

const ACCEPT = "image/*,video/*,audio/*"
const MAX_FILES = 12

export default function RefUploader({ items, onChange }) {
  const inputRef = useRef()

  const handleFiles = async (files) => {
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
        uploading: false,
        url: null,  // remote URL filled in after upload
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
    <div className="flex gap-2 flex-wrap">
      {/* Uploaded items */}
      {items.map(item => (
        <div key={item.id} className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 group">
          {item.type === 'image' && (
            <img src={item.localUrl} alt="" className="w-full h-full object-cover" />
          )}
          {item.type === 'video' && (
            <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
          )}
          {item.type === 'audio' && (
            <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
          )}
          {item.uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <button
            onClick={() => remove(item.id)}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ))}

      {/* Add button */}
      {items.length < MAX_FILES && (
        <button
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition cursor-pointer"
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
```

**Step 2: Commit**

```bash
git add src/components/RefUploader.jsx
git commit -m "feat: add RefUploader with drag-drop and preview"
```

---

## Task 9: Frontend — ConfigPopup Component

**Files:**
- Create: `seedtest/src/components/ConfigPopup.jsx`

**Step 1: Create `src/components/ConfigPopup.jsx`:**

```jsx
// Image aspect ratios
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

// Video aspect ratios
const VIDEO_RATIOS = [
  { label: '21:9', value: '21:9' },
  { label: '16:9', value: '16:9' },
  { label: '4:3',  value: '4:3'  },
  { label: '1:1',  value: '1:1'  },
  { label: '3:4',  value: '3:4'  },
  { label: '9:16', value: '9:16' },
]

const REFERENCE_MODES = [
  { label: '全能参考', value: 'all',        icon: '⊛' },
  { label: '首尾帧',   value: 'first_last', icon: '⊟' },
  { label: '智能多帧', value: 'multi',      icon: '⊞' },
]

const DURATIONS = Array.from({ length: 12 }, (_, i) => i + 4) // 4..15

export default function ConfigPopup({ mode, config, onChange, onClose }) {
  if (mode === 'image') {
    return (
      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-80 z-50">
        <p className="text-sm text-gray-500 mb-3">选择比例</p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {IMAGE_RATIOS.map(r => (
            <button
              key={r.value}
              onClick={() => onChange({ ...config, ratio: r.value })}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition
                ${config.ratio === r.value ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span className="text-base">{r.icon}</span>
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
                ${config.resolution === res ? 'bg-gray-900 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
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
              ${config.ratio === r.value ? 'bg-gray-900 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
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
              ${config.duration === d ? 'bg-gray-900 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
          >
            {d}s
          </button>
        ))}
      </div>
    </div>
  )
}

export { REFERENCE_MODES }
```

**Step 2: Commit**

```bash
git add src/components/ConfigPopup.jsx
git commit -m "feat: add ConfigPopup for image/video settings"
```

---

## Task 10: Frontend — InputToolbar Component

**Files:**
- Create: `seedtest/src/components/InputToolbar.jsx`

**Step 1: Create `src/components/InputToolbar.jsx`:**

```jsx
import { useState, useRef } from 'react'
import RefUploader from './RefUploader'
import ConfigPopup, { REFERENCE_MODES } from './ConfigPopup'

const IMAGE_MODELS = [
  { label: '图片5.0 Lite', value: 'seedream-lite' },
  { label: '图片5.0',      value: 'seedream' },
]
const VIDEO_MODELS = [
  { label: 'Seedance 2.0 Fast', value: 'fast' },
  { label: 'Seedance 2.0 Pro',  value: 'pro'  },
]

const DEFAULT_IMAGE_CONFIG = { ratio: '1:1', resolution: '2K' }
const DEFAULT_VIDEO_CONFIG = { ratio: '16:9', duration: 5, refMode: 'all' }

export default function InputToolbar({ onSubmit, disabled }) {
  const [genType, setGenType] = useState('image')   // 'image' | 'video'
  const [imageModel, setImageModel] = useState('seedream')
  const [videoModel, setVideoModel] = useState('fast')
  const [imageConfig, setImageConfig] = useState(DEFAULT_IMAGE_CONFIG)
  const [videoConfig, setVideoConfig] = useState(DEFAULT_VIDEO_CONFIG)
  const [mediaItems, setMediaItems] = useState([])
  const [text, setText] = useState('')
  const [openDropdown, setOpenDropdown] = useState(null) // 'type'|'model'|'refMode'|'config'|null

  const toggleDropdown = (name) => setOpenDropdown(o => o === name ? null : name)
  const closeAll = () => setOpenDropdown(null)

  const handleSubmit = () => {
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

  return (
    <div
      className="border-t border-gray-100 bg-white px-4 pt-3 pb-4"
      onClick={closeAll}
    >
      {/* Input area */}
      <div className="flex gap-3 mb-3" onClick={e => e.stopPropagation()}>
        <RefUploader items={mediaItems} onChange={setMediaItems} />
        <textarea
          className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent leading-relaxed min-h-[56px] max-h-32"
          placeholder={genType === 'image'
            ? '上传参考图，输入文字，生成图片'
            : '上传参考图、视频、音频，输入文字，自由组合生成视频'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
          rows={2}
        />
      </div>

      {/* Bottom toolbar */}
      <div
        className="flex items-center gap-2 overflow-x-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Gen type selector */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('type')}
            className="flex items-center gap-1 text-sm font-medium text-teal-600 whitespace-nowrap"
          >
            {genType === 'image' ? '🖼 图片生成' : '🎬 视频生成'}
            <span className="text-gray-400">▾</span>
          </button>
          {openDropdown === 'type' && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[120px]">
              {['image', 'video'].map(t => (
                <button
                  key={t}
                  onClick={() => { setGenType(t); closeAll() }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2
                    ${genType === t ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
                >
                  {t === 'image' ? '🖼 图片生成' : '🎬 视频生成'}
                  {genType === t && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-gray-200">|</span>

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('model')}
            className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap"
          >
            ⬡ {genType === 'image'
              ? IMAGE_MODELS.find(m => m.value === imageModel)?.label
              : VIDEO_MODELS.find(m => m.value === videoModel)?.label}
            <span className="text-teal-500">✦</span>
            <span className="text-gray-400">▾</span>
          </button>
          {openDropdown === 'model' && (
            <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[160px]">
              {(genType === 'image' ? IMAGE_MODELS : VIDEO_MODELS).map(m => (
                <button
                  key={m.value}
                  onClick={() => {
                    if (genType === 'image') setImageModel(m.value)
                    else setVideoModel(m.value)
                    closeAll()
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2
                    ${(genType === 'image' ? imageModel : videoModel) === m.value ? 'font-medium' : 'text-gray-600'}`}
                >
                  {m.label}
                  {(genType === 'image' ? imageModel : videoModel) === m.value && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Video: reference mode */}
        {genType === 'video' && (
          <>
            <span className="text-gray-200">|</span>
            <div className="relative">
              <button
                onClick={() => toggleDropdown('refMode')}
                className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap"
              >
                ⊛ {REFERENCE_MODES.find(r => r.value === videoConfig.refMode)?.label || '全能参考'}
                <span className="text-gray-400">▾</span>
              </button>
              {openDropdown === 'refMode' && (
                <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 min-w-[140px]">
                  {REFERENCE_MODES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => { setVideoConfig(c => ({ ...c, refMode: r.value })); closeAll() }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2
                        ${videoConfig.refMode === r.value ? 'font-medium' : 'text-gray-600'}`}
                    >
                      {r.icon} {r.label}
                      {videoConfig.refMode === r.value && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <span className="text-gray-200">|</span>

        {/* Config popup trigger (ratio + resolution/duration) */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('config')}
            className={`flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap rounded-lg px-2 py-1 transition
              ${openDropdown === 'config' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            {genType === 'image'
              ? `□ ${imageConfig.ratio} ${imageConfig.resolution}`
              : `□ ${videoConfig.ratio} · ${videoConfig.duration}s`}
          </button>
          {openDropdown === 'config' && (
            <ConfigPopup
              mode={genType}
              config={config}
              onChange={(c) => { setConfig(c); }}
              onClose={closeAll}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && mediaItems.length === 0)}
          className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center
            hover:bg-gray-900 disabled:bg-gray-200 disabled:cursor-not-allowed transition"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/InputToolbar.jsx
git commit -m "feat: add InputToolbar with dropdowns and config popup"
```

---

## Task 11: Frontend — useGenerate Hook (State + API calls)

**Files:**
- Create: `seedtest/src/hooks/useGenerate.js`

**Step 1: Create `src/hooks/useGenerate.js`:**

```js
import { useState, useEffect, useCallback } from 'react'

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
  if (!res.ok) throw new Error('Image generation failed')
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

export function useGenerate() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
  })

  const addMsg = useCallback((msg) => {
    setMessages(prev => {
      const next = [...prev, msg]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return msg
  }, [])

  const updateMsg = useCallback((id, patch) => {
    setMessages(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...patch } : m)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const submit = useCallback(async ({ text, mediaItems, genType, model, config }) => {
    // 1. Add user message
    const userMsg = {
      id: genId(),
      role: 'user',
      text,
      mediaItems: mediaItems.map(i => ({ type: i.type, localUrl: i.localUrl, url: i.url })),
      config: {
        modelLabel: model,
        ratio: genType === 'image' ? config.ratio : config.ratio,
        resolution: genType === 'image' ? config.resolution : null,
      },
    }
    addMsg(userMsg)

    // 2. Add pending AI message
    const aiMsg = {
      id: genId(),
      role: 'assistant',
      type: genType,
      status: 'loading',
      loadingText: '正在上传素材...',
      prompt: null,
      imageUrls: null,
      videoUrl: null,
      taskId: null,
    }
    addMsg(aiMsg)

    try {
      // 3. Upload files that haven't been uploaded yet
      const uploadedItems = await Promise.all(
        mediaItems.map(async (item) => {
          if (item.url) return item
          const url = await uploadFile(item.file)
          return { ...item, url }
        })
      )
      updateMsg(aiMsg.id, { loadingText: '正在生成提示词...' })

      // 4. Generate optimized prompt via Seed 2.0 Pro
      const uploadedUrls = uploadedItems.map(i => i.url).filter(Boolean)
      const prompt = await generatePrompt(text, uploadedUrls, genType)
      updateMsg(aiMsg.id, { prompt, loadingText: `正在生成${genType === 'image' ? '图片' : '视频'}...` })

      if (genType === 'image') {
        // 5a. Generate image
        const imageUrls = await generateImage(prompt, uploadedUrls, config)
        updateMsg(aiMsg.id, { status: 'done', imageUrls })
      } else {
        // 5b. Submit video task
        const taskId = await submitVideo(prompt, uploadedItems, config, model)
        updateMsg(aiMsg.id, { taskId, loadingText: '视频生成中，请稍候...' })

        // 6. Poll for completion
        const poll = async () => {
          const result = await pollTask(taskId)
          if (result.status === 'succeeded' || result.status === 'completed') {
            updateMsg(aiMsg.id, { status: 'done', videoUrl: result.video_url })
          } else if (result.status === 'failed') {
            updateMsg(aiMsg.id, { status: 'error' })
          } else {
            setTimeout(poll, 3000) // poll every 3s
          }
        }
        poll()
      }
    } catch (err) {
      console.error(err)
      updateMsg(aiMsg.id, { status: 'error' })
    }
  }, [addMsg, updateMsg])

  const clearHistory = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { messages, submit, clearHistory }
}
```

**Step 2: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useGenerate hook with upload/prompt/image/video flow"
```

---

## Task 12: Frontend — Wire Everything Together in App.jsx

**Files:**
- Modify: `seedtest/src/App.jsx`

**Step 1: Update `src/App.jsx`:**

```jsx
import { useRef, useEffect } from 'react'
import ChatHistory from './components/ChatHistory'
import InputToolbar from './components/InputToolbar'
import { useGenerate } from './hooks/useGenerate'

export default function App() {
  const { messages, submit, clearHistory } = useGenerate()
  const bottomRef = useRef(null)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isLoading = messages.some(m => m.role === 'assistant' && m.status === 'loading')

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-white shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h1 className="text-base font-semibold text-gray-800">Seed 创作工具</h1>
        <button
          onClick={clearHistory}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          清空记录
        </button>
      </header>

      {/* Chat */}
      <ChatHistory
        messages={messages}
        onRegenerate={(msg) => {/* TODO: re-submit same config */}}
        onEdit={(msg) => {/* TODO: fill toolbar with msg config */}}
      />
      <div ref={bottomRef} />

      {/* Toolbar */}
      <InputToolbar onSubmit={submit} disabled={isLoading} />
    </div>
  )
}
```

**Step 2: Verify full flow in browser**

```bash
npm run dev
# Also run backend locally:
uvicorn api.index:app --reload --port 8000
```

Test: type a description, submit, watch loading states → image/video appears.

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire App with useGenerate hook, auto-scroll, disable during load"
```

---

## Task 13: Vercel Deployment

**Files:**
- Modify: `seedtest/vercel.json`
- Verify: `seedtest/requirements.txt`

**Step 1: Finalize `vercel.json`:**

```json
{
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" },
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Step 2: Ensure `requirements.txt` is complete:**

```
fastapi==0.115.0
httpx==0.27.0
openai==1.51.0
python-multipart==0.0.12
uvicorn==0.30.6
```

**Step 3: Add build script to `package.json`**

Confirm `scripts.build` is `"vite build"` (Vite default).

**Step 4: Deploy to Vercel**

```bash
cd seedtest
npx vercel --prod
# Set env var when prompted or via Vercel dashboard:
# ARK_API_KEY = fe8a175b-12ac-442a-ab11-3a8c57b1cb9f
```

**Step 5: Verify production endpoints**

```bash
curl https://your-app.vercel.app/api/prompt \
  -X POST -H "Content-Type: application/json" \
  -d '{"user_text": "test", "target_type": "image"}'
```

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: finalize Vercel deployment config"
```

---

## Summary

| Task | Component | Est. |
|------|-----------|------|
| 1 | Project scaffold | 10 min |
| 2 | Backend: Upload API | 10 min |
| 3 | Backend: Prompt API | 10 min |
| 4 | Backend: Image API | 10 min |
| 5 | Backend: Video API + polling | 15 min |
| 6 | Frontend: Layout | 10 min |
| 7 | Frontend: MessageBubble | 15 min |
| 8 | Frontend: RefUploader | 10 min |
| 9 | Frontend: ConfigPopup | 10 min |
| 10 | Frontend: InputToolbar | 15 min |
| 11 | Frontend: useGenerate hook | 15 min |
| 12 | Frontend: App wiring | 10 min |
| 13 | Vercel deploy | 10 min |
