import { AudioAnalyzer } from './audioAnalyzer'
import { SceneManager } from './sceneManager'
import { SpectrumVisualizer, ColorTheme } from './spectrumVisualizer'
import { ParticleSystem } from './particleSystem'

const colorThemes: ColorTheme[] = [
  { lowFrequency: 0xff3366, highFrequency: 0x33ffff },
  { lowFrequency: 0xffd700, highFrequency: 0xff4500 },
  { lowFrequency: 0x00ff7f, highFrequency: 0x1e90ff },
]

let currentThemeIndex = 0
let audioAnalyzer: AudioAnalyzer
let sceneManager: SceneManager
let spectrumVisualizer: SpectrumVisualizer
let particleSystem: ParticleSystem
let animationId: number
let isLoading = false

const app = document.getElementById('app')!

function createStyles(): void {
  const style = document.createElement('style')
  style.textContent = `
    .upload-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100;
      text-align: center;
      transition: opacity 0.3s ease-out;
    }
    .upload-container.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .upload-area {
      width: 320px;
      padding: 40px 20px;
      border: 2px dashed #FF6B6B;
      border-radius: 16px;
      background: rgba(30, 30, 30, 0.9);
      cursor: pointer;
      transition: all 0.2s ease-out;
    }
    .upload-area:hover,
    .upload-area.drag-over {
      border-color: #4ECDC4;
      background: rgba(30, 30, 30, 0.95);
      transform: scale(1.02);
      box-shadow: 0 0 30px rgba(78, 205, 196, 0.3);
    }
    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .upload-text {
      color: #fff;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .upload-hint {
      color: #888;
      font-size: 12px;
    }
    .file-input {
      display: none;
    }
    .upload-btn {
      margin-top: 20px;
      padding: 10px 24px;
      background: #1E1E1E;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease-out;
    }
    .upload-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 15px rgba(255, 107, 107, 0.4);
    }
    .loading-ring {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: #FF6B6B;
      border-right-color: #4ECDC4;
      animation: spin 1s linear infinite;
      z-index: 200;
      display: none;
    }
    .loading-ring.active {
      display: block;
    }
    @keyframes spin {
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }
    .control-panel {
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 220px;
      background: rgba(30, 30, 30, 0.9);
      border-radius: 12px;
      padding: 20px;
      z-index: 100;
      color: #fff;
      backdrop-filter: blur(10px);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease-out;
    }
    .control-panel.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .control-section {
      margin-bottom: 20px;
    }
    .control-section:last-child {
      margin-bottom: 0;
    }
    .control-label {
      font-size: 12px;
      color: #888;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .play-btn {
      width: 100%;
      padding: 12px;
      background: transparent;
      border: 2px solid #4ECDC4;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #4ECDC4;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease-out;
    }
    .play-btn:hover {
      transform: scale(1.02);
      box-shadow: 0 0 15px rgba(78, 205, 196, 0.4);
    }
    .play-btn.paused {
      border-color: #FF6B6B;
      color: #FF6B6B;
    }
    .play-btn.paused:hover {
      box-shadow: 0 0 15px rgba(255, 107, 107, 0.4);
    }
    .slider-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .slider {
      flex: 1;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #333;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: #4ECDC4;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s ease-out;
    }
    .slider::-webkit-slider-thumb:hover {
      transform: scale(1.3);
      box-shadow: 0 0 10px rgba(78, 205, 196, 0.6);
    }
    .slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: #4ECDC4;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }
    .slider-value {
      min-width: 36px;
      text-align: right;
      font-size: 12px;
      color: #888;
    }
    .theme-buttons {
      display: flex;
      gap: 8px;
    }
    .theme-btn {
      flex: 1;
      height: 32px;
      border-radius: 6px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease-out;
      position: relative;
    }
    .theme-btn:hover {
      transform: scale(1.05);
    }
    .theme-btn.active {
      border-color: #fff;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    .theme-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 4px;
      background: linear-gradient(90deg, var(--c1), var(--c2));
    }
    .now-playing {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #333;
      font-size: 12px;
      color: #888;
      text-align: center;
      word-break: break-all;
    }
    @media (max-width: 768px) {
      .control-panel {
        top: auto;
        bottom: 20px;
        right: 50%;
        transform: translateX(50%);
        width: calc(100% - 40px);
        max-width: 320px;
      }
      .upload-area {
        width: 280px;
      }
    }
  `
  document.head.appendChild(style)
}

