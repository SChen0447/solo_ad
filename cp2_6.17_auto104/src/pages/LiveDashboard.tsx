import React, { useEffect, useState, useCallback } from 'react'
import HeatMap from '@/components/HeatMap'
import CommentWall from '@/components/CommentWall'
import VotingPanel from '@/components/VotingPanel'
import { api } from '@/utils/api'
import type { Stage, Comment, StageRatings } from '../../shared/types'

const LiveDashboard: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [ratings, setRatings] = useState<StageRatings[]>([])

  const fetchStages = useCallback(async () => {
    try {
      const data = await api.getStages()
      setStages(data)
      const ratingsData = await api.getRatings()
      setRatings(ratingsData.stages)
    } catch (err) {
      console.error('Failed to fetch stages:', err)
    }
  }, [])

  const fetchComments = useCallback(async () => {
    try {
      const data = await api.getComments()
      setComments(data)
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }, [])

  const handleVoteSuccess = useCallback(() => {
    fetchStages()
    fetchComments()
  }, [fetchStages, fetchComments])

  useEffect(() => {
    fetchStages()
    fetchComments()

    const ratingsInterval = setInterval(fetchStages, 5000)
    const commentsInterval = setInterval(fetchComments, 3000)

    return () => {
      clearInterval(ratingsInterval)
      clearInterval(commentsInterval)
    }
  }, [fetchStages, fetchComments])

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1040 100%)',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease forwards;
        }
      `}</style>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-white text-3xl font-bold mb-2 drop-shadow-lg">
            🎵 音乐节实时互动看板
          </h1>
          <p className="text-white/60 text-sm">
            实时热力图 · 观众评分 · 滚动评论墙
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-white/80 text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            舞台热力图
          </h2>
          <HeatMap ratings={ratings} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-white/80 text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              实时评论墙
            </h2>
            <CommentWall comments={comments} />
          </div>
          <div>
            <h2 className="text-white/80 text-lg font-semibold mb-4">
              观众投票
            </h2>
            <VotingPanel stages={stages} onVoteSuccess={handleVoteSuccess} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveDashboard
