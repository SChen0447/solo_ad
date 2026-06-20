import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ChefHat, Home } from 'lucide-react'
import { useAppStore } from './store'
import CourseCatalog from './CourseCatalog'
import CourseDetail from './CourseDetail'

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 md:h-14 flex items-center px-6 bg-white/70 backdrop-blur-[8px] border-b border-slate-100">
      <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-[#1e293b]">厨艺学堂</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#3b82f6] transition-colors no-underline"
        >
          <Home className="w-4 h-4" />
          <span>首页</span>
        </Link>
      </div>
    </nav>
  )
}

export default function App() {
  const loadCourses = useAppStore((s) => s.loadCourses)

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  return (
    <Router>
      <div className="min-h-screen bg-[#f8fafc]">
        <Navbar />
        <main className="pt-16 md:pt-14">
          <Routes>
            <Route path="/" element={<CourseCatalog />} />
            <Route path="/course/:id" element={<CourseDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
