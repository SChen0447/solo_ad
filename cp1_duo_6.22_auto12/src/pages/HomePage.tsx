import React, { useState, useMemo } from 'react';
import type { ProposalStatus, Proposal } from '../data/types';
import { mockProposals, avgRating } from '../data/mockData';
import ProposalCard from '../components/ProposalCard';
import { statusLabels } from '../data/types';

interface HomePageProps {
  onSelectProposal: (id: string) => void;
  onCreateNew: () => void;
}

const allStatuses: (ProposalStatus | 'all')[] = ['all', 'draft', 'sent', 'accepted', 'rejected'];
const starFilters = [0, 1, 2, 3, 4, 5];

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const HomePage: React.FC<HomePageProps> = ({ onSelectProposal, onCreateNew }) => {
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [starFilter, setStarFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [gridKey, setGridKey] = useState(0);

  const filteredProposals = useMemo(() => {
    let result: Proposal[] = [...mockProposals];

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    if (starFilter > 0) {
      result = result.filter(p => {
        const rating = avgRating(p.comments);
        return rating >= starFilter && rating < starFilter + 1;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [statusFilter, starFilter, searchQuery]);

  const handleStatusChange = (status: ProposalStatus | 'all') => {
    setStatusFilter(status);
    setGridKey(prev => prev + 1);
  };

  const handleStarChange = (stars: number) => {
    setStarFilter(starFilter === stars ? 0 : stars);
    setGridKey(prev => prev + 1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">项目提案看板</h1>
        <p className="page-subtitle">管理所有客户提案，追踪反馈与版本迭代</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">状态：</span>
          {allStatuses.map(status => (
            <button
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => handleStatusChange(status)}
            >
              {status === 'all' ? '全部' : statusLabels[status as ProposalStatus]}
            </button>
          ))}
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">星级：</span>
          {starFilters.slice(1).map(stars => (
            <button
              key={stars}
              className={`filter-btn ${starFilter === stars ? 'active' : ''}`}
              onClick={() => handleStarChange(stars)}
              title={`${stars}星及以上`}
            >
              <StarIcon filled={starFilter === stars} />
              <span>{stars}星</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="搜索提案标题、描述或客户名称..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            setGridKey(prev => prev + 1);
          }}
        />

        <button className="btn-pill btn-pill-primary" onClick={onCreateNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建提案
        </button>
      </div>

      {filteredProposals.length > 0 ? (
        <div key={gridKey} className="proposal-grid">
          {filteredProposals.map((proposal, index) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              index={index}
              onClick={() => onSelectProposal(proposal.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <p className="empty-state-text">暂无符合条件的提案</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;
