import os
import zipfile
from pathlib import Path
from datetime import datetime

class ExportService:
    def __init__(self, output_dir=None):
        if output_dir is None:
            self.output_dir = Path(__file__).resolve().parent / "exports"
        else:
            self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def create_bundle(self, project_id, selected_frames, transcription, title="video"):
        """
        Creates a ZIP bundle containing selected frames and a transcription report.
        """
        export_filename = f"SnapCaption_{project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        export_path = self.output_dir / export_filename

        with zipfile.ZipFile(export_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 1. Add Frames
            for i, frame in enumerate(selected_frames):
                frame_path = Path(frame['path'])
                if frame_path.exists():
                    # Preserve original filename but structure in 'frames/' folder
                    zipf.write(frame_path, arcname=f"frames/{frame_path.name}")
            
            # 2. Add Transcription Report
            report_content = f"# Snap-Caption Master Export\n"
            report_content += f"**Project ID:** {project_id}\n"
            report_content += f"**Title:** {title}\n"
            report_content += f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            report_content += f"## AI Transcription (Generated via Groq/Whisper-v3)\n\n"
            report_content += f"{transcription['full_text']}\n\n"
            report_content += f"## Timestamped Segments\n\n"
            
            for seg in transcription['segments']:
                start_m = int(seg['start'] // 60)
                start_s = seg['start'] % 60
                report_content += f"[{start_m:02}:{start_s:04.1f}] {seg['text']}\n"

            zipf.writestr("README_TRANSCRIPTION.md", report_content)

        return str(export_path), export_filename
