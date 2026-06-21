import React, { useState, useEffect } from 'react'
import { Problem, PracticeRecord } from '../types'

interface RecordsPageProps {
  problems: Problem[]
}

const RecordsPage: React.FC<RecordsPageProps> = ({ problems }) => {
  const [records, setRecords] = useState<PracticeRecord[]>([])
  const [filterProblemId, setFilterProblemId] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/records')
      const data = await response.json()
      setRecords(data.reverse())
    } catch (err) {
      console.error('获取练习记录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = filterProblemId === 'all'
    ? records
    : records.filter(r => r.problemId === filterProblemId)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>加载中...</div>
  }

  return (
    <div style={{ paddingTop: '24px' }}>
      <h2 className="section-title">📋 练习记录</h2>

      <div className="records-container">
        <div className="filter-section">
          <label className="filter-label">按题目筛选：</label>
          <select
            className="filter-select"
            value={filterProblemId}
            onChange={(e) => setFilterProblemId(e.target.value)}
          >
            <option value="all">全部题目</option>
            {problems.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <span style={{ color: '#999', fontSize: '0.85rem' }}>
            共 {filteredRecords.length} 条记录
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">
              {filterProblemId === 'all' ? '暂无练习记录，快去做题吧！' : '该题目暂无练习记录'}
            </div>
          </div>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}></th>
                <th>题目</th>
                <th>提交时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <React.Fragment key={record.id}>
                  <tr>
                    <td>
                      <button
                        className={`expand-btn ${expandedId === record.id ? 'expanded' : ''}`}
                        onClick={() => toggleExpand(record.id)}
                      >
                        ▶
                      </button>
                    </td>
                    <td>{record.problemTitle}</td>
                    <td style={{ color: '#666', fontSize: '0.9rem' }}>
                      {formatDate(record.submittedAt)}
                    </td>
                    <td>
                      <span className={`status-badge ${record.success ? 'success' : 'failed'}`}>
                        {record.success ? '成功' : '失败'}
                      </span>
                    </td>
                  </tr>
                  {expandedId === record.id && (
                    <tr className="expanded-row">
                      <td colSpan={4} style={{ padding: '0 16px 16px 58px' }}>
                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: '#666' }}>代码快照：</strong>
                        </div>
                        <pre className="code-snapshot">{record.code}</pre>
                        {record.output && (
                          <>
                            <div style={{ margin: '12px 0 8px' }}>
                              <strong style={{ color: '#666' }}>输出：</strong>
                            </div>
                            <pre className="code-snapshot" style={{ maxHeight: '150px' }}>
                              {record.output}
                            </pre>
                          </>
                        )}
                        {record.error && (
                          <>
                            <div style={{ margin: '12px 0 8px' }}>
                              <strong style={{ color: '#666' }}>错误：</strong>
                            </div>
                            <pre className="code-snapshot" style={{ maxHeight: '150px', color: '#f48771' }}>
                              {record.error}
                            </pre>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default RecordsPage
