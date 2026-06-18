import { useState, useEffect } from 'react';
import type { Artifact, Hotspot } from '../types';

interface ArtifactUIProps {
  artifacts: Artifact[];
  currentArtifact: Artifact | null;
  activeHotspot: Hotspot | null;
  isLoading: boolean;
  onSelectArtifact: (id: string) => void;
  onCloseHotspot: () => void;
}

export default function ArtifactUI({
  artifacts,
  currentArtifact,
  activeHotspot,
  isLoading,
  onSelectArtifact,
  onCloseHotspot
}: ArtifactUIProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentArtifact?.id]);

  const handleSelect = (id: string) => {
    onSelectArtifact(id);
  };

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="菜单"
      >
        ☰
      </button>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>文物数字展馆</h1>
          <p>共 {artifacts.length} 件馆藏珍品</p>
        </div>
        <div className="artifact-list">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className={`artifact-item ${
                currentArtifact?.id === artifact.id ? 'selected' : ''
              }`}
              onClick={() => handleSelect(artifact.id)}
            >
              <span className="artifact-item-name">{artifact.name}</span>
              <span className="artifact-item-dynasty">{artifact.dynasty}</span>
            </div>
          ))}
        </div>
      </aside>

      {currentArtifact && (
        <div key={currentArtifact.id} className="info-panel">
          <div className="info-panel-inner">
            <div className="info-panel-name">{currentArtifact.name}</div>
            <div className="info-panel-dynasty">{currentArtifact.dynasty}</div>
            <div className="info-panel-desc">{currentArtifact.description}</div>
            <div className="info-panel-meta">
              材质：<span>{currentArtifact.material}</span>
            </div>
          </div>
        </div>
      )}

      <div className="operation-hint">拖拽旋转 | 滚轮缩放 | 点击金点查看细节</div>

      {activeHotspot && (
        <div className="hotspot-modal-overlay" onClick={onCloseHotspot}>
          <div className="hotspot-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="hotspot-modal-close"
              onClick={onCloseHotspot}
              aria-label="关闭"
            >
              ×
            </button>
            <div className="hotspot-modal-title">{activeHotspot.title}</div>
            <div className="hotspot-modal-desc">{activeHotspot.description}</div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </>
  );
}
