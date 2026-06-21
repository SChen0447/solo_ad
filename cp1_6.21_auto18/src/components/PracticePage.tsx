import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Problem } from '../types'
import Editor from '../Editor'

interface PracticePageProps {
  problems: Problem[]
  onBack: () => void
  onRunComplete?: () => void
}

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}

const PracticePage: React.FC<PracticePageProps> = ({ problems, onBack, onRunComplete }) => {
  const { id } = useParams<{ id: string }>()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProblem = async () => {
      if (!id) return

      const localProblem = problems.find(p => p.id === id)
      if (localProblem) {
        setProblem(localProblem)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/problems/${id}`)
        if (response.ok) {
          const data = await response.json()
          setProblem(data)
        }
      } catch (err) {
        console.error('获取题目详情失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProblem()
  }, [id, problems])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>加载中...</div>
  }

  if (!problem) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p>题目不存在</p>
        <button onClick={onBack} className="run-btn" style={{ marginTop: '20px' }}>
          返回题目列表
        </button>
      </div>
    )
  }

  return (
    <div className="practice-layout">
      <div className="practice-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回题目列表
        </button>
        <h1 className="problem-detail-title">
          {problem.title}
          <span className={`difficulty-tag ${problem.difficulty}`}>
            {difficultyLabels[problem.difficulty]}
          </span>
        </h1>
        <p className="problem-detail-desc">{problem.description}</p>
      </div>

      <Editor problem={problem} onRunComplete={onRunComplete} />
    </div>
  )
}

export default PracticePage
