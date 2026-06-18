import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ProcessedImage } from '../engine/types'

export async function downloadAllAsZip(processedImages: ProcessedImage[]): Promise<void> {
  const zip = new JSZip()

  processedImages.forEach((img, index) => {
    const ext = img.fileName.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
    const baseName = img.fileName.replace(/\.[^/.]+$/, '')
    const fileName = `${baseName}_processed_${index + 1}.${ext}`
    zip.file(fileName, img.processedBlob)
  })

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const timestamp = new Date().toISOString().slice(0, 10)
  saveAs(content, `processed_images_${timestamp}.zip`)
}
