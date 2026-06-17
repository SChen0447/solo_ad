import {
  setupScene,
  resizeRenderer,
  type SceneSetupResult
} from './sceneSetup'
import { createCamera, resizeCamera, type CameraState } from './cameraControl'
import {
  createGameLoopState,
  createPlayerPhysicsState,
  createInputState,
  gameLoopStep,
  formatTime,
  type GameLoopState,
  type PlayerPhysicsState,
  type InputState,
  type GameCallbacks
} from './gameLoop'
import {
  setupKeyboardInput,
  collectRingEffect,
  collisionFlashEffect,
  updateVehicleOrientation
} from './playerController'
import {
  createHUD,
  updateSpeedDisplay,
  updateRingDisplay,
  updateTimerDisplay,
  triggerWarningFlash,
  showHUD,
  type HUDState
} from './hud'
import { createMinimap, updateMinimap, type MinimapState } from './minimap'
import {
  createUIControls,
  hideStartScreen,
  showFinishScreen,
  hideFinishScreen,
  fetchLeaderboard,
  submitRecord,
  saveLocalRecord,
  type UIControls,
  type LeaderboardRecord
} from './ui'

interface GameState {
  sceneSetup: SceneSetupResult | null
  cameraState: CameraState | null
  loopState: GameLoopState
  physicsState: PlayerPhysicsState | null
  inputState: InputState
  hudState: HUDState | null
  minimapState: MinimapState | null
  uiControls: UIControls
  cleanupFns: Array<() => void>
  hasFinished: { value: boolean }
  animationFrameId: number | null
}

const game: GameState = {
  sceneSetup: null,
  cameraState: null,
  loopState: createGameLoopState(),
  physicsState: null,
  inputState: createInputState(),
  hudState: null,
  minimapState: null,
  uiControls: createUIControls(),
  cleanupFns: [],
  hasFinished: { value: false },
  animationFrameId: null
}

function initializeScene(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  const width = window.innerWidth
  const height = window.innerHeight

  game.sceneSetup = setupScene(canvas, width, height)

  game.cameraState = createCamera(
    width,
    height,
    game.sceneSetup.startPosition
  )

  game.physicsState = createPlayerPhysicsState(
    game.sceneSetup.startPosition
  )

  const totalRings = game.sceneSetup.rings.length
  game.hudState = createHUD(totalRings)

  game.minimapState = createMinimap('minimap', game.sceneSetup.islands)
}

function createCallbacks(): GameCallbacks {
  return {
    onSpeedChange: (speed: number) => {
      if (game.hudState) {
        updateSpeedDisplay(game.hudState.speedElement, speed)
      }
    },
    onRingCollected: (collected: number, total: number) => {
      if (game.hudState && game.sceneSetup) {
        updateRingDisplay(
          game.hudState.ringValueElement,
          game.hudState.ringProgressElement,
          collected,
          total
        )
        const lastCollected = game.sceneSetup.rings
          .filter(r => r.collected)
          .pop()
        if (lastCollected) {
          collectRingEffect(
            game.sceneSetup.vehicle,
            game.sceneSetup.scene,
            lastCollected.position
          )
        }
      }
    },
    onCollision: () => {
      if (game.hudState && game.sceneSetup) {
        triggerWarningFlash(game.hudState.warningFlashElement, 500)
        collisionFlashEffect(game.sceneSetup.bodyMeshes, 500)
      }
    },
    onLapComplete: () => {},
    onFinish: async (time: number) => {
      handleFinish(time)
    },
    onTimerUpdate: (time: number) => {
      if (game.hudState) {
        updateTimerDisplay(game.hudState.timerElement, time)
      }
    }
  }
}

async function handleFinish(timeMs: number): Promise<void> {
  const formattedTime = formatTime(timeMs)
  console.log(`🏁 完赛！用时: ${formattedTime}`)

  if (game.hudState) {
    updateTimerDisplay(game.hudState.timerElement, timeMs)
  }

  const submitResult = await submitRecord(timeMs)

  let localRecords = saveLocalRecord(timeMs)

  let leaderboard: LeaderboardRecord[]
  if (submitResult && submitResult.success) {
    const serverLeaderboard = await fetchLeaderboard()
    leaderboard = serverLeaderboard.length > 0 ? serverLeaderboard : localRecords.slice(0, 3)
  } else {
    leaderboard = localRecords.slice(0, 3)
  }

  showFinishScreen(game.uiControls, timeMs, leaderboard)
}

