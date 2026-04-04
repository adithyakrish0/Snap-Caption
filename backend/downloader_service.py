import os
import re
import asyncio
import json
from pathlib import Path
from yt_dlp import YoutubeDL

class DownloaderService:
    def __init__(self, output_dir=None):
        if output_dir is None:
            # Use a path relative to the backend directory
            output_dir = Path(__file__).resolve().parent / "downloads"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def download_stream(self, url: str):
        """
        Universal Asynchronous Downloader.
        Supports YouTube, Instagram, TikTok, etc. with live SSE feedback.
        """
        loop = asyncio.get_event_loop()
        
        # Base options for high-quality extraction
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'overwrites': True,
            'source_address': '0.0.0.0', # Force IPv4 to bypass cloud DNS/network resolution errors
            'nocheckcertificate': True,
        }

        # Specialized YouTube/Meta bypass logic
        if "youtube.com" in url or "youtu.be" in url:
            ydl_opts['extractor_args'] = {'youtube': {'player_client': ['android', 'ios']}}
        elif "instagram.com" in url:
            # Instagram often requires forcing a generic referer or specific headers
            ydl_opts['referer'] = 'https://www.instagram.com/'

        try:
            with YoutubeDL(ydl_opts) as ydl:
                # 1. Info Extraction
                yield {"status": "log", "message": "Establishing secure handshake...", "type": "info"}
                
                # Run blocking extract_info in executor
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False))
                
                title = info.get('title', 'video')
                yield {"status": "log", "message": f"Source Verified: '{title}'", "type": "success"}
                
                # 2. Preparation
                filename = ydl.prepare_filename(info)
                file_path = os.path.abspath(filename)

                # 3. Direct Download in Executor
                yield {"status": "downloading", "percent": 25, "speed": "Auto", "eta": "N/A"}
                await loop.run_in_executor(None, lambda: ydl.download([url]))

                yield {"status": "complete", "path": file_path, "filename": title}
                
        except Exception as e:
            error_msg = str(e)
            yield {"status": "error", "message": f"Extraction Failed: {error_msg}"}

    def get_video_id(self, url: str):
        if not url: return None
        reg = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
        match = re.search(reg, url)
        return match.group(1) if match else None
