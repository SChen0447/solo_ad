import { useMemo, useState } from 'react';
import { Annotation } from '../utils/markdownExporter';

interface AnnotationScannerProps {
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
}

type TabType = 'all' | 'TODO' | 'FIXME' | 'HACK';

export default function AnnotationScanner({
  annotations,
  onAnnotationClick
}: AnnotationScannerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const grouped = useMemo(() => {
    return {
      TODO: annotations.filter(a => a.type === 'TODO'),
      FIXME: annotations.filter(a => a.type === 'FIXME'),
      HACK: annotations.filter(a => a.type === 'HACK')
    };
  }, [annotations]);

  const displayedAnnotations = useMemo(() => {
    if (activeTab === 'all') return annotations;
    return grouped[activeTab];
  }, [activeTab, annotations, grouped]);

  const tabs: { key: TabType; label: string; icon: string; color: string }[] = [
    { key: 'all', label: '全部', icon: '📋', color: '#89b4fa' },
    { key: 'TODO', label: 'TODO', icon: '✅', color: '#a6e3a1' },
    { key: 'FIXME', label: 'FIXME', icon: '🔧', color: '#f38ba8' },
    { key: 'HACK', label: 'HACK', icon: '⚠️', color: '#fab387' }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TODO': return { bg: 'rgba(166, 227, 161, 0.15)', text: '#a6e3a1', border: '#a6e3a1' };
      case 'FIXME': return { bg: 'rgba(243, 139, 168, 0.15)', text: '#f38ba8', border: '#f38ba8' };
      case 'HACK': return { bg: 'rgba(250, 179, 135, 0.15)', text: '#fab387', border: '#fab387' };
      default: return { bg: 'rgba(137, 180, 250, 0.15)', text: '#89b4fa', border: '#89b4fa' };
    }
  };

  return (
    <div className="annotation-scanner">
      <div className="scanner-header">
        <h3>
          <span className="header-icon">🔍</span>
          注释扫描
        </h3>
      </div>

      <div className="tabs">
        {tabs.map(tab => {
          const count = tab.key === 'all' ? annotations.length : grouped[tab.key as keyof typeof grouped].length;
          return (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? { borderColor: tab.color, color: tab.color } : {}}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count" style={activeTab === tab.key ? { background: tab.color, color: '#1e1e2e' } : {}}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="annotation-list">
        {displayedAnnotations.length === 0 ? (
          <div className="empty-scan">
            <div className="empty-scan-icon">🔎</div>
            <p>{activeTab === 'all' ? '代码中暂未发现注释标注' : `暂无${activeTab}标注`}</p>
            <p className="empty-scan-hint">
              支持格式：// TODO、// FIXME、// HACK
            </p>
          </div>
        ) : (
          displayedAnnotations.map(ann => {
            const colors = getTypeColor(ann.type);
            return (
              <div
                key={ann.id}
                className="annotation-item"
                onClick={() => onAnnotationClick(ann)}
                style={{ '--type-bg': colors.bg, '--type-border': colors.border }}
              >
                <div
                  className="annotation-type-badge"
                  style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
                >
                  {ann.type}
                </div>
                <div className="annotation-content-wrapper">
                  <p className="annotation-content">{ann.content}</p>
                  <div className="annotation-raw">{ann.rawText}</div>
                </div>
                <div className="annotation-line" style={{ color: colors.text }}>
                  L{ann.line}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .annotation-scanner {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: #181825;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 16px;
        }
        .scanner-header {
          margin-bottom: 16px;
          flex-shrink: 0;
        }
        .scanner-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cdd6f4;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-icon {
          font-size: 18px;
        }
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 6px;
          color: #6c7086;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab:hover {
          color: #cdd6f4;
          border-color: #45475a;
        }
        .tab.active {
          background: #1e1e2e;
          font-weight: 600;
        }
        .tab-icon {
          font-size: 12px;
        }
        .tab-count {
          background: #313244;
          color: #a6adc8;
          font-size: 11px;
          font-weight: 700;
          padding: 1px 8px;
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .annotation-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-right: 4px;
        }
        .annotation-list::-webkit-scrollbar {
          width: 6px;
        }
        .annotation-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .annotation-list::-webkit-scrollbar-thumb {
          background: #45475a;
          border-radius: 3px;
        }
        .empty-scan {
          text-align: center;
          padding: 32px 24px;
          color: #6c7086;
        }
        .empty-scan-icon {
          font-size: 36px;
          margin-bottom: 12px;
          opacity: 0.6;
        }
        .empty-scan p {
          margin: 0;
          font-size: 13px;
        }
        .empty-scan-hint {
          font-size: 11px !important;
          margin-top: 8px !important;
          opacity: 0.7;
          font-family: 'JetBrains Mono', monospace;
        }
        .annotation-item {
          display: flex;
          gap: 10px;
          padding: 12px;
          background: var(--type-bg);
          border: 1px solid var(--type-border);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: slide-in 0.3s ease;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .annotation-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .annotation-type-badge {
          flex-shrink: 0;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          height: fit-content;
          border: 1px solid;
          letter-spacing: 0.5px;
        }
        .annotation-content-wrapper {
          flex: 1;
          min-width: 0;
        }
        .annotation-content {
          margin: 0 0 6px 0;
          color: #cdd6f4;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }
        .annotation-raw {
          color: #6c7086;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .annotation-line {
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
          align-self: center;
        }
      `}</style>
    </div>
  );
}