function createUploadUI(): void {
  const container = document.createElement('div')
  container.className = 'upload-container'
  container.id = 'uploadContainer'

  const uploadArea = document.createElement('div')
  uploadArea.className = 'upload-area'
  uploadArea.id = 'uploadArea'

  const icon = document.createElement('div')
  icon.className = 'upload-icon'
  icon.textContent = '🎵'

  const text = document.createElement('div')
  text.className = 'upload-text'
  text.textContent = '拖放音频文件到这里'

  const hint = document.createElement('div')
  hint.className = 'upload-hint'
  hint.textContent = '支持 MP3、WAV 格式'

  const fileInput = document.createElement('input')
  fileInput.className = 'file-input'
  fileInput.id = 'fileInput'
  fileInput.type = 'file'
  fileInput.accept = 'audio/mp3,audio/wav,audio/mpeg,audio/*'

  const btn = document.createElement('button')
  btn.className = 'upload-btn'
  btn.textContent = '或点击选择文件'

  uploadArea.appendChild(icon)
  uploadArea.appendChild(text)
  uploadArea.appendChild(hint)
  uploadArea.appendChild(btn)

  container.appendChild(uploadArea)
  container.appendChild(fileInput)
  app.appendChild(container)

  uploadArea.addEventListener('click', () => fileInput.click())
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    fileInput.click()
  })
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
      handleFile(target.files[0])
    }
  })

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.classList.add('drag-over')
  })
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over')
  })
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.classList.remove('drag-over')
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('audio/')) {
        handleFile(file)
      }
    }
  })
}

function createLoadingRing(): void {
  const ring = document.createElement('div')
  ring.className = 'loading-ring'
  ring.id = 'loadingRing'
  app.appendChild(ring)
}

