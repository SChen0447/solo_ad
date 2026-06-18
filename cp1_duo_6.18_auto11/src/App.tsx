import Editor from './components/Editor';
import Preview from './components/Preview';
import Exporter from './components/Exporter';
import { usePortfolioStore } from './store';
import './App.css';

function App() {
  const clearAll = usePortfolioStore(state => state.clearAll);

  return (
    <div className="app-container">
      <div className="editor-section">
        <div className="editor-header">
          <h1 className="editor-title">
            <i className="fas fa-th-large"></i>
            作品集布局编辑器
          </h1>
          <div className="editor-actions">
            <button className="btn btn-secondary" onClick={clearAll}>
              <i className="fas fa-trash-alt"></i>
              清空布局
            </button>
            <Exporter />
          </div>
        </div>
        <Editor />
      </div>
      <div className="preview-section">
        <div className="preview-header">
          <i className="fas fa-mobile-alt"></i>
          <span>实时预览</span>
        </div>
        <div className="preview-wrapper">
          <div className="phone-frame">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <Preview />
            </div>
            <div className="phone-home-bar"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
