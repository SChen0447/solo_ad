import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'

interface EditorProps {
  value: string
  onChange: (value: string) => void
}

export interface EditorRef {
  insertText: (text: string, cursorOffset?: number) => void
  getSelectionStart: () => number
}

const Editor = forwardRef<EditorRef, EditorProps>(({ value, onChange }, ref) => {
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lastExternalValue = useRef<string>(value)
  const pendingCursorPos = useRef<number | null>(null)

  useImperativeHandle(ref, () => ({
    insertText: (text: string, cursorOffset: number = 0) => {
      const el = editorRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const newValue = value.substring(0, start) + text + value.substring(end)
      const targetPos = start + cursorOffset
      pendingCursorPos.current = targetPos
      onChange(newValue)
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.focus()
          const pos = pendingCursorPos.current ?? targetPos
          editorRef.current.setSelectionRange(pos, pos)
          pendingCursorPos.current = null
        }
      })
    },
    getSelectionStart: () => editorRef.current?.selectionStart ?? 0
  }))

  useEffect(() => {
    if (value !== lastExternalValue.current && editorRef.current) {
      const el = editorRef.current
      if (pendingCursorPos.current !== null) {
        el.value = value
        const pos = pendingCursorPos.current
        el.setSelectionRange(pos, pos)
        pendingCursorPos.current = null
      } else {
        const start = el.selectionStart
        const end = el.selectionEnd
        const lengthDiff = value.length - lastExternalValue.current.length
        el.value = value
        if (lengthDiff > 0) {
          const newPos = start + lengthDiff
          el.setSelectionRange(newPos, newPos)
        } else {
          el.setSelectionRange(Math.min(start, value.length), Math.min(end, value.length))
        }
      }
      lastExternalValue.current = value
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    lastExternalValue.current = newValue
    pendingCursorPos.current = null
    onChange(newValue)
  }

  return (
    <textarea
      ref={editorRef}
      className="editor"
      value={value}
      onChange={handleChange}
      spellCheck={false}
      placeholder="在此输入LaTeX公式，或使用工具栏按钮插入..."
    />
  )
})

Editor.displayName = 'Editor'

export default Editor
