import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { extractImageFeatures } from '../utils/imageProcessor'
import type { ComponentVersion } from '../types'

interface DesignUploaderProps {
  componentName: string
  onUploadComplete: (version: ComponentVersion) => void
}

const DesignUploader: React.FC<DesignUploaderProps> = ({ componentName, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('仅支持 PNG 和 JPG 格式的图片')
      return false
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB')
      return false
    }
    setError(null)
    return true
  }

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return
    if (!componentName || componentName.trim() === '') {
      setError('请先选择或创建一个组件')
      return
    }

    setIsProcessing(true)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    try {
      const version = await extractImageFeatures(file, componentName)
      onUploadComplete(version)
    } catch (err) {
      setError('上传处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="uploader-container">
      <motion.div
        className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileTap={{ scale: 0.99 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="upload-processing"
            >
              <div className="spinner" />
              <p>正在提取特征...</p>
              {previewUrl && (
                <img src={previewUrl} alt="preview" className="upload-preview-small" />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="upload-idle"
            >
              <div className="upload-icon">📤</div>
              <p className="upload-title">拖放设计稿到此处，或点击选择文件</p>
              <p className="upload-hint">支持 PNG / JPG，最大 5MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="upload-error"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DesignUploader
