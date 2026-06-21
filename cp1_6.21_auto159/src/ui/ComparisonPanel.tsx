import React from 'react';
import type { SnapshotData } from '../types';

interface ComparisonPanelProps {
  snapshot: SnapshotData | null;
}

const ComparisonPanel: React.FC<ComparisonPanelProps> = ({ snapshot }) => {
  const hasSnapshot = snapshot !== null;

  return (
    <div className="comparison-panel">
      <div className="panel-header">
        <h3 className="panel-title">材质对比</h3>
        {hasSnapshot && (
          <span className="change-info">
            {snapshot.areaName}：{snapshot.materialName}
          </span>
        )}
      </div>
      
      <div className="comparison-content">
        <div className="snapshot-container">
          <div className="snapshot-label">切换前</div>
          <div className="snapshot-frame">
            {hasSnapshot ? (
              <img 
                src={snapshot.before} 
                alt="切换前" 
                className="snapshot-image"
              />
            ) : (
              <div className="snapshot-placeholder">
                <span>暂无快照</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="divider" />
        
        <div className="snapshot-container">
          <div className="snapshot-label">切换后</div>
          <div className="snapshot-frame">
            {hasSnapshot ? (
              <img 
                src={snapshot.after} 
                alt="切换后" 
                className="snapshot-image"
              />
            ) : (
              <div className="snapshot-placeholder">
                <span>暂无快照</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonPanel;
