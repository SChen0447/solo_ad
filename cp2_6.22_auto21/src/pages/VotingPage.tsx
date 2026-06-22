import React, { useEffect, useState, useCallback } from 'react'
import { Idea, getIdeas, voteForIdea, getUserVotes, UserVotes } from '../api/ideas'
import IdeaCard from '../components/IdeaCard'
import Toast from '../components/Toast'

interface VotingPageProps {
  newIdea?: Idea | null
}

const VotingPage: React.FC<VotingPageProps> = ({ newIdea }) => {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [userVotes, setUserVotes] = useState<UserVotes>({
    remainingVotes: 5,
    votedIdeas: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const MAX_VOTES = 5

  const fetchData = useCallback(async () => {
    try {
      const [ideasData, votesData] = await Promise.all([
        getIdeas(),
        getUserVotes()
      ])
      setIdeas(ideasData)
      setUserVotes(votesData)
    } catch (error) {
      setToastMessage('加载数据失败，请刷新页面重试')
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (newIdea) {
      setIdeas(prev => {
        if (prev.find(i => i.id === newIdea.id)) return prev
        return [newIdea, ...prev]
      })
    }
  }, [newIdea])

  const handleVote = async (ideaId: string) => {
    if (userVotes.remainingVotes <= 0) {
      setToastMessage('投票次数已用完！')
      setToastType('error')
      setShowToast(true)
      return
    }

    if (userVotes.votedIdeas.includes(ideaId)) {
      return
    }

    try {
      const result = await voteForIdea(ideaId)
      setIdeas(prev => prev.map(idea =>
        idea.id === ideaId ? result.idea : idea
      ))
      setUserVotes(prev => ({
        remainingVotes: result.remainingVotes,
        votedIdeas: [...prev.votedIdeas, ideaId]
      }))
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : '投票失败')
      setToastType('error')
      setShowToast(true)
    }
  }

  const remainingPercentage = (userVotes.remainingVotes / MAX_VOTES) * 100
  const isOutOfVotes = userVotes.remainingVotes === 0

  return (
    <div className="voting-page">
      <div className="votes-status-bar">
        <div className="status-info">
          <span className="status-label">剩余票数</span>
          <span className={`status-count ${isOutOfVotes ? 'zero' : ''}`}>
            {userVotes.remainingVotes} / {MAX_VOTES}
          </span>
        </div>
        <div className={`progress-bar ${isOutOfVotes ? 'flash-red' : ''}`}>
          <div
            className="progress-fill"
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
        {isOutOfVotes && (
          <p className="out-of-votes-text">您的投票次数已用完，请明天再来！</p>
        )}
      </div>

      <div className="ideas-grid">
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : ideas.length === 0 ? (
          <div className="empty-state">
            <p>还没有创意，快去提交第一个吧！</p>
          </div>
        ) : (
          ideas.map((idea, index) => {
            const hasVoted = userVotes.votedIdeas.includes(idea.id)
            const canVote = userVotes.remainingVotes > 0 && !hasVoted
            
            return (
              <div
                key={idea.id}
                className="idea-card-wrapper"
                style={{
                  animationDelay: `${index * 80}ms`,
                  animation: 'fadeInUp 0.5s ease forwards',
                  opacity: 0
                }}
              >
                <IdeaCard
                  idea={idea}
                  onVote={() => handleVote(idea.id)}
                  canVote={canVote}
                  showVoteButton={true}
                />
              </div>
            )
          })
        )}
      </div>

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <style>{`
        .voting-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        
        .votes-status-bar {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 32px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #E5E7EB;
        }
        
        .status-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .status-label {
          font-size: 14px;
          color: #6B7280;
          font-weight: 500;
        }
        
        .status-count {
          font-size: 20px;
          font-weight: 700;
          color: #6366F1;
        }
        
        .status-count.zero {
          color: #EF4444;
        }
        
        .progress-bar {
          height: 8px;
          background: #E5E7EB;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar.flash-red {
          animation: flashRed 1s ease infinite;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10B981, #34D399, #6EE7B7);
          border-radius: 4px;
          transition: width 0.3s ease, background 0.3s ease;
        }
        
        .flash-red .progress-fill {
          background: linear-gradient(90deg, #EF4444, #F87171);
        }
        
        @keyframes flashRed {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .out-of-votes-text {
          margin: 12px 0 0;
          font-size: 13px;
          color: #EF4444;
          font-weight: 500;
        }
        
        .ideas-grid {
          display: grid;
          grid-template-columns: repeat(3, 320px);
          gap: 24px;
          justify-content: center;
        }
        
        .idea-card-wrapper {
          display: flex;
          justify-content: center;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .loading-placeholder,
        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: #9CA3AF;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #E5E7EB;
          border-top-color: #6366F1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .empty-state p {
          font-size: 16px;
          margin: 0;
        }
        
        @media (max-width: 1100px) {
          .ideas-grid {
            grid-template-columns: repeat(2, 320px);
          }
        }
        
        @media (max-width: 720px) {
          .ideas-grid {
            grid-template-columns: 320px;
          }
        }
      `}</style>
    </div>
  )
}

export default VotingPage
