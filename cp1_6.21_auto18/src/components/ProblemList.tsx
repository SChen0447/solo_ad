import React from 'react'
import { Problem, Stats } from '../types'

interface ProblemListProps {
  problems: Problem[]
  stats: Stats | null
  onSelectProblem: (id: string) => void
}

const difficultyLabels = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}

const ProblemList: React.FC<ProblemListProps> = ({ problems, stats, onSelectProblem }) => {
  return (
    <div className="stats-section">
      {stats && (
        <>
          <h2 className="section-title">📊 个人统计</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalAttempts}</div>
              <div className="stat-label">总练习次数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.successfulAttempts}</div>
              <div className="stat-label">成功次数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.successRate}%</div>
              <div className="stat-label">通过率</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.currentStreak}</div>
              <div className="stat-label">连续练习天数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.uniqueDays}</div>
              <div className="stat-label">累计练习天数</div>
            </div>
          </div>
        </>
      )}

      <h2 className="section-title">📝 题目列表</h2>
      <div className="problems-grid">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="problem-card"
            onClick={() => onSelectProblem(problem.id)}
          >
            <div className="problem-title">
              {problem.title}
              <span className={`difficulty-tag ${problem.difficulty}`}>
                {difficultyLabels[problem.difficulty]}
              </span>
            </div>
            <div className="problem-description">{problem.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProblemList
