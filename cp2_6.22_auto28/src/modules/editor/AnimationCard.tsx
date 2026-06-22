import { useState } from 'react'
import styled from 'styled-components'
import type { AnimationConfig, AnimationInstance, AnimationType, EasingType } from '@/types/animation'
import { ANIMATION_TYPE_LABELS, EASING_OPTIONS, EASING_LABELS } from '@/types/animation'

const CardContainer = styled.div`
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: #C4B5FD;
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);
  }
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(139,92,246,0.04) 0%, rgba(59,130,246,0.04) 100%);
  cursor: pointer;
  user-select: none;
`

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const CardIndex = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CardName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
`

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const RemoveBtn = styled.button`
  background: transparent;
  border: 1px solid #FCA5A5;
  color: #EF4444;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #FEE2E2;
  }
`

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  font-size: 12px;
  color: #6B7280;
  transition: transform 0.2s;
  transform: rotate(${({ $expanded }) => $expanded ? '180deg' : '0deg'});
`

const CardBody = styled.div<{ $expanded: boolean }>`
  display: ${({ $expanded }) => $expanded ? 'block' : 'none'};
  padding: 16px;
  border-top: 1px solid #F3F4F6;
`

const FieldGroup = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`

const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
`

const TypeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`

const TypeBtn = styled.button<{ $active: boolean }>`
  padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? '#8B5CF6' : '#E5E7EB'};
  background: ${({ $active }) => $active ? 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)' : '#FFFFFF'};
  color: ${({ $active }) => $active ? '#8B5CF6' : '#4B5563'};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    border-color: ${({ $active }) => $active ? '#8B5CF6' : '#C4B5FD'};
  }
`

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Slider = styled.input`
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 2px solid #8B5CF6;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: transform 0.15s;

    &:hover {
      transform: scale(1.15);
    }
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #FFFFFF;
    border: 2px solid #8B5CF6;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    cursor: pointer;
  }
`

const SliderValue = styled.span`
  min-width: 48px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #8B5CF6;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
`

const EasingSelect = styled.select`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  background: #FFFFFF;
  color: #1F2937;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #8B5CF6;
  }
`

const CubicBezierGroup = styled.div`
  margin-top: 10px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
`

const CubicBezierLabel = styled.span`
  display: block;
  font-size: 12px;
  color: #6B7280;
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
`

const CubicBezierInputs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`

const BezierInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #E5E7EB;
  font-size: 12px;
  text-align: center;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  color: #1F2937;
  outline: none;
  transition: border-color 0.2s;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-color: #8B5CF6;
  }
`

interface AnimationCardProps {
  index: number
  instance: AnimationInstance
  onUpdate: (config: AnimationConfig) => void
  onRemove: () => void
  canRemove: boolean
}

export function AnimationCard({
  index,
  instance,
  onUpdate,
  onRemove,
  canRemove
}: AnimationCardProps) {
  const [expanded, setExpanded] = useState(true)
  const { config } = instance

  const updateField = <K extends keyof AnimationConfig>(key: K, value: AnimationConfig[K]) => {
    onUpdate({ ...config, [key]: value })
  }

  const handleCubicBezierChange = (idx: number, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return
    const newBezier = [...config.cubicBezier] as [number, number, number, number]
    newBezier[idx] = Math.max(-1, Math.min(2, num))
    updateField('cubicBezier', newBezier)
  }

  const animationTypes: AnimationType[] = ['translate', 'rotate', 'scale', 'color', 'bounce']

  return (
    <CardContainer>
      <CardHeader onClick={() => setExpanded(e => !e)}>
        <CardTitle>
          <CardIndex>{index + 1}</CardIndex>
          <CardName>{config.name}</CardName>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
            · {ANIMATION_TYPE_LABELS[config.type]}
          </span>
        </CardTitle>
        <CardActions onClick={e => e.stopPropagation()}>
          {canRemove && (
            <RemoveBtn onClick={onRemove} title="删除实例">×</RemoveBtn>
          )}
          <ExpandIcon $expanded={expanded}>▼</ExpandIcon>
        </CardActions>
      </CardHeader>
      <CardBody $expanded={expanded}>
        <FieldGroup>
          <FieldLabel>动画类型</FieldLabel>
          <TypeSelector>
            {animationTypes.map(type => (
              <TypeBtn
                key={type}
                $active={config.type === type}
                onClick={() => updateField('type', type)}
              >
                {ANIMATION_TYPE_LABELS[type]}
              </TypeBtn>
            ))}
          </TypeSelector>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>持续时长</FieldLabel>
          <SliderContainer>
            <Slider
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={config.duration}
              onChange={e => updateField('duration', parseFloat(e.target.value))}
            />
            <SliderValue>{config.duration.toFixed(1)}s</SliderValue>
          </SliderContainer>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>延迟时间</FieldLabel>
          <SliderContainer>
            <Slider
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.delay}
              onChange={e => updateField('delay', parseFloat(e.target.value))}
            />
            <SliderValue>{config.delay.toFixed(1)}s</SliderValue>
          </SliderContainer>
        </FieldGroup>

        <FieldGroup>
          <FieldLabel>缓动函数</FieldLabel>
          <EasingSelect
            value={config.easing}
            onChange={e => updateField('easing', e.target.value as EasingType)}
          >
            {EASING_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{EASING_LABELS[opt]}</option>
            ))}
          </EasingSelect>

          {config.easing === 'cubic-bezier' && (
            <CubicBezierGroup>
              <CubicBezierLabel>
                cubic-bezier(
                {config.cubicBezier[0]}, {config.cubicBezier[1]},{' '}
                {config.cubicBezier[2]}, {config.cubicBezier[3]})
              </CubicBezierLabel>
              <CubicBezierInputs>
                {['x1', 'y1', 'x2', 'y2'].map((label, idx) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <BezierInput
                      type="number"
                      step="0.01"
                      min="-1"
                      max="2"
                      value={config.cubicBezier[idx]}
                      onChange={e => handleCubicBezierChange(idx, e.target.value)}
                    />
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>{label}</div>
                  </div>
                ))}
              </CubicBezierInputs>
            </CubicBezierGroup>
          )}
        </FieldGroup>
      </CardBody>
    </CardContainer>
  )
}
