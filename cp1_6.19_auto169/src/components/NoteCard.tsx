import { useState } from 'react';
import { Note, User, api } from '../api';

interface Props {
  note: Note;
  currentUserId: string;
  users: User[];
  onUpdate: () => void;
}

export default function NoteCard({ note, currentUserId, users, onUpdate }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const user = users.find((u) => u.id === note.userId);

  const isLiked = note.likes.includes(currentUserId);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await api.notes.like(note.id, currentUserId);
      await onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isCommenting) return;
    setIsCommenting(true);
    try {
      await api.notes.addComment(note.id, currentUserId, newComment.trim());
      setNewComment('');
      setShowComments(true);
      await onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommenting(false);
    }
  };

  const getCommentUser = (userId: string) => users.find((u) => u.id === userId);

  return (
    <div className="note-card fade-in" key={note.id}>
      <div className="note-card-header">
        <div className="avatar-wrapper">
          <img
            className="avatar avatar-small"
            src={user?.avatar || 'https://i.pravatar.cc/80?img=99'}
            alt={user?.name || '用户'}
          />
        </div>
        <div className="note-card-user">
          <div className="note-card-username">{user?.name || '匿名用户'}</div>
          <div className="note-card-time">
            {new Date(note.createdAt).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        <div className="note-card-rating">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={'star' + (s <= note.rating ? ' filled' : '')}>
              ★
            </span>
          ))}
        </div>
      </div>

      <div className="note-card-content">{note.content}</div>

      {note.tags.length > 0 && (
        <div className="note-card-tags">
          {note.tags.map((t) => (
            <span key={t} className="note-card-tag">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="note-card-footer">
        <div className="note-card-actions">
          <button
            className={'like-btn' + (isLiked ? ' liked' : '')}
            onClick={handleLike}
            disabled={isLiking}
          >
            <span className="heart-icon">{isLiked ? '❤' : '♡'}</span>
            <span>{note.likes.length}</span>
          </button>
          <button className="comment-btn" onClick={() => setShowComments(!showComments)}>
            <span>💬</span>
            <span>{note.comments.length}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <div className="comments-section">
          {note.comments.length > 0 && (
            note.comments.map((c) => {
              const cu = getCommentUser(c.userId);
              return (
                <div key={c.id} className="comment-item">
                  <div className="avatar-wrapper">
                    <img
                      className="avatar avatar-small"
                      src={cu?.avatar || 'https://i.pravatar.cc/80?img=99'}
                      alt={cu?.name || '用户'}
                      style={{ width: 32, height: 32, borderWidth: 2 }}
                    />
                  </div>
                  <div className="comment-content">
                    <div className="comment-user">{cu?.name || '匿名用户'}</div>
                    <div className="comment-text">{c.content}</div>
                    <div className="comment-time">
                      {new Date(c.createdAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="comment-input-wrap">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              placeholder="回复这条笔记..."
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isCommenting}
            >
              {isCommenting ? '发送中' : '回复'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
