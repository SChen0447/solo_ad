import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookClubCard from '../components/BookClubCard';
import Modal from '../components/Modal';
import { Plus } from 'lucide-react';

interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  coverUrl: string;
  startTime: string;
  endTime: string;
  description: string;
  maxMembers: number;
  creatorId: string;
  status: 'recruiting' | 'ongoing' | 'ended';
  members: string[];
  pendingMembers: string[];
}

interface ClubsPageProps {
  currentUser: any;
}

const ClubsPage: React.FC<ClubsPageProps> = ({ currentUser }) => {
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClub, setNewClub] = useState({
    name: '',
    bookTitle: '',
    startTime: '',
    endTime: '',
    description: '',
    maxMembers: 20
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const res = await fetch('/api/clubs');
      const data = await res.json();
      setClubs(data);
    } catch (err) {
      console.error('Failed to fetch clubs:', err);
    }
    setLoading(false);
  };

  const handleJoin = async (clubId: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const res = await fetch(`/api/clubs/${clubId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        fetchClubs();
        alert('申请已提交，请等待管理员审核');
      }
    } catch (err) {
      console.error('Failed to join club:', err);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClub,
          creatorId: currentUser.id
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewClub({
          name: '',
          bookTitle: '',
          startTime: '',
          endTime: '',
          description: '',
          maxMembers: 20
        });
        fetchClubs();
      }
    } catch (err) {
      console.error('Failed to create club:', err);
    }
  };

  const isMember = (club: BookClub) => {
    return currentUser && club.members.includes(currentUser.id);
  };

  const isPending = (club: BookClub) => {
    return currentUser && club.pendingMembers.includes(currentUser.id);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">读书会</h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7A6554' }}>
          加载中...
        </div>
      ) : (
        <div className="club-list">
          {clubs.map((club, index) => (
            <div key={club.id} style={{ animationDelay: `${index * 0.08}s` }}>
              <BookClubCard
                club={club}
                onClick={() => navigate(`/clubs/${club.id}`)}
                onJoin={() => handleJoin(club.id)}
                isMember={isMember(club)}
                isPending={isPending(club)}
              />
            </div>
          ))}
        </div>
      )}

      {currentUser && (
        <button 
          className="create-club-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={28} />
        </button>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="创建读书会"
      >
        <form onSubmit={handleCreateClub}>
          <div className="form-group">
            <label className="form-label">读书会名称</label>
            <input
              type="text"
              className="form-input"
              value={newClub.name}
              onChange={e => setNewClub({ ...newClub, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">共读书目</label>
            <input
              type="text"
              className="form-input"
              value={newClub.bookTitle}
              onChange={e => setNewClub({ ...newClub, bookTitle: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">开始时间</label>
              <input
                type="date"
                className="form-input"
                value={newClub.startTime}
                onChange={e => setNewClub({ ...newClub, startTime: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">结束时间</label>
              <input
                type="date"
                className="form-input"
                value={newClub.endTime}
                onChange={e => setNewClub({ ...newClub, endTime: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">最大人数</label>
            <input
              type="number"
              className="form-input"
              value={newClub.maxMembers}
              onChange={e => setNewClub({ ...newClub, maxMembers: parseInt(e.target.value) || 20 })}
              min="2"
              max="100"
            />
          </div>
          <div className="form-group">
            <label className="form-label">简介</label>
            <textarea
              className="form-input"
              rows={3}
              value={newClub.description}
              onChange={e => setNewClub({ ...newClub, description: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              创建
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClubsPage;