function createControlPanel(): void {
  const panel = document.createElement('div')
  panel.className = 'control-panel'
  panel.id = 'controlPanel'

  const playSection = document.createElement('div')
  playSection.className = 'control-section'
  const playLabel = document.createElement('div')
  playLabel.className = 'control-label'
  playLabel.textContent = '播放控制'
  const playBtn = document.createElement('button')
  playBtn.className = 'play-btn'
  playBtn.id = 'playBtn'
  playBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
    <span>暂停</span>
  `
  playSection.appendChild(playLabel)
  playSection.appendChild(playBtn)

  const volumeSection = document.createElement('div')
  volumeSection.className = 'control-section'
  const volumeLabel = document.createElement('div')
  volumeLabel.className = 'control-label'
  volumeLabel.textContent = '音量'
  const volumeContainer = document.createElement('div')
  volumeContainer.className = 'slider-container'
  const volumeSlider = document.createElement('input')
  volumeSlider.className = 'slider'
  volumeSlider.id = 'volumeSlider'
  volumeSlider.type = 'range'
  volumeSlider.min = '0'
  volumeSlider.max = '100'
  volumeSlider.value = '70'
  const volumeValue = document.createElement('span')
  volumeValue.className = 'slider-value'
  volumeValue.id = 'volumeValue'
  volumeValue.textContent = '70'
  volumeContainer.appendChild(volumeSlider)
  volumeContainer.appendChild(volumeValue)
  volumeSection.appendChild(volumeLabel)
  volumeSection.appendChild(volumeContainer)

  const particleSection = document.createElement('div')
  particleSection.className = 'control-section'
  const particleLabel = document.createElement('div')
  particleLabel.className = 'control-label'
  particleLabel.textContent = '粒子数量'
  const particleContainer = document.createElement('div')
  particleContainer.className = 'slider-container'
  const particleSlider = document.createElement('input')
  particleSlider.className = 'slider'
  particleSlider.id = 'particleSlider'
  particleSlider.type = 'range'
  particleSlider.min = '100'
  particleSlider.max = '1000'
  particleSlider.step = '100'
  particleSlider.value = '500'
  const particleValue = document.createElement('span')
  particleValue.className = 'slider-value'
  particleValue.id = 'particleValue'
  particleValue.textContent = '500'
  particleContainer.appendChild(particleSlider)
  particleContainer.appendChild(particleValue)
  particleSection.appendChild(particleLabel)
  particleSection.appendChild(particleContainer)

  const themeSection = document.createElement('div')
  themeSection.className = 'control-section'
  const themeLabel = document.createElement('div')
  themeLabel.className = 'control-label'
  themeLabel.textContent = '颜色主题'
  const themeButtons = document.createElement('div')
  themeButtons.className = 'theme-buttons'
  const themeColors = [
    ['#FF3366', '#33FFFF'],
    ['#FFD700', '#FF4500'],
    ['#00FF7F', '#1E90FF'],
  ]
  themeColors.forEach((colors, i) => {
    const btn = document.createElement('button')
    btn.className = 'theme-btn' + (i === 0 ? ' active' : '')
    btn.dataset.index = String(i)
    btn.style.setProperty('--c1', colors[0])
    btn.style.setProperty('--c2', colors[1])
    btn.addEventListener('click', () => handleThemeChange(i))
    themeButtons.appendChild(btn)
  })
  themeSection.appendChild(themeLabel)
  themeSection.appendChild(themeButtons)

  const nowPlaying = document.createElement('div')
  nowPlaying.className = 'now-playing'
  nowPlaying.id = 'nowPlaying'
  nowPlaying.textContent = ''

  panel.appendChild(playSection)
  panel.appendChild(volumeSection)
  panel.appendChild(particleSection)
  panel.appendChild(themeSection)
  panel.appendChild(nowPlaying)

  app.appendChild(panel)

  playBtn.addEventListener('click', handlePlayToggle)
  volumeSlider.addEventListener('input', (e) => {
    const value = Number((e.target as HTMLInputElement).value)
    volumeValue.textContent = String(value)
    if (audioAnalyzer) {
      audioAnalyzer.setVolume(value / 100)
    }
  })
  particleSlider.addEventListener('input', (e) => {
    const value = Number((e.target as HTMLInputElement).value)
    particleValue.textContent = String(value)
    if (particleSystem) {
      particleSystem.setParticleCount(value)
    }
  })
}

function handleThemeChange(index: number): void {
  currentThemeIndex = index
  const theme = colorThemes[index]
  spectrumVisualizer.setColorTheme(theme)

  document.querySelectorAll('.theme-btn').forEach((btn, i) => {
    if (i === index) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })
}

function handlePlayToggle(): void {
  if (!audioAnalyzer) return
  const isPlaying = audioAnalyzer.togglePlay()
  const playBtn = document.getElementById('playBtn')!
  const span = playBtn.querySelector('span')!
  if (isPlaying) {
    playBtn.classList.remove('paused')
    span.textContent = '暂停'
    playBtn.querySelector('svg')!.innerHTML = `
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    `
  } else {
    playBtn.classList.add('paused')
    span.textContent = '播放'
    playBtn.querySelector('svg')!.innerHTML = `
      <polygon points="5,3 19,12 5,21"/>
    `
  }
}

function showLoading(show: boolean): void {
  isLoading = show
  const ring = document.getElementById('loadingRing')
  if (ring) {
    ring.classList.toggle('active', show)
  }
}

async function handleFile(file: File): Promise<void> {
  if (isLoading) return
  showLoading(true)

  try {
    if (!sceneManager) {
      initScene()
    }

    await audioAnalyzer.loadAudioFile(file)

    document.getElementById('uploadContainer')?.classList.add('hidden')
    document.getElementById('controlPanel')?.classList.add('visible')

    const nowPlaying = document.getElementById('nowPlaying')
    if (nowPlaying) {
      nowPlaying.textContent = `正在播放: ${file.name}`
    }

    const playBtn = document.getElementById('playBtn')!
    playBtn.classList.remove('paused')
    playBtn.querySelector('span')!.textContent = '暂停'
    playBtn.querySelector('svg')!.innerHTML = `
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    `
  } catch (err) {
    console.error('Error loading audio:', err)
    alert('音频加载失败，请尝试其他文件')
  } finally {
    showLoading(false)
  }
}

function initScene(): void {
  audioAnalyzer = new AudioAnalyzer()
  sceneManager = new SceneManager(app)
  spectrumVisualizer = new SpectrumVisualizer(sceneManager.scene)
  particleSystem = new ParticleSystem(sceneManager.scene, 500)

  const radius = sceneManager.getResponsiveRadius()
  spectrumVisualizer.setArrangementRadius(radius)

  window.addEventListener('resize', () => {
    const newRadius = sceneManager.getResponsiveRadius()
    if (spectrumVisualizer && spectrumVisualizer.getArrangementRadius() !== newRadius) {
      spectrumVisualizer.setArrangementRadius(newRadius)
    }
  })

  startAnimationLoop()
}

function startAnimationLoop(): void {
  let lastFrameTime = 0
  const frameInterval = 1000 / 30

  function animate(time: number): void {
    animationId = requestAnimationFrame(animate)

    const delta = time - lastFrameTime
    if (delta < frameInterval) return
    lastFrameTime = time - (delta % frameInterval)

    let frequencyData = new Uint8Array(128)
    let amplitude = 0

    if (audioAnalyzer && audioAnalyzer.isPlaying()) {
      frequencyData = audioAnalyzer.getFrequencyData()
      amplitude = audioAnalyzer.getAverageAmplitude()
    }

    if (spectrumVisualizer) {
      spectrumVisualizer.update(frequencyData, time)
    }
    if (particleSystem) {
      particleSystem.update(time, amplitude)
    }
    if (sceneManager) {
      sceneManager.updateLights(amplitude)
      sceneManager.render(time)
    }
  }

  animate(0)
}

function init(): void {
  createStyles()
  createUploadUI()
  createLoadingRing()
  createControlPanel()
}

init()

window.addEventListener('beforeunload', () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (audioAnalyzer) {
    audioAnalyzer.dispose()
  }
  if (sceneManager) {
    sceneManager.dispose()
  }
  if (spectrumVisualizer) {
    spectrumVisualizer.dispose()
  }
  if (particleSystem) {
    particleSystem.dispose()
  }
})
