import { useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useAnimationStore } from './store'

export default function CodeEditor() {
  const { code, setCode } = useAnimationStore()

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value)
      }
    },
    [setCode]
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>CSS 代码编辑器</span>
      </div>
      <div style={styles.editorWrapper}>
        <Editor
          height="100%"
          defaultLanguage="css"
          value={code}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#2a2a3e',
    borderRadius: '12px',
    overflow: 'hidden',
    flex: 1
  },
  header: {
    padding: '12px 16px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e0e0e0'
  },
  editorWrapper: {
    flex: 1,
    minHeight: 0
  }
}
