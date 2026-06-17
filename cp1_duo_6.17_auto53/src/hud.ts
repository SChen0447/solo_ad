import { formatTime } from './gameLoop'

export interface HUDState {
  speedElement: HTMLElement
  lapElement: HTMLElement
  ringValueElement: HTMLElement
  ringProgressElement: HTMLElement
  timerElement: HTMLElement
  warningFlashElement: HTMLElement
  totalRings: number
  currentLap: number
  totalLaps: number
}

export function createHUD(totalRings: number): HUDState {
  const speedElement = document.getElementById('speed-value')!
  const lapElement = document.getElementById('lap-value')!
  const ringValueElement = document.getElementById('ring-value')!
  const ringProgressElement = document.getElementById('ring-progress')!
  const timerElement = document.getElementById('timer-value')!
  const warningFlashElement = document.getElementById('warning-flash')!

  updateLapDisplay(lapElement, 1, 1)
  updateRingDisplay(ringValueElement, ringProgressElement, 0, totalRings)
  updateTimerDisplay(timerElement, 0)

  return {
    speedElement,
    lapElement,
    ringValueElement,
    ringProgressElement,
    timerElement,
    warningFlashElement,
    totalRings,
    currentLap: 1,
    totalLaps: 1
  }
}

export function updateSpeedDisplay(
  element: HTMLElement,
  speedKmh: number
): void {
  element.textContent = `${speedKmh} KM/H`
}

export function updateLapDisplay(
  element: HTMLElement,
  current: number,
  total: number
): void {
  element.textContent = `${current} / ${total}`
}

export function updateRingDisplay(
  valueElement: HTMLElement,
  progressElement: HTMLElement,
  collected: number,
  total: number
): void {
  valueElement.textContent = `${collected} / ${total}`
  const percentage = total > 0 ? (collected / total) * 100 : 0
  progressElement.style.width = `${percentage}%`
}

export function updateTimerDisplay(
  element: HTMLElement,
  elapsedMs: number
): void {
  element.textContent = formatTime(elapsedMs)
}

export function triggerWarningFlash(
  element: HTMLElement,
  duration: number = 500
): void {
  element.classList.add('active')
  setTimeout(() => {
    element.classList.remove('active')
  }, duration)
}

export function showHUD(): void {
  const hud = document.getElementById('hud')
  if (hud) {
    hud.classList.add('visible')
  }
}

export function hideHUD(): void {
  const hud = document.getElementById('hud')
  if (hud) {
    hud.classList.remove('visible')
  }
}
