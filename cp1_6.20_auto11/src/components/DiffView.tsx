import { useState, useMemo } from 'react';
import { diff_match_patch, Diff } from 'diff-match-patch';
import type { User, Proposal } from '../types';
import '../styles/diff-view.css';

interface DiffViewProps {
  proposal: Proposal;
  users: User[];
  currentUser: User | null;
  onLike: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onClose: () => void;
}

const DiffView = ({
  proposal,
  users,
  currentUser,
  onLike,
  onReject,
  onClose,
}: DiffViewProps) => {
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const diffs = useMemo(() => {
    const dmp = new diff_match_patch();
    const diffResult = dmp.diff_main(proposal.originalCode, proposal.proposedCode);
    dmp.diff_cleanupSemantic(diffResult);
    return diffResult;
  }, [proposal.originalCode, proposal.proposedCode]);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const originalLines = proposal.originalCode.split('\n');
  const proposedLines = proposal.proposedCode.split('\n');
  const maxLines = Math.max(originalLines.length, proposedLines.length);

  const hasLiked = currentUser ? proposal.likes.includes(currentUser.id) : false;
  const hasRejected = currentUser ? proposal.rejections.includes(currentUser.id) : false;

  const getStatusBadge = () => {
    switch (proposal.status) {
      case 'approved':
        return (
          <span className="status-badge approved">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            已通过
          </span>
        );
      case 'rejected':
        return (
          <span className="status-badge rejected">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            已驳回
          </span>
        );
      default:
        return (
          <span className="status-badge pending">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            待审核
          </span>
        );
    }
  };

  const renderInlineDiff = () => {
    const renderDiffLine = (diff: Diff, key: string) => {
      const [operation, text] = diff;
      let className = '';
      switch (operation) {
        case 1:
          className = 'diff-insert';
          break;
        case -1:
          className = 'diff-delete';
          break;
        default:
          className = 'diff-equal';
      }
      return (
        <span key={key} className={className}>
          {text}
        </span>
      );
    };

    return (
      <div className="inline-diff-container">
        <div className="diff-section-title">
          <span className="title-icon">📋</span>
          内联差异对比
        </div>
        <div className="inline-diff-content">
          <pre className="inline-diff-code">
            {diffs.map((diff, idx) => renderDiffLine(diff, `diff-${idx}`))}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="diff-view-overlay" onClick={onClose}>
      <div className="diff-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="diff-view-header">
          <div className="header-info">
            <div className="proposal-author">
              <div
                className="author-avatar"
                style={{ backgroundColor: proposal.author.color }}
              >
                {proposal.author.avatar}
              </div>
              <div className="author-meta">
                <div className="author-row">
                  <span className="author-name">{proposal.author.name}</span>
                  {getStatusBadge()}
                </div>
                <div className="author-sub">
                  <span>📄 {proposal.fileName}</span>
                  <span>·</span>
                  <span>第 {proposal.startLine}-{proposal.endLine} 行</span>
                  <span>·</span>
                  <span>{formatTime(proposal.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} title="关闭">
            ×
          </button>
        </div>

        <div className="diff-view-body">
          <div className="proposal-description">
            <div className="desc-label">修改说明</div>
            <div className="desc-content">{proposal.description}</div>
          </div>

          <div className="diff-toolbar">
            <div className="tool-group">
              <button
                className={`tool-btn ${showLineNumbers ? 'active' : ''}`}
                onClick={() => setShowLineNumbers(!showLineNumbers)}
              >
                行号
              </button>
            </div>
            <div className="diff-stats">
              <span className="stat add">+ {proposedLines.length - originalLines.length + (proposedLines.length === originalLines.length ? 0 : 0)} 行变化</span>
            </div>
          </div>

          <div className="side-by-side-diff">
            <div className="diff-pane original-pane">
              <div className="diff-pane-header">
                <span className="pane-badge remove">原代码</span>
                <span className="pane-meta">{originalLines.length} 行</span>
              </div>
              <div className="diff-pane-content">
                <table className="diff-table">
                  <tbody>
                    {Array.from({ length: maxLines }, (_, i) => {
                      const line = originalLines[i];
                      const lineContent = line !== undefined ? line : '';
                      return (
                        <tr key={`orig-${i}`} className={line === undefined ? 'empty-line' : ''}>
                          {showLineNumbers && (
                            <td className="line-number">
                              {line !== undefined ? i + 1 : ''}
                            </td>
                          )}
                          <td className={`line-content ${line === undefined ? 'empty' : ''}`}>
                            <code>{lineContent}</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="diff-arrow-col">
              <div className="diff-arrow-container">
                <svg viewBox="0 0 48 48" width="28" height="28" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 24 L34 24"></path>
                  <polyline points="26,16 34,24 26,32"></polyline>
                </svg>
              </div>
            </div>

            <div className="diff-pane proposed-pane">
              <div className="diff-pane-header">
                <span className="pane-badge add">修改后</span>
                <span className="pane-meta">{proposedLines.length} 行</span>
              </div>
              <div className="diff-pane-content">
                <table className="diff-table">
                  <tbody>
                    {Array.from({ length: maxLines }, (_, i) => {
                      const line = proposedLines[i];
                      const origLine = originalLines[i];
                      const lineContent = line !== undefined ? line : '';
                      const isChanged = line !== undefined && origLine !== undefined && line !== origLine;
                      const isAdded = line !== undefined && origLine === undefined;
                      return (
                        <tr
                          key={`prop-${i}`}
                          className={`
                            ${line === undefined ? 'empty-line' : ''}
                            ${isAdded ? 'added-line' : ''}
                            ${isChanged ? 'changed-line' : ''}
                          `}
                        >
                          {showLineNumbers && (
                            <td className={`line-number ${isAdded ? 'added' : ''} ${isChanged ? 'changed' : ''}`}>
                              {line !== undefined ? i + 1 : ''}
                            </td>
                          )}
                          <td className={`line-content ${line === undefined ? 'empty' : ''} ${isAdded ? 'added' : ''} ${isChanged ? 'changed' : ''}`}>
                            <code>{lineContent}</code>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {renderInlineDiff()}
        </div>

        <div className="diff-view-footer">
          <div className="voters-section">
            {proposal.likes.length > 0 && (
              <div className="voters-group likes">
                <span className="voters-label">👍 赞同 ({proposal.likes.length}):</span>
                <div className="voters-avatars">
                  {proposal.likes.map((userId) => {
                    const user = users.find((u) => u.id === userId);
                    if (!user) return null;
                    return (
                      <div
                        key={userId}
                        className="voter-avatar"
                        style={{ backgroundColor: user.color }}
                        title={user.name}
                      >
                        {user.avatar}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {proposal.rejections.length > 0 && (
              <div className="voters-group rejects">
                <span className="voters-label">👎 驳回 ({proposal.rejections.length}):</span>
                <div className="voters-avatars">
                  {proposal.rejections.map((userId) => {
                    const user = users.find((u) => u.id === userId);
                    if (!user) return null;
                    return (
                      <div
                        key={userId}
                        className="voter-avatar"
                        style={{ backgroundColor: user.color }}
                        title={user.name}
                      >
                        {user.avatar}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="vote-actions">
            <button
              className={`vote-btn like ${hasLiked ? 'active' : ''}`}
              onClick={() => onLike(proposal.id)}
              disabled={proposal.status !== 'pending' || !currentUser}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              赞同
              <span className="vote-count">{proposal.likes.length}</span>
            </button>
            <button
              className={`vote-btn reject ${hasRejected ? 'active' : ''}`}
              onClick={() => onReject(proposal.id)}
              disabled={proposal.status !== 'pending' || !currentUser}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
              </svg>
              驳回
              <span className="vote-count">{proposal.rejections.length}</span>
            </button>
            {proposal.status === 'pending' && (
              <div className="vote-hint">
                {proposal.likes.length >= 2 ? '即将通过！' : `还需 ${2 - proposal.likes.length} 票通过`}
                {proposal.rejections.length >= 2 && ' | 将被驳回'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffView;
