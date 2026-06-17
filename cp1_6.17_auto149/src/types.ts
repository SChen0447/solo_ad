export type ComponentType = 'button' | 'navbar' | 'card' | 'modal' | 'carousel' | 'form'

export type Breakpoint = '1200' | '768' | '480' | '320'

export type AnimationType = 'fadeIn' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'rotate' | 'scale' | 'none'

export type EasingType = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'

export interface ComponentStyle {
  width: number
  height: number
  backgroundColor: string
  borderWidth: number
  borderColor: string
  borderRadius: number
  boxShadow: string
}

export interface ComponentAnimation {
  type: AnimationType
  duration: number
  delay: number
  easing: EasingType
}

export interface GridPosition {
  x: number
  y: number
  colSpan: number
}

export interface CanvasComponent {
  id: string
  type: ComponentType
  style: ComponentStyle
  animation: ComponentAnimation
  zIndex: number
  position: { x: number; y: number }
  gridPositions: Record<Breakpoint, GridPosition>
  className: string
}

export interface PresetComponent {
  type: ComponentType
  name: string
  icon: string
}

export const DEFAULT_STYLE: ComponentStyle = {
  width: 200,
  height: 60,
  backgroundColor: '#7C4DFF',
  borderWidth: 0,
  borderColor: '#000000',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
}

export const DEFAULT_ANIMATION: ComponentAnimation = {
  type: 'none',
  duration: 1,
  delay: 0,
  easing: 'ease-out',
}

export const BREAKPOINTS: { value: Breakpoint; label: string; width: number }[] = [
  { value: '1200', label: '桌面', width: 1200 },
  { value: '768', label: '平板', width: 768 },
  { value: '480', label: '手机', width: 480 },
  { value: '320', label: '小屏', width: 320 },
]

export const ANIMATION_TYPES: { value: AnimationType; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'fadeIn', label: '淡入' },
  { value: 'slideLeft', label: '左滑入' },
  { value: 'slideRight', label: '右滑入' },
  { value: 'slideUp', label: '上滑入' },
  { value: 'slideDown', label: '下滑入' },
  { value: 'rotate', label: '旋转' },
  { value: 'scale', label: '缩放' },
]

export const EASING_TYPES: { value: EasingType; label: string }[] = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
]
