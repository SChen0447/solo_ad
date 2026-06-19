import { useState, useRef, useCallback } from 'react'
import type { Landmark, TravelImage } from '../data/DataManager'

interface Props {
  landmark: Landmark | null
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Landmark>) => void
  onDelete: (id: string) => void
  onAddImages: (id: string, files: FileList) => void
  onRemoveImage: (landmarkId: string, imageId: string) => void
}

function ImagePreview({
  images,
  startIndex,
  onClose,
}: {
  images: TravelImage[]
  startIndex: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length)
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length)
  }, [images.length])

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
        <button className="preview-close" onClick={onClose}>×</button>
        {images.length > 1 && (
          <>
            <button className="preview-arrow preview-prev" onClick={handlePrev}>
              ‹
            </button>
            <button className="preview-arrow preview-next" onClick={handleNext}>
              ›
            </button>
          </>
        )}
        <img
          src={images[currentIndex].dataUrl}
          alt={images[currentIndex].title}
          className="preview-image"
        />
        <div className="preview-title">{images[currentIndex].title}</div>
      </div>
    </div>
  )
}

function SidePanel({
  landmark,
  onClose,
  onUpdate,
  onDelete,
  onAddImages,
  onRemoveImage,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewImage, setPreviewImage] = useState<{ images: TravelImage[]; index: number } | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (landmark && e.target.files && e.target.files.length > 0) {
      onAddImages(landmark.id, e.target.files)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [landmark, onAddImages])

  const handleImageClick = useCallback((index: number) => {
    if (landmark) {
      setPreviewImage({ images: landmark.images, index })
    }
  }, [landmark])

  if (!landmark) {
    return (
      <div className={`side-panel-overlay ${landmark ? 'visible' : ''}`}>
        <div className={`side-panel ${landmark ? 'open' : ''}`}>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`side-panel-overlay ${landmark ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`side-panel ${landmark ? 'open' : ''}`}>
        <div className="panel-header">
          <h2>编辑地标</h2>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-body">
          <div className="form-group">
            <label>城市名称</label>
            <input
              type="text"
              value={landmark.cityName}
              onChange={(e) => onUpdate(landmark.id, { cityName: e.target.value })}
              className="form-input"
              placeholder="输入城市名称"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>到达日期</label>
              <input
                type="date"
                value={landmark.arrivalDate}
                onChange={(e) => onUpdate(landmark.id, { arrivalDate: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>停留天数</label>
              <input
                type="number"
                min={0}
                value={landmark.stayDays}
                onChange={(e) => onUpdate(landmark.id, { stayDays: Math.max(0, parseInt(e.target.value) || 0) })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              旅行照片 ({landmark.images.length}/5)
            </label>
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={handleFileChange}
                className="file-input"
                id="image-upload"
                disabled={landmark.images.length >= 5}
              />
              <label htmlFor="image-upload" className="upload-btn">
                + 上传图片
              </label>
            </div>
            {landmark.images.length > 0 && (
              <div className="image-grid">
                {landmark.images.map((img, idx) => (
                  <div key={img.id} className="image-item">
                    <img
                      src={img.dataUrl}
                      alt={img.title}
                      onClick={() => handleImageClick(idx)}
                    />
                    <div className="image-title">{img.title}</div>
                    <button
                      className="image-remove"
                      onClick={() => onRemoveImage(landmark.id, img.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>旅行笔记</label>
            <textarea
              value={landmark.notes}
              onChange={(e) => onUpdate(landmark.id, { notes: e.target.value })}
              className="form-textarea"
              placeholder="记录这段旅行的回忆... ✈️ 🏖️ 🏔️"
              rows={6}
            />
          </div>
        </div>

        <div className="panel-footer">
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm('确定删除这个地标吗？')) {
                onDelete(landmark.id)
              }
            }}
          >
            删除地标
          </button>
        </div>
      </div>

      {previewImage && (
        <ImagePreview
          images={previewImage.images}
          startIndex={previewImage.index}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  )
}

export default SidePanel
