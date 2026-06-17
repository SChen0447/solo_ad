import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Account, Task, ContentType, DuplicateResult, HistoryData,
  contentTypeWidth, contentTypeLabel
} from '../api'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Props {
  accounts: Account[]
  tasks: Task[]
  selectedAccountId: string | null
  onCreateTask: (task: Omit<Task, 'id'>) => Promise<Task>
  onCheckDuplicate: (taskIds: string[]) => Promise<DuplicateResult[]>
  onDeleteTask: (id: string) => Promise<void>
  onGetHistoryData: (s: string, e: string, a: Account[]) => Promise<{ barData: HistoryData[]; lineData: HistoryData[] }>
  onExportCSV: () => Promise<string>
}

const statusLabel: Record<Task['status'], string> = {
  scheduled: '待发布',
  published: '已发布',
  draft: '草稿'
}

const statusColor: Record<Task['status'], string> = {
  scheduled: '#339af0',
  published: '#51cf66',
  draft: '#fcc419'
}

type ViewTab = 'calendar' | 'history' | 'duplicate'

const CalendarGantt: React.FC<Props> = ({
  accounts, tasks, selectedAccountId,
  onCreateTask, onCheckDuplicate, onDeleteTask,
  onGetHistoryData, onExportCSV
}) => {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [duplicateResults, setDuplicateResults] = useState<DuplicateResult[]>([])
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [exportProgress, setExportProgress] = useState(-1)
  const [exportMsg, setExportMsg] = useState('')
  const [historyRange, setHistoryRange] = useState<'7' | '30' | 'custom'>('7')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [barData, setBarData] = useState<HistoryData[]>([])
  const [lineData, setLineData] = useState<HistoryData[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [showConflictModal, setShowConflictModal] = useState(false)

  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const visibleAccounts = useMemo(() =>
    selectedAccountId ? accounts.filter(a => a.id === selectedAccountId) : accounts
  , [accounts, selectedAccountId])

  const { days, startDate, endDate } = useMemo(() => {
    const y = viewMonth.getFullYear()
    const m = viewMonth.getMonth()
    const first = new Date(y, m, 1)
    const last = new Date(y, m + 1, 0)
    const startDay = first.getDay()
    const start = new Date(first)
    start.setDate(start.getDate() - startDay)
    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return { days, startDate: start, endDate: new Date(last) }
  }, [viewMonth])

  const taskMap: Map<string, Map<string, Task[]>> = useMemo(() => {
    const map = new Map<string, Map<string, Task[]>>()
    tasks.forEach(t => {
      if (!map.has(t.accountId)) map.set(t.accountId, new Map<string, Task[]>())
      const accMap = map.get(t.accountId)!
      if (!accMap.has(t.date)) accMap.set(t.date, [])
      accMap.get(t.date)!.push(t)
    })
    return map
  }, [tasks])

  const hasConflict = (accountId: string, date: string, excludeId?: string) => {
    const accMap = taskMap.get(accountId)
    if (!accMap) return false
    const list = accMap.get(date)
    if (!list) return false
    return list.some(t => t.id !== excludeId)
  }

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
  const goToday = () => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))

  const [formData, setFormData] = useState({
    title: '', type: 'short_text' as ContentType,
    summary: '', accountId: '', status: 'draft' as Task['status']
  })
  const [conflictWarn, setConflictWarn] = useState(false)

  const openCreateModal = (date: string) => {
    setModalDate(date)
    setFormData({
      title: '', type: 'short_text', summary: '',
      accountId: selectedAccountId || (accounts[0]?.id ?? ''),
      status: 'draft'
    })
    setConflictWarn(false)
    setShowTaskModal(true)
  }

  useEffect(() => {
    if (showTaskModal && formData.accountId) {
      setConflictWarn(hasConflict(formData.accountId, modalDate))
    }
  }, [formData.accountId, modalDate, showTaskModal, taskMap])

  const submitTask = async () => {
    if (!formData.title.trim() || !formData.accountId || !modalDate) return
    if (hasConflict(formData.accountId, modalDate)) {
      setShowConflictModal(true)
      return
    }
    await doCreateTask()
  }

  const doCreateTask = async () => {
    await onCreateTask({
      ...formData,
      date: modalDate,
      estimatedViews: Math.floor(5000 + Math.random() * 45000),
      estimatedEngagement: Number((2 + Math.random() * 8).toFixed(1))
    })
    setShowTaskModal(false)
    setShowConflictModal(false)
  }

  const toggleTaskSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedTaskIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnterTask = (task: Task, e: React.MouseEvent) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setHoveredTask(task)
    setHoverPos({ x: e.clientX, y: e.clientY })
    hoverTimerRef.current = setTimeout(() => {
      setTooltipVisible(true)
    }, 80)
  }

  const handleMouseMoveTask = (e: React.MouseEvent) => {
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeaveTask = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setTooltipVisible(false)
    setTimeout(() => setHoveredTask(null), 300)
  }

  const runDuplicateCheck = async () => {
    if (selectedTaskIds.size < 2) {
      alert('请至少选择2个任务进行重复检测')
      return
    }
    setIsCheckingDuplicate(true)
    const res = await onCheckDuplicate(Array.from(selectedTaskIds))
    if (res.length === 0) {
      const computed = computeJaccardDuplicates(Array.from(selectedTaskIds))
      setDuplicateResults(computed)
    } else {
      setDuplicateResults(res)
    }
    setIsCheckingDuplicate(false)
  }

  const computeJaccardDuplicates = (ids: string[]): DuplicateResult[] => {
    const selected = tasks.filter(t => ids.includes(t.id))
    const results: DuplicateResult[] = []
    const tokenize = (s: string) => new Set(s.split(/[\s,，。！？!?、；;:：""''（）()【】\[\]《》<>\/\\.。]+/).filter(Boolean))
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const a = tokenize(selected[i].summary + selected[i].title)
        const b = tokenize(selected[j].summary + selected[j].title)
        if (a.size === 0 || b.size === 0) continue
        const inter = new Set([...a].filter(x => b.has(x)))
        const union = new Set([...a, ...b])
        const sim = inter.size / union.size
        if (sim >= 0.7) {
          results.push({
            task1Id: selected[i].id,
            task2Id: selected[j].id,
            similarity: Number((sim * 100).toFixed(1))
          })
        }
      }
    }
    return results
  }

  const deleteDuplicate = async (taskId: string) => {
    await onDeleteTask(taskId)
    setDuplicateResults(prev => prev.filter(r => r.task1Id !== taskId && r.task2Id !== taskId))
    setSelectedTaskIds(prev => {
      const n = new Set(prev)
      n.delete(taskId)
      return n
    })
  }

  const handleExport = async () => {
    setExportProgress(0)
    setExportMsg('')
    const timer = setInterval(() => {
      setExportProgress(p => {
        if (p >= 95) { clearInterval(timer); return 95 }
        return p + 10
      })
    }, 100)
    const csv = await onExportCSV()
    clearInterval(timer)
    setExportProgress(100)
    if (csv) {
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `content-schedule-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('导出成功')
    } else {
      generateAndDownloadCSV()
      setExportMsg('导出成功')
    }
    setTimeout(() => setExportProgress(-1), 2000)
  }

  const generateAndDownloadCSV = () => {
    const rows = [['账号', '日期', '标题', '类型', '摘要']]
    tasks.forEach(t => {
      const acc = accounts.find(a => a.id === t.accountId)
      rows.push([
        acc?.name || '',
        t.date,
        t.title,
        contentTypeLabel[t.type],
        t.summary.replace(/\n/g, ' ')
      ])
    })
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `content-schedule-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadHistoryData = async () => {
    let s: Date, e: Date
    const now = new Date()
    if (historyRange === '7') {
      e = new Date(now)
      s = new Date(now)
      s.setDate(s.getDate() - 6)
    } else if (historyRange === '30') {
      e = new Date(now)
      s = new Date(now)
      s.setDate(s.getDate() - 29)
    } else {
      if (!customStart || !customEnd) {
        alert('请选择自定义时间范围')
        return
      }
      s = new Date(customStart)
      e = new Date(customEnd)
    }
    setIsLoadingHistory(true)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const res = await onGetHistoryData(fmt(s), fmt(e), accounts)
    setBarData(res.barData)
    setLineData(res.lineData)
    setIsLoadingHistory(false)
  }

  useEffect(() => {
    if (activeTab === 'history' && barData.length === 0) loadHistoryData()
  }, [activeTab])

  const isMobile = windowWidth < 768
  const dayCellWidth = isMobile ? 40 : Math.max(50, Math.floor((windowWidth - 250 - 160 - 32) / 7))

  const monthLabel = `${viewMonth.getFullYear()}年${viewMonth.getMonth() + 1}月`

  const accountById = useMemo(() => {
    const m = new Map<string, Account>()
    accounts.forEach(a => m.set(a.id, a))
    return m
  }, [accounts])

  const taskById = useMemo(() => {
    const m = new Map<string, Task>()
    tasks.forEach(t => m.set(t.id, t))
    return m
  }, [tasks])

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.tabs}>
          {(['calendar', 'history', 'duplicate'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabBtn,
                backgroundColor: activeTab === tab ? '#7950f2' : 'transparent',
                color: activeTab === tab ? '#fff' : '#a0a0c0'
              }}
            >
              {tab === 'calendar' ? '📅 排期甘特图' : tab === 'history' ? '📊 历史追踪' : '🔍 重复检测'}
            </button>
          ))}
        </div>
        <div style={styles.toolbarActions}>
          <button onClick={handleExport} style={styles.exportBtn} disabled={exportProgress >= 0}>
            {exportProgress >= 0 ? `导出中 ${exportProgress}%` : '⬇ 导出排期'}
          </button>
        </div>
      </div>

      {exportProgress >= 0 && (
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${exportProgress}%` }} />
        </div>
      )}
      {exportMsg && <div style={styles.successToast}>{exportMsg}</div>}

      {activeTab === 'calendar' && (
        <>
          <div style={styles.monthNav}>
            <button onClick={prevMonth} style={styles.navBtn}>‹</button>
            <button onClick={goToday} style={styles.todayBtn}>今天</button>
            <span style={styles.monthTitle}>{monthLabel}</span>
            <button onClick={nextMonth} style={styles.navBtn}>›</button>
          </div>

          {!isMobile ? (
            <div style={styles.ganttWrapper}>
              <div style={{ ...styles.gantt, gridTemplateColumns: `160px repeat(${days.length}, ${dayCellWidth}px)` }}>
                <div style={{ ...styles.cornerCell, left: 0 }}>账号 / 日期</div>
                {days.map((d, i) => {
                  const isCurMonth = d.getMonth() === viewMonth.getMonth()
                  const isToday = d.toDateString() === today.toDateString()
                  return (
                    <div key={i} style={{
                      ...styles.dayHeaderCell,
                      color: isCurMonth ? '#e0e0f0' : '#505070',
                      backgroundColor: isToday ? '#7950f222' : 'transparent',
                      borderBottom: isToday ? '2px solid #7950f2' : '1px solid #3a3a52'
                    }}>
                      <div style={styles.weekDay}>
                        {['日','一','二','三','四','五','六'][d.getDay()]}
                      </div>
                      <div style={{ ...styles.dayNum, color: isToday ? '#7950f2' : 'inherit' }}>
                        {d.getDate()}
                      </div>
                    </div>
                  )
                })}

                {visibleAccounts.map(acc => {
                  const accMap = taskMap.get(acc.id) || new Map()
                  return (
                    <React.Fragment key={acc.id}>
                      <div style={{
                        ...styles.accountRowHeader,
                        borderLeft: `4px solid ${acc.color}`
                      }}>
                        <div style={{ ...styles.accIcon, backgroundColor: acc.color }}>{acc.icon}</div>
                        <div style={styles.accNameWrap}>
                          <div style={styles.accName}>{acc.name}</div>
                          <div style={styles.accCount}>
                            {Array.from(accMap.values()).flat().filter(t =>
                              new Date(t.date) >= startDate && new Date(t.date) <= endDate
                            ).length} 条
                          </div>
                        </div>
                      </div>
                      {days.map((d, i) => {
                        const dateStr = d.toISOString().split('T')[0]
                        const dayTasks: Task[] = accMap.get(dateStr) || []
                        const conflict = dayTasks.length > 1
                        return (
                          <div
                            key={i}
                            onClick={() => openCreateModal(dateStr)}
                            style={{
                              ...styles.dayCell,
                              backgroundColor: d.getMonth() === viewMonth.getMonth() ? 'transparent' : '#1a1a28',
                              cursor: 'pointer'
                            }}
                          >
                            {conflict && <div style={styles.conflictBadge} title="任务冲突">⚠</div>}
                            <div style={styles.tasksStack}>
                              {dayTasks.map(t => {
                                const w = Math.min(contentTypeWidth[t.type], dayCellWidth - 8)
                                return (
                                  <div
                                    key={t.id}
                                    onClick={(e) => toggleTaskSelect(t.id, e)}
                                    onMouseEnter={(e) => handleMouseEnterTask(t, e)}
                                    onMouseMove={handleMouseMoveTask}
                                    onMouseLeave={handleMouseLeaveTask}
                                    style={{
                                      ...styles.ganttBar,
                                      backgroundColor: acc.color,
                                      width: w,
                                      outline: selectedTaskIds.has(t.id) ? `2px solid #fff` : 'none',
                                      outlineOffset: 1
                                    }}
                                    title={t.title}
                                  >
                                    <span style={styles.barText}>{t.title.slice(0, 4)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={styles.mobileList}>
              {days.filter(d => d.getMonth() === viewMonth.getMonth()).map(d => {
                const dateStr = d.toISOString().split('T')[0]
                const dayTasks = tasks.filter(t => t.date === dateStr && visibleAccounts.some(a => a.id === t.accountId))
                return (
                  <div key={d.toISOString()} style={styles.mobileDay}>
                    <div style={styles.mobileDayHeader} onClick={() => openCreateModal(dateStr)}>
                      <div style={{
                        ...styles.mobileDayNum,
                        color: d.toDateString() === today.toDateString() ? '#7950f2' : '#e0e0f0'
                      }}>
                        {d.getDate()}
                      </div>
                      <div style={styles.mobileWeekday}>
                        周{['日','一','二','三','四','五','六'][d.getDay()]}
                      </div>
                      <div style={styles.mobileAddBtn}>+ 添加</div>
                    </div>
                    <div style={styles.mobileTaskList}>
                      {dayTasks.map(t => {
                        const acc = accountById.get(t.accountId)
                        return (
                          <div key={t.id} style={{
                            ...styles.mobileTaskItem,
                            borderLeftColor: acc?.color || '#888'
                          }}
                          onClick={(e) => toggleTaskSelect(t.id, e)}
                          >
                            <div style={styles.mobileTaskTitle}>{t.title}</div>
                            <div style={styles.mobileTaskMeta}>
                              {acc?.name} · {contentTypeLabel[t.type]}
                            </div>
                          </div>
                        )
                      })}
                      {dayTasks.length === 0 && <div style={styles.noTask}>暂无任务</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div style={styles.historySection}>
          <div style={styles.historyControls}>
            <div style={styles.rangeGroup}>
              {(['7', '30', 'custom'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setHistoryRange(r)}
                  style={{
                    ...styles.rangeBtn,
                    backgroundColor: historyRange === r ? '#7950f2' : '#2a2a3e',
                    color: historyRange === r ? '#fff' : '#a0a0c0'
                  }}
                >
                  {r === '7' ? '最近7天' : r === '30' ? '最近30天' : '自定义'}
                </button>
              ))}
            </div>
            {historyRange === 'custom' && (
              <div style={styles.customRange}>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={styles.dateInput} />
                <span style={{ color: '#8080a0' }}>至</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={styles.dateInput} />
              </div>
            )}
            <button onClick={loadHistoryData} style={styles.refreshBtn} disabled={isLoadingHistory}>
              {isLoadingHistory ? '加载中...' : '刷新数据'}
            </button>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>📊 各账号发布数量 & 平均互动率</h3>
            {barData.length > 0 ? (
              <div style={{ height: 380 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={barData.map((b, i) => {
                      const ld = lineData[i] || {}
                      const merged: HistoryData = { ...b }
                      accounts.forEach(a => {
                        if (ld[a.id] !== undefined) merged[`${a.id}_rate`] = ld[a.id] as number
                      })
                      return merged
                    })}
                    onMouseMove={(e) => {
                      if (e && e.activeTooltipIndex !== undefined && barData[e.activeTooltipIndex]) {
                        setHighlightedDate(barData[e.activeTooltipIndex].date as string)
                      }
                    }}
                    onMouseLeave={() => setHighlightedDate(null)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a52" />
                    <XAxis
                      dataKey="date"
                      stroke="#8080a0"
                      tick={{ fill: '#8080a0', fontSize: 11 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#8080a0"
                      tick={{ fill: '#8080a0', fontSize: 11 }}
                      label={{ value: '发布数量', angle: -90, position: 'insideLeft', fill: '#8080a0', fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#8080a0"
                      tick={{ fill: '#8080a0', fontSize: 11 }}
                      label={{ value: '互动率(%)', angle: 90, position: 'insideRight', fill: '#8080a0', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#2a2a3e',
                        border: '1px solid #3a3a52',
                        borderRadius: 8,
                        color: '#e0e0f0',
                        fontSize: 12
                      }}
                      formatter={(value: any, name: string) => {
                        if (name.endsWith('_rate')) return [`${value}%`, `${accountById.get(name.replace('_rate', ''))?.name || ''} 互动率`]
                        return [value, `${accountById.get(name)?.name || name} 发布数`]
                      }}
                      labelFormatter={(l) => `📅 日期: ${l}`}
                    />
                    <Legend
                      wrapperStyle={{ color: '#a0a0c0', fontSize: 12 }}
                      formatter={(value: string) => {
                        if (value.endsWith('_rate')) return `${accountById.get(value.replace('_rate', ''))?.name || value} (互动率)`
                        return `${accountById.get(value)?.name || value} (发布数)`
                      }}
                    />
                    {accounts.map(acc => (
                      <Bar
                        key={acc.id}
                        yAxisId="left"
                        dataKey={acc.id}
                        fill={acc.color}
                        fillOpacity={highlightedDate ? 0.4 : 0.85}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                    {accounts.map(acc => (
                      <Line
                        key={`${acc.id}_rate`}
                        yAxisId="right"
                        type="monotone"
                        dataKey={`${acc.id}_rate`}
                        stroke={acc.color}
                        strokeWidth={2}
                        dot={{ fill: acc.color, r: highlightedDate ? 4 : 3 }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={styles.emptyChart}>点击"刷新数据"加载历史数据</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'duplicate' && (
        <div style={styles.duplicateSection}>
          <div style={styles.dupHeader}>
            <div>
              <h3 style={styles.dupTitle}>🔍 重复内容检测</h3>
              <p style={styles.dupSubtitle}>在甘特图中选择任务（点击任务条），至少选择2个，使用Jaccard相似度算法检测摘要文本重复度（≥70%为重复）</p>
            </div>
            <div style={styles.dupActions}>
              <span style={styles.selectedCount}>已选择 {selectedTaskIds.size} 个任务</span>
              <button
                onClick={runDuplicateCheck}
                disabled={selectedTaskIds.size < 2 || isCheckingDuplicate}
                style={{
                  ...styles.checkBtn,
                  opacity: selectedTaskIds.size < 2 ? 0.5 : 1
                }}
              >
                {isCheckingDuplicate ? '检测中...' : '检查重复'}
              </button>
              {selectedTaskIds.size > 0 && (
                <button onClick={() => setSelectedTaskIds(new Set())} style={styles.clearBtn}>
                  清除选择
                </button>
              )}
            </div>
          </div>

          {selectedTaskIds.size > 0 && (
            <div style={styles.selectedTasksPanel}>
              <div style={styles.selectedLabel}>已选择的任务：</div>
              <div style={styles.selectedTasksWrap}>
                {Array.from(selectedTaskIds).map(id => {
                  const t = taskById.get(id)
                  const acc = t ? accountById.get(t.accountId) : null
                  if (!t) return null
                  return (
                    <div key={id} style={{
                      ...styles.selectedTaskChip,
                      borderColor: acc?.color || '#888'
                    }}>
                      <div style={{ ...styles.chipColor, backgroundColor: acc?.color }} />
                      <div style={styles.chipText}>
                        <div style={styles.chipTitle}>{t.title}</div>
                        <div style={styles.chipMeta}>{t.date} · {contentTypeLabel[t.type]}</div>
                      </div>
                      <button onClick={(e) => toggleTaskSelect(id, e)} style={styles.chipClose}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={styles.resultsPanel}>
            <h4 style={styles.resultsTitle}>检测结果</h4>
            {duplicateResults.length === 0 ? (
              <div style={styles.emptyResults}>
                {isCheckingDuplicate ? '正在检测...' : '未检测到相似度≥70%的重复内容'}
              </div>
            ) : (
              duplicateResults.map((r, idx) => {
                const t1 = taskById.get(r.task1Id)
                const t2 = taskById.get(r.task2Id)
                const a1 = t1 ? accountById.get(t1.accountId) : null
                const a2 = t2 ? accountById.get(t2.accountId) : null
                if (!t1 || !t2) return null
                return (
                  <div key={idx} style={styles.dupCard}>
                    <div style={styles.simBadge}>相似度 {r.similarity}%</div>
                    <div style={styles.dupPair}>
                      <div style={{ ...styles.dupTask, borderLeft: `4px solid ${a1?.color}` }}>
                        <div style={styles.dupTaskHeader}>
                          <div style={styles.dupTaskTitle}>{t1.title}</div>
                          <button onClick={() => deleteDuplicate(t1.id)} style={styles.deleteBtn}>🗑 删除</button>
                        </div>
                        <div style={styles.dupTaskMeta}>
                          <span style={{ color: a1?.color }}>{a1?.name}</span>
                          <span> · {t1.date}</span>
                          <span> · {contentTypeLabel[t1.type]}</span>
                        </div>
                        <div style={styles.dupSummary}>{t1.summary}</div>
                      </div>
                      <div style={{ ...styles.dupTask, borderLeft: `4px solid ${a2?.color}` }}>
                        <div style={styles.dupTaskHeader}>
                          <div style={styles.dupTaskTitle}>{t2.title}</div>
                          <button onClick={() => deleteDuplicate(t2.id)} style={styles.deleteBtn}>🗑 删除</button>
                        </div>
                        <div style={styles.dupTaskMeta}>
                          <span style={{ color: a2?.color }}>{a2?.name}</span>
                          <span> · {t2.date}</span>
                          <span> · {contentTypeLabel[t2.type]}</span>
                        </div>
                        <div style={styles.dupSummary}>{t2.summary}</div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {hoveredTask && (() => {
        const accColor = accountById.get(hoveredTask.accountId)?.color || '#7950f2'
        const tooltipW = 320
        const tooltipH = 220
        let left = hoverPos.x + 16
        let top = hoverPos.y + 16
        if (left + tooltipW > window.innerWidth - 16) {
          left = hoverPos.x - tooltipW - 16
        }
        if (top + tooltipH > window.innerHeight - 16) {
          top = hoverPos.y - tooltipH - 16
        }
        left = Math.max(16, left)
        top = Math.max(16, top)
        return (
          <div style={{
            ...styles.tooltipCard,
            left,
            top,
            border: `2px solid ${accColor}`,
            opacity: tooltipVisible ? 1 : 0,
            transform: tooltipVisible ? 'translateY(0)' : 'translateY(6px)',
          }}>
            <div style={{ ...styles.tooltipAccLine, backgroundColor: accColor }} />
            <div style={styles.tooltipContent}>
              <div style={styles.tooltipTitle}>{hoveredTask.title}</div>
              <div style={styles.tooltipMetaRow}>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: statusColor[hoveredTask.status]
                }}>{statusLabel[hoveredTask.status]}</span>
                <span style={styles.tooltipMeta}>{contentTypeLabel[hoveredTask.type]}</span>
              </div>
              <div style={styles.tooltipSummary}>{hoveredTask.summary}</div>
              <div style={styles.tooltipStats}>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>预计阅读量</div>
                  <div style={styles.statValue}>{hoveredTask.estimatedViews.toLocaleString()}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>预估互动率</div>
                  <div style={styles.statValue}>{hoveredTask.estimatedEngagement}%</div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {showTaskModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTaskModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>➕ 创建发布任务</h3>
            <div style={styles.modalDateRow}>
              <span style={styles.modalDateLabel}>发布日期：</span>
              <span style={styles.modalDateValue}>{modalDate}</span>
              {conflictWarn && (
                <span style={styles.conflictWarn}>⚠ 该账号此日期已有任务</span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>内容标题 *</label>
              <input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入内容标题"
                style={styles.fieldInput}
                maxLength={50}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>内容类型</label>
              <div style={styles.typeGrid}>
                {(['short_text', 'long_article', 'image_set', 'video'] as const).map(tp => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: tp })}
                    style={{
                      ...styles.typeBtn,
                      backgroundColor: formData.type === tp ? '#7950f2' : '#1e1e2e',
                      borderColor: formData.type === tp ? '#7950f2' : '#3a3a52',
                      color: formData.type === tp ? '#fff' : '#a0a0c0'
                    }}
                  >
                    {tp === 'short_text' ? '📝' : tp === 'long_article' ? '📄' : tp === 'image_set' ? '🖼' : '🎬'}
                    <div style={{ fontSize: 12, marginTop: 4 }}>{contentTypeLabel[tp]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>
                摘要文本
                <span style={{ color: '#8080a0', fontWeight: 400, marginLeft: 8 }}>
                  {formData.summary.length}/200
                </span>
              </label>
              <textarea
                value={formData.summary}
                onChange={e => setFormData({ ...formData, summary: e.target.value.slice(0, 200) })}
                placeholder="输入内容摘要（用于重复检测和卡片展示）"
                style={{ ...styles.fieldInput, minHeight: 80, resize: 'vertical' }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>目标账号 *</label>
              <select
                value={formData.accountId}
                onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                style={styles.fieldInput}
              >
                <option value="">请选择账号</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>发布状态</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                style={styles.fieldInput}
              >
                <option value="draft">📋 草稿</option>
                <option value="scheduled">⏰ 待发布</option>
                <option value="published">✅ 已发布</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowTaskModal(false)} style={styles.cancelBtn}>取消</button>
              <button
                onClick={submitTask}
                disabled={!formData.title.trim() || !formData.accountId}
                style={{
                  ...styles.confirmBtn,
                  opacity: (!formData.title.trim() || !formData.accountId) ? 0.5 : 1
                }}
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showConflictModal && (
        <div style={styles.modalOverlay} onClick={() => setShowConflictModal(false)}>
          <div style={{ ...styles.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={styles.conflictIcon}>⚠️</div>
            <h3 style={{ ...styles.modalTitle, textAlign: 'center', marginBottom: 12 }}>时间冲突提示</h3>
            <div style={{ ...styles.conflictWarnBig, marginBottom: 8 }}>
              该账号在 <span style={{ fontWeight: 600, color: '#7950f2' }}>{modalDate}</span> 已有其他发布任务
            </div>
            <div style={{ fontSize: 13, color: '#a0a0c0', marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}>
              同时发布多条内容可能导致粉丝阅读体验下降，建议调整发布时间。
              <br />是否仍要在该时间点创建任务？
            </div>
            <div style={styles.modalActions}>
              <button onClick={() => setShowConflictModal(false)} style={styles.cancelBtn}>
                返回调整
              </button>
              <button onClick={doCreateTask} style={{ ...styles.confirmBtn, backgroundColor: '#ff6b6b' }}>
                仍要创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#1e1e2e'
  },
  toolbar: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #3a3a52',
    gap: 16,
    flexWrap: 'wrap'
  },
  tabs: { display: 'flex', gap: 4 },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500
  },
  toolbarActions: { display: 'flex', gap: 8, alignItems: 'center' },
  exportBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    backgroundColor: '#20c997',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2a3e',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #20c997, #339af0)',
    transition: 'width 0.1s ease'
  },
  successToast: {
    position: 'fixed',
    top: 80,
    right: 32,
    padding: '12px 20px',
    backgroundColor: '#20c997',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 10000,
    animation: 'fadeIn 0.3s ease'
  },
  monthNav: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
    color: '#e0e0f0',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  todayBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
    color: '#a0a0c0',
    fontSize: 13
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0f0',
    marginLeft: 8
  },
  ganttWrapper: {
    flex: 1,
    overflow: 'auto',
    padding: '0 24px 24px'
  },
  gantt: {
    display: 'grid',
    minWidth: 'max-content'
  },
  cornerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    padding: '12px 16px',
    backgroundColor: '#2a2a3e',
    fontSize: 12,
    fontWeight: 600,
    color: '#a0a0c0',
    borderBottom: '1px solid #3a3a52',
    borderRight: '1px solid #3a3a52'
  },
  dayHeaderCell: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    padding: '8px 4px',
    textAlign: 'center',
    backgroundColor: '#2a2a3e',
    borderBottom: '1px solid #3a3a52',
    borderRight: '1px solid #3a3a52'
  },
  weekDay: { fontSize: 10, color: '#8080a0', marginBottom: 2 },
  dayNum: { fontSize: 14, fontWeight: 600 },
  accountRowHeader: {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    padding: '16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#252538',
    borderRight: '1px solid #3a3a52',
    borderBottom: '1px solid #3a3a52'
  },
  accIcon: {
    width: 32, height: 32, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
  },
  accNameWrap: { flex: 1, minWidth: 0 },
  accName: { fontSize: 13, fontWeight: 600, color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  accCount: { fontSize: 11, color: '#8080a0', marginTop: 2 },
  dayCell: {
    position: 'relative',
    minHeight: 64,
    padding: 4,
    borderRight: '1px solid #3a3a52',
    borderBottom: '1px solid #3a3a52',
    verticalAlign: 'top'
  },
  conflictBadge: {
    position: 'absolute',
    top: 2, right: 2,
    width: 20, height: 20,
    borderRadius: '50%',
    backgroundColor: '#ff6b6b',
    color: '#fff',
    fontSize: 14,
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 0 8px rgba(255,107,107,0.8)',
    animation: 'pulse 1.5s ease-in-out infinite'
  },
  tasksStack: { display: 'flex', flexDirection: 'column', gap: 3 },
  ganttBar: {
    height: 24,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    padding: '0 6px',
    fontSize: 10,
    color: '#fff',
    fontWeight: 500,
    cursor: 'pointer',
    opacity: 0.92,
    overflow: 'hidden'
  },
  barText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  tooltipCard: {
    position: 'fixed',
    width: 320,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',
    zIndex: 9999,
    overflow: 'hidden',
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease, transform 0.3s ease'
  },
  tooltipAccLine: { height: 4 },
  tooltipContent: { padding: 16 },
  tooltipTitle: { fontSize: 15, fontWeight: 600, color: '#e0e0f0', marginBottom: 10 },
  tooltipMetaRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 },
  statusBadge: { padding: '3px 8px', borderRadius: 4, fontSize: 11, color: '#fff', fontWeight: 500 },
  tooltipMeta: { fontSize: 12, color: '#a0a0c0' },
  tooltipSummary: { fontSize: 12, color: '#c0c0d8', lineHeight: 1.6, marginBottom: 12 },
  tooltipStats: { display: 'flex', gap: 16, paddingTop: 12, borderTop: '1px solid #3a3a52' },
  stat: { flex: 1 },
  statLabel: { fontSize: 11, color: '#8080a0', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 600, color: '#e0e0f0' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 16
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#2a2a3e',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
  },
  modalTitle: { fontSize: 18, fontWeight: 600, color: '#e0e0f0', marginBottom: 16 },
  modalDateRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  modalDateLabel: { fontSize: 13, color: '#8080a0' },
  modalDateValue: { fontSize: 14, fontWeight: 600, color: '#7950f2' },
  conflictWarn: { fontSize: 12, color: '#ff6b6b', backgroundColor: '#ff6b6b22', padding: '4px 8px', borderRadius: 4 },
  field: { marginBottom: 16 },
  fieldLabel: { display: 'block', fontSize: 13, color: '#a0a0c0', marginBottom: 6, fontWeight: 500 },
  fieldInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    color: '#e0e0f0',
    fontSize: 14,
    border: '1px solid #3a3a52',
    boxSizing: 'border-box'
  },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  typeBtn: {
    padding: '12px 8px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  modalActions: { display: 'flex', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 8,
    backgroundColor: '#3a3a52',
    color: '#e0e0f0',
    fontSize: 14,
    fontWeight: 500
  },
  confirmBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: 8,
    backgroundColor: '#7950f2',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500
  },
  mobileList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 16px 16px'
  },
  mobileDay: {
    marginBottom: 12,
    backgroundColor: '#252538',
    borderRadius: 12,
    overflow: 'hidden'
  },
  mobileDayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid #3a3a52',
    cursor: 'pointer'
  },
  mobileDayNum: { fontSize: 22, fontWeight: 700 },
  mobileWeekday: { fontSize: 13, color: '#8080a0', flex: 1 },
  mobileAddBtn: { fontSize: 12, color: '#7950f2', fontWeight: 500 },
  mobileTaskList: { padding: 8 },
  mobileTaskItem: {
    padding: '10px 12px',
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    borderLeft: '4px solid',
    cursor: 'pointer'
  },
  mobileTaskTitle: { fontSize: 13, fontWeight: 500, color: '#e0e0f0' },
  mobileTaskMeta: { fontSize: 11, color: '#8080a0', marginTop: 4 },
  noTask: { padding: 16, textAlign: 'center', color: '#505070', fontSize: 12 },
  historySection: { flex: 1, overflowY: 'auto', padding: '16px 24px 24px' },
  historyControls: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  rangeGroup: { display: 'flex', gap: 4, backgroundColor: '#2a2a3e', borderRadius: 8, padding: 4 },
  rangeBtn: {
    padding: '8px 14px',
    borderRadius: 6,
    fontSize: 13,
    color: '#a0a0c0',
    fontWeight: 500
  },
  customRange: { display: 'flex', gap: 8, alignItems: 'center' },
  dateInput: {
    padding: '8px 12px',
    borderRadius: 6,
    backgroundColor: '#2a2a3e',
    color: '#e0e0f0',
    border: '1px solid #3a3a52',
    fontSize: 13
  },
  refreshBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    backgroundColor: '#7950f2',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    marginLeft: 'auto'
  },
  chartCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 20
  },
  chartTitle: { fontSize: 15, fontWeight: 600, color: '#e0e0f0', marginBottom: 16 },
  emptyChart: { padding: 80, textAlign: 'center', color: '#8080a0', fontSize: 14 },
  duplicateSection: { flex: 1, overflowY: 'auto', padding: '16px 24px 24px' },
  dupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  dupTitle: { fontSize: 16, fontWeight: 600, color: '#e0e0f0', marginBottom: 4 },
  dupSubtitle: { fontSize: 12, color: '#8080a0', lineHeight: 1.6, maxWidth: 600 },
  dupActions: { display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 },
  selectedCount: { fontSize: 13, color: '#a0a0c0' },
  checkBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    backgroundColor: '#7950f2',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500
  },
  clearBtn: {
    padding: '10px 16px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: '#a0a0c0',
    fontSize: 13,
    border: '1px solid #3a3a52'
  },
  selectedTasksPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  selectedLabel: { fontSize: 12, color: '#8080a0', marginBottom: 10 },
  selectedTasksWrap: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  selectedTaskChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 8px 8px 0',
    borderRadius: 8,
    backgroundColor: '#1e1e2e',
    border: '1px solid',
    minWidth: 240
  },
  chipColor: { width: 4, height: 40, borderRadius: '0 2px 2px 0' },
  chipText: { flex: 1, minWidth: 0 },
  chipTitle: { fontSize: 13, fontWeight: 500, color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipMeta: { fontSize: 11, color: '#8080a0', marginTop: 2 },
  chipClose: {
    width: 24, height: 24,
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: '#8080a0',
    fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  resultsPanel: { backgroundColor: '#2a2a3e', borderRadius: 12, padding: 16, minHeight: 200 },
  resultsTitle: { fontSize: 14, fontWeight: 600, color: '#e0e0f0', marginBottom: 12 },
  emptyResults: { padding: 40, textAlign: 'center', color: '#8080a0', fontSize: 13 },
  dupCard: {
    padding: 16,
    backgroundColor: '#2e2a26',
    borderRadius: 10,
    border: '1px solid #ff922b55',
    marginBottom: 12,
    position: 'relative'
  },
  simBadge: {
    position: 'absolute',
    top: 12, right: 12,
    padding: '4px 10px',
    borderRadius: 6,
    backgroundColor: '#ff922b',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600
  },
  dupPair: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  dupTask: {
    padding: 12,
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    borderLeft: '4px solid'
  },
  dupTaskHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dupTaskTitle: { fontSize: 14, fontWeight: 500, color: '#e0e0f0' },
  deleteBtn: {
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: '#ff6b6b',
    fontSize: 12,
    border: '1px solid #ff6b6b55',
    flexShrink: 0
  },
  dupTaskMeta: { fontSize: 11, color: '#a0a0c0', marginBottom: 8 },
  dupSummary: { fontSize: 12, color: '#c0c0d8', lineHeight: 1.6 },
  conflictIcon: {
    textAlign: 'center',
    fontSize: 48,
    marginBottom: 8
  },
  conflictWarnBig: {
    fontSize: 14,
    color: '#e0e0f0',
    textAlign: 'center',
    padding: '12px 16px',
    backgroundColor: '#ff6b6b22',
    borderRadius: 8,
    border: '1px solid #ff6b6b55'
  }
}

export default CalendarGantt
