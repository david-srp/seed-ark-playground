import os
import traceback
import httpx
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

# Return actual error detail instead of opaque 500
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    return JSONResponse(status_code=500, content={"error": str(exc), "trace": tb[-800:]})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ARK_API_KEY  = os.environ.get("ARK_API_KEY", "").strip()  # strip trailing \n from env var
ARK_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
ASSETS_URL   = "https://assets.yesy.site/api/upload"

MODEL_MAP = {
    "fast": "dreamina-seedance-2-0-fast-260128",
    "pro":  "dreamina-seedance-2-0-260128",
}


# ── Health ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"ok": True, "key_set": bool(ARK_API_KEY)}


# ── Upload ─────────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ASSETS_URL,
            files={"file": (file.filename, content, file.content_type)},
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"R2 upload failed: {resp.text}")
    data = resp.json()
    if not data.get("state"):
        raise HTTPException(502, data.get("message", "Upload failed"))
    return {"url": data["data"]["url"]}


# ── Prompt generation (Seed 2.0 Pro) ───────────────────────────────────
class PromptRequest(BaseModel):
    user_text: str
    media_urls: List[str] = []
    target_type: str = "image"


@app.post("/api/prompt")
async def generate_prompt(req: PromptRequest):
    if not ARK_API_KEY:
        raise HTTPException(500, "ARK_API_KEY not set")
    try:
        return await _generate_prompt(req)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Prompt endpoint error: {e}\n{traceback.format_exc()[-600:]}")

async def _generate_prompt(req: PromptRequest):
    system_msg = (
        "You are a professional prompt engineer for AI image/video generation. "
        "Convert the user's casual description into a detailed, structured English prompt "
        "optimized for high-quality generation. Be specific about style, lighting, "
        "composition, and mood. Return ONLY the prompt text, no explanation."
    )
    content: list = []
    for url in req.media_urls[:4]:
        ext = url.split(".")[-1].lower()
        if ext in ("jpg", "jpeg", "png", "webp", "gif"):
            content.append({"type": "image_url", "image_url": {"url": url}})
    content.append({
        "type": "text",
        "text": f"Generate a {req.target_type} generation prompt for: {req.user_text}",
    })

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{ARK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {ARK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "seed-2-0-pro-260328",
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user",   "content": content},
                ],
            },
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Seed 2.0 Pro error {resp.status_code}: {resp.text[:400]}")
    data = resp.json()
    prompt = data["choices"][0]["message"]["content"].strip()
    return {"prompt": prompt}



# ── Image generation (Seedream 5.0) ────────────────────────────────────
class ImageRequest(BaseModel):
    prompt: str
    image_urls: List[str] = []
    size: str = "2K"
    aspect_ratio: str = "1:1"


@app.post("/api/image")
async def generate_image(req: ImageRequest):
    if not ARK_API_KEY:
        raise HTTPException(500, "ARK_API_KEY not set")
    try:
        return await _generate_image(req)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Image endpoint error: {e}\n{traceback.format_exc()[-600:]}")

async def _generate_image(req: ImageRequest):
    payload: dict = {
        "model": "seedream-5-0-260128",
        "prompt": req.prompt,
        "size": req.size,
        "response_format": "url",
        "watermark": False,
        "sequential_image_generation": "disabled",
    }
    if req.image_urls:
        payload["image"] = req.image_urls

    async with httpx.AsyncClient(timeout=55) as client:
        resp = await client.post(
            f"{ARK_BASE_URL}/images/generations",
            headers={"Authorization": f"Bearer {ARK_API_KEY}"},
            json=payload,
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Seedream error {resp.status_code}: {resp.text[:600]}")
    data = resp.json()
    urls = [item["url"] for item in data.get("data", [])]
    return {"urls": urls}



# ── Video generation (Seedance) ─────────────────────────────────────────
class MediaItem(BaseModel):
    url: str
    type: str


class VideoRequest(BaseModel):
    prompt: str
    media_items: List[MediaItem] = []
    model: str = "fast"
    ratio: str = "16:9"
    duration: int = 5
    generate_audio: bool = True


@app.post("/api/video")
async def submit_video(req: VideoRequest):
    if not ARK_API_KEY:
        raise HTTPException(500, "ARK_API_KEY not set")

    content: list = [{"type": "text", "text": req.prompt}]
    for item in req.media_items:
        if item.type == "image":
            content.append({"type": "image_url", "image_url": {"url": item.url}, "role": "reference_image"})
        elif item.type == "video":
            content.append({"type": "video_url", "video_url": {"url": item.url}, "role": "reference_video"})
        elif item.type == "audio":
            content.append({"type": "audio_url", "audio_url": {"url": item.url}, "role": "reference_audio"})

    payload = {
        "model": MODEL_MAP.get(req.model, MODEL_MAP["fast"]),
        "content": content,
        "ratio": req.ratio,
        "duration": req.duration,
        "generate_audio": req.generate_audio,
        "watermark": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{ARK_BASE_URL}/contents/generations/tasks",
            headers={"Authorization": f"Bearer {ARK_API_KEY}", "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Seedance submit error: {resp.text}")
    data = resp.json()
    task_id = data.get("id") or data.get("task_id")
    return {"task_id": task_id}


# ── Task status polling ─────────────────────────────────────────────────
@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    if not ARK_API_KEY:
        raise HTTPException(500, "ARK_API_KEY not set")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{ARK_BASE_URL}/contents/generations/tasks/{task_id}",
            headers={"Authorization": f"Bearer {ARK_API_KEY}"},
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Task query error: {resp.text}")
    data = resp.json()
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
