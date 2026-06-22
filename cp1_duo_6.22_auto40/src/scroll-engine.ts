import { ref, reactive, onMounted, onUnmounted, provide, InjectionKey } from 'vue'

export interface ElementProgress {
  id: string
  progress: number
  visibility: number
  sceneProgress: number
}

export interface SceneData {
  id: string
  index: number
  title: string
  colorStart: string
  colorEnd: string
}

export const progressKey: InjectionKey<ReturnType<typeof useScrollEngine>> = Symbol('scroll-progress')

export function useScrollEngine() {
  const progressMap = reactive<Map<string, ElementProgress>>(new Map())
  const activeSceneIndex = ref(0)
  const isScrolling = ref(false)

  let rafId: number | null = null
  let lastScrollY = 0
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null
  let registeredElements: { id: string; element: HTMLElement; sceneId: string }[] = []
  let registeredScenes: { id: string; element: HTMLElement; index: number }[] = []

  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value))
  }

  const calculateElementProgress = (element: HTMLElement): ElementProgress => {
    const rect = element.getBoundingClientRect()
    const windowHeight = window.innerHeight

    const elementTop = rect.top
    const elementBottom = rect.bottom
    const elementHeight = rect.height

    let visibility = 0
    let progress = 0

    if (elementBottom < 0 || elementTop > windowHeight) {
      visibility = 0
      progress = elementTop > windowHeight ? 0 : 1
    } else {
      const visibleTop = Math.max(0, elementTop)
      const visibleBottom = Math.min(windowHeight, elementBottom)
      const visibleHeight = visibleBottom - visibleTop
      visibility = clamp(visibleHeight / elementHeight, 0, 1)

      const enterPoint = windowHeight * 0.8
      const centerPoint = windowHeight * 0.5
      const exitPoint = windowHeight * 0.2

      if (elementBottom > enterPoint && elementTop < enterPoint) {
        const enterProgress = (enterPoint - elementBottom) / (elementHeight * 0.3)
        progress = clamp(enterProgress, 0, 0.5)
      } else if (elementTop <= centerPoint && elementBottom >= centerPoint) {
        progress = 0.5 + clamp((centerPoint - elementTop) / elementHeight, 0, 0.5) * 0.1
        progress = clamp(progress, 0.5, 0.6)
      } else if (elementTop < exitPoint && elementBottom > exitPoint) {
        const exitProgress = (exitPoint - elementTop) / (elementHeight * 0.3)
        progress = 0.6 + clamp(exitProgress, 0, 1) * 0.4
      } else if (elementBottom <= enterPoint && elementTop >= exitPoint) {
        const centerProgress = (enterPoint - elementBottom) / (enterPoint - exitPoint)
        progress = 0.5 + clamp(centerProgress, 0, 1) * 0.1
      } else if (elementBottom < exitPoint) {
        progress = 1
      } else {
        progress = 0
      }
    }

    const sceneProgress = calculateSceneProgress(element)

    return {
      id: element.id,
      progress: clamp(progress, 0, 1),
      visibility,
      sceneProgress
    }
  }

  const calculateSceneProgress = (element: HTMLElement): number => {
    const rect = element.getBoundingClientRect()
    const windowHeight = window.innerHeight
    const elementHeight = rect.height

    const totalScroll = elementHeight + windowHeight
    const scrolled = windowHeight - rect.top
    const progress = clamp(scrolled / totalScroll, 0, 1)

    return progress
  }

  const calculateActiveScene = (): number => {
    const scrollY = window.scrollY
    const windowHeight = window.innerHeight
    let activeIndex = 0

    for (let i = registeredScenes.length - 1; i >= 0; i--) {
      const scene = registeredScenes[i]
      const rect = scene.element.getBoundingClientRect()
      if (rect.top <= windowHeight * 0.5) {
        activeIndex = i
        break
      }
    }

    return activeIndex
  }

  const updateProgress = () => {
    if (lastScrollY === window.scrollY && rafId !== null) {
      rafId = requestAnimationFrame(updateProgress)
      return
    }

    lastScrollY = window.scrollY

    registeredElements.forEach(({ id, element }) => {
      const progress = calculateElementProgress(element)
      progressMap.set(id, progress)
    })

    activeSceneIndex.value = calculateActiveScene()

    isScrolling.value = true
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    scrollTimeout = setTimeout(() => {
      isScrolling.value = false
    }, 500)

    rafId = requestAnimationFrame(updateProgress)
  }

  const registerElement = (id: string, element: HTMLElement, sceneId: string) => {
    if (!registeredElements.find(e => e.id === id)) {
      registeredElements.push({ id, element, sceneId })
      progressMap.set(id, { id, progress: 0, visibility: 0, sceneProgress: 0 })
    }
  }

  const unregisterElement = (id: string) => {
    registeredElements = registeredElements.filter(e => e.id !== id)
    progressMap.delete(id)
  }

  const registerScene = (id: string, element: HTMLElement, index: number) => {
    if (!registeredScenes.find(s => s.id === id)) {
      registeredScenes.push({ id, element, index })
      registeredScenes.sort((a, b) => a.index - b.index)
    }
  }

  const unregisterScene = (id: string) => {
    registeredScenes = registeredScenes.filter(s => s.id !== id)
  }

  const getProgress = (id: string): ElementProgress | undefined => {
    return progressMap.get(id)
  }

  const scrollToScene = (index: number) => {
    const scene = registeredScenes.find(s => s.index === index)
    if (scene) {
      scene.element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleScroll = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(updateProgress)
    }
  }

  const startListening = () => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    handleScroll()
  }

  const stopListening = () => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', handleScroll)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
  }

  const provideEngine = () => {
    provide(progressKey, {
      progressMap,
      activeSceneIndex,
      isScrolling,
      registerElement,
      unregisterElement,
      registerScene,
      unregisterScene,
      getProgress,
      scrollToScene,
      startListening,
      stopListening
    })
  }

  onMounted(() => {
    startListening()
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    progressMap,
    activeSceneIndex,
    isScrolling,
    registerElement,
    unregisterElement,
    registerScene,
    unregisterScene,
    getProgress,
    scrollToScene,
    startListening,
    stopListening,
    provideEngine
  }
}

export type ScrollEngine = ReturnType<typeof useScrollEngine>
