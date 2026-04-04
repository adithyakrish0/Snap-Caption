import os
import subprocess
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class TranscriberService:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key) if self.api_key else None
        if not self.client:
            print("WARNING: Groq API Key not found. Transcription will fail until set.")

    def _extract_audio(self, video_path):
        """Extracts mono audio (16kHz) from video for Whisper compatibility."""
        audio_path = f"{os.path.splitext(video_path)[0]}.mp3"
        if os.path.exists(audio_path):
            return audio_path
        
        command = [
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "libmp3lame", "-ac", "1", "-ar", "16000",
            audio_path, "-y"
        ]
        try:
            subprocess.run(command, check=True, capture_output=True)
            return audio_path
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg Error: {e.stderr.decode()}")
            raise Exception("Failed to extract audio from video.")

    def transcribe_with_groq(self, video_path):
        """High-speed cloud transcription using Groq's Whisper-large-v3."""
        if not self.client:
            raise Exception("Groq Client not initialized. Set GROQ_API_KEY.")

        audio_path = self._extract_audio(video_path)
        
        with open(audio_path, "rb") as file:
            transcription = self.client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), file.read()),
                model="whisper-large-v3",
                response_format="verbose_json",
            )
        
        # Verbose JSON provides segments with timestamps
        segments = []
        for segment in transcription.segments:
            segments.append({
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip()
            })
            
        return {
            "full_text": transcription.text,
            "segments": segments,
            "language": transcription.language
        }

    def transcribe_local(self, video_path):
        """Fallback: Local transcription (can be slow on CPU)."""
        # This would use the faster-whisper implementation if needed.
        # For now, we are prioritizing Groq as per user request.
        pass
