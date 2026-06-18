import { useEffect } from 'react'
import { diffLines } from 'diff'
import { useAppStore, DiffLine } from '../store'

interface DiffHighlighterProps {
  children?: React.ReactNode
}

export function DiffHighlighter({ children }: DiffHighlighterProps) {
  const {
    leftCode,
    rightCode,
    diffEnabled,
    setDiffLines,
    leftDiffLines,
    rightDiffLines,
  } = useAppStore()

  useEffect(() => {
    if (!diffEnabled) {
      setDiffLines([], [])
      return
    }

    const changes = diffLines(leftCode, rightCode)

    const leftLines: DiffLine[] = []
    const rightLines: DiffLine[] = []

    changes.forEach((change) => {
      const lines = change.value.split('\n')
      if (lines[lines.length - 1] === '') {
        lines.pop()
      }

      lines.forEach((line) => {
        if (change.added) {
          rightLines.push({ value: line, added: true })
        } else if (change.removed) {
          leftLines.push({ value: line, removed: true })
        } else {
          leftLines.push({ value: line })
          rightLines.push({ value: line })
        }
      })
    })

    setDiffLines(leftLines, rightLines)
  }, [leftCode, rightCode, diffEnabled, setDiffLines])

  const getLeftDiffLineNumbers = (): number[] => {
    const lineNumbers: number[] = []
    leftDiffLines.forEach((line, index) => {
      if (line.removed) {
        lineNumbers.push(index + 1)
      }
    })
    return lineNumbers
  }

  const getRightDiffLineNumbers = (): number[] => {
    const lineNumbers: number[] = []
    rightDiffLines.forEach((line, index) => {
      if (line.added) {
        lineNumbers.push(index + 1)
      }
    })
    return lineNumbers
  }

  if (children) {
    return <>{children}</>
  }

  return null
}

export function useDiffLines() {
  const { leftDiffLines, rightDiffLines, diffEnabled } = useAppStore()

  const getLeftDiffLineNumbers = (): number[] => {
    if (!diffEnabled) return []
    const lineNumbers: number[] = []
    leftDiffLines.forEach((line, index) => {
      if (line.removed) {
        lineNumbers.push(index)
      }
    })
    return lineNumbers
  }

  const getRightDiffLineNumbers = (): number[] => {
    if (!diffEnabled) return []
    const lineNumbers: number[] = []
    rightDiffLines.forEach((line, index) => {
      if (line.added) {
        lineNumbers.push(index)
      }
    })
    return lineNumbers
  }

  return {
    leftDiffLines,
    rightDiffLines,
    diffEnabled,
    getLeftDiffLineNumbers,
    getRightDiffLineNumbers,
  }
}
