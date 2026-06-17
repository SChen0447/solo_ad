import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchProposals,
  fetchCurrentUser,
  type Proposal,
  type Comment,
  type User,
} from './dataFetcher';
import ProposalCard from './components/ProposalCard';
import DetailDrawer from './components/DetailDrawer';

type Category = '全部' | '技术' | '设计' | '运营' | '公益';

const categories: Category[] = ['全部', '技术', '设计', '运营', '公益'];

export default function App() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('全部');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [data, user] = await Promise.all([
          fetchProposals(),
          fetchCurrentUser(),
        ]);
        setProposals(data);
        setCurrentUser(user);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProposals = useMemo(() => {
    if (activeCategory === '全部') return proposals;
    return proposals.filter((p) => p.category === activeCategory);
  }, [proposals, activeCategory]);

  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
  };

  const handleCardClick = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const handleVoteChange = (
    proposalId: string,
    type: 'like' | 'dislike',
    delta: number
  ) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? type === 'like'
            ? { ...p, likes: p.likes + delta }
            : { ...p, dislikes: p.dislikes + delta }
          : p
      )
    );
  };

  const handleAddComment = (proposalId: string, comment: Comment) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? { ...p, comments: [comment, ...p.comments] }
          : p
      )
    );
    setSelectedProposal((prev) =>
      prev && prev.id === proposalId
        ? { ...prev, comments: [comment, ...prev.comments] }
        : prev
    );
  };

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case '全部':
        return 'fa-layer-group';
      case '技术':
        return 'fa-code';
      case '设计':
        return 'fa-palette';
      case '运营':
        return 'fa-bullhorn';
      case '公益':
        return 'fa-heart';
      default:
        return 'fa-circle';
    }
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo">
            <i className="fas fa-lightbulb"></i>
            <span>创意提案板</span>
          </div>
          <div className="category-nav">
            {categories.map((category) => (
              <button
                key={category}
                className={`nav-item ${
                  activeCategory === category ? 'active' : ''
                }`}
                onClick={() => handleCategoryChange(category)}
              >
                <i className={`fas ${getCategoryIcon(category)}`}></i>
                <span>{category}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <header className="page-header">
          <h1>
            <i className="fas fa-rocket"></i> 探索创意
          </h1>
          <p className="page-subtitle">
            发现团队成员和社区用户的精彩想法，参与投票与讨论
          </p>
        </header>

        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line short"></div>
                <div className="skeleton-footer">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton skeleton-name"></div>
                  <div className="skeleton-votes">
                    <div className="skeleton skeleton-vote-btn"></div>
                    <div className="skeleton skeleton-vote-btn"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className="card-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {filteredProposals.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <h3>该分类暂无提案</h3>
                  <p>快来成为第一个提出创意的人吧！</p>
                </div>
              ) : (
                filteredProposals.map((proposal, index) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    index={index}
                    onClick={() => handleCardClick(proposal)}
                    onVoteChange={handleVoteChange}
                  />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <DetailDrawer
        isOpen={drawerOpen}
        proposal={selectedProposal}
        currentUser={currentUser}
        onClose={handleCloseDrawer}
        onAddComment={handleAddComment}
      />
    </div>
  );
}
