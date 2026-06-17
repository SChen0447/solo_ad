import React, { useState, useMemo, useCallback } from 'react';
import * as Diff from 'diff';
import DiffPanel from './DiffPanel';
import { saveMerge, type DocumentVersion } from '../utils/api';

interface MergePanelProps {
  leftContent: string;
  rightContent: string;
  leftVersion?: DocumentVersion;
  rightVersion?: DocumentVersion;
  onMergeComplete?: (mergedDoc: DocumentVersion) => void;
}

const MergePanel: React.FC<MergePanelProps> = ({
  leftContent,
  rightContent,
  leftVersion,
  rightVersion,
  onMergeComplete,
}) => {
  const [checkedLines, setCheckedLines] = useState<Set<number>>(new Set());
  const [isMerging, setIsMerging] = useState(false);

  const rightLines = useMemo(() => rightContent.split('\n'), [rightContent]);
  const leftLines = useMemo(() => leftContent.split('\n'), [leftContent]);

  const totalDiffCount = useMemo(() => {
    let count = 0;
    const result = Diff.diffArrays(leftLines, rightLines);
    result.forEach((part) => {
      if (part.added || part.removed) {
        count += part.value.length;
      }
    });
    return count;
  }, [leftLines, rightLines]);

  const rightDiffIndices = useMemo(() => {
    const result = Diff.diffArrays(leftLines, rightLines);
    const indices: number[] = [];
    let rightIdx = 0;

    result.forEach((part) => {
      if (part.added) {
        part.value.forEach(() => {
          indices.push(rightIdx);
          rightIdx++;
        });
      } else if (part.removed) {
        // removed lines don't affect right index
      } else {
        rightIdx += part.value.length;
      }
    });

    return indices;
  }, [leftLines, rightLines]);

  const handleLineToggle = useCallback((globalIndex: number) => {
    setCheckedLines((prev) => {
      const next = new Set(prev);
      if (next.has(globalIndex)) {
        next.delete(globalIndex);
      } else {
        next.add(globalIndex);
      }
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    setCheckedLines(new Set(rightDiffIndices.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setCheckedLines(new Set());
  };

  const mergedContent = useMemo(() => {
    const result = Diff.diffArrays(leftLines, rightLines);
    const merged: string[] = [];
    let rightDiffCounter = 0;

    result.forEach((part) => {
      if (part.added) {
        part.value.forEach((line: string) => {
          if (checkedLines.has(rightDiffCounter)) {
            merged.push(line);
          }
          rightDiffCounter++;
        });
      } else if (part.removed) {
        part.value.forEach((line: string) => {
          merged.push(line);
        });
      } else {
        part.value.forEach((line: string) => {
          merged.push(line);
        });
      }
    });

    return merged.join('\n');
  }, [leftLines, rightLines, checkedLines]);

  const handleApplyMerge = async () => {
    if (!leftVersion || !rightVersion) return;

    setIsMerging(true);
    try {
      const result = await saveMerge(mergedContent, leftVersion.id, rightVersion.id);
      onMergeComplete?.(result);
    } catch (error) {
      console.error('Merge failed:', error);
      alert('合并保存失败，请重试');
    } finally {
      setIsMerging(false);
    }
  };

  const showFloatBar = totalDiffCount > 5;
  const mergedCount = checkedLines.size;

  const leftTitle = leftVersion
    ? `基准版本 v${leftVersion.version}`
    : '基准版本';
  const rightTitle = rightVersion
    ? `比较版本 v${rightVersion.version}`
    : '比较版本';

  return (
    <div className="merge-panel-container">
      <div className="merge-toolbar" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button className="btn btn-outline" onClick={handleSelectAll}>
          全选差异
        </button>
        <button className="btn btn-outline" onClick={handleDeselectAll}>
          取消全选
        </button>
        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '14px', color: '#666' }}>
          已选择 <strong style={{ color: '#007bff' }}>{mergedCount}</strong> / {totalDiffCount} 差异行
        </span>
        <button
          className="btn btn-primary"
          onClick={handleApplyMerge}
          disabled={isMerging}
        >
          {isMerging ? '保存中...' : '应用合并'}
        </button>
      </div>

      <DiffPanel
        leftContent={leftContent}
        rightContent={rightContent}
        leftTitle={leftTitle}
        rightTitle={rightTitle}
        showCheckboxes={true}
        checkedLines={checkedLines}
        onLineToggle={handleLineToggle}
      />

      {showFloatBar && (
        <div className="merge-float-bar">
          <div className="merge-progress">
            合并进度：<span className="count">{mergedCount}</span> / {totalDiffCount} 行
          </div>
          <button
            className="btn btn-primary"
            onClick={handleApplyMerge}
            disabled={isMerging}
          >
            {isMerging ? '保存中...' : '应用合并'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MergePanel;
