import React from 'react';
import { Snapshot } from '../types';

interface SnapshotPanelProps {
  snapshots: Snapshot[];
  onRestore: (snapshot: Snapshot) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  darkMode: boolean;
}

const SnapshotPanel: React.FC<SnapshotPanelProps> = ({
  snapshots,
  onRestore,
  onDelete,
  onSave,
  darkMode,
}) => {
  return (
    <div className={`snapshot-panel ${darkMode ? 'dark' : ''}`}>
      <div className="snapshot-panel-header">
        <span className="snapshot-panel-title">快照</span>
        <button className="snapshot-save-btn" onClick={onSave}>
          + 保存
        </button>
      </div>
      <div className="snapshot-list">
        {snapshots.length === 0 && (
          <div className="snapshot-empty">暂无快照</div>
        )}
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="snapshot-card"
            onClick={() => onRestore(snapshot)}
          >
            <div className="snapshot-card-name">{snapshot.name}</div>
            <div className="snapshot-card-meta">
              行: {snapshot.fieldMapping.row.length} | 列: {snapshot.fieldMapping.col.length} | 值: {snapshot.fieldMapping.value.length}
            </div>
            <div className="snapshot-card-time">
              {new Date(snapshot.createdAt).toLocaleString('zh-CN')}
            </div>
            <button
              className="snapshot-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(snapshot.id);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnapshotPanel;
