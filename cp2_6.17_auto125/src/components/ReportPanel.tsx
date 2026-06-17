import React, { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import type { ReportStats } from '../api'
import { getReportStats } from '../api'

interface ReportPanelProps {
  team: string
  onClose: () => void
}

const PIE_COLORS = ['#10b981', '#f97316', '#3b82f6']

const ReportPanel: React.FC<ReportPanelProps> = ({ team, onClose }) => {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getReportStats(team)
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch report stats:', err)
      }
    }
    fetchStats()
  }, [team])

  const pieData = stats
    ? [
        { name: '亮点', value: stats.columnCounts.highlight, color: '#10b981' },
        { name: '改进点', value: stats.columnCounts.improvement, color: '#f97316' },
        { name: '行动项', value: stats.columnCounts.action, color: '#3b82f6' }
      ]
    : []

  const barData = stats
    ? stats.memberCounts.map(item => ({
        name: item.member,
        卡片数: item.count
      }))
    : []

  const generateMarkdown = (): string => {
    if (!stats) return ''
    let md = `# ${team} 复盘报告\n\n`
    md += `## 概览\n\n`
    md += `- **总卡片数**: ${stats.totalCards}\n`
    md += `- **参与成员**: ${stats.memberCounts.length} 人\n\n`
    md += `## 分类统计\n\n`
    md += `| 分类 | 数量 | 占比 |\n`
    md += `|------|------|------|\n`
    const total = stats.totalCards || 1
    md += `| 🌟 亮点 | ${stats.columnCounts.highlight} | ${((stats.columnCounts.highlight / total) * 100).toFixed(1)}% |\n`
    md += `| 🔧 改进点 | ${stats.columnCounts.improvement} | ${((stats.columnCounts.improvement / total) * 100).toFixed(1)}% |\n`
    md += `| ✅ 行动项 | ${stats.columnCounts.action} | ${((stats.columnCounts.action / total) * 100).toFixed(1)}% |\n\n`
    md += `## 成员贡献排行\n\n`
    stats.memberCounts.forEach((member, index) => {
      md += `${index + 1}. **${member.member}**: ${member.count} 张卡片\n`
    })
    md += `\n## 详细内容\n\n`
    const columns: { key: 'highlight' | 'improvement' | 'action'; title: string; icon: string }[] = [
      { key: 'highlight', title: '亮点', icon: '🌟' },
      { key: 'improvement', title: '改进点', icon: '🔧' },
      { key: 'action', title: '行动项', icon: '✅' }
    ]
    columns.forEach(col => {
      md += `### ${col.icon} ${col.title}\n\n`
      const columnCards = stats.cards.filter(c => c.column === col.key)
      if (columnCards.length === 0) {
        md += `_暂无内容_\n\n`
      } else {
        columnCards.forEach(card => {
          md += `- **${card.author}**: ${card.content}\n`
        })
        md += `\n`
      }
    })
    return md
  }

  const handleCopyMarkdown = async () => {
    const markdown = generateMarkdown()
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 32px',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#1e293b'
            }}
          >
            📊 {team} 复盘报告
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f1f5f9',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9'
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px'
          }}
        >
          {stats ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  marginBottom: '32px'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#059669'
                    }}
                  >
                    {stats.columnCounts.highlight}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#047857',
                      marginTop: '4px'
                    }}
                  >
                    🌟 亮点
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#fff7ed',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#ea580c'
                    }}
                  >
                    {stats.columnCounts.improvement}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#c2410c',
                      marginTop: '4px'
                    }}
                  >
                    🔧 改进点
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#2563eb'
                    }}
                  >
                    {stats.columnCounts.action}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#1d4ed8',
                      marginTop: '4px'
                    }}
                  >
                    ✅ 行动项
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginBottom: '32px'
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1e293b',
                    margin: '0 0 16px 0'
                  }}
                >
                  分类占比
                </h3>
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                style={{
                  marginBottom: '32px'
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#1e293b',
                    margin: '0 0 16px 0'
                  }}
                >
                  成员贡献排行
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="卡片数" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
                color: '#94a3b8'
              }}
            >
              加载中...
            </div>
          )}
        </div>

        <div
          style={{
            padding: '20px 32px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={handleCopyMarkdown}
            style={{
              padding: '10px 20px',
              backgroundColor: copied ? '#10b981' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {copied ? '✓ 已复制' : '📋 复制 Markdown'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportPanel
