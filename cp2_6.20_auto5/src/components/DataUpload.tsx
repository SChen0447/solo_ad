import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import type { ColumnInfo, DataRow } from '../App'

interface DataUploadProps {
  onDataParsed: (columns: ColumnInfo[], data: DataRow[]) => void
}

const detectColumnType = (values: string[]): 'number' | 'string' | 'date' => {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '')
  if (nonEmpty.length === 0) return 'string'

  const allNumbers = nonEmpty.every(v => !isNaN(Number(v)) && v.trim() !== '')
  if (allNumbers) return 'number'

  const allDates = nonEmpty.every(v => !isNaN(Date.parse(v)) && isNaN(Number(v)))
  if (allDates) return 'date'

  return 'string'
}

export default function DataUpload({ onDataParsed }: DataUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string>('')
  const [isAnimating, setIsAnimating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback((file: File) => {
    setFileName(file.name)
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as Record<string, string>[]
          if (rows.length > 0) {
            const columnNames = Object.keys(rows[0])
            const columns: ColumnInfo[] = columnNames.map(name => ({
              name,
              type: detectColumnType(rows.map(r => r[name])),
            }))
            const data: DataRow[] = rows.map(row => {
              const newRow: DataRow = {}
              columns.forEach(col => {
                const val = row[col.name]
                newRow[col.name] = col.type === 'number' ? Number(val) : val
              })
              return newRow
            })
            onDataParsed(columns, data)
          }
        },
      })
    } else if (extension === 'json') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string)
          const rows = Array.isArray(jsonData) ? jsonData : [jsonData]
          if (rows.length > 0) {
            const columnNames = Object.keys(rows[0])
            const columns: ColumnInfo[] = columnNames.map(name => ({
              name,
              type: detectColumnType(rows.map(r => String(r[name]))),
            }))
            const data: DataRow[] = rows.map(row => {
              const newRow: DataRow = {}
              columns.forEach(col => {
                const val = row[col.name]
                newRow[col.name] = col.type === 'number' ? Number(val) : String(val)
              })
              return newRow
            })
            onDataParsed(columns, data)
          }
        } catch (err) {
          console.error('JSON解析失败:', err)
        }
      }
      reader.readAsText(file)
    }
  }, [onDataParsed])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 200)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      parseFile(files[0])
    }
  }, [parseFile])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      parseFile(files[0])
    }
  }, [parseFile])

  return (
    <div style={{ padding: '16px' }}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: isDragging ? '2px dashed #4a90d9' : '2px dashed #d9d9d9',
          borderRadius: '12px',
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#e8f4fd' : '#fafafa',
          transition: 'all 0.2s ease',
          animation: isAnimating ? 'borderPulse 0.2s ease-in-out' : 'none',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
          拖拽 CSV 或 JSON 文件到这里
        </p>
        <p style={{ fontSize: '11px', color: '#999' }}>
          或点击选择文件
        </p>
        {fileName && (
          <p style={{ fontSize: '12px', color: '#4a90d9', marginTop: '8px', fontWeight: 500 }}>
            ✓ {fileName}
          </p>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
