import { useState, useEffect, useRef } from 'react'
import { Check, Loader2, Play, Info, Layers, Eye, Video as VideoIcon, CheckCircle2, XCircle, MousePointer2, ChevronRight, CheckCircle } from 'lucide-react'

const API_URL = "" 

export default function ReviewGallery({ video, onFramesExtracted }) {
    const [frames, setFrames] = useState([])
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [activePreview, setActivePreview] = useState(null)
    const [isExtracting, setIsExtracting] = useState(false)
    const [extractProgress, setExtractProgress] = useState({ status: 'idle', percent: 0 })
    const [videoDims, setVideoDims] = useState({ width: 16, height: 9 })
    const [showVideo, setShowVideo] = useState(true)
    const [enableTranscribe, setEnableTranscribe] = useState(false)
    const [isProjectFinalized, setIsProjectFinalized] = useState(false)
    
    const videoRef = useRef(null)
    const filmstripRef = useRef(null)
    const frameRefs = useRef({})

    useEffect(() => {
        if (video && !isExtracting && frames.length === 0) {
            handleExtract()
        }
    }, [video])

    useEffect(() => {
        if (frames.length > 0 && !activePreview) {
            setActivePreview(frames[0])
        }
    }, [frames, activePreview])

    useEffect(() => {
        if (showVideo && activePreview && videoRef.current) {
            const videoTime = videoRef.current.currentTime
            const frameTime = activePreview.timestamp_ms / 1000
            if (Math.abs(videoTime - frameTime) > 0.5) {
                videoRef.current.currentTime = frameTime
            }
        }
    }, [activePreview, showVideo])

    useEffect(() => {
        if (activePreview && frameRefs.current[activePreview.id]) {
            frameRefs.current[activePreview.id].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            })
        }
    }, [activePreview])

    const handleTimeUpdate = () => {
        if (!videoRef.current || isExtracting) return
        const currentTimeMs = videoRef.current.currentTime * 1000
        const currentFrame = [...frames].reverse().find(f => f.timestamp_ms <= currentTimeMs + 100)
        if (currentFrame && currentFrame.id !== activePreview?.id) {
            setActivePreview(currentFrame)
        }
    }

    const handleExtract = async () => {
        if (!video) return
        setIsExtracting(true)
        setFrames([]) 
        setSelectedIds(new Set())
        setExtractProgress({ status: 'connecting', percent: 0 })

        const url = `${API_URL}/extract/stream?video_path=${encodeURIComponent(video.path)}&interval_ms=1000`
        const eventSource = new EventSource(url)

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.status === 'frame_found') {
                const newFrame = data.frame
                setFrames(prev => {
                    if (prev.some(f => f.id === newFrame.id)) return prev;
                    return [...prev, newFrame].sort((a,b) => a.timestamp_ms - b.timestamp_ms)
                })
                setSelectedIds(prev => {
                    const next = new Set(prev)
                    next.add(newFrame.id)
                    return next
                })
                setExtractProgress({ status: 'extracting', percent: data.percent })
            } else if (data.status === 'complete') {
                eventSource.close()
                setIsExtracting(false)
                const { frames: finalFrames, width, height, project_id } = data.data
                const sorted = finalFrames.sort((a,b) => a.timestamp_ms - b.timestamp_ms)
                setFrames(sorted)
                setVideoDims({ width: width || 16, height: height || 9 })
                const allIds = new Set(sorted.map(f => f.id))
                setSelectedIds(allIds)
                onFramesExtracted(project_id, sorted)
            }
        }
        eventSource.onerror = () => {
            eventSource.close()
            setIsExtracting(false)
        }
    }

    const toggleFrame = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id);
            return next
        })
    }

    const formatTimestamp = (ms) => {
        const total = Math.floor(ms / 1000)
        const m = Math.floor(total / 60)
        const s = total % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const getVideoUrl = () => {
        if (!video) return ""
        return `/files/downloads/${encodeURIComponent(video.filename)}`
    }

    const handleFinalize = () => {
        if (enableTranscribe) {
           // This will be handled by the parent App.jsx tab switching if needed, 
           // but for now we'll just log or show a success state.
           // Since we don't have direct tab control here, we'll assume the 
           // user will click the 'Transcribe' tab if they enabled it.
           // Better: Add a direct 'Proceed' prop to move tabs.
           alert("AI Transcription Enabled. Access the Transcribe tab to process captions.")
        } else {
            setIsProjectFinalized(true)
            setTimeout(() => setIsProjectFinalized(false), 3000)
        }
    }

    if (!video) return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a]">
            <Play size={48} className="text-white/10 mb-4 animate-pulse" />
            <p className="text-gray-600 font-medium tracking-widest uppercase text-[10px]">Awaiting Content</p>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
            <div className="flex-none px-6 py-2 border-b border-white/5 bg-black/20 flex items-center gap-4">
                <div className="flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase">
                    <span className="text-emerald-500">Video Content Suite</span>
                    <ChevronRight size={10} className="text-gray-700" />
                    <span className="text-purple-400">Review & Selection</span>
                    {isExtracting && (
                        <>
                            <ChevronRight size={10} className="text-gray-700" />
                            <span className="text-gray-500 animate-pulse">Scanning: {Math.round(extractProgress.percent)}%</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 gap-3">
                
                <div className="flex-1 min-h-0 flex flex-col bg-[#111111]/40 rounded-xl border border-white/5 overflow-hidden shadow-2xl relative">
                    <div className="absolute top-4 left-4 z-10 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 bg-black/60 p-1 rounded-full border border-white/10 backdrop-blur-xl group/toggle cursor-pointer" onClick={() => setShowVideo(!showVideo)}>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${!showVideo ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>Frame</span>
                            <div className="relative w-8 h-4 bg-white/5 rounded-full border border-white/10">
                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-purple-500 rounded-full transition-all duration-300 ${showVideo ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-all ${showVideo ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>Video</span>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden group">
                        {showVideo ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <video 
                                    ref={videoRef}
                                    src={getVideoUrl()} 
                                    className="w-full h-full object-contain rounded drop-shadow-2xl"
                                    controls
                                    autoPlay
                                    muted
                                    onTimeUpdate={handleTimeUpdate}
                                />
                                {activePreview && (
                                    <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-300 pointer-events-none">
                                        <div className="bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full border border-purple-400/30 flex items-center gap-2">
                                            <span className="text-white text-[8px] font-black uppercase tracking-widest">
                                                Active Frame: {activePreview.id}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            activePreview ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <img src={activePreview.url} className="w-full h-full object-contain rounded drop-shadow-2xl border border-white/5" />
                                    <div className="absolute bottom-4 right-4 focus-within:opacity-100">
                                         <button onClick={() => toggleFrame(activePreview.id)} className={`px-6 py-2 rounded-full font-black flex items-center gap-2 border transition-all ${selectedIds.has(activePreview.id) ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white/10 border-white/10 text-gray-400'}`}>
                                            <span className="uppercase text-[9px] tracking-[0.2em]">{selectedIds.has(activePreview.id) ? 'Selected' : 'Exclude'}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <Loader2 className="text-purple-500/20 animate-spin" size={32} />
                            )
                        )}
                    </div>
                </div>

                <div className="flex-none flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Live Filmstrip</span>
                        <span className="text-[9px] text-gray-600 font-mono">{frames.length} POTENTIAL KINDS</span>
                    </div>

                    <div ref={filmstripRef} className="h-32 flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
                        {frames.map((frame) => {
                            const isSelected = selectedIds.has(frame.id);
                            const isActive = activePreview?.id === frame.id;
                            return (
                                <div 
                                    key={frame.id}
                                    ref={(el) => (frameRefs.current[frame.id] = el)}
                                    onClick={() => setActivePreview(frame)}
                                    onDoubleClick={() => toggleFrame(frame.id)}
                                    className={`relative h-full shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-purple-500 scale-[1.02] z-10' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                                    style={{ aspectRatio: `${videoDims.width}/${videoDims.height}` }}
                                >
                                    <img src={frame.url} className={`w-full h-full object-cover ${isSelected ? '' : 'grayscale'}`} />
                                    <div className={`absolute top-1.5 left-1.5 w-4 h-4 rounded flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600' : 'bg-black/40 border border-white/20'}`} onClick={(e) => { e.stopPropagation(); toggleFrame(frame.id); }}>
                                        {isSelected && <Check size={10} className="text-white" />}
                                    </div>
                                    <div className="absolute top-1.5 right-1.5 bg-black/60 px-1 py-0.5 rounded text-[7px] text-gray-300 font-mono">
                                        {formatTimestamp(frame.timestamp_ms)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex-none flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                    <div className="flex gap-2 mr-auto">
                        <button onClick={() => setSelectedIds(new Set())} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[8px] font-bold text-gray-500 uppercase tracking-widest">Deselect All</button>
                        <button onClick={() => setSelectedIds(new Set(frames.map(f => f.id)))} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-[8px] font-bold text-gray-500 uppercase tracking-widest">Select All</button>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-2 border-x border-white/5">
                        <div 
                            className="flex items-center gap-2 group cursor-pointer"
                            onClick={() => setEnableTranscribe(!enableTranscribe)}
                        >
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${enableTranscribe ? 'text-purple-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                                Enable AI Transcription
                            </span>
                            <div className={`w-8 h-4 rounded-full border transition-all relative ${enableTranscribe ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-white/10'}`}>
                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-purple-500 rounded-full transition-all duration-300 ${enableTranscribe ? 'left-4.5' : 'left-0.5'}`} />
                            </div>
                        </div>
                    </div>

                    <button 
                        disabled={selectedIds.size === 0} 
                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                            isProjectFinalized 
                                ? 'bg-emerald-600 text-white' 
                                : enableTranscribe 
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-900/40 transform active:scale-95'
                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-emerald-500/50 hover:text-emerald-400'
                        }`}
                        onClick={handleFinalize}
                    >
                        {isProjectFinalized ? <CheckCircle size={14} /> : null}
                        {enableTranscribe ? <Sparkles size={14} /> : null}
                        {isProjectFinalized ? 'Ready!' : enableTranscribe ? 'Proceed to Transcribe' : 'Finalize & Export'}
                    </button>
                </div>
            </div>
        </div>
    )
}
