import React, { useState, useEffect, useRef, useCallback } from 'react';
import { diffLines, Change } from 'diff';
import { useRoomStore, Version } from '../context/RoomContext';

const VersionPanel: React.FC = () => {
  const { versions, manualSave, inRoom, content } = useRoomStore();
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [diffChanges, setDiffChanges] = useState<Change[]>([]);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const openDiff = useCallback((version: Version) => {
    setSelectedVersion(version);
    const idx = versions.findIndex((v) => v.id === version.id);
    const oldContent = idx > 0 ? htmlToText(versions[idx - 1].content) : '';
    const newContent = htmlToText(version.content);
    const changes = diffLines(oldContent, newContent);
    setDiffChanges(changes);
    setDiffModalOpen(true);
  }, [versions]);

  const closeDiff = useCallback(() => {
    setDiffModalOpen(false);
    setSelectedVersion(null);
    setDiffChanges([]);
  }, []);

  const handleLeftScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const sortedVersions = [...versions].reverse();

  const renderDiffSide = useCallback(
    (side: 'old' | 'new') => {
      return diffChanges.map((change, i) => {
        const text = change.value;
        if (change.added) {
          if (side === 'new') {
            return (
              <span key={i} style={styles.diffAdded}>
                {text}
              </span>
            );
          }
          return null;
        }
        if (change.removed) {
          if (side === 'old') {
            return (
              <span key={i} style={styles.diffRemoved}>
                {text}
              </span>
            );
          }
          return null;
        }
        return <span key={i}>{text}</span>;
      });
    },
    [diffChanges]
  );

  function getOldContent(version: Version): string {
    const idx = versions.findIndex((v) => v.id === version.id);
    if (idx <= 0) return '';
    return htmlToText(versions[idx - 1].content);
  }

  if (!inRoom) {
    return (
      <div style={styles.emptyPanel}>
        <p style={styles.emptyText}>版本历史将在加入房间后显示</p>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h3 style={styles.panelTitle}>版本历史</h3>
        <button
          style={styles.saveBtn}
          onClick={manualSave}
          className="action-btn"
        >
          💾 保存快照
        </button>
      </div>

      <div style={styles.versionList}>
        {sortedVersions.map((version, index) => (
          <div
            key={version.id}
            style={{
              ...styles.versionItem,
              animationDelay: `${index * 0.05}s`,
            }}
            className="version-item"
            onClick={() => openDiff(version)}
          >
            <div style={styles.versionDot} />
            <div style={styles.versionInfo}>
              <div style={styles.versionId}>{version.id}</div>
              <div style={styles.versionTime}>
                {formatTime(version.timestamp)}
              </div>
              {version.authors &&
                Object.keys(version.authors).length > 0 && (
                  <div style={styles.versionAuthors}>
                    {Object.keys(version.authors).join(', ')}
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {diffModalOpen && selectedVersion && (
        <div style={styles.modalOverlay} onClick={closeDiff}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                版本对比 — {selectedVersion.id}
              </h3>
              <button style={styles.closeBtn} onClick={closeDiff}>
                ✕
              </button>
            </div>
            <div style={styles.diffContainer}>
              <div style={styles.diffSide}>
                <div style={styles.diffSideHeader}>旧版本</div>
                <div
                  ref={leftScrollRef}
                  style={styles.diffScroll}
                  onScroll={handleLeftScroll}
                >
                  <pre style={styles.diffPre}>{getOldContent(selectedVersion)}</pre>
                </div>
              </div>
              <div style={styles.diffSide}>
                <div style={styles.diffSideHeader}>新版本</div>
                <div
                  ref={rightScrollRef}
                  style={styles.diffScroll}
                  onScroll={handleRightScroll}
                >
                  <pre style={styles.diffPre}>{renderDiffSide('new')}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function htmlToText(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '280px',
    height: '100%',
    background: '#FFFDF7',
    borderLeft: '1px solid #E8DFC8',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '16px',
    borderBottom: '1px solid #E8DFC8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: '#2C2C2C',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  saveBtn: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '8px',
    background: '#2C2C2C',
    color: '#FAF3E0',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: 'background 0.2s',
  },
  versionList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
  },
  versionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 0',
    cursor: 'pointer',
    borderBottom: '1px solid #F0E8D8',
    animation: 'slideIn 0.3s ease-out both',
  },
  versionDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#D4C5A0',
    marginTop: '4px',
    flexShrink: 0,
  },
  versionInfo: {
    flex: 1,
    minWidth: 0,
  },
  versionId: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2C2C2C',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  versionTime: {
    fontSize: '12px',
    color: '#999',
    marginTop: '2px',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  versionAuthors: {
    fontSize: '11px',
    color: '#B8A88A',
    marginTop: '2px',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#FFFDF7',
    borderRadius: '16px',
    width: '90vw',
    maxWidth: '1100px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #E8DFC8',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#2C2C2C',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: '8px',
    background: 'transparent',
    color: '#666',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  diffSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  diffSideHeader: {
    padding: '8px 16px',
    background: '#F5ECD7',
    fontSize: '12px',
    fontWeight: 600,
    color: '#666',
    fontFamily: "'Noto Sans SC', sans-serif",
    borderBottom: '1px solid #E8DFC8',
  },
  diffScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  diffPre: {
    margin: 0,
    fontFamily: "'Noto Serif SC', serif",
    fontSize: '14px',
    lineHeight: '1.8',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: '#2C2C2C',
  },
  diffAdded: {
    background: 'rgba(0,200,0,0.15)',
    borderRadius: '2px',
  },
  diffRemoved: {
    background: 'rgba(200,0,0,0.15)',
    textDecoration: 'line-through',
    borderRadius: '2px',
  },
  emptyPanel: {
    width: '280px',
    height: '100%',
    background: '#FFFDF7',
    borderLeft: '1px solid #E8DFC8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: '13px',
    fontFamily: "'Noto Sans SC', sans-serif",
  },
};

export default VersionPanel;
