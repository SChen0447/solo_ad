import GUI from 'lil-gui'

export interface ControlParams {
  terrainWidth: number
  terrainDepth: number
  terrainSegments: number
  noiseFrequency: number
  heightScale: number
  seed: number
  treeDensity: number
  houseCount: number
  lightIntensity: number
  lightX: number
  lightY: number
  lightZ: number
  autoTour: boolean
  randomSeed: () => void
}

export interface ControlCallbacks {
  onTerrainChange: () => void
  onDecorationsChange: () => void
  onLightChange: () => void
  onAutoTourToggle: (enabled: boolean) => void
  onRandomSeed: () => void
}

export function createControls(
  container: HTMLElement,
  params: ControlParams,
  callbacks: ControlCallbacks
): GUI {
  const gui = new GUI({
    container,
    title: '地形控制面板'
  })

  const terrainFolder = gui.addFolder('地形设置')
  terrainFolder.add(params, 'terrainWidth', 10, 50, 1).name('宽度').onChange(() => {
    callbacks.onTerrainChange()
  })
  terrainFolder.add(params, 'terrainDepth', 10, 50, 1).name('深度').onChange(() => {
    callbacks.onTerrainChange()
  })
  terrainFolder.add(params, 'terrainSegments', 32, 128, 2).name('分辨率').onChange(() => {
    callbacks.onTerrainChange()
  })
  terrainFolder.add(params, 'noiseFrequency', 0.5, 2.0, 0.01).name('噪声频率').onChange(() => {
    callbacks.onTerrainChange()
  })
  terrainFolder.add(params, 'heightScale', 1, 8, 0.1).name('高度缩放').onChange(() => {
    callbacks.onTerrainChange()
  })
  terrainFolder.add(params, 'seed', 0, 10000, 1).name('种子').onChange(() => {
    callbacks.onTerrainChange()
    callbacks.onDecorationsChange()
  })
  terrainFolder.add(params, 'randomSeed').name('随机种子')

  const decorationFolder = gui.addFolder('植被与建筑')
  decorationFolder.add(params, 'treeDensity', 0, 100, 1).name('植被密度(%)').onChange(() => {
    callbacks.onDecorationsChange()
  })
  decorationFolder.add(params, 'houseCount', 0, 10, 1).name('小屋数量').onChange(() => {
    callbacks.onDecorationsChange()
  })

  const lightFolder = gui.addFolder('光照设置')
  lightFolder.add(params, 'lightIntensity', 0.5, 2.0, 0.01).name('光照强度').onChange(() => {
    callbacks.onLightChange()
  })
  lightFolder.add(params, 'lightX', -20, 20, 0.1).name('光源X').onChange(() => {
    callbacks.onLightChange()
  })
  lightFolder.add(params, 'lightY', 5, 40, 0.1).name('光源Y').onChange(() => {
    callbacks.onLightChange()
  })
  lightFolder.add(params, 'lightZ', -20, 20, 0.1).name('光源Z').onChange(() => {
    callbacks.onLightChange()
  })

  const tourFolder = gui.addFolder('相机漫游')
  tourFolder.add(params, 'autoTour').name('自动漫游').onChange((value: boolean) => {
    callbacks.onAutoTourToggle(value)
  })

  return gui
}

export function setControlsEnabled(gui: GUI, enabled: boolean): void {
  gui.controllersRecursive().forEach((controller) => {
    if (enabled) {
      controller.enable()
    } else {
      controller.disable()
    }
  })
}
