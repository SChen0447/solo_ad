import { useMemo } from 'react';
import type { DiffSegment } from '../types';

interface EditorProps {
  originalContent: string;
  modifiedContent: string;
  onModifiedChange: (content: string) => void;
}

export default function Editor({ originalContent, modifiedContent, onModifiedChange }: EditorProps) {
  const computeDiff = useMemo((): { original: DiffSegment[]; modified: DiffSegment[] } => {
    if (!originalContent || !modifiedContent) {
      return {
        original: [{ type: 'unchanged', value: originalContent }],
        modified: [{ type: 'unchanged', value: modifiedContent }]
      };
    }

    const originalChars = originalContent.split('');
    const modifiedChars = modifiedContent.split('');

    const tokenize = (text: string) => {
      const tokens: string[] = [];
      let current = '';

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/\s/.test(char)) {
          if (current) {
            tokens.push(current);
            current = '';
          }
          tokens.push(char);
        } else if (/[，。！？、；：""''（）《》【】\[\]()<>.,;:!?]/.test(char)) {
          if (current) {
            tokens.push(current);
            current = '';
          }
          tokens.push(char);
        } else {
          current += char;
        }
      }
      if (current) tokens.push(current);
      return tokens;
    };

    const originalTokens = tokenize(originalContent);
    const modifiedTokens = tokenize(modifiedContent);

    const buildLCSMatrix = (a: string[], b: string[]) => {
      const m = a.length;
      const n = b.length;
      const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }
      return dp;
    };

    const dp = buildLCSMatrix(originalTokens, modifiedTokens);

    const originalSegments: DiffSegment[] = [];
    const modifiedSegments: DiffSegment[] = [];

    let i = originalTokens.length;
    let j = modifiedTokens.length;

    const tempOriginal: { type: DiffSegment['type']; tokens: string[] }[] = [];
    const tempModified: { type: DiffSegment['type']; tokens: string[] }[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && originalTokens[i - 1] === modifiedTokens[j - 1]) {
        if (tempOriginal.length === 0 || tempOriginal[tempOriginal.length - 1].type !== 'unchanged') {
          tempOriginal.push({ type: 'unchanged', tokens: [] });
          tempModified.push({ type: 'unchanged', tokens: [] });
        }
        tempOriginal[tempOriginal.length - 1].tokens.unshift(originalTokens[i - 1]);
        tempModified[tempModified.length - 1].tokens.unshift(modifiedTokens[j - 1]);
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        if (tempModified.length === 0 || tempModified[tempModified.length - 1].type !== 'added') {
          tempModified.push({ type: 'added', tokens: [] });
        }
        tempModified[tempModified.length - 1].tokens.unshift(modifiedTokens[j - 1]);
        j--;
      } else {
        if (tempOriginal.length === 0 || tempOriginal[tempOriginal.length - 1].type !== 'removed') {
          tempOriginal.push({ type: 'removed', tokens: [] });
        }
        tempOriginal[tempOriginal.length - 1].tokens.unshift(originalTokens[i - 1]);
        i--;
      }
    }

    tempOriginal.forEach(seg => {
      originalSegments.push({ type: seg.type, value: seg.tokens.join('') });
    });

    tempModified.forEach(seg => {
      modifiedSegments.push({ type: seg.type, value: seg.tokens.join('') });
    });

    return { original: originalSegments, modified: modifiedSegments };
  }, [originalContent, modifiedContent]);

  const renderSegments = (segments: DiffSegment[], isOriginal: boolean) => {
    return segments.map((segment, index) => {
      let className = '';
      if (segment.type === 'removed' && isOriginal) {
        className = 'diff-removed';
      } else if (segment.type === 'added' && !isOriginal) {
        className = 'diff-added';
      }

      return (
        <span key={index} className={className}>
          {segment.value}
        </span>
      );
    });
  };

  const diffStats = useMemo(() => {
    let added = 0;
    let removed = 0;

    computeDiff.modified.forEach(seg => {
      if (seg.type === 'added') added += seg.value.length;
    });
    computeDiff.original.forEach(seg => {
      if (seg.type === 'removed') removed += seg.value.length;
    });

    return { added, removed };
  }, [computeDiff]);

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-stats">
          <span className="stat added">+ {diffStats.added} 字符新增</span>
          <span className="stat removed">- {diffStats.removed} 字符删除</span>
        </div>
      </div>

      <div className="editor-panels">
        <div className="editor-panel original">
          <div className="panel-header">
            <h3>原始版本</h3>
            <span className="panel-badge original-badge">只读</span>
          </div>
          <div className="panel-content original-content">
            <div className="diff-text">
              {renderSegments(computeDiff.original, true)}
            </div>
          </div>
        </div>

        <div className="editor-divider">
          <div className="divider-line" />
          <div className="divider-arrow">→</div>
          <div className="divider-line" />
        </div>

        <div className="editor-panel modified">
          <div className="panel-header">
            <h3>编辑版本</h3>
            <span className="panel-badge modified-badge">可编辑</span>
          </div>
          <div className="panel-content">
            <textarea
              className="editor-textarea"
              value={modifiedContent}
              onChange={(e) => onModifiedChange(e.target.value)}
              placeholder="在此处编辑合同条款..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <div className="editor-preview">
        <div className="panel-header">
          <h3>对比预览</h3>
        </div>
        <div className="panel-content diff-preview">
          <div className="diff-text">
            {renderSegments(computeDiff.modified, false)}
          </div>
        </div>
      </div>

      <style>{`
        .editor-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin: 24px;
          gap: 16px;
          overflow: hidden;
        }

        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--bg-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
        }

        .editor-stats {
          display: flex;
          gap: 16px;
        }

        .stat {
          font-size: 13px;
          font-weight: 500;
          padding: 4px 12px;
          border-radius: 4px;
        }

        .stat.added {
          background: var(--diff-added);
          color: var(--success);
        }

        .stat.removed {
          background: var(--diff-removed);
          color: var(--danger);
        }

        .editor-panels {
          display: flex;
          flex: 1;
          gap: 0;
          min-height: 0;
        }

        .editor-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          min-width: 0;
        }

        .editor-divider {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 40px;
          flex-shrink: 0;
        }

        .divider-line {
          flex: 1;
          width: 1px;
          background: var(--border);
        }

        .divider-arrow {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-tertiary);
        }

        .panel-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .panel-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 4px;
        }

        .original-badge {
          background: var(--bg-secondary);
          color: var(--text-tertiary);
        }

        .modified-badge {
          background: rgba(22, 93, 255, 0.1);
          color: var(--primary);
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .original-content {
          background: var(--bg-tertiary);
        }

        .diff-text {
          padding: 20px 24px;
          font-size: 15px;
          line-height: 1.8;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: 'Noto Serif SC', Georgia, serif;
          color: var(--text-primary);
        }

        .diff-removed {
          background: var(--diff-removed);
          color: var(--danger);
          text-decoration: line-through;
          text-decoration-thickness: 2px;
          border-radius: 3px;
          padding: 0 2px;
          margin: 0 -2px;
        }

        .diff-added {
          background: var(--diff-added);
          color: var(--success);
          border-radius: 3px;
          padding: 0 2px;
          margin: 0 -2px;
          font-weight: 500;
        }

        .editor-textarea {
          width: 100%;
          height: 100%;
          min-height: 400px;
          padding: 20px 24px;
          border: none;
          outline: none;
          resize: none;
          font-size: 15px;
          line-height: 1.8;
          font-family: 'Noto Serif SC', Georgia, serif;
          color: var(--text-primary);
          background: var(--bg-primary);
        }

        .editor-textarea:focus {
          background: rgba(22, 93, 255, 0.02);
        }

        .editor-preview {
          background: var(--bg-primary);
          border-radius: 8px;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          max-height: 200px;
          display: flex;
          flex-direction: column;
        }

        .diff-preview {
          background: var(--bg-secondary);
        }

        .diff-preview .diff-text {
          font-size: 14px;
          padding: 16px 20px;
        }

        @media (max-width: 1280px) {
          .editor-container {
            margin: 16px;
          }

          .editor-panels {
            flex-direction: column;
          }

          .editor-divider {
            flex-direction: row;
            width: 100%;
            height: 40px;
          }

          .divider-line {
            height: 1px;
            width: auto;
            flex: 1;
          }

          .divider-arrow {
            transform: rotate(90deg);
          }
        }
      `}</style>
    </div>
  );
}
