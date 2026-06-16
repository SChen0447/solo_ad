import { useMemo, useState } from 'react';
import * as Diff from 'diff';
import { Check, X } from 'lucide-react';
import { GeneratedComment } from '../utils/CommentGenerator';

interface DiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  comments: GeneratedComment[];
  onCommentToggle: (commentId: string) => void;
  onLineClick: (lineNumber: number) => void;
}

interface DiffLinePair {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  oldContent: string;
  newContent: string;
  commentId?: string;
  isCommentLine?: boolean;
  isChecked?: boolean;
}

export default function DiffViewer({
  originalCode,
  modifiedCode,
  comments,
  onCommentToggle,
  onLineClick
}: DiffViewerProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const diffLines = useMemo(() => {
    const diff = Diff.diffLines(originalCode, modifiedCode, { ignoreWhitespace: false, newlineIsToken: false });
    const lines: DiffLinePair[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    const appliedComments = comments.filter(c => c.applied);

    for (const part of diff) {
      const partLines = part.value.split('\n');
      if (partLines[partLines.length - 1] === '') {
        partLines.pop();
      }

      for (const line of partLines) {
        if (part.added) {
          const isComment = appliedComments.some(c => {
            const commentLines = c.text.split('\n');
            return newLineNum >= c.targetLine && newLineNum < c.targetLine + commentLines.length;
          });

          const matchingComment = appliedComments.find(c => {
            const commentLines = c.text.split('\n');
            return newLineNum >= c.targetLine && newLineNum < c.targetLine + commentLines.length;
          });

          lines.push({
            type: 'added',
            oldLineNumber: null,
            newLineNumber: newLineNum,
            oldContent: '',
            newContent: line,
            commentId: matchingComment?.id,
            isCommentLine: isComment,
            isChecked: matchingComment?.applied
          });
          newLineNum++;
        } else if (part.removed) {
          lines.push({
            type: 'removed',
            oldLineNumber: oldLineNum,
            newLineNumber: null,
            oldContent: line,
            newContent: ''
          });
          oldLineNum++;
        } else {
          lines.push({
            type: 'unchanged',
            oldLineNumber: oldLineNum,
            newLineNumber: newLineNum,
            oldContent: line,
            newContent: line
          });
          oldLineNum++;
          newLineNum++;
        }
      }
    }

    return lines;
  }, [originalCode, modifiedCode, comments]);

  const handleLineClick = (
    e: React.MouseEvent,
    line: DiffLinePair
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (line.type === 'added' && line.isCommentLine) {
      setTooltip({
        x: rect.left,
        y: rect.top - 10,
        text: line.newContent
      });
    }

    if (line.oldLineNumber) {
      onLineClick(line.oldLineNumber);
    } else if (line.newLineNumber) {
      onLineClick(line.newLineNumber);
    }

    setTimeout(() => setTooltip(null), 2000);
  };

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <div className="diff-column-header diff-left">
          <div className="diff-line-numbers diff-column">
            <span className="diff-header-text">行号</span>
          </div>
          <div className="diff-content diff-column">
            <span className="diff-header-text">原始代码</span>
          </div>
        </div>
        <div className="diff-column-header diff-right">
          <div className="diff-line-numbers diff-column">
            <span className="diff-header-text">行号</span>
          </div>
          <div className="diff-content diff-column">
            <span className="diff-header-text">带注释代码</span>
          </div>
          <div className="diff-actions diff-column">
            <span className="diff-header-text">应用</span>
          </div>
        </div>
      </div>
      <div className="diff-body">
        {diffLines.map((line, idx) => {
          const isFirstLineOfComment = line.commentId &&
            (idx === 0 || diffLines[idx - 1]?.commentId !== line.commentId);
          const comment = line.commentId ? comments.find(c => c.id === line.commentId) : null;

          return (
            <div
              key={idx}
              className={`diff-row ${line.type}`}
              onClick={(e) => handleLineClick(e, line)}
            >
              <div className="diff-column diff-line-numbers">
                <span className="line-no">{line.oldLineNumber || ''}</span>
              </div>
              <div className="diff-column diff-content diff-original">
                <pre>{line.oldContent || '\u00A0'}</pre>
              </div>
              <div className="diff-column diff-line-numbers">
                <span className="line-no">{line.newLineNumber || ''}</span>
              </div>
              <div className="diff-column diff-content diff-modified">
                <pre>{line.newContent || '\u00A0'}</pre>
              </div>
              <div className="diff-column diff-actions">
                {comment && isFirstLineOfComment && (
                  <button
                    className={`comment-checkbox ${comment.applied ? 'checked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCommentToggle(comment.id);
                    }}
                    title={comment.applied ? '取消应用' : '应用注释'}
                  >
                    {comment.applied ? <Check size={14} /> : <X size={14} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {tooltip && (
        <div
          className="diff-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
