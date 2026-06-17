import { memo } from 'react'
import type { ImageItem } from './types'

interface GalleryProps {
  images: ImageItem[]
  onImageClick: (index: number) => void
}

function truncateFileName(name: string): string {
  const dotIndex = name.indexOf('.')
  const baseName = dotIndex !== -1 ? name.slice(0, dotIndex) : name
  if (baseName.length <= 20) {
    return baseName
  }
  return baseName.slice(0, 19) + '…'
}

const Gallery = memo(function Gallery({ images, onImageClick }: GalleryProps) {
  return (
    <div className="gallery">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="gallery-card"
          onClick={() => onImageClick(index)}
        >
          <div className="gallery-card-image-wrapper">
            <img
              src={image.url}
              alt={image.name}
              className="gallery-card-image"
              loading="lazy"
            />
          </div>
          <p className="gallery-card-filename">
            {truncateFileName(image.name)}
          </p>
        </div>
      ))}
    </div>
  )
})

export default Gallery
