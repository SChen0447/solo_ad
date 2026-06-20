import React, { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import './DataPanel.css'

type ColumnType = 'string' | 'number' | 'date'

interface DataRow {
  [key: string]: string
}

interface DatasetInfo {
  filename: string
  columns: string[]
  column_types: ColumnType[]
  rows: DataRow[]
  total_rows: number
  upload_time: string
}

interface DataPanelProps {
  projectId?: string
}

const DataPanel: React.FC<DataPanelProps> = ({ projectId = 'default' }) => {
  const [datasets, setDatasets] = useState<Map<string, DatasetInfo>>(new Map())
  const [activeDataset, setActiveDataset] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    column: string
    direction: 'asc' | 'desc'
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const currentDataset = activeDataset ? datasets.get(activeDataset) : null

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file) return

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('请上传 CSV 格式的文件')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('文件大小不能超过 5MB')
        return
      }

      setError(null)
      setIsUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', projectId)

      axios
        .post('/api/upload-csv', formData, {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              setUploadProgress(progress)
            }
          },
        })
        .then((response) => {
          const data = response.data
          if (data.success) {
            const dataset: DatasetInfo = {
              filename: data.filename,
              columns: data.columns,
              column_types: data.column_types,
              rows: data.rows,
              total_rows: data.total_rows,
              upload_time: new Date().toISOString(),
            }
            setDatasets((prev) => {
              const next = new Map(prev)
              next.set(data.filename, dataset)
              return next
            })
            setActiveDataset(data.filename)
            setSortConfig(null)
          } else {
            setError(data.error || '上传失败')
          }
        })
        .catch((err) => {
          setError(err.message || '上传失败，请检查后端服务是否启动')
        })
        .finally(() => {
          setIsUploading(false)
          setUploadProgress(0)
        })
    },
    [projectId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev?.column === column) {
        return {
          column,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      return { column, direction: 'asc' }
    })
  }

  const getColumnTypeLabel = (type: ColumnType): string => {
    switch (type) {
      case 'number':
        return '数值'
      case 'date':
        return '日期'
      default:
        return '字符串'
    }
  }

  const getColumnTypeClass = (type: ColumnType): string => {
    return `col-type col-type-${type}`
  }

  const sortedRows = React.useMemo(() => {
    if (!currentDataset || !sortConfig) {
      return currentDataset?.rows || []
    }

    const { column, direction } = sortConfig
    const colIndex = currentDataset.columns.indexOf(column)
    const colType = currentDataset.column_types[colIndex]

    return [...currentDataset.rows].sort((a, b) => {
      let aVal = a[column] || ''
      let bVal = b[column] || ''

      if (colType === 'number') {
        const aNum = parseFloat(aVal)
        const bNum = parseFloat(bVal)
        aVal = isNaN(aNum) ? aVal : String(aNum)
        bVal = isNaN(bNum) ? bVal : String(bNum)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === 'asc' ? aNum - bNum : bNum - aNum
        }
      }

      if (direction === 'asc') {
        return aVal.localeCompare(bVal, 'zh-CN', { numeric: true })
      }
      return bVal.localeCompare(aVal, 'zh-CN', { numeric: true })
    })
  }, [currentDataset, sortConfig])

  const deleteDataset = (filename: string) => {
    setDatasets((prev) => {
      const next = new Map(prev)
      next.delete(filename)
      return next
    })
    if (activeDataset === filename) {
      setActiveDataset(null)
    }
  }

  return (
    <div className="data-panel">
      <div className="data-header">
        <h2>📊 数据探索</h2>
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? '上传中...' : '📁 上传 CSV'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
      </div>

      {error && <div className="error-message">⚠ {error}</div>}

      {isUploading && (
        <div className="upload-progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <span className="progress-text">{uploadProgress}%</span>
        </div>
      )}

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="drop-zone-content">
          <div className="drop-icon">📄</div>
          <p>拖拽 CSV 文件到此处</p>
          <p className="drop-hint">或点击上方按钮选择文件 (最大 5MB)</p>
        </div>
      </div>

      {datasets.size > 0 && (
        <div className="dataset-tabs">
          {Array.from(datasets.keys()).map((filename) => (
            <div
              key={filename}
              className={`dataset-tab ${activeDataset === filename ? 'active' : ''}`}
              onClick={() => setActiveDataset(filename)}
            >
              <span className="tab-name">{filename}</span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteDataset(filename)
                }}
                title="移除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {currentDataset && (
        <div className="data-table-container" ref={tableContainerRef}>
          <div className="table-info">
            <span>
              显示 {sortedRows.length} / {currentDataset.total_rows} 行
            </span>
            <span className="column-count">
              {currentDataset.columns.length} 列
            </span>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="row-index-header">#</th>
                  {currentDataset.columns.map((col, idx) => (
                    <th
                      key={col}
                      className={`sortable-column ${sortConfig?.column === col ? 'sorted' : ''}`}
                      onClick={() => handleSort(col)}
                    >
                      <div className="column-header-content">
                        <span className="column-name">{col}</span>
                        <span className={getColumnTypeClass(currentDataset.column_types[idx])}>
                          {getColumnTypeLabel(currentDataset.column_types[idx])}
                        </span>
                        <span className={`sort-arrow ${sortConfig?.column === col ? sortConfig.direction : ''}`}>
                          ↕
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'even' : 'odd'}>
                    <td className="row-index">{rowIdx + 1}</td>
                    {currentDataset.columns.map((col) => (
                      <td key={col}>{row[col] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!currentDataset && datasets.size === 0 && !isUploading && (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <p>暂无数据集</p>
          <p className="empty-hint">上传 CSV 文件开始探索数据</p>
        </div>
      )}
    </div>
  )
}

export default DataPanel
