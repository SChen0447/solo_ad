import { useEffect } from 'react'
import { useStore } from '../store'
import CourseCard from '../components/CourseCard'

export default function CourseList() {
  const { courses, loading, loadCourses } = useStore()

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  if (loading && courses.length === 0) {
    return (
      <div className="pt-24 pb-12 max-w-[1200px] mx-auto px-4">
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-clay-200 border-t-clay-500 rounded-full animate-spin-custom mx-auto" />
          <p className="text-clay-400 text-sm mt-4">加载课程中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-12 max-w-[1200px] mx-auto px-4">
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-bold text-clay-800">探索手工艺课程</h1>
        <p className="text-sm text-clay-500 mt-1">发现传统手工艺的魅力，开启你的创作之旅</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  )
}
