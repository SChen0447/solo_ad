import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GitCompare, X, Plus, Minus, RefreshCw } from 'lucide-react';
import { DiffResult, Version } from '../../version/types';
import { computeDiff } from '../../version/utils/diff';
import '../styles/DiffViewer.css';

interface DiffViewerProps {
  leftVersion: Version | null;
  rightVersion: Version | null;
  onClose: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  leftVersion,
  rightVersion,
  onClose,
}) => {
  const [syncScroll, setSyncScroll] = useState(true);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (leftVersion && rightVersion) {
      const startTime = performance.now();
      const result = computeDiff(leftVersion.code, rightVersion.code);
      setDiffResult(result);
      const endTime = performance.now();
      console.log(`Diff computed in ${endTime - startTime}ms`);
    } else {
      setDiffResult(null);
    }
  }, [leftVersion, rightVersion]);

  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || isSyncing.current) return;
    
    isSyncing.current = true;
    
    const sourceEl = source === 'left' ? leftPaneRef.current : rightPaneRef.current;
    const targetEl = source === 'left' ? rightPaneRef.current : leftPaneRef.current;
    
    if (sourceEl && targetEl) {
      const scrollRatio = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight || 1);
      const targetScrollTop = scrollRatio * (targetEl.scrollHeight - targetEl.clientHeight);
      targetEl.scrollTop = targetScrollTop;
    }
    
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [syncScroll]);

  const addedCount = diffResult ? 
    diffResult.rightLines.filter(l => l.type === 'added').length : 0;
  const removedCount = diffResult ? 
    diffResult.leftLines.filter(l => l.type === 'removed').length : 0;

  if (!leftVersion || !rightVersion || !diffResult) {
    return (
      <div className="diff-viewer">
        <div className="diff-empty">
          <div className="diff-empty-icon">
            <GitCompare size={48} />
          </div>
          <div>请选择两个版本进行对比</div>
        </div>
      </div>
    );
  }

  const renderLine = (line: { type: string; content: string; lineNumber: number }, index: number) => {
    const isEmpty = line.lineNumber === -1;
    return (
      <div
        key={index}
        className={`diff-line ${line.type} ${isEmpty ? 'empty' : ''}`}
      >
        <span className="diff-line-number">
          {isEmpty ? '' : line.lineNumber}
        </span>
        <span className="diff-line-content">
          {line.content || ' '}
        </span>
      </div>
    );
  };

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-title">
          <GitCompare size={18} />
          版本对比
          <div className="diff-stats">
            <span className="diff-stat added">
              <Plus size={14} />
              {addedCount}
            </span>
            <span className="diff-stat removed">
              <Minus size={14} />
              {removedCount}
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className={`diff-sync-toggle ${syncScroll ? 'enabled' : ''}`}>
            <RefreshCw size={14} />
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
            />
            同步滚动
          </label>
          <button className="diff-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="diff-content">
        <div className="diff-pane">
          <div className="diff-pane-header">
            <span>旧版本</span>
            <span className="diff-pane-version">v{leftVersion.versionNumber}</span>
          </div>
          <div 
            className="diff-code-container"
            ref={leftPaneRef}
            onScroll={() => handleScroll('left')}
          >
            <div className="diff-code">
              {diffResult.leftLines.map((line, index) => renderLine(line, index))}
            </div>
          </div>
        </div>
        
        <div className="diff-pane">
          <div className="diff-pane-header">
            <span>新版本</span>
            <span className="diff-pane-version">v{rightVersion.versionNumber}</span>
          </div>
          <div 
            className="diff-code-container"
            ref={rightPaneRef}
            onScroll={() => handleScroll('right')}
          >
            <div className="diff-code">
              {diffResult.rightLines.map((line, index) => renderLine(line, index))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
