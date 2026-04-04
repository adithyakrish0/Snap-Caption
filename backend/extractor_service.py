import cv2
import os
import imagehash
from PIL import Image
import numpy as np
import uuid

class ExtractorService:
    def __init__(self, output_base="data/projects"):
        self.output_base = output_base

    def extract_and_save(self, video_path, interval_ms=1000, progress_callback=None):
        """
        Extracts frames at a fixed interval (default 1s) using fast seeking.
        Streams each frame metadata to progress_callback.
        """
        project_id = str(uuid.uuid4())[:8]
        project_dir = os.path.join(self.output_base, project_id)
        frames_dir = os.path.join(project_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception(f"Failed to open video file at {video_path}")
            
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_duration_ms = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) * 1000 / cap.get(cv2.CAP_PROP_FPS))
        
        current_ms = 0
        saved_files = []
        frame_idx = 0

        while current_ms < total_duration_ms:
            cap.set(cv2.CAP_PROP_POS_MSEC, current_ms)
            ret, frame = cap.read()
            if not ret: break

            filename = f"frame_{frame_idx}_{int(current_ms)}.jpg"
            filepath = os.path.join(frames_dir, filename)
            cv2.imwrite(filepath, frame)

            frame_data = {
                "id": frame_idx,
                "url": f"/files/projects/{project_id}/frames/{filename}",
                "path": filepath,
                "timestamp_ms": current_ms
            }
            saved_files.append(frame_data)

            # Notify UI immediately
            if progress_callback:
                progress_callback({
                    "status": "frame_found",
                    "frame": frame_data,
                    "percent": round((current_ms / total_duration_ms) * 100, 1)
                })

            current_ms += interval_ms
            frame_idx += 1

        cap.release()
        
        # Final completion event
        if progress_callback:
            progress_callback({
                "status": "complete",
                "data": {
                    "project_id": project_id,
                    "frames": saved_files,
                    "width": width,
                    "height": height
                }
            })

        return {
            "project_id": project_id, 
            "frames": saved_files,
            "width": width,
            "height": height
        }
