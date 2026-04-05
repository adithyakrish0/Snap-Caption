import { useState } from 'react'
import DownloadTab from './components/DownloadTab'
import ReviewGallery from './components/ReviewGallery'
import TranscribeTab from './components/TranscribeTab'
import { Video, Layers, FileText } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('download')
  const [currentVideo, setCurrentVideo] = useState(null)
  const [frames, setFrames] = useState([])
  const [projectId, setProjectId] = useState(null)

  return (
    <div className="h-screen bg-dark-bg text-gray-100 font-sans flex flex-col overflow-hidden">
      
      {/* Immersive Top Navigation Bar */}
      <header className="flex-none px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md z-20">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Snap-Caption
        </h1>

        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
          <TabButton
            id="download"
            label="1. Download"
            icon={<Video size={16} />}
            active={activeTab === 'download'}
            onClick={setActiveTab}
          />
          <TabButton
            id="extract"
            label="2. Extract & Review"
            icon={<Layers size={16} />}
            active={activeTab === 'extract'}
            onClick={setActiveTab}
          />
          <TabButton
            id="transcribe"
            label="3. Transcribe (Optional)"
            icon={<FileText size={16} />}
            active={activeTab === 'transcribe'}
            onClick={setActiveTab}
          />
        </div>

        <div className="w-40 hidden md:block"></div> {/* Spacer for balance */}
      </header>

      {/* Main Content Area: Expands to fit the viewport */}
      <main className="flex-1 min-h-0 relative h-full">
        {activeTab === 'download' && (
          <DownloadTab
            onDownloadComplete={(videoPath, filename) => {
              setCurrentVideo({ path: videoPath, filename })
              setActiveTab('extract')
            }}
          />
        )}

        {activeTab === 'extract' && (
          <ReviewGallery
            video={currentVideo}
            onFramesExtracted={(pid, extractedFrames) => {
              setProjectId(pid)
              setFrames(extractedFrames)
              setActiveTab('transcribe')
            }}
          />
        )}

        {activeTab === 'transcribe' && (
          <TranscribeTab 
            video={currentVideo} 
            projectId={projectId}
            frames={frames}
          />
        )}
      </main>
    </div>
  )
}

function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${active
          ? 'bg-purple-600/90 text-white shadow-lg shadow-purple-900/40'
          : 'bg-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default App
