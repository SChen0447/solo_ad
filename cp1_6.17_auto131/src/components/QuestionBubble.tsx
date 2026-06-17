import React, { useState } from 'react'

export interface QuestionData {
  id: string
  content: string
  color: string
  is_starred: boolean
  is_for_vote: boolean
  votes_agree: number
  votes_disagree: number
}

interface QuestionBubbleProps {
  question: QuestionData
  showStarButton?: boolean
  showVoteButton?: boolean
  showVoteProgress?: boolean
  isTeacher?: boolean
  onStar?: (questionId: string, starred: boolean) => void
  onMarkForVote?: (questionId: string, forVote: boolean) => void
  onVote?: (questionId: string, agree: boolean) => void
  voted?: boolean
}

const QuestionBubble: React.FC<QuestionBubbleProps> = ({
  question,
  showStarButton = false,
  showVoteButton = false,
  showVoteProgress = false,
  isTeacher = false,
  onStar,
  onMarkForVote,
  onVote,
  voted = false
}) => {
  const [bounceAgree, setBounceAgree] = useState(false)
  const [bounceDisagree, setBounceDisagree] = useState(false)

  const totalVotes = question.votes_agree + question.votes_disagree
  const agreePct = totalVotes > 0 ? (question.votes_agree / totalVotes) * 100 : 0
  const disagreePct = totalVotes > 0 ? (question.votes_disagree / totalVotes) * 100 : 0

  const handleAgree = () => {
    if (voted || !onVote) return
    setBounceAgree(true)
    setTimeout(() => setBounceAgree(false), 300)
    onVote(question.id, true)
  }

  const handleDisagree = () => {
    if (voted || !onVote) return
    setBounceDisagree(true)
    setTimeout(() => setBounceDisagree(false), 300)
    onVote(question.id, false)
  }

  const bubbleBg = question.is_starred
    ? 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)'
    : 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)'

  return (
    <div
      style={{
        background: bubbleBg,
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        position: 'relative',
        borderLeft: `4px solid ${question.color}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            flex: 1,
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#374151',
            wordBreak: 'break-word'
          }}
        >
          {question.content}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {showStarButton && isTeacher && (
            <button
              onClick={() => onStar && onStar(question.id, !question.is_starred)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px',
                transition: 'all 0.2s ease',
                color: question.is_starred ? '#F59E0B' : '#9CA3AF'
              }}
              title={question.is_starred ? '取消精选' : '标记精选'}
            >
              {question.is_starred ? '★' : '☆'}
            </button>
          )}
          {showVoteButton && isTeacher && (
            <button
              onClick={() => onMarkForVote && onMarkForVote(question.id, !question.is_for_vote)}
              style={{
                background: question.is_for_vote
                  ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
                  : '#E5E7EB',
                color: question.is_for_vote ? '#FFFFFF' : '#6B7280',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {question.is_for_vote ? '已选' : '投票'}
            </button>
          )}
        </div>
      </div>

      {(showVoteProgress || showVoteButton) && totalVotes > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              height: '8px',
              borderRadius: '4px',
              background: '#E5E7EB',
              overflow: 'hidden',
              display: 'flex'
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
                width: `${agreePct}%`,
                transition: 'width 0.3s ease'
              }}
            />
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #EF4444 0%, #F87171 100%)',
                width: `${disagreePct}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
            <span style={{ color: '#10B981' }}>赞同 {question.votes_agree} ({agreePct.toFixed(0)}%)</span>
            <span style={{ color: '#EF4444' }}>反对 {question.votes_disagree} ({disagreePct.toFixed(0)}%)</span>
          </div>
        </div>
      )}

      {showVoteButton && !isTeacher && (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleAgree}
            disabled={voted}
            style={{
              background: voted && question.votes_agree > 0 ? '#D1FAE5' : '#F3F4F6',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 24px',
              fontSize: '24px',
              cursor: voted ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              transform: bounceAgree ? 'scale(0.85)' : 'scale(1)',
              opacity: voted ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            👍
          </button>
          <button
            onClick={handleDisagree}
            disabled={voted}
            style={{
              background: voted && question.votes_disagree > 0 ? '#FEE2E2' : '#F3F4F6',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 24px',
              fontSize: '24px',
              cursor: voted ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              transform: bounceDisagree ? 'scale(0.85)' : 'scale(1)',
              opacity: voted ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            👎
          </button>
        </div>
      )}
    </div>
  )
}

export default QuestionBubble
