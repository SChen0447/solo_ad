import { useStore, breakpointWidths, type TypographyLevel } from '../store/useStore'
import clsx from 'clsx'

const sampleTexts: Record<TypographyLevel, string> = {
  h1: 'Typography is the craft of endowing human language with a durable visual form.',
  h2: 'Good typography is invisible — bad typography is everywhere.',
  h3: 'The details are not the details. They make the design.',
  body: 'Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the space between pairs of letters.',
  small: '— Robert Bringhurst, The Elements of Typographic Style',
}

const levelLabels: Record<TypographyLevel, string> = {
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  body: 'Body',
  small: 'Small',
}

interface PreviewItemProps {
  level: TypographyLevel
  showDivider: boolean
}

function PreviewItem({ level, showDivider }: PreviewItemProps) {
  const style = useStore((state) => state.styles[level])
  const selectedLevel = useStore((state) => state.selectedLevel)
  const setSelectedLevel = useStore((state) => state.setSelectedLevel)

  const isSelected = selectedLevel === level

  const handleClick = () => {
    setSelectedLevel(isSelected ? null : level)
  }

  return (
    <>
      <div
        className={clsx(
          'py-6 relative cursor-pointer transition-all duration-200 group',
          isSelected && 'bg-[#667eea]/5 -mx-4 px-4 rounded-lg'
        )}
        onClick={handleClick}
      >
        {isSelected && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 arrow-animate">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#667eea]"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <div className="absolute -left-10 top-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {levelLabels[level]}
          </span>
        </div>

        <p
          style={{
            fontSize: `${style.fontSize}px`,
            lineHeight: style.lineHeight,
            letterSpacing: `${style.letterSpacing}px`,
            color: style.color,
            fontWeight: style.fontWeight,
            fontFamily: style.fontFamily,
          }}
        >
          {sampleTexts[level]}
        </p>
      </div>

      {showDivider && (
        <div className="divider-fade h-px bg-[#e0e0e0]" />
      )}
    </>
  )
}

export default function PreviewPanel() {
  const currentBreakpoint = useStore((state) => state.currentBreakpoint)

  const levels: TypographyLevel[] = ['h1', 'h2', 'h3', 'body', 'small']
  const width = breakpointWidths[currentBreakpoint]

  return (
    <div className="flex-1 bg-white overflow-auto">
      <div className="p-8 flex justify-center">
        <div
          className="transition-all duration-[300ms] ease-in-out overflow-hidden"
          style={{ width: `${width}px` }}
        >
          {levels.map((level, index) => (
            <PreviewItem
              key={level}
              level={level}
              showDivider={index < levels.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
