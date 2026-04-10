import os
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AsyncOpenAI
from typing import Optional

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

openai_client = AsyncOpenAI(
    base_url=ARK_BASE_URL,
    api_key=ARK_API_KEY,
)


# ─── Upload ───────────────────────────────────────────────────────────────────

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


# ─── Prompt generation ────────────────────────────────────────────────────────

class PromptRequest(BaseModel):
    user_text: str
    media_urls: list[str] = []
    target_type: str = "image"  # "image" or "video"


@app.post("/api/prompt")
async def generate_prompt(req: PromptRequest):
    """Use Seed 2.0 Pro to convert casual description into optimized prompt."""
    system_msg = (
        "You are a professional prompt engineer for AI image/video generation. "
        "Convert the user's casual description into a detailed, structured English prompt "
        "optimized for high-quality generation. Be specific about style, lighting, "
        "composition, and mood. Return ONLY the prompt text, no explanation."
    )
    content = []
    for url in req.media_urls[:4]:
        ext = url.split(".")[-1].lower()
        if ext in ("jpg", "jpeg", "png", "webp", "gif"):
            content.append({"type": "image_url", "image_url": {"url": url}})
    content.append({
        "type": "text",
        "text": f"Generate a {req.target_type} generation prompt for: {req.user_text}",
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


# ─── Image generation (Seedream 5.0) ─────────────────────────────────────────

class ImageRequest(BaseModel):
    prompt: str
    image_urls: list[str] = []
    size: str = "2K"          # "2K" or "4K"
    aspect_ratio: str = "1:1"


@app.post("/api/image")
async def generate_image(req: ImageRequest):
    """Generate image via Seedream 5.0."""
    payload = {
        "model": "seedream-5-0-260128",
        "prompt": req.prompt,
        "size": req.size,
        "response_format": "url",
        "watermark": False,
        "sequential_image_generation": "disabled",
    }
    if req.image_urls:
        payload["image"] = req.image_urls

    async with httpx.AsyncClient(timeout=120) as client:
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


# ─── Video generation (Seedance) ─────────────────────────────────────────────

class MediaItem(BaseModel):
    url: str
    type: str  # "image" | "video" | "audio"


class VideoRequest(BaseModel):
    prompt: str
    media_items: list[MediaItem] = []
    model: str = "fast"        # "fast" | "pro"
    ratio: str = "16:9"
    duration: int = 5          # 4–15 seconds
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
    status = data.get("status", "running")
    video_url = None
    if status in ("succeeded", "completed"):
        for item in data.get("content", []):
            if item.get("type") == "video_url":
                video_url = item.get("video_url", {}).get("url")
                break
        if not video_url:
            video_url = data.get("video_url") or data.get("url")
    return {"status": status, "video_url": video_url}
