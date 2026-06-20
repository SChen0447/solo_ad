import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, BookOpen } from 'lucide-react';

interface Note {
  id: string;
  clubId: string;
  userId: string;
  title: string;
  content: string;
  progress: number;
  createdAt: string;
}

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

interface ClubDetailPageProps {
  currentUser: any;
}

const statusMap = {
  recruiting: '招募中',
  ongoing: '进行中',
  ended: '已结束'
};

const ClubDetailPage: React.FC<ClubDetailPageProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const [club, setClub] = useState<BookClub | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    progress: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchClub();
    fetchNotes();
  }, [id]);

  const fetchClub = async () => {
    try {
      const res = await fetch(`/api/clubs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClub(data);
      }
    } catch (err) {
      console.error('Failed to fetch club:', err);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/clubs/${id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const res = await fetch(`/api/clubs/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newNote,
          userId: currentUser.id
        })
      });
      if (res.ok) {
        setShowNoteForm(false);
        setNewNote({ title: '', content: '', progress: 0 });
        fetchNotes();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const isMember = club && currentUser && club.members.includes(currentUser.id);

  if (!club) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button 
        className="btn btn-outline"
        onClick={() => navigate(-1)}
        style={{ marginBottom: '24px' }}
      >
        <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
        返回
      </button>

      <div className="club-detail-header">
        <img 
          src={club.coverUrl} 
          alt={club.name}
          className="club-detail-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${club.id}/200/200`;
          }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: '12px' }}>{club.name}</h1>
          <div style={{ display: 'flex', gap: '24px', color: '#7A6554', fontSize: '14px', marginBottom: '16px' }}>
            <span><BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{club.bookTitle}</span>
            <span><Users size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{club.members.length}/{club.maxMembers} 人</span>
            <span><Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{club.startTime} ~ {club.endTime}</span>
            <span className={`club-card-status ${club.status}`}>{statusMap[club.status]}</span>
          </div>
          <p style={{ color: '#7A6554', fontSize: '14px' }}>{club.description}</p>
        </div>
      </div>

      <div className="section-header">
        <h2 style={{ fontSize: '22px' }}>读书笔记</h2>
        {isMember && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowNoteForm(!showNoteForm)}
          >
            发布笔记
          </button>
        )}
      </div>

      {showNoteForm && (
        <div className="profile-section" style={{ marginBottom: '24px' }}>
          <form onSubmit={handleAddNote}>
            <div className="form-group">
              <label className="form-label">笔记标题</label>
              <input
                type="text"
                className="form-input"
                value={newNote.title}
                onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">阅读进度：{newNote.progress}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={newNote.progress}
                onChange={e => setNewNote({ ...newNote, progress: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">笔记内容</label>
              <textarea
                className="form-input"
                rows={4}
                value={newNote.content}
                onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowNoteForm(false)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                发布
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="note-list">
        {notes.length > 0 ? (
          notes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <div className="note-card-title">{note.title}</div>
                <span className="note-card-progress">
                  {note.progress}%
                </span>
              </div>
              <div className="note-card-content">{note.content}</div>
              <div className="note-card-footer">
                用户 {note.userId.slice(0, 8)} · {new Date(note.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7A6554' }}>
            暂无笔记
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubDetailPage;
