---
title: Video Content Suite
emoji: 🎥
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# Snap-Caption v2 (Universal)
A professional-grade, zero-setup video extraction pipeline with AI transcription powered by Groq and the **Fly.io "Free Shield"** architecture.

## 🚀 The Hybrid Architecture
To bypass global cloud-IP blocks on YouTube and Instagram, this project uses a **Hybrid Deployment**:
*   **Frontend**: Hugging Face Spaces (Free, permanent UI).
*   **Backend**: Fly.io (Free, 24/7 high-authority extraction engine).

## 🛠 Setup (3 Minutes)

### 1. Launch the Backend (Fly.io)
1.  Install the [flyctl](https://fly.io/docs/hands-on/install-flyctl/) CLI.
2.  Run `fly launch` in the root directory.
3.  Choose `snap-caption-engine` as the app name.
4.  Run `fly secrets set GROQ_API_KEY=your_key_here`.
5.  Wait for the live URL (e.g., `https://snap-caption-engine.fly.dev`).

### 2. Launch the Frontend (Hugging Face)
1.  Push this repo to your Space as a **Docker** app.
2.  Go to **Settings** -> **Variables**.
3.  Add a **Variable**: `VITE_API_BASE_URL` = (Your Fly.dev URL).
4.  **Re-build** the Space.

## 🛡 Features
*   **Zero-Setup**: End users only provide links.
*   **Iron Handshake**: Deno-powered signature solving for YouTube.
*   **Silent Authority**: Professional Netscape cookie support via `YT_COOKIES_B64` secret.
*   **Single-Page UI**: Zero-scrolling, immersive dashboard layout.

## Enjoy! 🎥
