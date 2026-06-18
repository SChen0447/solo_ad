import { toPng } from 'html-to-image'

export const EXPORT_SIZE = 128
export const GRID_SIZE = 32

export async function exportGridAsPng(gridElement: HTMLElement): Promise<void> {
  try {
    const dataUrl = await toPng(gridElement, {
      width: EXPORT_SIZE,
      height: EXPORT_SIZE,
      style: {
        transform: 'scale(1)',
      },
      pixelRatio: EXPORT_SIZE / (GRID_SIZE * 24),
      cacheBust: true,
      backgroundColor: '#ffffff',
    })

    const link = document.createElement('a')
    link.download = 'grid-canvas.png'
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Failed to export image:', err)
    fallbackExport(gridElement)
  }
}

function fallbackExport(gridElement: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_SIZE
  canvas.height = EXPORT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)

  const cellSize = EXPORT_SIZE / GRID_SIZE
  const cells = gridElement.querySelectorAll<HTMLElement>('[data-cell]')

  cells.forEach((cell) => {
    const x = parseInt(cell.dataset.x || '0', 10)
    const y = parseInt(cell.dataset.y || '0', 10)
    const base = parseInt(cell.dataset.base || '0', 10)

    if (base === 1) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
    }
  })

  const link = document.createElement('a')
  link.download = 'grid-canvas.png'
  link.href = canvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
