import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/store'
import { SkeletonList } from '@/components/Skeleton'
import { getRankBgClass, getRatingColor, truncateText } from '@/lib/constants'
import { Star, MapPin, Clock, Trophy, ChevronRight, Heart } from 'lucide-react'

interface Caregiver {
  id: string
  name: string
  avgRating: number
  totalOrders: number
  recentComment: string
}

interface HotTask {
  id: string
  petName: string
  breed: string
  startTime: string
  endTime: string
  location: string
  reward: number
  duration: string
}

export default function Home() {
  const navigate = useNavigate()
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [caregiversLoading, setCaregiversLoading] = useState(true)
  const [hotTasks, setHotTasks] = useState<HotTask[]>([])
  const [hotTasksLoading, setHotTasksLoading] = useState(true)

  useEffect(() => {
    apiFetch<Caregiver[]>('/api/caregivers/top')
      .then((data) => setCaregivers(data))
      .finally(() => setCaregiversLoading(false))

    apiFetch<HotTask[]>('/api/tasks/hot')
      .then((data) => setHotTasks(data))
      .finally(() => setHotTasksLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <section className="mb-10 text-center">
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800">
          找靠谱看护，放心出门
        </h1>
        <p className="mt-3 text-stone-500">
          专业的宠物看护服务，让您的爱宠得到最好的照顾
        </p>
        <button
          className="btn-press mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-amber-500 px-8 py-3 font-medium text-white shadow-md transition-colors hover:bg-amber-600"
          onClick={() => navigate('/tasks')}
        >
          发布任务 <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 border-l-4 border-amber-400 pl-3 text-xl font-bold text-stone-800">
          <Trophy className="mr-1 inline-block h-5 w-5 text-amber-500" />
          看护者排行榜
        </h2>
        {caregiversLoading ? (
          <SkeletonList count={5} />
        ) : (
          <div className="space-y-3">
            {caregivers.slice(0, 5).map((c, i) => (
              <div
                key={c.id}
                className="btn-press flex cursor-pointer items-center gap-4 rounded-lg border border-stone-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                onClick={() => navigate(`/caregiver/${c.id}`)}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${getRankBgClass(i + 1)}`}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-800">{c.name}</span>
                    <span className={`flex items-center gap-0.5 text-sm ${getRatingColor(c.avgRating)}`}>
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {c.avgRating.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-stone-400">
                    <span>完成 {c.totalOrders} 单</span>
                    <span>{truncateText(c.recentComment, 20)}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 border-l-4 border-amber-400 pl-3 text-xl font-bold text-stone-800">
          <Heart className="mr-1 inline-block h-5 w-5 text-rose-400" />
          本周热门任务
        </h2>
        {hotTasksLoading ? (
          <SkeletonList count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {hotTasks.map((t) => (
              <div
                key={t.id}
                className="btn-press cursor-pointer rounded-lg border border-stone-100 bg-white p-4 shadow-sm transition-all duration-200 hover:translate-y-[-3px] hover:shadow-lg"
                onClick={() => navigate(`/task/${t.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">
                    {t.petName} · {t.breed}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t.startTime} ~ {t.endTime}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{t.location}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="reward-gradient text-lg">¥{t.reward}</span>
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <Clock className="h-3 w-3" />
                    {t.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
