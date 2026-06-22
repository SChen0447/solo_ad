import { useState, useCallback, useMemo } from 'react'
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

const BezierInput = styled.input<{ $hasError?: boolean }>`
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid ${({ $hasError }) => $hasError ? '#EF4444' : '#E5E7EB'};
  font-size: 12px;
  text-align: center;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  color: #1F2937;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  -moz-appearance: textfield;
  background: ${({ $hasError }) => $hasError ? '#FEF2F2' : '#FFFFFF'};

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    border-color: ${({ $hasError }) => $hasError ? '#EF4444' : '#8B5CF6'};
    box-shadow: ${({ $hasError }) => $hasError
      ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
      : '0 0 0 3px rgba(139, 92, 246, 0.1)'};
  }
`

const BezierPreview = styled.div`
  margin-top: 10px;
  padding: 12px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1px dashed #D1D5DB;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const PreviewPath = styled.svg`
  width: 60px;
  height: 60px;
  flex-shrink: 0;
`

const PreviewLabel = styled.span`
  font-size: 11px;
  color: #6B7280;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  word-break: break-all;
`

const ErrorText = styled.span`
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: #EF4444;
  font-weight: 500;
`

const ValidationBadge = styled.span<{ $valid: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  background: ${({ $valid }) => $valid ? '#D1FAE5' : '#FEE2E2'};
  color: ${({ $valid }) => $valid ? '#059669' : '#DC2626'};
`

interface AnimationCardProps {
  index: number
  instance: AnimationInstance
  onUpdate: (config: AnimationConfig) => void
  onRemove: () => void
  canRemove: boolean
}

function validateBezierValue(value: string): { valid: boolean; num?: number; error?: string } {
  const trimmed = value.trim()
  if (trimmed === '') {
    return { valid: false, error: '值不能为空' }
  }
  const num = parseFloat(trimmed)
  if (isNaN(num)) {
    return { valid: false, error: '请输入有效数字' }
  }
  if (num < 0 || num > 1) {
    return { valid: false, error: '值必须在 0 到 1 之间' }
  }
  return { valid: true, num }
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
  const [bezierInputs, setBezierInputs] = useState<string[]>(
    config.cubicBezier.map(n => n.toString())
  )
  const [bezierErrors, setBezierErrors] = useState<(string | null)[]>([null, null, null, null])
  const [bezierValid, setBezierValid] = useState(true)

  const updateField = useCallback(<K extends keyof AnimationConfig>(key: K, value: AnimationConfig[K]) => {
    onUpdate({ ...config, [key]: value })
  }, [config, onUpdate])

  const triggerReplay = useCallback(() => {
  }, [])

  const handleBezierInputChange = useCallback((idx: number, value: string) => {
    setBezierInputs(prev => {
      const newInputs = [...prev]
      newInputs[idx] = value
      return newInputs
    })
    setBezierErrors(prev => {
      const newErrors = [...prev]
      newErrors[idx] = null
      return newErrors
    })
  }, [])

  const validateAndApplyBezier = useCallback((idx: number) => {
    const result = validateBezierValue(bezierInputs[idx])
    if (!result.valid) {
      setBezierErrors(prev => {
        const newErrors = [...prev]
        newErrors[idx] = result.error || '无效值'
        return newErrors
      })
      setBezierValid(false)
      return
    }

    setBezierErrors(prev => {
      const newErrors = [...prev]
      newErrors[idx] = null
      return newErrors
    })

    const allValid = bezierInputs.every((input, i) => {
      if (i === idx) return true
      const r = validateBezierValue(input)
      return r.valid
    })

    if (allValid && result.num !== undefined) {
      const newBezier = [...config.cubicBezier] as [number, number, number, number]
      newBezier[idx] = result.num
      setBezierValid(true)
      updateField('cubicBezier', newBezier)
      triggerReplay()
    }
  }, [bezierInputs, config.cubicBezier, updateField, triggerReplay])

  const handleBezierBlur = useCallback((idx: number) => {
    validateAndApplyBezier(idx)
  }, [validateAndApplyBezier])

  const handleBezierKeyDown = useCallback((idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      validateAndApplyBezier(idx)
    }
  }, [validateAndApplyBezier])

  const handleApplyAll = useCallback(() => {
    const results = bezierInputs.map(input => validateBezierValue(input))
    const errors = results.map(r => r.valid ? null : (r.error || '无效值'))
    setBezierErrors(errors)

    const allValid = results.every(r => r.valid)
    setBezierValid(allValid)

    if (allValid) {
      const nums = results.map(r => r.num!) as [number, number, number, number]
      const changed = nums.some((n, i) => Math.abs(n - config.cubicBezier[i]) > 0.001)
      if (changed) {
        updateField('cubicBezier', nums)
        triggerReplay()
      }
    }
  }, [bezierInputs, config.cubicBezier, updateField, triggerReplay])

  const bezierPathD = useMemo(() => {
    const [x1, y1, x2, y2] = config.cubicBezier
    const w = 60, h = 60
    const sy = (v: number) => h - v * h
    return `M 0 ${sy(0)} C ${x1 * w} ${sy(y1)}, ${x2 * w} ${sy(y2)}, ${w} ${sy(1)}`
  }, [config.cubicBezier])

  const hasAnyError = bezierErrors.some(e => e !== null)

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <CubicBezierLabel>
                  cubic-bezier(
                  {config.cubicBezier[0].toFixed(2)}, {config.cubicBezier[1].toFixed(2)},{' '}
                  {config.cubicBezier[2].toFixed(2)}, {config.cubicBezier[3].toFixed(2)})
                </CubicBezierLabel>
                <ValidationBadge $valid={bezierValid && !hasAnyError}>
                  {bezierValid && !hasAnyError ? '✓ 有效' : '✗ 无效'}
                </ValidationBadge>
              </div>
              <CubicBezierInputs>
                {['x1', 'y1', 'x2', 'y2'].map((label, idx) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <BezierInput
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={bezierInputs[idx]}
                      $hasError={bezierErrors[idx] !== null}
                      onChange={e => handleBezierInputChange(idx, e.target.value)}
                      onBlur={() => handleBezierBlur(idx)}
                      onKeyDown={e => handleBezierKeyDown(idx, e)}
                      placeholder={label}
                    />
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>{label}</div>
                    {bezierErrors[idx] && (
                      <ErrorText>{bezierErrors[idx]}</ErrorText>
                    )}
                  </div>
                ))}
              </CubicBezierInputs>
              <button
                type="button"
                onClick={handleApplyAll}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #8B5CF6',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                  color: '#8B5CF6',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                应用参数并重播动画
              </button>
              <BezierPreview>
                <PreviewPath viewBox="0 0 60 60" preserveAspectRatio="none">
                  <line x1="0" y1="60" x2="60" y2="0" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="2,2" />
                  <path
                    d={bezierPathD}
                    fill="none"
                    stroke="url(#bezierGradient)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="bezierGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                  <circle cx="0" cy="60" r="3" fill="#8B5CF6" />
                  <circle cx="60" cy="0" r="3" fill="#3B82F6" />
                </PreviewPath>
                <PreviewLabel>
                  曲线预览<br/>
                  调整x1,y1,x2,y2(0-1)
                </PreviewLabel>
              </BezierPreview>
            </CubicBezierGroup>
          )}
        </FieldGroup>
      </CardBody>
    </CardContainer>
  )
}
