import { useStore, fontFamilyOptions, fontWeightOptions, colorPresets, type TypographyLevel, type Breakpoint } from '../store/useStore'
import clsx from 'clsx'

const levelLabels: Record<TypographyLevel, string> = {
  h1: 'H1 标题',
  h2: 'H2 标题',
  h3: 'H3 标题',
  body: '正文',
  small: '小字',
}

const breakpointLabels: Record<Breakpoint, string> = {
  mobile: '手机 375px',
  tablet: '平板 768px',
  desktop: '桌面 1280px',
}

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

function SliderControl({ label, value, min, max, step, unit, onChange }: SliderControlProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-xs text-gray-500 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  )
}

interface SelectControlProps {
  label: string
  value: string | number
  options: { value: string | number; label: string }[]
  onChange: (value: string) => void
}

function SelectControl({ label, value, options, onChange }: SelectControlProps) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white
                   focus:outline-none focus:border-[#667eea]
                   hover:border-[#667eea] transition-colors duration-200 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface ColorControlProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorControl({ label, value, onChange }: ColorControlProps) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-gray-300 rounded-md hover:border-[#667eea] transition-colors duration-200"
        />
        <span className="text-xs font-mono text-gray-500 uppercase">{value}</span>
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        {colorPresets.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={clsx(
              'w-5 h-5 rounded border transition-transform duration-200 hover:scale-110',
              value.toLowerCase() === color.toLowerCase()
                ? 'border-[#667eea] ring-2 ring-[#667eea]/30'
                : 'border-gray-300'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  )
}

interface LevelSectionProps {
  level: TypographyLevel
  isSelected: boolean
  onSelect: () => void
}

function LevelSection({ level, isSelected, onSelect }: LevelSectionProps) {
  const styles = useStore((state) => state.styles[level])
  const setStyle = useStore((state) => state.setStyle)

  const fontWeightOpts = fontWeightOptions.map((w) => ({
    value: w,
    label: String(w),
  }))

  const fontFamilyOpts = fontFamilyOptions.map((f) => ({
    value: f.fontFamily,
    label: f.label,
  }))

  return (
    <div
      className={clsx(
        'p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200',
        isSelected
          ? 'bg-white shadow-md border-l-4 border-[#667eea]'
          : 'bg-gray-50 hover:bg-gray-100 border-l-4 border-transparent'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-semibold text-sm text-gray-800"
          style={{
            fontSize: `${Math.min(styles.fontSize, 20)}px`,
            fontWeight: styles.fontWeight,
            color: styles.color,
          }}
        >
          {levelLabels[level]}
        </h3>
        {isSelected && (
          <span className="text-[10px] bg-[#667eea] text-white px-2 py-0.5 rounded-full">
            编辑中
          </span>
        )}
      </div>

      <SliderControl
        label="字体大小"
        value={styles.fontSize}
        min={12}
        max={64}
        step={1}
        unit="px"
        onChange={(v) => setStyle(level, 'fontSize', v)}
      />

      <SliderControl
        label="行高"
        value={styles.lineHeight}
        min={1.0}
        max={2.0}
        step={0.05}
        unit=""
        onChange={(v) => setStyle(level, 'lineHeight', v)}
      />

      <SliderControl
        label="字间距"
        value={styles.letterSpacing}
        min={-2}
        max={8}
        step={0.5}
        unit="px"
        onChange={(v) => setStyle(level, 'letterSpacing', v)}
      />

      <ColorControl
        label="颜色"
        value={styles.color}
        onChange={(v) => setStyle(level, 'color', v)}
      />

      <SelectControl
        label="字体粗细"
        value={styles.fontWeight}
        options={fontWeightOpts}
        onChange={(v) => setStyle(level, 'fontWeight', Number(v))}
      />

      <SelectControl
        label="字体族"
        value={styles.fontFamily}
        options={fontFamilyOpts}
        onChange={(v) => setStyle(level, 'fontFamily', v)}
      />
    </div>
  )
}

export default function ControlPanel() {
  const selectedLevel = useStore((state) => state.selectedLevel)
  const setSelectedLevel = useStore((state) => state.setSelectedLevel)
  const currentBreakpoint = useStore((state) => state.currentBreakpoint)
  const setCurrentBreakpoint = useStore((state) => state.setCurrentBreakpoint)
  const panelCollapsed = useStore((state) => state.panelCollapsed)

  const levels: TypographyLevel[] = ['h1', 'h2', 'h3', 'body', 'small']
  const breakpoints: Breakpoint[] = ['mobile', 'tablet', 'desktop']

  if (panelCollapsed) {
    return null
  }

  return (
    <div className="w-[300px] bg-[#f8f9fa] h-full overflow-y-auto flex-shrink-0 border-r border-gray-200">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">断点预览</h2>
          <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
            {breakpoints.map((bp) => (
              <button
                key={bp}
                onClick={() => setCurrentBreakpoint(bp)}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  currentBreakpoint === bp
                    ? 'bg-white text-[#667eea] shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                )}
              >
                {breakpointLabels[bp].split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-sm font-semibold text-gray-700 mb-3">排版层级</h2>

        {levels.map((level) => (
          <LevelSection
            key={level}
            level={level}
            isSelected={selectedLevel === level}
            onSelect={() => setSelectedLevel(selectedLevel === level ? null : level)}
          />
        ))}
      </div>
    </div>
  )
}
