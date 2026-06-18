import { ref, shallowRef } from 'vue'

export function useCanvas() {
  const scale = ref(1)
  const offsetX = ref(0)
  const offsetY = ref(0)
  const isPanning = ref(false)
  const isSpaceDown = ref(false)
  const panStartX = ref(0)
  const panStartY = ref(0)
  const panOffsetStartX = ref(0)
  const panOffsetStartY = ref(0)
  const animFrameId = shallowRef<number | null>(null)

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.min(3, Math.max(0.5, scale.value + delta))
    scale.value = Math.round(newScale * 100) / 100
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault()
      isSpaceDown.value = true
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      isSpaceDown.value = false
      isPanning.value = false
    }
  }

  function startPan(e: MouseEvent) {
    if (!isSpaceDown.value) return
    isPanning.value = true
    panStartX.value = e.clientX
    panStartY.value = e.clientY
    panOffsetStartX.value = offsetX.value
    panOffsetStartY.value = offsetY.value
  }

  function movePan(e: MouseEvent) {
    if (!isPanning.value) return
    const dx = e.clientX - panStartX.value
    const dy = e.clientY - panStartY.value
    offsetX.value = panOffsetStartX.value + dx
    offsetY.value = panOffsetStartY.value + dy
  }

  function endPan() {
    isPanning.value = false
  }

  function resetView() {
    scale.value = 1
    offsetX.value = 0
    offsetY.value = 0
  }

  function screenToCanvas(
    clientX: number,
    clientY: number,
    containerEl: HTMLElement
  ): { x: number; y: number } {
    const rect = containerEl.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    const x = (cx - offsetX.value) / scale.value
    const y = (cy - offsetY.value) / scale.value
    return { x, y }
  }

  function canvasToScreen(
    canvasX: number,
    canvasY: number,
    containerEl: HTMLElement
  ): { x: number; y: number } {
    const rect = containerEl.getBoundingClientRect()
    const x = canvasX * scale.value + offsetX.value + rect.left
    const y = canvasY * scale.value + offsetY.value + rect.top
    return { x, y }
  }

  function scheduleRender(callback: () => void) {
    if (animFrameId.value !== null) {
      cancelAnimationFrame(animFrameId.value)
    }
    animFrameId.value = requestAnimationFrame(() => {
      callback()
      animFrameId.value = null
    })
  }

  return {
    scale,
    offsetX,
    offsetY,
    isPanning,
    isSpaceDown,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    startPan,
    movePan,
    endPan,
    resetView,
    screenToCanvas,
    canvasToScreen,
    scheduleRender,
  }
}
