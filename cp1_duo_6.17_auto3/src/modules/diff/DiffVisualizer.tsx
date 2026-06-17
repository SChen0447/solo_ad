import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { diffLines, diffWords, Change } from 'diff';
import CodePreview, { CodePreviewHandle } from '../preview/CodePreview';
import { computeDiff } from '../../services/api';
import type { DiffResult } from '../../types';
import './DiffVisualizer.css';

interface DiffVisualizerProps {
  originalCode: string;
  modifiedCode: string;
}

type TextDiffViewMode = 'inline' | 'side-by-side';
type DiffType = 'text' | 'visual';

interface LineDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  originalNumber: number;
  modifiedNumber: number;
  originalContent: string;
  modifiedContent: string;
  originalChanges?: Change[];
  modifiedChanges?: Change[];
}

const DiffVisualizer: React.FC<DiffVisualizerProps> = ({ originalCode, modifiedCode }) => {
  const originalRef = useRef<CodePreviewHandle>(null);
  const modifiedRef = useRef<CodePreviewHandle>(null);
  const [originalLoaded, setOriginalLoaded] = useState(false);
  const [modifiedLoaded, setModifiedLoaded] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffType, setDiffType] = useState<DiffType>('text');
  const [textViewMode, setTextViewMode] = useState<TextDiffViewMode>('inline');
  const [visualViewMode, setVisualViewMode] = useState<'diff' | 'side-by-side' | 'overlay'>('diff');
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  const computeVisualDiff = useCallback(async () => {
    if (!originalLoaded || !modifiedLoaded) return;
    if (!originalRef.current || !modifiedRef.current) return;

    setIsComputing(true);
    setError(null);

    try {
      const originalScreenshot = await originalRef.current.getScreenshot();
      const modifiedScreenshot = await modifiedRef.current.getScreenshot();

      if (!originalScreenshot || !modifiedScreenshot) {
        setError('无法获取预览截图');
        setIsComputing(false);
        return;
      }

      const result = await computeDiff(originalScreenshot, modifiedScreenshot);
      setDiffResult(result);
    } catch (err) {
      console.error('Diff computation failed:', err);
      setError('差异计算失败，请稍后重试');
    } finally {
      setIsComputing(false);
    }
  }, [originalLoaded, modifiedLoaded]);

  useEffect(() => {
    if (diffType === 'visual' && originalLoaded && modifiedLoaded) {
      const timer = setTimeout(() => {
        computeVisualDiff();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [diffType, originalCode, modifiedCode, originalLoaded, modifiedLoaded, computeVisualDiff]);

  const lineDiffs = useMemo((): LineDiff[] => {
    const changes = diffLines(originalCode, modifiedCode, { ignoreWhitespace: false });
    const result: LineDiff[] = [];
    let originalLineNum = 1;
    let modifiedLineNum = 1;
    let i = 0;

    while (i < changes.length) {
      const change = changes[i];

      if (change.added) {
        const lines = change.value.split('\n').filter((l, idx, arr) => 
          idx < arr.length - 1 || l !== ''
        );
        for (const line of lines) {
          result.push({
            type: 'added',
            originalNumber: 0,
            modifiedNumber: modifiedLineNum++,
            originalContent: '',
            modifiedContent: line
          });
        }
        i++;
      } else if (change.removed) {
        const nextChange = changes[i + 1];
        if (nextChange && nextChange.added) {
          const removedLines = change.value.split('\n').filter((l, idx, arr) => 
            idx < arr.length - 1 || l !== ''
          );
          const addedLines = nextChange.value.split('\n').filter((l, idx, arr) => 
            idx < arr.length - 1 || l !== ''
          );
          
          const maxLines = Math.max(removedLines.length, addedLines.length);
          for (let j = 0; j < maxLines; j++) {
            const removedLine = removedLines[j] || '';
            const addedLine = addedLines[j] || '';
            
            const wordDiff = removedLine && addedLine 
              ? diffWords(removedLine, addedLine)
              : null;

            if (removedLine && addedLine) {
              result.push({
                type: 'modified',
                originalNumber: j < removedLines.length ? originalLineNum++ : 0,
                modifiedNumber: j < addedLines.length ? modifiedLineNum++ : 0,
                originalContent: removedLine,
                modifiedContent: addedLine,
                originalChanges: wordDiff?.filter(c => !c.added),
                modifiedChanges: wordDiff?.filter(c => !c.removed)
              });
            } else if (removedLine) {
              result.push({
                type: 'removed',
                originalNumber: originalLineNum++,
                modifiedNumber: 0,
                originalContent: removedLine,
                modifiedContent: ''
              });
            } else {
              result.push({
                type: 'added',
                originalNumber: 0,
                modifiedNumber: modifiedLineNum++,
                originalContent: '',
                modifiedContent: addedLine
              });
            }
          }
          i += 2;
        } else {
          const lines = change.value.split('\n').filter((l, idx, arr) => 
            idx < arr.length - 1 || l !== ''
          );
          for (const line of lines) {
            result.push({
              type: 'removed',
              originalNumber: originalLineNum++,
              modifiedNumber: 0,
              originalContent: line,
              modifiedContent: ''
            });
          }
          i++;
        }
      } else {
        const lines = change.value.split('\n').filter((l, idx, arr) => 
          idx < arr.length - 1 || l !== ''
        );
        for (const line of lines) {
          result.push({
            type: 'unchanged',
            originalNumber: originalLineNum++,
            modifiedNumber: modifiedLineNum++,
            originalContent: line,
            modifiedContent: line
          });
        }
        i++;
      }
    }

    return result;
  }, [originalCode, modifiedCode]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;
    
    for (const line of lineDiffs) {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else if (line.type === 'modified') modified++;
    }
    
    return { added, removed, modified };
  }, [lineDiffs]);

  const handleDownload = () => {
    if (!diffResult) return;

    const link = document.createElement('a');
    link.download = `diff-${Date.now()}.png`;
    link.href = diffResult.diffImage;
    link.click();
  };

  const renderInlineDiff = () => (
    <div className="inline-diff-container">
      <div className="diff-lines">
        {lineDiffs.map((line, index) => (
          <div
            key={index}
            className={`diff-line line-${line.type}`}
          >
            <span className="line-numbers">
              <span className="line-num original">
                {line.originalNumber > 0 ? line.originalNumber : ''}
              </span>
              <span className="line-num modified">
                {line.modifiedNumber > 0 ? line.modifiedNumber : ''}
              </span>
            </span>
            <span className="line-gutter">
              {line.type === 'added' && '+'}
              {line.type === 'removed' && '-'}
              {line.type === 'modified' && '~'}
            </span>
            {line.type === 'modified' ? (
              <>
                <div className="inline-modified-line">
                  <div className="modified-part removed-part">
                    {line.originalChanges?.map((change, idx) => (
                      <span
                        key={idx}
                        className={`word-diff ${change.removed ? 'word-removed' : ''}`}
                      >
                        {change.value}
                      </span>
                    ))}
                  </div>
                  <div className="modified-part added-part">
                    {line.modifiedChanges?.map((change, idx) => (
                      <span
                        key={idx}
                        className={`word-diff ${change.added ? 'word-added' : ''}`}
                      >
                        {change.value}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <span className="line-content">
                {line.type === 'removed' ? line.originalContent : line.modifiedContent}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSideBySideDiff = () => (
    <div className="side-by-side-diff-container">
      <div className="diff-column">
        <div className="column-header">原始版本</div>
        <div className="diff-lines">
          {lineDiffs.map((line, index) => (
            <div
              key={`left-${index}`}
              className={`diff-line line-${line.type === 'added' ? 'unchanged' : line.type}`}
            >
              <span className="line-numbers">
                <span className="line-num original">
                  {line.originalNumber > 0 ? line.originalNumber : ''}
                </span>
              </span>
              <span className="line-gutter">
                {line.type === 'removed' && '-'}
                {line.type === 'modified' && '~'}
              </span>
              <span className="line-content">
                {line.type === 'modified' ? (
                  line.originalChanges?.map((change, idx) => (
                    <span
                      key={idx}
                      className={`word-diff ${change.removed ? 'word-removed' : ''}`}
                    >
                      {change.value}
                    </span>
                  ))
                ) : (
                  line.originalContent
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="diff-column">
        <div className="column-header">修改版本</div>
        <div className="diff-lines">
          {lineDiffs.map((line, index) => (
            <div
              key={`right-${index}`}
              className={`diff-line line-${line.type === 'removed' ? 'unchanged' : line.type}`}
            >
              <span className="line-numbers">
                <span className="line-num modified">
                  {line.modifiedNumber > 0 ? line.modifiedNumber : ''}
                </span>
              </span>
              <span className="line-gutter">
                {line.type === 'added' && '+'}
                {line.type === 'modified' && '~'}
              </span>
              <span className="line-content">
                {line.type === 'modified' ? (
                  line.modifiedChanges?.map((change, idx) => (
                    <span
                      key={idx}
                      className={`word-diff ${change.added ? 'word-added' : ''}`}
                    >
                      {change.value}
                    </span>
                  ))
                ) : (
                  line.modifiedContent
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="diff-visualizer">
      <div className="diff-toolbar">
        <div className="diff-type-toggle">
          <button
            className={`type-btn ${diffType === 'text' ? 'active' : ''}`}
            onClick={() => setDiffType('text')}
          >
            📝 代码差异
          </button>
          <button
            className={`type-btn ${diffType === 'visual' ? 'active' : ''}`}
            onClick={() => setDiffType('visual')}
          >
            🖼️ 视觉差异
          </button>
        </div>

        {diffType === 'text' ? (
          <div className="view-modes">
            <button
              className={`mode-btn ${textViewMode === 'inline' ? 'active' : ''}`}
              onClick={() => setTextViewMode('inline')}
            >
              行内差异
            </button>
            <button
              className={`mode-btn ${textViewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setTextViewMode('side-by-side')}
            >
              左右对比
            </button>
          </div>
        ) : (
          <div className="view-modes">
            <button
              className={`mode-btn ${visualViewMode === 'diff' ? 'active' : ''}`}
              onClick={() => setVisualViewMode('diff')}
            >
              差异视图
            </button>
            <button
              className={`mode-btn ${visualViewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setVisualViewMode('side-by-side')}
            >
              并排对比
            </button>
            <button
              className={`mode-btn ${visualViewMode === 'overlay' ? 'active' : ''}`}
              onClick={() => setVisualViewMode('overlay')}
            >
              叠加对比
            </button>
          </div>
        )}

        {diffType === 'text' && (
          <div className="diff-actions">
            <div className="diff-stats">
              <span className="stat added">+{stats.added} 新增</span>
              <span className="stat removed">-{stats.removed} 删除</span>
              <span className="stat modified">~{stats.modified} 修改</span>
            </div>
          </div>
        )}

        {diffType === 'visual' && diffResult && (
          <div className="diff-actions">
            <span className="diff-stats">
              差异像素: {diffResult.diffPixels.toLocaleString()}
            </span>
            <button className="download-btn" onClick={handleDownload}>
              导出PNG
            </button>
          </div>
        )}
      </div>

      {diffType === 'visual' && isComputing && (
        <div className="diff-loading">
          <div className="loading-spinner"></div>
          <span>正在计算视觉差异...</span>
        </div>
      )}

      {error && (
        <div className="diff-error">
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {diffType === 'text' && (
        <div className="text-diff-content">
          {textViewMode === 'inline' ? renderInlineDiff() : renderSideBySideDiff()}
        </div>
      )}

      {diffType === 'visual' && visualViewMode === 'diff' && diffResult && (
        <div className="diff-view">
          <img
            src={diffResult.diffImage}
            alt="Diff result"
            className="diff-image"
          />
        </div>
      )}

      {diffType === 'visual' && visualViewMode === 'side-by-side' && (
        <div className="side-by-side-view">
          <div className="preview-panel">
            <div className="panel-label">原始版本</div>
            <CodePreview
              code={originalCode}
              onLoad={() => setOriginalLoaded(true)}
            />
          </div>
          <div className="preview-panel">
            <div className="panel-label">修改版本</div>
            <CodePreview
              code={modifiedCode}
              onLoad={() => setModifiedLoaded(true)}
            />
          </div>
        </div>
      )}

      {diffType === 'visual' && visualViewMode === 'overlay' && diffResult && (
        <div className="overlay-view">
          <div className="overlay-container">
            <img
              src={diffResult.diffImage}
              alt="Diff overlay"
              className="overlay-image"
              style={{ opacity: overlayOpacity / 100 }}
            />
          </div>
          <div className="opacity-slider">
            <label>不透明度: {overlayOpacity}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>
        <CodePreview
          ref={originalRef}
          code={originalCode}
          onLoad={() => setOriginalLoaded(true)}
        />
        <CodePreview
          ref={modifiedRef}
          code={modifiedCode}
          onLoad={() => setModifiedLoaded(true)}
        />
      </div>
    </div>
  );
};

export default DiffVisualizer;
