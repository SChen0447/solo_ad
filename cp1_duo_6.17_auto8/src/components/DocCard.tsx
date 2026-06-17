import { useState, memo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Star, Clipboard, Check } from 'lucide-react'

interface DocCardProps {
  id: number
  title: string
  description: string
  codeSnippet: string
  techStack: string
  isBookmarked: boolean
  onBookmarkToggle: (id: number) => void
  isRemoving?: boolean
}

const getTechStackClass = (tech: string): string => {
  const techLower = tech.toLowerCase()
  if (techLower.includes('react')) return 'react'
  if (techLower.includes('typescript') || techLower.includes('ts')) return 'typescript'
  if (techLower.includes('tailwind')) return 'tailwind'
  return 'react'
}

const getCodeLanguage = (tech: string): string => {
  const techLower = tech.toLowerCase()
  if (techLower.includes('react') || techLower.includes('typescript')) return 'tsx'
  if (techLower.includes('tailwind')) return 'html'
  return 'javascript'
}

function DocCard({
  id,
  title,
  description,
  codeSnippet,
  techStack,
  isBookmarked,
  onBookmarkToggle,
  isRemoving = false,
}: DocCardProps) {
  const [copied, setCopied] = useState(false)
  const techClass = getTechStackClass(techStack)
  const codeLang = getCodeLanguage(techStack)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippet)
      setCopied(true)
      const event = new CustomEvent('toast', {
        detail: { message: '代码已复制到剪贴板' },
      })
      window.dispatchEvent(event)
      setTimeout(() => setCopied(false), 200)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBookmarkToggle(id)
  }

  return (
    <div className={`doc-card ${isRemoving ? 'removing' : ''}`}>
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className={`card-tech-badge ${techClass}`}>{techStack}</span>
      </div>
      <p className="card-description">{description}</p>

      <div className="code-block-wrapper">
        <button
          className={`code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check size={14} />
              已复制
            </>
          ) : (
            <>
              <Clipboard size={14} />
              复制
            </>
          )}
        </button>
        <SyntaxHighlighter
          language={codeLang}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: '8px',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          {codeSnippet}
        </SyntaxHighlighter>
      </div>

      <div className="card-actions">
        <button
          className={`action-btn bookmark ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmark}
        >
          <Star
            size={16}
            className={`bookmark-icon ${isBookmarked ? 'filled' : ''}`}
            fill={isBookmarked ? '#FFD700' : 'none'}
          />
          {isBookmarked ? '已收藏' : '收藏'}
        </button>
      </div>
    </div>
  )
}

export default memo(DocCard)
