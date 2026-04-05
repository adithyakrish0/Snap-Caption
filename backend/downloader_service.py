import os
import re
import asyncio
import json
import socket
import requests
from pathlib import Path
from yt_dlp import YoutubeDL

# --- DEEP HANDSHAKE: MULTI-STACK DNS BYPASS ---
# We sequentially try multiple DoH providers (Cloudflare, Google, Quad9)
# to ensure we can resolve Meta/Instagram domains despite cloud firewalls.

_original_getaddrinfo = socket.getaddrinfo

# Known stable IPs for Instagram (Used as final fallback if all DoH fail)
_SAFE_IPS = {
    "www.instagram.com": "157.240.22.174",
    "instagram.com": "157.240.22.174",
    "facebook.com": "157.240.13.35",
}

def resolve_via_doh(hostname, provider_ip="1.1.1.1"):
    """Resolve a hostname via a specific DoH provider IP."""
    try:
        # Use simple JSON API for DoH resolution (Cloudflare/Google style)
        url = f"https://{provider_ip}/dns-query?name={hostname}&type=A"
        headers = {"accept": "application/dns-json"}
        response = requests.get(url, headers=headers, timeout=3)
        data = response.json()
        
        if "Answer" in data:
            return data["Answer"][0]["data"]
    except Exception:
        pass
    return None

def deep_resolve(hostname):
    """Try multiple DoH providers sequentially."""
    providers = [
        ("1.1.1.1", "Cloudflare"),
        ("8.8.8.8", "Google"),
        ("9.9.9.9", "Quad9")
    ]
    
    for ip, name in providers:
        result = resolve_via_doh(hostname, ip)
        if result:
            return result, name
            
    # Final Fallback: Hardcoded IP
    if hostname in _SAFE_IPS:
        return _SAFE_IPS[hostname], "Legacy Fix"
        
    return None, None

def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    # Expanded list of domains for Universal Bypass (Meta & Google/YouTube)
    targeted_domains = [
        "instagram.com", "facebook.com", "fbcdn.net",
        "youtube.com", "googlevideo.com", "youtu.be", "ytimg.com"
    ]
    
    is_target = any(domain in host for domain in targeted_domains)
    if is_target:
        ip, _ = deep_resolve(host)
        if ip:
            # Return resolution for the forced IP
            return _original_getaddrinfo(ip, port, family, type, proto, flags)
    
    return _original_getaddrinfo(host, port, family, type, proto, flags)

# Apply the monkeypatch globally
socket.getaddrinfo = patched_getaddrinfo

class DownloaderService:
    def __init__(self, output_dir=None):
        if output_dir is None:
            # Use a path relative to the backend directory
            output_dir = Path(__file__).resolve().parent / "downloads"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    async def download_stream(self, url: str, proxy: str = None, po_token: str = None):
        """
        Universal Asynchronous Downloader.
        Supports YouTube, Instagram, TikTok, etc. with live SSE feedback.
        """
        loop = asyncio.get_event_loop()
        
        # Capture real yt-dlp errors for diagnostic streaming
        captured_warnings = []

        def _progress_hook(d):
            # We can't yield from here, but we track state
            pass

        # --- STEALTH ENGINE 2026: GLOBAL AUTHORITY ---
        cookie_path = Path(__file__).resolve().parent / "data" / "cookies.txt"
        
        # Base options for high-quality extraction
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': str(self.output_dir / '%(title)s.%(ext)s'),
            'noplaylist': True,
            'quiet': False,
            'no_warnings': False,
            'verbose': True,
            'overwrites': True,
            'nocheckcertificate': True,
            'socket_timeout': 30,
            'retries': 5,
            'progress_hooks': [_progress_hook],
            # 2026 Stealth Core
            'javascript_executor': 'deno',
            'impersonate': 'chrome',
        }

        # Apply Global Cookies if synced by Owner
        if cookie_path.exists():
            ydl_opts['cookiefile'] = str(cookie_path)

        # Apply User Proxy if provided (Iron Handshake)
        if proxy:
            ydl_opts['proxy'] = proxy

        # Specialized YouTube/Meta bypass logic
        if "youtube.com" in url or "youtu.be" in url:
            # Optimized clients for Cloud-Datacenters
            ydl_opts['extractor_args'] = {
                'youtube': {
                    'player_client': ['web', 'mweb'],
                    'player_skip': ['webpage', 'configs'],
                }
            }
            # Inject PO-Token if provided from UI
            if po_token:
                ydl_opts['extractor_args']['youtube']['po_token'] = [po_token]
            
        elif "instagram.com" in url:
            ydl_opts['referer'] = 'https://www.instagram.com/'
        elif "tiktok.com" in url:
            ydl_opts['referer'] = 'https://www.tiktok.com/'

        try:
            with YoutubeDL(ydl_opts) as ydl:
                # 1. Info Extraction
                yield {"status": "log", "message": f"Iron Handshake active. Proxy: {'ENABLED' if proxy else 'DIRECT'}.", "type": "warning"}
                yield {"status": "log", "message": "Negotiating extraction protocol with source...", "type": "info"}
                
                # Run blocking extract_info in executor
                try:
                    info = await loop.run_in_executor(None, lambda: ydl.extract_info(url, download=False))
                except Exception as extract_err:
                    err_str = str(extract_err)
                    yield {"status": "log", "message": f"Primary extraction failed: {err_str[:200]}", "type": "error"}
                    
                    # Retry with simpler format for YouTube
                    if "youtube" in url or "youtu.be" in url:
                        yield {"status": "log", "message": "Retrying with fallback protocol (format=best)...", "type": "warning"}
                        ydl_opts['format'] = 'best'
                        ydl_opts['extractor_args'] = {
                            'youtube': {
                                'player_client': ['web'],
                            }
                        }
                        # Persist proxy/token during retry
                        if proxy: ydl_opts['proxy'] = proxy
                        if po_token: ydl_opts['extractor_args']['youtube']['po_token'] = [po_token]

                        with YoutubeDL(ydl_opts) as ydl2:
                            info = await loop.run_in_executor(None, lambda: ydl2.extract_info(url, download=False))
                    else:
                        raise extract_err
                
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
