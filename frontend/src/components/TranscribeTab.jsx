import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, Copy, Check, FileText, ChevronRight, Play, Info, HardDrive, Cpu, ExternalLink } from 'lucide-react'

const API_URL = ""

export default function TranscribeTab({ video, projectId, frames }) {
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState({ percent: 0, status: 'idle' })
    const [logs, setLogs] = useState([])
    const [result, setResult] = useState(null)
    const [activeTab, setActiveTab] = useState('editor')
    const [copied, setCopied] = useState(false)
    const logEndRef = useRef(null)
    const videoRef = useRef(null)

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [...prev, { timestamp, message, type }])
    }

    const handleTranscribe = async () => {
        if (!video) return
        setLoading(true)
        setLogs([])
        setResult(null)
        setProgress({ percent: 0, status: 'initializing' })
        
        addLog("Handshaking with Groq Cloud...", "info")
        
        const eventSource = new EventSource(`${API_URL}/transcribe/stream?video_path=${encodeURIComponent(video.path)}`)

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)
            
            if (data.status === 'log') {
                addLog(data.message, data.type)
                // Fake progress for visual smoothness
                if (data.type === 'info') setProgress(prev => ({ ...prev, percent: Math.min(prev.percent + 20, 90) }))
            } else if (data.status === 'complete') {
                setProgress({ percent: 100, status: 'complete' })
                setResult(data.data)
                setLoading(false)
                eventSource.close()
            } else if (data.status === 'error') {
                addLog(`CRITICAL: ${data.message}`, "error")
                setLoading(false)
                eventSource.close()
            }
        }

        eventSource.onerror = () => {
            addLog("Connection interrupted. Ensure GROQ_API_KEY is set.", "error")
            setLoading(false)
            eventSource.close()
        }
    }

    const handleExport = async () => {
        if (!result || !projectId) return
        setExporting(true)
        addLog("Bundling Master Package...", "info")
        
        try {
            const response = await fetch(`${API_URL}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    selected_frames: frames,
                    transcription: result,
                    title: video?.filename || "SnapCaption_Asset"
                })
            })
            
            if (!response.ok) throw new Error("Export failed")
            const data = await response.json()
            
            addLog("Master Package Ready!", "success")
            
            // Trigger browser download
            const link = document.createElement('a')
            link.href = data.download_url
            link.download = data.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err) {
            addLog(`Export Error: ${err.message}`, "error")
        } finally {
            setExporting(false)
        }
    }

    const copyToClipboard = () => {
        if (!result) return
        navigator.clipboard.writeText(result.full_text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const seekTo = (seconds) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds
            videoRef.current.play()
        }
    }

    const getVideoUrl = () => {
        if (!video) return ""
        return `/files/downloads/${encodeURIComponent(video.filename)}`
    }

    if (!video) return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a]">
            <p className="text-gray-600 font-medium tracking-widest uppercase text-[10px]">Please download a video first</p>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
             {/* COMPACT BREADCRUMBS */}
             <div className="flex-none px-6 py-2 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase">
                    <span className="text-emerald-500">Video Content Suite</span>
                    <ChevronRight size={10} className="text-gray-700" />
                    <span className="text-purple-400">AI Transcription</span>
                    {loading && (
                        <>
                            <ChevronRight size={10} className="text-gray-700" />
                            <span className="text-gray-500 animate-pulse">Running Cloud Inference...</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded border border-white/10">
                    <Cpu size={12} className="text-purple-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Groq: Whisper-large-v3</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4">
                {!result && !loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-xl bg-[#111111] border border-white/5 rounded-2xl p-10 text-center shadow-2xl relative overflow-hidden">
                            {/* Decorative background flare */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
                            
                            <div className="bg-purple-600/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-purple-500/30">
                                <Sparkles className="text-purple-400" size={32} />
                            </div>
                            
                            <h3 className="text-2xl font-black text-white tracking-tight mb-4">Ready for AI Captioning</h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-10 max-w-sm mx-auto">
                                Using Groq's high-speed cloud bridge for **near-instant** Whisper-large transcription.
                            </p>
                            
                            <button
                                onClick={handleTranscribe}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-purple-900/40 uppercase tracking-widest text-xs"
                            >
                                <Play size={18} fill="currentColor" />
                                Initiate Cloud Inference
                            </button>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex flex-col gap-10 items-center justify-center">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                             <svg className="absolute w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                <circle
                                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="6" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 88}
                                    strokeDashoffset={2 * Math.PI * 88 * (1 - (progress.percent / 100))}
                                    strokeLinecap="round"
                                    className="text-purple-500 transition-all duration-700 ease-in-out filter drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                                />
                            </svg>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-black text-white tracking-tighter">{progress.percent}%</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-1">Listening...</span>
                            </div>
                        </div>

                        <div className="w-full max-w-xl flex flex-col bg-black/60 border border-white/5 rounded-xl overflow-hidden h-40">
                             <div className="p-4 font-mono text-[10px] overflow-y-auto space-y-2 custom-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 text-gray-400">
                                        <span className="text-gray-600">[{log.timestamp}]</span>
                                        <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-red-400' : ''}>{log.message}</span>
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex gap-4 min-h-0">
                        {/* LEFT: MASTER PREVIEW & CONTROLS */}
                        <div className="w-2/5 flex flex-col gap-4">
                            <div className="flex-1 bg-[#111111] rounded-xl border border-white/10 overflow-hidden relative group">
                                <video 
                                    ref={videoRef}
                                    src={getVideoUrl()} 
                                    className="w-full h-full object-contain"
                                    controls
                                />
                                <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[9px] font-bold text-gray-400 uppercase tracking-widest backdrop-blur-md">
                                    Master Reference
                                </div>
                            </div>

                            <div className="h-48 bg-[#111111] rounded-xl border border-white/5 p-5 flex flex-col gap-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Project Details</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-gray-400"><Info size={14} /> Language</div>
                                        <div className="text-xs font-bold text-white uppercase">{result.language || 'English'}</div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-gray-400"><HardDrive size={14} /> Engine</div>
                                        <div className="text-xs font-bold text-purple-400">Groq v3</div>
                                    </div>
                                    <button 
                                        onClick={copyToClipboard}
                                        className="w-full mt-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-gray-400" />}
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                                            {copied ? 'Copied' : 'Copy Full Text'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: INTERACTIVE CAPTION TIMELINE */}
                        <div className="flex-1 flex flex-col bg-[#111111] rounded-xl border border-white/10 overflow-hidden">
                            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-300">Caption Timeline</h3>
                                <div className="flex gap-2">
                                    <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-400 uppercase">Interactive</div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {result.segments.map((seg, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => seekTo(seg.start)}
                                        className="group cursor-pointer p-4 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-mono font-bold text-purple-500 opacity-60 group-hover:opacity-100">
                                                {Math.floor(seg.start / 60)}:{(seg.start % 60).toFixed(1).padStart(4, '0')}
                                            </span>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ExternalLink size={12} className="text-gray-600" />
                                            </div>
                                        </div>
                                        <p className="text-sm leading-relaxed text-gray-400 group-hover:text-white transition-colors">
                                            {seg.text}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-black/40 border-t border-white/5 flex justify-end">
                                <button 
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className="px-10 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg shadow-purple-900/40 transform active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {exporting ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
                                    {exporting ? 'Bundling...' : 'Export Final Package'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
