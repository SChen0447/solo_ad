import './ControlBar.css';

interface ControlBarProps {
  onClear: () => void;
  onSave: () => void;
  onImport: () => void;
}

const ControlBar = ({ onClear, onSave, onImport }: ControlBarProps) => {
  return (
    <div className="control-bar">
      <div className="control-bar-left">
        <span className="control-bar-title">3D场景</span>
      </div>
      
      <div className="control-bar-right">
        <button 
          className="control-button danger"
          onClick={onClear}
          title="清空全部家具"
        >
          <span className="button-icon">🗑️</span>
          <span className="button-text">清空全部</span>
        </button>
        
        <button 
          className="control-button"
          onClick={onImport}
          title="导入布局JSON文件"
        >
          <span className="button-icon">📂</span>
          <span className="button-text">导入布局</span>
        </button>
        
        <button 
          className="control-button primary"
          onClick={onSave}
          title="保存当前布局为JSON文件"
        >
          <span className="button-icon">💾</span>
          <span className="button-text">保存布局</span>
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
