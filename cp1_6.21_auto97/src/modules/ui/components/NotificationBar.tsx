import React from 'react';
import { AlertTriangle, X, Merge, RotateCcw } from 'lucide-react';
import { Conflict } from '../../version/types';
import '../styles/NotificationBar.css';

interface ConflictNotificationProps {
  conflicts: Conflict[];
  visible: boolean;
  onClose: () => void;
  onResolveMine: () => void;
  onResolveTheirs: () => void;
  onRollback: (versionNumber: number) => void;
}

export const ConflictNotificationBar: React.FC<ConflictNotificationProps> = ({
  conflicts,
  visible,
  onClose,
  onResolveMine,
  onResolveTheirs,
  onRollback,
}) => {
  if (!visible || conflicts.length === 0) {
    return null;
  }

  const conflictLines = conflicts.map(c => `第${c.lineNumber}行`).join('、');

  return (
    <div className="conflict-notification">
      <div className="conflict-notification-content">
        <div className="conflict-icon">
          <AlertTriangle size={20} />
        </div>
        
        <div className="conflict-info">
          <div className="conflict-title">样式冲突</div>
          <div className="conflict-description">
            检测到 {conflicts.length} 处冲突（{conflictLines}）。
            其他协作者已修改了相同的代码行，请处理冲突。
          </div>
        </div>
        
        <div className="conflict-actions">
          <button 
            className="conflict-btn conflict-btn-primary"
            onClick={onResolveMine}
          >
            <Merge size={14} />
            保留我的
          </button>
          <button 
            className="conflict-btn conflict-btn-secondary"
            onClick={onResolveTheirs}
          >
            <RotateCcw size={14} />
            使用对方
          </button>
          <button 
            className="conflict-btn conflict-btn-outline"
            onClick={() => onRollback(1)}
          >
            回退到上一版本
          </button>
        </div>
      </div>
      
      <button 
        className="conflict-close-btn"
        onClick={onClose}
        aria-label="关闭通知"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default ConflictNotificationBar;
