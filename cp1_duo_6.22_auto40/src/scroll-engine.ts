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

const IO_THRESHOLDS: number[] = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]

export function useScrollEngine() {
  const progressMap = reactive<Map<string, ElementProgress>>(new Map())
  const activeSceneIndex = ref(0)
  const isScrolling = ref(false)

  let rafId: number | null = null
  let lastScrollY = 0
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null
  let registeredElements: { id: string; element: HTMLElement; sceneId: string; lastRatio: number }[] = []
  let registeredScenes: { id: string; element: HTMLElement; index: number }[] = []
  let intersectionObserver: IntersectionObserver | null = null
  let pendingElements: Set<string> = new Set()

  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value))
  }

  const calculateElementProgress = (element: HTMLElement): ElementProgress => {
    const rect = element.getBoundingClientRect()
    const windowHeight = window.innerHeight

    const elementTop = rect.top
    const elementBottom = rect.bottom
    const elementHeight = rect.height

    const visibleTop = Math.max(0, elementTop)
    const visibleBottom = Math.min(windowHeight, elementBottom)
    const visibleHeight = visibleBottom - visibleTop
    const visibility = clamp(visibleHeight / elementHeight, 0, 1)

    let progress = 0

    if (elementBottom <= 0) {
      progress = 1
    } else if (elementTop >= windowHeight) {
      progress = 0
    } else {
      const enterStart = windowHeight
      const enterEnd = windowHeight * 0.5
      const exitStart = windowHeight * 0.5
      const exitEnd = 0

      if (elementTop >= enterEnd) {
        const enterTotal = enterStart - enterEnd
        const elementEnterPoint = elementBottom
        const t = (enterStart - elementEnterPoint) / enterTotal
        progress = clamp(t, 0, 0.5)
      } else if (elementBottom <= exitStart) {
        const exitTotal = exitStart - exitEnd
        const elementExitPoint = elementTop
        const t = (exitStart - elementExitPoint) / exitTotal
        progress = clamp(0.5 + t * 0.5, 0.5, 1)
      } else {
        progress = 0.5
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
    if (lastScrollY === window.scrollY && pendingElements.size === 0 && rafId !== null) {
      rafId = requestAnimationFrame(updateProgress)
      return
    }

    lastScrollY = window.scrollY
    pendingElements.clear()

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

  const onIntersectionChange = (entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      const id = entry.target.id
      const elementData = registeredElements.find(e => e.id === id)
      if (elementData) {
        elementData.lastRatio = entry.intersectionRatio
        pendingElements.add(id)
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(updateProgress)
      }
    })
  }

  const createIntersectionObserver = () => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return
    }

    intersectionObserver = new IntersectionObserver(onIntersectionChange, {
      root: null,
      rootMargin: '0px',
      threshold: IO_THRESHOLDS
    })
  }

  const registerElement = (id: string, element: HTMLElement, sceneId: string) => {
    if (!registeredElements.find(e => e.id === id)) {
      registeredElements.push({ id, element, sceneId, lastRatio: 0 })
      progressMap.set(id, { id, progress: 0, visibility: 0, sceneProgress: 0 })

      if (intersectionObserver) {
        intersectionObserver.observe(element)
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(updateProgress)
      }
    }
  }

  const unregisterElement = (id: string) => {
    const elementData = registeredElements.find(e => e.id === id)
    if (elementData && intersectionObserver) {
      intersectionObserver.unobserve(elementData.element)
    }
    registeredElements = registeredElements.filter(e => e.id !== id)
    progressMap.delete(id)
  }

  const registerScene = (id: string, element: HTMLElement, index: number) => {
    if (!registeredScenes.find(s => s.id === id)) {
      registeredScenes.push({ id, element, index })
      registeredScenes.sort((a, b) => a.index - b.index)

      if (intersectionObserver) {
        intersectionObserver.observe(element)
      }
    }
  }

  const unregisterScene = (id: string) => {
    const sceneData = registeredScenes.find(s => s.id === id)
    if (sceneData && intersectionObserver) {
      intersectionObserver.unobserve(sceneData.element)
    }
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
    createIntersectionObserver()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    registeredElements.forEach(({ element }) => {
      if (intersectionObserver) {
        intersectionObserver.observe(element)
      }
    })
    registeredScenes.forEach(({ element }) => {
      if (intersectionObserver) {
        intersectionObserver.observe(element)
      }
    })

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
    if (intersectionObserver) {
      intersectionObserver.disconnect()
      intersectionObserver = null
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
