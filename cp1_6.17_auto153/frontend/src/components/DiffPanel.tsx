import React, { useMemo } from 'react';
import * as Diff from 'diff';

export interface DiffLineData {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  leftLineNumber?: number;
  rightLineNumber?: number;
}

interface DiffPanelProps {
  leftContent: string;
  rightContent: string;
  leftTitle?: string;
  rightTitle?: string;
  showCheckboxes?: boolean;
  checkedLines?: Set<number>;
  onLineToggle?: (rightLineIndex: number) => void;
}

const DiffPanel: React.FC<DiffPanelProps> = ({
  leftContent,
  rightContent,
  leftTitle = '基准版本',
  rightTitle = '比较版本',
  showCheckboxes = false,
  checkedLines = new Set(),
  onLineToggle,
}) => {
  const { leftLines, rightLines, totalDiffLines } = useMemo(() => {
    const left = leftContent.split('\n');
    const right = rightContent.split('\n');

    const diffResult = Diff.diffArrays(left, right);

    const leftResult: DiffLineData[] = [];
    const rightResult: DiffLineData[] = [];
    let leftLineNum = 1;
    let rightLineNum = 1;
    let diffCount = 0;

    diffResult.forEach((part) => {
      if (part.added) {
        diffCount += part.value.length;
        part.value.forEach((line: string) => {
          leftResult.push({
            type: 'removed' as const,
            content: '',
            leftLineNumber: undefined,
            rightLineNumber: rightLineNum,
          });
          rightResult.push({
            type: 'added' as const,
            content: line,
            leftLineNumber: undefined,
            rightLineNumber: rightLineNum,
          });
          rightLineNum++;
        });
      } else if (part.removed) {
        diffCount += part.value.length;
        part.value.forEach((line: string) => {
          leftResult.push({
            type: 'removed' as const,
            content: line,
            leftLineNumber: leftLineNum,
            rightLineNumber: undefined,
          });
          rightResult.push({
            type: 'added' as const,
            content: '',
            leftLineNumber: leftLineNum,
            rightLineNumber: undefined,
          });
          leftLineNum++;
        });
      } else {
        part.value.forEach((line: string) => {
          leftResult.push({
            type: 'unchanged' as const,
            content: line,
            leftLineNumber: leftLineNum,
            rightLineNumber: rightLineNum,
          });
          rightResult.push({
            type: 'unchanged' as const,
            content: line,
            leftLineNumber: leftLineNum,
            rightLineNumber: rightLineNum,
          });
          leftLineNum++;
          rightLineNum++;
        });
      }
    });

    return {
      leftLines: leftResult,
      rightLines: rightResult,
      totalDiffLines: diffCount,
    };
  }, [leftContent, rightContent]);

  const getLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'diff-line-added';
      case 'removed':
        return 'diff-line-removed';
      case 'modified':
        return 'diff-line-modified';
      default:
        return 'diff-line-unchanged';
    }
  };

  const getSymbol = (type: string) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'modified':
        return '~';
      default:
        return ' ';
    }
  };

  const getTooltip = (type: string) => {
    switch (type) {
      case 'added':
        return '新增行';
      case 'removed':
        return '删除行';
      case 'modified':
        return '修改行';
      default:
        return '';
    }
  };

  const rightDiffIndices = useMemo(() => {
    const indices: number[] = [];
    rightLines.forEach((line, index) => {
      if (line.type === 'added' || line.type === 'modified') {
        indices.push(index);
      }
    });
    return indices;
  }, [rightLines]);

  const renderLine = (line: DiffLineData, side: 'left' | 'right', lineIndex: number) => {
    const lineNum = side === 'left' ? line.leftLineNumber : line.rightLineNumber;
    const isDiffLine = line.type !== 'unchanged';
    const showCheckbox = side === 'right' && showCheckboxes && line.type === 'added';
    const globalRightIndex = side === 'right' ? rightDiffIndices.indexOf(lineIndex) : -1;
    const isChecked = showCheckbox && globalRightIndex >= 0 && checkedLines.has(globalRightIndex);

    return (
      <div
        key={`${side}-${lineIndex}`}
        className={`diff-line ${getLineClass(line.type)}`}
        data-tooltip={isDiffLine ? getTooltip(line.type) : undefined}
      >
        {showCheckbox && (
          <div className="diff-line-checkbox">
            <input
              type="checkbox"
              className="custom-checkbox"
              checked={isChecked}
              onChange={() => {
                if (onLineToggle && globalRightIndex >= 0) {
                  onLineToggle(globalRightIndex);
                }
              }}
            />
          </div>
        )}
        <div className="diff-line-number">{lineNum || ''}</div>
        {isDiffLine && (
          <div className={`diff-line-symbol ${line.type}`}>{getSymbol(line.type)}</div>
        )}
        {!isDiffLine && side === 'right' && showCheckboxes && (
          <div className="diff-line-symbol" style={{ visibility: 'hidden' }}> </div>
        )}
        <div className="diff-line-content">{line.content || ' '}</div>
      </div>
    );
  };

  return (
    <div className="diff-container">
      <div className="diff-panel">
        <div className="diff-panel-header">
          <span>{leftTitle}</span>
          <span className="version-info">共 {leftLines.filter((l) => l.leftLineNumber).length} 行</span>
        </div>
        <div className="diff-panel-content">
          {leftLines.map((line, index) => renderLine(line, 'left', index))}
        </div>
      </div>

      <div className="diff-panel">
        <div className="diff-panel-header">
          <span>{rightTitle}</span>
          <span className="version-info">
            共 {rightLines.filter((l) => l.rightLineNumber).length} 行 | 差异 {totalDiffLines} 行
          </span>
        </div>
        <div className="diff-panel-content">
          {rightLines.map((line, index) => renderLine(line, 'right', index))}
        </div>
      </div>
    </div>
  );
};

export default DiffPanel;
