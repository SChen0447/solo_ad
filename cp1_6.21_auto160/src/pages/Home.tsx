import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Palette, LayoutDashboard } from 'lucide-react'
import { useWorkshopStore } from '@/stores/workshopStore'
import CourseCard from '@/components/CourseCard'

export default function Home() {
  const { courses, loading, loadCourses } = useWorkshopStore()

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  return (
    <div className="min-h-screen bg-surface-primary">
      <header className="bg-white/80 backdrop-blur-md border-b border-warm-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="w-10 h-10 bg-warm-500 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-surface-dark">手工艺工作坊</h1>
          </Link>
          <Link
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-btn bg-warm-50 text-warm-600 hover:bg-warm-100 transition-colors text-sm font-medium no-underline"
          >
            <LayoutDashboard className="w-4 h-4" />
            管理看板
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-surface-dark mb-2"> upcoming 课程</h2>
          <p className="text-surface-muted">发现有趣的手工艺课程，即刻报名参加</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-card shadow-card animate-pulse">
                <div className="h-48 bg-warm-100 rounded-t-card" />
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-warm-100 rounded w-3/4" />
                  <div className="h-4 bg-warm-100 rounded w-1/2" />
                  <div className="h-4 bg-warm-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🎨</p>
            <p className="text-surface-muted text-lg">暂无课程，请等待管理员发布</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
