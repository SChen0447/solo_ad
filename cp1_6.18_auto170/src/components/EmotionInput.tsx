import { useState } from 'react'
import { useEmotionStore } from '../store/emotionStore'

const MAX_LENGTH = 200

export default function EmotionInput() {
  const [text, setText] = useState('')
  const { generateFromText, ui } = useEmotionStore()

  const handleSubmit = () => {
    if (text.trim()) {
      generateFromText(text.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>情绪日记</span>
        <span style={styles.counter}>{text.length}/{MAX_LENGTH}</span>
      </div>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder="写下今天的心情，记录你的情绪...\n（支持中英文关键词识别）"
        style={styles.textarea}
      />
      
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || ui.isGenerating}
        style={{
          ...styles.button,
          ...(ui.isGenerating ? styles.buttonLoading : {}),
          ...(!text.trim() ? styles.buttonDisabled : {})
        }}
      >
        {ui.isGenerating ? '生成中...' : '生成星云'}
      </button>
      
      <div style={styles.hint}>
        提示：试试输入「今天很开心，阳光灿烂」或「有点焦虑和紧张」
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '320px',
    padding: '20px',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600
  },
  counter: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px'
  },
  textarea: {
    width: '100%',
    height: '120px',
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    lineHeight: 1.5,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit'
  },
  button: {
    width: '100%',
    marginTop: '12px',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  buttonLoading: {
    opacity: 0.7,
    cursor: 'wait'
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  hint: {
    marginTop: '10px',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.4)',
    lineHeight: 1.5
  }
}
