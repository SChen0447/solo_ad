import EditorPanel from './EditorPanel'
import ControlPanel from './ControlPanel'

export default function App() {
  return (
    <div className="app-container">
      <div className="left-panel">
        <EditorPanel />
      </div>
      <div className="right-panel">
        <ControlPanel />
      </div>
    </div>
  )
}