function startGame(): void {
  if (!game.sceneSetup || !game.cameraState || !game.physicsState || !game.minimapState) {
    console.error('游戏未初始化')
    return
  }

  game.hasFinished.value = false
  game.loopState.running = true
  game.loopState.paused = false
  game.loopState.startTime = performance.now()
  game.loopState.lastFrameTime = performance.now()
  game.loopState.elapsedTime = 0

  game.physicsState.position.copy(game.sceneSetup.startPosition)
  game.physicsState.velocity.set(0, 0, 0)
  game.physicsState.forward.set(0, 0, -1)
  game.physicsState.up.set(0, 1, 0)
  game.physicsState.right.set(1, 0, 0)
  game.physicsState.speed = 0
  game.physicsState.boostMultiplier = 1.0
  game.physicsState.isColliding = false
  game.physicsState.isFlashing = false

  for (const ring of game.sceneSetup.rings) {
    ring.collected = false
    ring.mesh.visible = true
    ;(ring.mesh as any).userData.collected = false
  }

  if (game.hudState) {
    updateSpeedDisplay(game.hudState.speedElement, 0)
    updateRingDisplay(
      game.hudState.ringValueElement,
      game.hudState.ringProgressElement,
      0,
      game.hudState.totalRings
    )
    updateTimerDisplay(game.hudState.timerElement, 0)
  }

  hideStartScreen(game.uiControls)
  hideFinishScreen(game.uiControls)
  showHUD()

  const callbacks = createCallbacks()
  runGameLoop(callbacks)
}

function runGameLoop(callbacks: GameCallbacks): void {
  const tick = (): void => {
    if (!game.loopState.running) {
      game.animationFrameId = null
      return
    }

    game.animationFrameId = requestAnimationFrame(tick)

    if (!game.sceneSetup || !game.cameraState || !game.physicsState) {
      return
    }

    const now = performance.now()
    const deltaTime = Math.min(
      (now - game.loopState.lastFrameTime) / 1000,
      0.05
    )

    updateVehicleOrientation(
      game.sceneSetup.vehicle,
      game.physicsState,
      game.inputState,
      deltaTime
    )

    gameLoopStep(
      game.loopState,
      game.physicsState,
      game.inputState,
      game.cameraState,
      game.sceneSetup.renderer,
      game.sceneSetup.scene,
      game.sceneSetup.islands,
      game.sceneSetup.rings,
      game.sceneSetup.vehicle,
      callbacks,
      game.hasFinished
    )

    if (game.minimapState && game.physicsState) {
      updateMinimap(
        game.minimapState,
        game.physicsState.position,
        game.physicsState.forward
      )
    }
  }

  game.animationFrameId = requestAnimationFrame(tick)
}

function handleResize(): void {
  const width = window.innerWidth
  const height = window.innerHeight

  if (game.sceneSetup) {
    resizeRenderer(game.sceneSetup.renderer, width, height)
  }
  if (game.cameraState) {
    resizeCamera(game.cameraState, width, height)
  }
}

function setupEventListeners(): void {
  const cleanupKeyboard = setupKeyboardInput(game.inputState)
  game.cleanupFns.push(cleanupKeyboard)

  window.addEventListener('resize', handleResize)
  game.cleanupFns.push(() => {
    window.removeEventListener('resize', handleResize)
  })

  game.uiControls.startBtn.addEventListener('click', startGame)
  game.cleanupFns.push(() => {
    game.uiControls.startBtn.removeEventListener('click', startGame)
  })

  game.uiControls.restartBtn.addEventListener('click', () => {
    hideFinishScreen(game.uiControls)
    startGame()
  })
  game.cleanupFns.push(() => {
    game.uiControls.restartBtn.removeEventListener('click', startGame)
  })
}

function preloadLeaderboard(): void {
  fetchLeaderboard().catch(() => {})
}

function main(): void {
  console.log('🚀 云岛飞行竞速 - 初始化中...')

  try {
    initializeScene()
    setupEventListeners()
    preloadLeaderboard()

    console.log('✅ 游戏初始化完成，点击"开始游戏"按钮开始！')
    console.log('🎮 控制方式:')
    console.log('   W / ↑ - 前进加速')
    console.log('   S / ↓ - 减速')
    console.log('   A / ← - 左转')
    console.log('   D / → - 右转')
    console.log('   空格 - 抬升')
    console.log('   Shift - 下降')
  } catch (error) {
    console.error('❌ 游戏初始化失败:', error)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main()
}
