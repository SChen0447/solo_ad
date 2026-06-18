import { useEffect, useMemo } from 'react'
import { diffLines } from 'diff'
import { useAppStore } from '../store'

interface DiffHighlighterProps {
  children?: React.ReactNode
}

export function DiffHighlighter({ children }: DiffHighlighterProps) {
  const {
    leftCode,
    rightCode,
    diffEnabled,
    setDiffLines,
  } = useAppStore()

  useEffect(() => {
    if (!diffEnabled) {
      setDiffLines([], [])
      return
    }

    const changes = diffLines(leftCode, rightCode)

    const leftDiffLineNumbers: number[] = []
    const rightDiffLineNumbers: number[] = []

    let leftLineIdx = 0
    let rightLineIdx = 0

    changes.forEach((change) => {
      const lines = change.value.split('\n')
      if (lines[lines.length - 1] === '') {
        lines.pop()
      }

      if (change.added) {
        lines.forEach(() => {
          rightDiffLineNumbers.push(rightLineIdx)
          rightLineIdx++
        })
      } else if (change.removed) {
        lines.forEach(() => {
          leftDiffLineNumbers.push(leftLineIdx)
          leftLineIdx++
        })
      } else {
        lines.forEach(() => {
          leftLineIdx++
          rightLineIdx++
        })
      }
    })

    const leftLines = leftCode.split('\n').map((value, index) => ({
      value,
      removed: leftDiffLineNumbers.includes(index),
    }))
    const rightLines = rightCode.split('\n').map((value, index) => ({
      value,
      added: rightDiffLineNumbers.includes(index),
    }))

    setDiffLines(leftLines, rightLines)
  }, [leftCode, rightCode, diffEnabled, setDiffLines])

  return <>{children}</>
}

export function useDiffLines() {
  const { leftDiffLines, rightDiffLines, diffEnabled } = useAppStore()

  const leftLineNumbers = useMemo(() => {
    if (!diffEnabled) return []
    const result: number[] = []
    leftDiffLines.forEach((line, index) => {
      if (line.removed) result.push(index)
    })
    return result
  }, [leftDiffLines, diffEnabled])

  const rightLineNumbers = useMemo(() => {
    if (!diffEnabled) return []
    const result: number[] = []
    rightDiffLines.forEach((line, index) => {
      if (line.added) result.push(index)
    })
    return result
  }, [rightDiffLines, diffEnabled])

  return {
    leftDiffLines,
    rightDiffLines,
    diffEnabled,
    getLeftDiffLineNumbers: () => leftLineNumbers,
    getRightDiffLineNumbers: () => rightLineNumbers,
    leftLineNumbers,
    rightLineNumbers,
  }
}
