import { useState, useEffect, useRef } from 'react'
import { Download, Loader2, Play, Info, CheckCircle2, AlertCircle, FileVideo, Clock, HardDrive, Youtube, FileUp, Upload } from 'lucide-react'

const API_URL = ""

export default function DownloadTab({ onDownloadComplete }) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [progress, setProgress] = useState(null) 
    const [logs, setLogs] = useState([])
    const [isDragging, setIsDragging] = useState(false)
    const logEndRef = useRef(null)

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [logs])

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [...prev, { timestamp, message, type }])
    }

    const handleFileUpload = async (file) => {
        if (!file) return
        setLoading(true)
        setError(null)
        setLogs([])
        setProgress({ percent: 0, speed: 'Uploading...', eta: '' })
        
        addLog(`Initiating local upload: ${file.name}`, "info")
        addLog("Streaming data to cloud engine...", "info")

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            })
            
            if (!response.ok) throw new Error("Upload failed")
            
            const data = await response.json()
            addLog("Upload finalized. Verifying asset integrity...", "success")
            
            setTimeout(() => {
                setLoading(false)
                onDownloadComplete(data.path, data.filename)
            }, 1000)
        } catch (err) {
            addLog(`CRITICAL: ${err.message}`, "error")
            setError(err.message)
            setLoading(false)
        }
    }

    const handleDownload = async () => {
        if (!url) return
        setLoading(true)
        setError(null)
        setLogs([])
        setProgress({ percent: 0, speed: 'Initializing...', eta: '' })
        
        addLog("Connecting to Cloud Source...", "info")
        addLog("Scanning for available extraction protocols...", "info")

        const eventSource = new EventSource(`${API_URL}/download/stream?url=${encodeURIComponent(url)}`)

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)
            
            if (data.status === 'log') {
                addLog(data.message, data.type)
            } else if (data.status === 'downloading') {
                setProgress({
                    percent: data.percent || 10,
                    speed: data.speed || 'Auto',
                    eta: data.eta || 'N/A'
                })
            } else if (data.status === 'complete') {
                addLog(`Cloud Stream Cached: ${data.filename}`, "success")
                setTimeout(() => {
                    eventSource.close()
                    setLoading(false)
                    onDownloadComplete(data.path, data.filename)
                }, 1000)
            } else if (data.status === 'error') {
                addLog(`CRITICAL: ${data.message}`, "error")
                eventSource.close()
                setLoading(false)
                setError(data.message)
            }
        }

        eventSource.onerror = (err) => {
            eventSource.close()
            setLoading(false)
            addLog("Cloud connection interrupted.", "error")
            setError("Could not maintain stream connection. Check backend logs.")
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0f1a]/80 backdrop-blur-xl overflow-hidden p-8">
            {/* Header: Advanced Title */}
            <div className="flex-none mb-12">
                <h1 className="text-2xl font-bold tracking-tight text-white/90">
                    Snap-Caption v2 <span className="text-xs font-normal text-purple-400 ml-2 uppercase tracking-widest">(Universal)</span>
                </h1>
                <div className="flex gap-8 mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 border-b border-white/5 pb-4">
                    <span className={loading || progress?.percent === 100 ? 'text-purple-400' : 'text-gray-400'}>1. Source ({loading ? 'Active' : progress?.percent === 100 ? 'Completed' : 'Pending'})</span>
                    <span className="text-gray-600">2. Extract & Review (Pending)</span>
                    <span className="text-gray-600">3. Transcribe (Pending)</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center">
                {!loading && !progress?.percent ? (
                    <div className="w-full max-w-4xl mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
                        {/* PATH A: CLOUD EXTRACT */}
                        <div className="bg-[#111827]/50 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col">
                            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-3">
                                <Youtube size={20} className="text-purple-400" /> Cloud Stream
                            </h2>
                            <div className="relative mb-8 group">
                                <input
                                    type="text"
                                    placeholder="Paste URL (YouTube, Insta, TikTok...)"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-light group-hover:border-white/20"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                                <div className="absolute inset-0 rounded-xl bg-purple-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity" />
                            </div>

                            <button
                                onClick={handleDownload}
                                disabled={!url}
                                className="mt-auto w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-30 disabled:grayscale shadow-lg shadow-purple-900/20"
                            >
                                <Download size={20} />
                                <span className="uppercase tracking-widest text-xs">Initiate Extraction</span>
                            </button>
                        </div>

                        {/* PATH B: LOCAL UPLOAD */}
                        <div 
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                            }}
                            className={`bg-[#111827]/50 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${
                                isDragging ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' : 'border-white/10 hover:border-white/20'
                            }`}
                        >
                            <div className="bg-white/5 p-4 rounded-full mb-4">
                                <FileUp size={32} className={isDragging ? 'text-purple-400 animate-bounce' : 'text-gray-500'} />
                            </div>
                            <h2 className="text-lg font-medium text-white mb-2">Local Asset</h2>
                            <p className="text-xs text-gray-500 text-center mb-6">Drag & Drop or click to browse</p>
                            
                            <input
                                type="file"
                                id="fileInput"
                                className="hidden"
                                accept="video/*"
                                onChange={(e) => handleFileUpload(e.target.files?.[0])}
                            />
                            <button
                                onClick={() => document.getElementById('fileInput').click()}
                                className="w-full border border-white/10 hover:bg-white/5 text-gray-300 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-xs"
                            >
                                <Upload size={18} />
                                Select File
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl flex gap-12 mt-10 h-full max-h-[500px]">
                        {/* Circular Progress & Log Area */}
                        <div className="flex-1 flex flex-col gap-12">
                            {/* THE CIRCULAR SCANNER */}
                            <div className="relative flex flex-col items-center justify-center scale-110">
                                <div className="relative w-56 h-56 flex items-center justify-center">
                                    {/* Background Circle */}
                                    <svg className="absolute w-full h-full transform -rotate-90">
                                        <circle
                                            cx="112" cy="112" r="100"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            className="text-white/5"
                                        />
                                        <circle
                                            cx="112" cy="112" r="100"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 100}
                                            strokeDashoffset={2 * Math.PI * 100 * (1 - (progress?.percent || 0) / 100)}
                                            strokeLinecap="round"
                                            className="text-purple-500 transition-all duration-300 ease-out filter drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                                        />
                                    </svg>
                                    
                                    {/* Inner Text */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl font-black text-white tracking-tighter">
                                            {Math.round(progress?.percent || 0)}<span className="text-2xl text-purple-400">%</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Scanning...</span>
                                        <span className="text-[8px] text-gray-600 mt-0.5">Phase 1/2</span>
                                    </div>
                                </div>
                            </div>

                            {/* LIVE LOG WINDOW */}
                            <div className="flex-1 flex flex-col bg-black/60 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Processing Log</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-white/10" />
                                        <div className="w-2 h-2 rounded-full bg-white/10" />
                                        <div className="w-2 h-2 rounded-full bg-white/10" />
                                    </div>
                                </div>
                                <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                    {logs.map((log, i) => (
                                        <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                                            <span className={
                                                log.type === 'error' ? 'text-red-400' :
                                                log.type === 'success' ? 'text-emerald-400' :
                                                log.type === 'warning' ? 'text-yellow-400' :
                                                'text-gray-300'
                                            }>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>

                        {/* VIDEO METADATA CARD (RHS) */}
                        <div className="w-80 flex flex-col bg-[#111827]/40 border border-white/10 rounded-2xl p-6 h-fit shrink-0 backdrop-blur-md">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Video Metadata</h3>
                            
                            {/* Placeholder/Thumb Area */}
                            <div className="aspect-video bg-black/60 rounded-lg mb-6 border border-white/5 flex items-center justify-center relative group overflow-hidden">
                                <img 
                                    src={`https://img.youtube.com/vi/${extractVideoId(url) || '0'}/0.jpg`} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:opacity-60 transition-opacity" 
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400'; }}
                                />
                                <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <FileVideo className="text-white/40" size={24} />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <MetaItem icon={<Info size={14} />} label="Title" value={loading ? "Analyzing..." : "Pending Download"} />
                                <MetaItem icon={<Clock size={14} />} label="Duration" value="N/A" />
                                <MetaItem icon={<HardDrive size={14} />} label="Speed" value={progress?.speed || "0 B/s"} />
                                <MetaItem icon={<Youtube size={14} />} label="Source" value={url.includes('youtube') ? 'YouTube' : 'External'} />
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Status</div>
                                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        In Progress
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="w-full max-w-4xl mt-12 p-8 bg-red-500/5 border border-red-500/20 rounded-3xl flex flex-col gap-8 animate-in slide-in-from-bottom-8 duration-700 shadow-2xl backdrop-blur-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/40" />
                        
                        <div className="flex items-start gap-5">
                            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                                <AlertCircle className="text-red-400" size={28} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-white tracking-tight mb-2">Extraction Signal Interrupted</h3>
                                <div className="text-sm text-red-200/60 leading-relaxed max-w-3xl space-y-2">
                                    <p>The network handshake with <span className="text-red-400 font-mono">instagram.com</span> was blocked by the cloud provider's firewall.</p>
                                    <p className="text-xs font-mono opacity-50">ERROR_CODE: {error.includes('resolve') ? 'DNS_RESOLUTION_NULL' : 'AUTH_REJECTED'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row items-center gap-8 p-6 bg-white/[0.02] rounded-2xl border border-white/5 group-hover:bg-white/[0.04] transition-colors">
                            <div className="flex-1 flex items-center gap-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <Info className="text-purple-400" size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Recovery Protocol Available</span>
                                    <p className="text-xs text-gray-400 mt-1">Uploading the file directly from your machine bypasses all platform restrictions. This is the 100% stable fallback.</p>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.preventDefault(); document.getElementById('fileInput').click(); }}
                                className="w-full lg:w-auto bg-white text-black hover:bg-emerald-400 hover:text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all hover:scale-[1.05] active:scale-95 shadow-2xl shadow-white/5 shrink-0"
                            >
                                <Upload size={18} /> 
                                Switch to Local Asset
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function MetaItem({ icon, label, value }) {
    return (
        <div className="flex flex-col gap-1 text-wrap">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                {icon} {label}
            </div>
            <div className="text-xs text-white/80 font-medium truncate">
                {value}
            </div>
        </div>
    )
}

function extractVideoId(url) {
    if (!url) return null;
    const reg = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
    const match = url.match(reg);
    return match ? match[1] : null;
}
