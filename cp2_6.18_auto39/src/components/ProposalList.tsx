import { useState } from 'react';
import type { ProposalListItem } from '../types';
import './ProposalList.css';

interface ProposalListProps {
  proposals: ProposalListItem[];
  onSelect: (id: string) => void;
  isLoading: boolean;
  renderStars: (score: number, size?: number) => JSX.Element;
}

export default function ProposalList({ proposals, onSelect, isLoading, renderStars }: ProposalListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', paddingTop: 40 }}>
        <p style={{ color: '#6b7280', fontSize: 16 }}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>分享提案</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>共 {proposals.length} 个分享提案，点击卡片查看详情</p>
      </div>

      <div className="proposal-grid">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className={`proposal-card ${expandedId === proposal.id ? 'expanded' : ''}`}
            onClick={() => {
              if (expandedId === proposal.id) {
                onSelect(proposal.id);
              } else {
                setExpandedId(proposal.id);
              }
            }}
          >
            <h3 className="proposal-title">{proposal.title}</h3>
            <p className="proposal-author">作者：{proposal.author}</p>
            <p
              className={`proposal-summary ${expandedId === proposal.id ? 'expanded' : ''}`}
            >
              {proposal.summary}
            </p>

            <div className="proposal-footer">
              <div className="proposal-score">
                {renderStars(Math.round(proposal.averageScore))}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {proposal.averageScore.toFixed(1)}
                </span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  ({proposal.ratingCount} 人)
                </span>
              </div>
              <span className="proposal-date">
                {proposal.createdAt}
              </span>
            </div>

            {expandedId === proposal.id && (
              <div className="proposal-cta fade-in">
                <span>点击查看详情 →</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {proposals.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: '#6b7280', fontSize: 16 }}>暂无分享提案</p>
        </div>
      )}
    </div>
  );
}
