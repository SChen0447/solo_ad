import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onActivity?: () => void
  readOnly?: boolean
}

export default function Editor({ value, onChange, onActivity, readOnly = false }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const isRemoteUpdate = useRef(false)

  useEffect(() => {
    if (!editorRef.current) return

    const handleChange = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isRemoteUpdate.current) {
        onChange(update.state.doc.toString())
        if (onActivity) {
          onActivity()
        }
      }
    })

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      javascript({ typescript: true, jsx: true }),
      oneDark,
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...searchKeymap,
      ]),
      EditorView.lineWrapping,
      handleChange,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px',
        },
        '.cm-scroller': {
          overflow: 'auto',
        },
        '.cm-gutters': {
          backgroundColor: '#1E1E2E',
          borderRight: '1px solid #4B5563',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#2D2D3F',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(55, 65, 81, 0.3)',
        },
      }),
    ]

    if (readOnly) {
      extensions.push(EditorView.editable.of(false))
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue !== value) {
      isRemoteUpdate.current = true
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      })
      isRemoteUpdate.current = false
    }
  }, [value])

  return (
    <div
      ref={editorRef}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: '#1E1E2E',
      }}
    />
  )
}
