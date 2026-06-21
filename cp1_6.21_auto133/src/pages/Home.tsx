import { Link } from 'react-router-dom'
import { Music, Headphones, LogIn } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="text-center max-w-lg animate-fadeIn">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Music className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Indie Music Studio
        </h1>
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          发现独立音乐人的原创作品，聆听不一样的声音
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/player"
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-[1.02] flex items-center gap-2"
          >
            <Headphones className="w-4 h-4" />
            浏览作品
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-medium transition-all duration-300 hover:bg-white/10 hover:border-white/20 flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            音乐人登录
          </Link>
        </div>
      </div>
    </div>
  )
}
