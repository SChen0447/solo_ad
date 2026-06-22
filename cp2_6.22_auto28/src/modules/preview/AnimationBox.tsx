import styled, { keyframes, css } from 'styled-components'
import { memo, useMemo } from 'react'
import type { AnimationConfig, AnimationInstance } from '@/types/animation'
import { ANIMATION_TYPE_LABELS } from '@/types/animation'
import { formatEasing } from '@/utils/cssExporter'

const kfTranslate = keyframes`
  0%   { transform: translateX(0); }
  50%  { transform: translateX(60px); }
  100% { transform: translateX(0); }
`

const kfRotate = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`

const kfScale = keyframes`
  0%   { transform: scale(1); }
  50%  { transform: scale(1.5); }
  100% { transform: scale(1); }
`

const kfColor = keyframes`
  0%   { background-color: #8B5CF6; }
  50%  { background-color: #3B82F6; }
  100% { background-color: #8B5CF6; }
`

const kfBounce = keyframes`
  0%   { transform: translateY(0); }
  30%  { transform: translateY(-50px); }
  50%  { transform: translateY(0); }
  70%  { transform: translateY(-25px); }
  100% { transform: translateY(0); }
`

const getKeyframes = (type: string) => {
  switch (type) {
    case 'translate': return kfTranslate
    case 'rotate': return kfRotate
    case 'scale': return kfScale
    case 'color': return kfColor
    case 'bounce': return kfBounce
    default: return kfTranslate
  }
}

const InstanceWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`

const AnimationStage = styled.div`
  width: 200px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-stage, #FFFFFF);
  border-radius: 12px;
  border: 1px solid var(--border-color, #E5E7EB);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
`

const GridBg = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-color, #F3F4F6) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-color, #F3F4F6) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
`

interface AnimBoxProps {
  $config: AnimationConfig
  $isPlaying: boolean
  $currentTime: number
  $playKey: number
  $seekKey: number
}

const AnimatedBox = styled.div<AnimBoxProps>`
  --box-size: 120px;

  width: var(--box-size);
  height: var(--box-size);
  min-width: var(--box-size);
  min-height: var(--box-size);
  max-width: var(--box-size);
  max-height: var(--box-size);
  box-sizing: border-box;
  padding: 0;
  border: none;
  margin: 0;
  border-radius: 16px;
  background: ${({ $config }) =>
    $config.type === 'color' ? '#8B5CF6' : 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)'};
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
  will-change: transform, background-color;

  ${({ $config, $isPlaying, $currentTime, $seekKey }) => {
    const kf = getKeyframes($config.type)
    const easing = formatEasing($config)
    const seekDelay = $config.delay > $currentTime
      ? $config.delay - $currentTime
      : -($currentTime - $config.delay)

    return css`
      animation-name: ${kf};
      animation-duration: ${$config.duration}s;
      animation-timing-function: ${easing};
      animation-delay: ${seekDelay}s;
      animation-iteration-count: infinite;
      animation-play-state: ${$isPlaying ? 'running' : 'paused'};
      animation-fill-mode: both;
      animation-direction: normal;
    `
  }}
`

const InstanceInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
  padding: 0 0.5rem;
`

const InstanceName = styled.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #1F2937);
`

const InstanceParams = styled.div`
  font-size: 0.75rem;
  color: var(--text-secondary, #6B7280);
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  word-break: break-all;
  max-width: 200px;
`

interface AnimationBoxProps {
  instance: AnimationInstance
  isPlaying: boolean
  currentTime: number
  playKey: number
  seekKey: number
  index: number
}

export const AnimationBox = memo(function AnimationBox({
  instance,
  isPlaying,
  currentTime,
  playKey,
  seekKey,
  index
}: AnimationBoxProps) {
  const { config } = instance

  const animKey = useMemo(() =>
    `${playKey}-${seekKey}`,
    [playKey, seekKey]
  )

  const summaryText = useMemo(() => {
    const type = ANIMATION_TYPE_LABELS[config.type]
    const dur = `${config.duration.toFixed(1)}s`
    const delay = config.delay > 0 ? ` | 延迟 ${config.delay.toFixed(1)}s` : ''
    const easing = config.easing === 'cubic-bezier'
      ? `cubic-bezier(${config.cubicBezier.map(n => n.toFixed(2)).join(',')})`
      : config.easing
    return `${type} · ${dur}${delay} · ${easing}`
  }, [config])

  const displayName = useMemo(() =>
    config.name || `实例 ${index + 1}`,
    [config.name, index]
  )

  return (
    <InstanceWrapper>
      <AnimationStage>
        <GridBg />
        <AnimatedBox
          key={animKey}
          $config={config}
          $isPlaying={isPlaying}
          $currentTime={currentTime}
          $playKey={playKey}
          $seekKey={seekKey}
        />
      </AnimationStage>
      <InstanceInfo>
        <InstanceName>{displayName}</InstanceName>
        <InstanceParams>{summaryText}</InstanceParams>
      </InstanceInfo>
    </InstanceWrapper>
  )
})
