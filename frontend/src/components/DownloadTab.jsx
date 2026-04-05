import { useState, useEffect, useRef } from 'react'
import { Download, Loader2, Play, Info, CheckCircle2, AlertCircle, FileVideo, Clock, HardDrive, Youtube, FileUp, Upload, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_BASE_URL || "";

const getDomain = (url) => {
    try {
        const host = new URL(url).hostname.replace('www.', '')
        return host
    } catch (e) {
        return "the platform"
    }
}

export default function DownloadTab({ onDownloadComplete }) {
    const [url, setUrl] = useState('')
    const [proxyUrl, setProxyUrl] = useState('')
    const [poToken, setPoToken] = useState('')
    const [showAdvanced, setShowAdvanced] = useState(false)
    
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

        const params = new URLSearchParams({
            url: url,
            proxy: proxyUrl,
            po_token: poToken
        })

        const eventSource = new EventSource(`${API_URL}/download/stream?${params.toString()}`)

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
        <div className="flex-1 flex flex-col h-full bg-[#0a0f1a]/80 backdrop-blur-xl overflow-hidden p-6 lg:p-8">
            {/* Header: Compact Navigation */}
            <div className="flex-none mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white/90">
                            Snap-Caption v2 <span className="text-xs font-normal text-purple-400 ml-2 uppercase tracking-widest">(Universal)</span>
                        </h1>
                        <div className="flex gap-4 mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                            <span className={loading || progress?.percent === 100 ? 'text-purple-400' : 'text-gray-400'}>1. Source</span>
                            <span className="text-gray-600">2. Extract</span>
                            <span className="text-gray-600">3. Transcribe</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                {!loading && !progress?.percent ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">
                            {/* PATH A: CLOUD EXTRACT */}
                            <div className="bg-[#111827]/50 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col">
                                <h2 className="text-md font-medium text-white mb-4 flex items-center gap-3">
                                    <Youtube size={18} className="text-purple-400" /> Cloud Stream
                                </h2>
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="Paste URL (YouTube, Insta, TikTok...)"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm font-light group-hover:border-white/20"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                        />
                                    </div>

                                    {/* Advanced Toggle */}
                                    <div className="border border-white/5 rounded-xl overflow-hidden">
                                        <button 
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className="w-full px-4 py-2 bg-white/5 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Shield size={12} className={showAdvanced ? 'text-purple-400' : 'text-gray-600'} />
                                                Iron Handshake (Unblocker)
                                            </div>
                                            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        
                                        {showAdvanced && (
                                            <div className="p-4 space-y-3 bg-black/20 animate-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-1">Proxy URL (HTTP/SOCKS5)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="http://user:pass@host:port"
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono text-purple-300 focus:outline-none focus:border-purple-500/50"
                                                        value={proxyUrl}
                                                        onChange={(e) => setProxyUrl(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-widest ml-1">YouTube PO-Token</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Paste Po-Token for Cloud Bypass"
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono text-purple-300 focus:outline-none focus:border-purple-500/50"
                                                        value={poToken}
                                                        onChange={(e) => setPoToken(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleDownload}
                                    disabled={!url}
                                    className="mt-6 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-30 disabled:grayscale shadow-lg shadow-purple-900/20"
                                >
                                    <Download size={18} />
                                    <span className="uppercase tracking-widest text-[10px]">Initiate Extraction</span>
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
                                className={`bg-[#111827]/50 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300 ${
                                    isDragging ? 'border-purple-500 bg-purple-500/10 scale-[1.02]' : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="bg-white/5 p-3 rounded-full mb-3">
                                    <FileUp size={24} className={isDragging ? 'text-purple-400 animate-bounce' : 'text-gray-500'} />
                                </div>
                                <h2 className="text-md font-medium text-white mb-1">Local Asset</h2>
                                <p className="text-[10px] text-gray-500 text-center mb-4 text-balance">Drag & Drop or click to browse</p>
                                
                                <input
                                    type="file"
                                    id="fileInput"
                                    className="hidden"
                                    accept="video/*"
                                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                                />
                                <button
                                    onClick={() => document.getElementById('fileInput').click()}
                                    className="w-full border border-white/10 hover:bg-white/5 text-gray-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-[10px]"
                                >
                                    <Upload size={16} />
                                    Select File
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col lg:flex-row gap-6 h-full">
                            {/* Left Col: Live Logs (Flexible) */}
                            <div className="flex-1 flex flex-col min-h-0 bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Live Handshake Protocol</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-purple-400/60 uppercase">Cloud Stage {progress?.percent < 50 ? '01' : '02'}</span>
                                </div>
                                <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-2 custom-scrollbar selection:bg-purple-500/30">
                                    {logs.map((log, i) => (
                                        <div key={i} className="flex gap-4 group">
                                            <span className="text-gray-600 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">[{log.timestamp}]</span>
                                            <span className={
                                                log.type === 'error' ? 'text-red-400 font-bold' :
                                                log.type === 'success' ? 'text-emerald-400 font-bold' :
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

                            {/* Right Col: Progress & Meta (Fixed) */}
                            <div className="w-full lg:w-80 flex flex-col gap-6">
                                {/* CIRCULAR PROGRESS CARD */}
                                <div className="bg-[#111827]/40 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-md">
                                    <div className="relative w-36 h-36 flex items-center justify-center">
                                        <svg className="absolute w-full h-full transform -rotate-90">
                                            <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                            <circle
                                                cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="6" fill="transparent"
                                                strokeDasharray={2 * Math.PI * 64}
                                                strokeDashoffset={2 * Math.PI * 64 * (1 - (progress?.percent || 0) / 100)}
                                                strokeLinecap="round"
                                                className="text-purple-500 transition-all duration-300 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                                            />
                                        </svg>
                                        <div className="flex flex-col items-center">
                                            <span className="text-3xl font-black text-white">{Math.round(progress?.percent || 0)}%</span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Extracted</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 w-full grid grid-cols-2 gap-2">
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-[8px] font-bold text-gray-500 uppercase">Speed</div>
                                            <div className="text-[10px] text-white font-mono">{progress?.speed || 'Auto'}</div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 text-center">
                                            <div className="text-[8px] font-bold text-gray-500 uppercase">ETA</div>
                                            <div className="text-[10px] text-white font-mono">{progress?.eta || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* META DATA CARD */}
                                <div className="bg-[#111827]/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Metadata</h3>
                                    <div className="space-y-4">
                                        <MetaItem icon={<Info size={12} />} label="Asset" value={loading ? "Handshaking..." : getDomain(url)} />
                                        <MetaItem icon={<Shield size={12} />} label="Security" value={proxyUrl ? "Proxy Enabled" : "Direct Cloud"} />
                                        <div className="pt-2">
                                            <div className="text-[8px] text-gray-500 font-bold uppercase mb-1">Handshake Status</div>
                                            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-[10px] font-bold flex items-center justify-between">
                                                ACTIVE 
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Layer (Overlay) */}
            {error && (
                <div className="absolute inset-x-8 bottom-8 p-6 bg-red-600/10 border border-red-500/30 rounded-2xl backdrop-blur-3xl animate-in slide-in-from-bottom-8 duration-500 z-50">
                    <div className="flex items-center gap-6">
                        <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                            <AlertCircle className="text-red-400" size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">Handshake Terminated: {error.includes('resolve') ? 'DNS_NULL' : 'AUTH_REJECTED'}</h4>
                            <p className="text-xs text-red-200/60 mt-1">Hugging Face IP address was rejected by {getDomain(url)}. Use a **Proxy** or **Local Upload**.</p>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => { setError(null); setLoading(false); setShowAdvanced(true); }}
                                className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                                Fix with Proxy
                            </button>
                            <button 
                                onClick={() => { setError(null); setLoading(false); setProgress(null); }}
                                className="px-4 py-2 bg-emerald-500 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/40"
                            >
                                Try Local Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function MetaItem({ icon, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-gray-500">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{label}</div>
                <div className="text-[11px] text-white/80 font-medium truncate">{value}</div>
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
