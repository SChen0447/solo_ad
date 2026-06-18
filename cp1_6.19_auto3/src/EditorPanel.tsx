import CodeEditor from './CodeEditor'
import AnimationPreview from './AnimationPreview'

export default function EditorPanel() {
  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <CodeEditor />
      </div>
      <div style={styles.bottomSection}>
        <AnimationPreview />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    minHeight: 0
  },
  topSection: {
    flex: 1,
    minHeight: 0,
    display: 'flex'
  },
  bottomSection: {
    flexShrink: 0
  }
}
