import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import DataLoader from '../data-engine/DataLoader'
import TimelineParser from '../data-engine/TimelineParser'
import DataGraph, { DataGraphHandle } from '../visualization/DataGraph'
import AnnotationOverlay from '../visualization/AnnotationOverlay'
import TimePlayback from '../animation/TimePlayback'
import {
  Annotation,
  ChartType,
  Dataset,
  ResampleInterval,
  TimelineParseConfig
} from '../../types'

const dataLoader = new DataLoader()
const timelineParser = new TimelineParser()

const App: React.FC = () => {
  const location = useLocation()
  const [rawDataset, setRawDataset] = useState<Dataset | null>(null)
  const [processedDataset, setProcessedDataset] = useState<Dataset | null>(null)
  const [chartType, setChartType] = useState<ChartType>('area')
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set())
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [highlightedTimestamp, setHighlightedTimestamp] = useState<number | null>(null)
  const [hoverInfo, setHoverInfo] = useState<{
    timestamp: number
    values: Map<string, number>
  } | null>(null)
  const [playSpeed, setPlaySpeed] = useState(1)
  const [parseConfig, setParseConfig] = useState<TimelineParseConfig>({
    interval: 'none',
    smoothing: 0,
    normalize: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)

  const graphRef = useRef<DataGraphHandle>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const apiUrlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMockData()
  }, [])

  useEffect(() => {
    if (rawDataset) {
      const processed = timelineParser.parse(rawDataset, parseConfig)
      setProcessedDataset(processed)
      const allSeries = new Set(processed.series.map((s) => s.series))
      setVisibleSeries((prev) => {
        if (prev.size === 0) return allSeries
        const intersection = new Set<string>()
        for (const s of prev) {
          if (allSeries.has(s)) intersection.add(s)
        }
        return intersection.size > 0 ? intersection : allSeries
      })
    }
  }, [rawDataset, parseConfig])

  const loadMockData = useCallback(() => {
    try {
      setLoading(true)
      setError(null)
      const mock = dataLoader.loadMockData()
      setRawDataset(mock)
      setAnnotations([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCSVUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        setLoading(true)
        setError(null)
        const dataset = await dataLoader.loadFromCSV(file)
        setRawDataset(dataset)
        setAnnotations([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'CSV解析失败')
      } finally {
        setLoading(false)
        if (csvInputRef.current) csvInputRef.current.value = ''
      }
    },
    []
  )

  const handleJSONUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        setLoading(true)
        setError(null)
        const dataset = await dataLoader.loadFromJSON(file)
        setRawDataset(dataset)
        setAnnotations([])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'JSON解析失败')
      } finally {
        setLoading(false)
        if (jsonInputRef.current) jsonInputRef.current.value = ''
      }
    },
    []
  )

  const handleAPILoad = useCallback(async () => {
    const url = apiUrlRef.current?.value.trim()
    if (!url) {
      setError('请输入API URL')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const dataset = await dataLoader.loadFromAPI(url)
      setRawDataset(dataset)
      setAnnotations([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleSeries = useCallback((seriesName: string) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev)
      if (next.has(seriesName)) {
        if (next.size > 1) next.delete(seriesName)
      } else {
        next.add(seriesName)
      }
      return next
    })
  }, [])

  const handlePointDoubleClick = useCallback(
    (info: {
      timestamp: number
      series: string
      value: number
      x: number
      y: number
    }) => {
      ;(window as any).__openAnnotationEditor?.({
        timestamp: info.timestamp,
        series: info.series,
        value: info.value,
        x: info.x,
        y: info.y
      })
    },
    []
  )

  const handleAddAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation])
  }, [])

  const handleRemoveAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    setSelectedAnnotation((prev) => (prev === id ? null : prev))
  }, [])

  const handleUpdateAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === annotation.id ? annotation : a))
    )
  }, [])

  const handleAnnotationClick = useCallback((annotation: Annotation) => {
    setSelectedAnnotation((prev) => (prev === annotation.id ? null : annotation.id))
    setHighlightedTimestamp(annotation.timestamp)
  }, [])

  const isAnnotatorRoute = location.pathname.includes('annotator')

  const formatTime = (ts: number): string => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const sidebarContent = useMemo(() => (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="app-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3v18h18"
                stroke="#00d4ff"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M7 15l4-6 4 3 5-7"
                stroke="#ffb703"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="logo-text">
            <h1>DataTimeline</h1>
            <span>可视化标注系统</span>
          </div>
        </div>

        <nav className="nav-tabs">
          <Link
            to="/data-viewer"
            className={`nav-tab ${!isAnnotatorRoute ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            数据浏览
          </Link>
          <Link
            to="/data-annotator"
            className={`nav-tab ${isAnnotatorRoute ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            数据标注
          </Link>
        </nav>
      </div>

      <div className="sidebar-content">
        <section className="panel">
          <div className="panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>数据源加载</span>
          </div>
          <div className="panel-body">
            <div className="file-upload-group">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                style={{ display: 'none' }}
              />
              <button className="upload-btn csv-btn" onClick={() => csvInputRef.current?.click()}>
                <span className="btn-icon">📊</span>
                <span>加载 CSV 文件</span>
              </button>
            </div>
            <div className="file-upload-group">
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                onChange={handleJSONUpload}
                style={{ display: 'none' }}
              />
              <button className="upload-btn json-btn" onClick={() => jsonInputRef.current?.click()}>
                <span className="btn-icon">📋</span>
                <span>加载 JSON 文件</span>
              </button>
            </div>

            <div className="api-input-group">
              <div className="input-label">API URL</div>
              <div className="input-row">
                <input
                  ref={apiUrlRef}
                  type="text"
                  placeholder="https://api.example.com/data"
                  className="api-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleAPILoad()}
                />
                <button className="api-load-btn" onClick={handleAPILoad}>
                  加载
                </button>
              </div>
            </div>

            <button className="mock-btn" onClick={loadMockData}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              加载示例数据
            </button>

            {rawDataset && (
              <div className="dataset-info">
                <div className="info-row">
                  <span className="info-key">数据集</span>
                  <span className="info-val">{rawDataset.name}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">数据系列</span>
                  <span className="info-val">{rawDataset.series.length} 组</span>
                </div>
                <div className="info-row">
                  <span className="info-key">总数据点</span>
                  <span className="info-val">
                    {rawDataset.series.reduce((sum, s) => sum + s.points.length, 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <span>图表类型</span>
          </div>
          <div className="panel-body">
            <div className="chart-type-selector">
              <button
                className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
                onClick={() => setChartType('area')}
              >
                <div className="chart-type-preview area-preview" />
                <span>面积图</span>
              </button>
              <button
                className={`chart-type-btn ${chartType === 'stacked-bar' ? 'active' : ''}`}
                onClick={() => setChartType('stacked-bar')}
              >
                <div className="chart-type-preview bar-preview" />
                <span>堆叠柱状</span>
              </button>
              <button
                className={`chart-type-btn ${chartType === 'scatter' ? 'active' : ''}`}
                onClick={() => setChartType('scatter')}
              >
                <div className="chart-type-preview scatter-preview" />
                <span>散点气泡</span>
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            <span>数据系列</span>
          </div>
          <div className="panel-body">
            <div className="series-list">
              {processedDataset?.series.map((s) => {
                const isVisible = visibleSeries.has(s.series)
                return (
                  <div
                    key={s.series}
                    className={`series-item ${isVisible ? '' : 'hidden'}`}
                    onClick={() => toggleSeries(s.series)}
                  >
                    <div
                      className="series-color"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="series-name">{s.series}</span>
                    <div className="series-stats">
                      <span className="stat-val">{s.points.length}点</span>
                    </div>
                    <div className="series-toggle">
                      <div className={`toggle-track ${isVisible ? 'on' : ''}`}>
                        <div className="toggle-thumb" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>数据处理</span>
          </div>
          <div className="panel-body">
            <div className="config-item">
              <label className="config-label">重采样间隔</label>
              <select
                className="config-select"
                value={parseConfig.interval}
                onChange={(e) =>
                  setParseConfig({ ...parseConfig, interval: e.target.value as ResampleInterval })
                }
              >
                <option value="none">不重采样</option>
                <option value="1min">1 分钟</option>
                <option value="5min">5 分钟</option>
                <option value="15min">15 分钟</option>
                <option value="1hour">1 小时</option>
                <option value="1day">1 天</option>
              </select>
            </div>
            <div className="config-item">
              <label className="config-label">
                平滑程度: <span className="config-value">{parseConfig.smoothing.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={parseConfig.smoothing}
                onChange={(e) =>
                  setParseConfig({ ...parseConfig, smoothing: parseFloat(e.target.value) })
                }
                className="config-slider"
              />
            </div>
            <div className="config-item">
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={parseConfig.normalize}
                  onChange={(e) =>
                    setParseConfig({ ...parseConfig, normalize: e.target.checked })
                  }
                />
                <span>归一化到 0-100 范围</span>
              </label>
            </div>
          </div>
        </section>

        {isAnnotatorRoute && (
          <section className="panel">
            <div className="panel-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>标注列表 ({annotations.length})</span>
            </div>
            <div className="panel-body">
              {annotations.length === 0 ? (
                <div className="empty-annotations">
                  <div className="empty-icon">💡</div>
                  <p>双击图表上的数据点添加标注</p>
                </div>
              ) : (
                <div className="annotations-list">
                  {annotations.map((a) => (
                    <div
                      key={a.id}
                      className={`annotation-item ${selectedAnnotation === a.id ? 'selected' : ''}`}
                      onClick={() => handleAnnotationClick(a)}
                    >
                      <div className="annotation-type-tag" style={{ color: a.color }}>
                        {a.type === 'text' ? '💬' : a.type === 'arrow' ? '↗' : '⭕'}
                      </div>
                      <div className="annotation-info">
                        <div className="annotation-series">{a.series}</div>
                        <div className="annotation-time">{formatTime(a.timestamp)}</div>
                        {a.text && (
                          <div className="annotation-preview">{a.text}</div>
                        )}
                      </div>
                      <button
                        className="annotation-delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveAnnotation(a.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="fps-indicator">
          <div className="fps-dot" />
          <span>实时渲染</span>
        </div>
      </div>
    </aside>
  ), [
    isAnnotatorRoute,
    rawDataset,
    chartType,
    visibleSeries,
    processedDataset,
    parseConfig,
    annotations,
    selectedAnnotation,
    handleCSVUpload,
    handleJSONUpload,
    handleAPILoad,
    loadMockData,
    toggleSeries,
    handleAnnotationClick,
    handleRemoveAnnotation
  ])

  const chartAreaContent = useMemo(() => (
    <main className="main-content">
      <header className="top-header">
        <div className="page-breadcrumb">
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">
            {isAnnotatorRoute ? '数据标注模式' : '数据浏览模式'}
          </span>
        </div>

        {hoverInfo && (
          <div className="hover-tooltip">
            <div className="hover-time">{formatTime(hoverInfo.timestamp)}</div>
            <div className="hover-values">
              {processedDataset?.series.map((s) => {
                if (!visibleSeries.has(s.series)) return null
                const val = hoverInfo.values.get(s.series)
                return (
                  <div key={s.series} className="hover-value-row">
                    <span
                      className="hover-dot"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="hover-label">{s.series}</span>
                    <span className="hover-num">
                      {val != null ? val.toFixed(2) : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span>加载中...</span>
          </div>
        )}

        {error && (
          <div className="error-banner" onClick={() => setError(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <span className="dismiss">（点击关闭）</span>
          </div>
        )}
      </header>

      <section className="graph-section">
        <div className="graph-wrapper">
          <DataGraph
            ref={graphRef}
            dataset={processedDataset}
            chartType={chartType}
            highlightedTimestamp={highlightedTimestamp}
            visibleSeries={visibleSeries}
            onPointDoubleClick={handlePointDoubleClick}
            onHover={setHoverInfo}
          />
          {isAnnotatorRoute && (
            <AnnotationOverlay
              annotations={annotations}
              dataset={processedDataset}
              highlightedTimestamp={highlightedTimestamp}
              onAddAnnotation={handleAddAnnotation}
              onRemoveAnnotation={handleRemoveAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
              onAnnotationClick={handleAnnotationClick}
              graphRef={graphRef}
            />
          )}
        </div>
      </section>

      <section className="playback-section">
        <TimePlayback
          dataset={processedDataset}
          onTimestampChange={setHighlightedTimestamp}
          playSpeed={playSpeed}
          setPlaySpeed={setPlaySpeed}
        />
      </section>
    </main>
  ), [
    isAnnotatorRoute,
    hoverInfo,
    loading,
    error,
    processedDataset,
    visibleSeries,
    chartType,
    highlightedTimestamp,
    annotations,
    playSpeed,
    handlePointDoubleClick,
    handleAddAnnotation,
    handleRemoveAnnotation,
    handleUpdateAnnotation,
    handleAnnotationClick
  ])

  return (
    <div className="app-container">
      {sidebarContent}
      <Routes>
        <Route path="/" element={<Navigate to="/data-viewer" replace />} />
        <Route path="/data-viewer" element={chartAreaContent} />
        <Route path="/data-annotator" element={chartAreaContent} />
        <Route path="*" element={<Navigate to="/data-viewer" replace />} />
      </Routes>
    </div>
  )
}

export default App
