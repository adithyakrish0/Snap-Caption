from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
from pathlib import Path
import json
import asyncio
from sse_starlette.sse import EventSourceResponse

from downloader_service import DownloaderService
from extractor_service import ExtractorService
from transcriber_service import TranscriberService
from export_service import ExportService

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = BASE_DIR / "backend" / "downloads"
SCREENSHOT_DIR = BASE_DIR / "backend" / "screenshots"
DATA_PROJECTS_DIR = BASE_DIR / "backend" / "data" / "projects"
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
DATA_PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

# Services
downloader = DownloaderService()
extractor = ExtractorService(output_base=str(DATA_PROJECTS_DIR))
transcriber = TranscriberService() 
exporter = ExportService()

# Export Data Model
class ExportRequest(BaseModel):
    project_id: str
    selected_frames: List[dict]
    transcription: dict
    title: Optional[str] = "SnapCaption_Asset"

# API Routes
@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    try:
        # Create a safe filename and path
        filename = f"upload_{file.filename}"
        file_path = DOWNLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "status": "complete",
            "path": str(file_path),
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/stream")
async def download_stream(url: str, proxy: Optional[str] = None, po_token: Optional[str] = None):
    async def event_generator():
        try:
            async for event in downloader.download_stream(url, proxy=proxy, po_token=po_token):
                yield json.dumps(event)
        except Exception as e:
            yield json.dumps({"status": "error", "message": str(e)})
            
    return EventSourceResponse(event_generator())

@app.get("/extract/stream")
async def extract_stream(video_path: str, interval_ms: int = 1000):
    async def event_generator():
        try:
            async for event in extractor.extract_frames_stream(video_path, interval_ms):
                yield json.dumps(event)
        except Exception as e:
            yield json.dumps({"status": "error", "message": str(e)})
            
    return EventSourceResponse(event_generator())

@app.get("/transcribe/stream")
async def transcribe_stream(video_path: str):
    async def event_generator():
        try:
            yield json.dumps({"status": "log", "message": "Groq Cloud initialized...", "type": "success"})
            yield json.dumps({"status": "log", "message": "Extracting audio stream...", "type": "info"})
            
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, transcriber.transcribe_with_groq, video_path)
            
            yield json.dumps({"status": "log", "message": f"Cloud inference complete ({result['language']})", "type": "success"})
            yield json.dumps({"status": "complete", "data": result})
            
        except Exception as e:
            yield json.dumps({"status": "log", "message": f"CRITICAL: {str(e)}", "type": "error"})
            yield json.dumps({"status": "error", "message": str(e)})
            
    return EventSourceResponse(event_generator())

@app.post("/export")
async def export_bundle(req: ExportRequest):
    try:
        # Wrap title to be filesystem safe
        safe_title = "".join([c if c.isalnum() else "_" for c in req.title])
        export_path, filename = exporter.create_bundle(
            req.project_id,
            req.selected_frames,
            req.transcription,
            safe_title
        )
        return {
            "status": "complete",
            "download_url": f"/files/exports/{filename}",
            "filename": filename
        }
    except Exception as e:
        print(f"Export Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Serve static files (screenshots and downloads)
app.mount("/files/downloads", StaticFiles(directory=DOWNLOAD_DIR), name="downloads")
app.mount("/files/screenshots", StaticFiles(directory=SCREENSHOT_DIR), name="screenshots")
app.mount("/files/projects", StaticFiles(directory=DATA_PROJECTS_DIR), name="projects")
app.mount("/files/exports", StaticFiles(directory=exporter.output_dir), name="exports")

# Production: Serve Built Frontend
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # Allow API and files to function normally
        if full_path.startswith("download") or full_path.startswith("extract") or full_path.startswith("transcribe") or full_path.startswith("files"):
             # Fallback logic for when they hit these via get directly if needed,
             # though normally handled by routes above.
             pass
             
        # Serve index.html for all other routes to support SPA
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    # Use 7860 as default for production (Hugging Face)
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
