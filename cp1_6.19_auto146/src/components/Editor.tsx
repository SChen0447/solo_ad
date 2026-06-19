import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import './Editor.css'

export interface EditorHandle {
  getHtmlCode: () => string
  getCssCode: () => string
}

interface EditorProps {
  initialHtml: string
  initialCss: string
  onCodeChange: (type: 'html' | 'css', code: string) => void
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ initialHtml, initialCss, onCodeChange }, ref) => {
  const htmlEditorRef = useRef<HTMLDivElement>(null)
  const cssEditorRef = useRef<HTMLDivElement>(null)
  const htmlViewRef = useRef<EditorView | null>(null)
  const cssViewRef = useRef<EditorView | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html')

  useImperativeHandle(ref, () => ({
    getHtmlCode: () => htmlViewRef.current?.state.doc.toString() || '',
    getCssCode: () => cssViewRef.current?.state.doc.toString() || ''
  }))

  useEffect(() => {
    if (!htmlEditorRef.current || !cssEditorRef.current) return

    const createEditor = (
      container: HTMLDivElement,
      initialValue: string,
      language: 'html' | 'css',
      onChange: (code: string) => void
    ) => {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const code = update.state.doc.toString()
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          debounceTimerRef.current = window.setTimeout(() => {
            onChange(code)
          }, 300)
        }
      })

      const languageExtension = language === 'html' ? html() : css()

      const state = EditorState.create({
        doc: initialValue,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          bracketMatching(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          indentUnit.of('  '),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...foldKeymap
          ]),
          languageExtension,
          oneDark,
          updateListener,
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '14px',
              backgroundColor: '#1a1a2e'
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: "'Fira Code', monospace"
            },
            '.cm-content': {
              caretColor: '#ffffff',
              padding: '10px 0'
            },
            '.cm-gutters': {
              backgroundColor: '#1a1a2e',
              borderRight: '1px solid #2d2d44'
            },
            '.cm-activeLineGutter': {
              backgroundColor: '#2d2d44'
            },
            '.cm-activeLine': {
              backgroundColor: 'rgba(102, 126, 234, 0.1)'
            },
            '.cm-foldPlaceholder': {
              backgroundColor: '#2d2d44',
              border: '1px solid #667eea',
              color: '#667eea'
            }
          })
        ]
      })

      return new EditorView({
        state,
        parent: container
      })
    }

    htmlViewRef.current = createEditor(htmlEditorRef.current, initialHtml, 'html', (code) => {
      onCodeChange('html', code)
    })

    cssViewRef.current = createEditor(cssEditorRef.current, initialCss, 'css', (code) => {
      onCodeChange('css', code)
    })

    return () => {
      htmlViewRef.current?.destroy()
      cssViewRef.current?.destroy()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [initialHtml, initialCss, onCodeChange])

  return (
    <div className="editor-container">
      <div className="editor-tabs">
        <button
          className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
          onClick={() => setActiveTab('html')}
        >
          HTML
        </button>
        <button
          className={`tab-btn ${activeTab === 'css' ? 'active' : ''}`}
          onClick={() => setActiveTab('css')}
        >
          CSS
        </button>
      </div>
      <div className={`editor-wrapper ${activeTab === 'html' ? 'show-html' : 'show-css'}`}>
        <div className="code-editor" ref={htmlEditorRef} />
        <div className="code-editor" ref={cssEditorRef} />
      </div>
    </div>
  )
})

Editor.displayName = 'Editor'

export default Editor
