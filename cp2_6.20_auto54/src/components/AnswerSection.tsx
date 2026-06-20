import React, { useState } from 'react';
import { likeAnswer, postAnswer, type Answer } from '../api';

interface AnswerSectionProps {
  answers: Answer[];
  questionId: string;
  onRefresh: () => void;
}

function AnswerItem({ answer, questionId, depth, onRefresh }: { answer: Answer; questionId: string; depth: number; onRefresh: () => void }) {
  const [liked, setLiked] = useState(answer.liked);
  const [likes, setLikes] = useState(answer.likes);
  const [heartAnim, setHeartAnim] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const handleLike = async () => {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 300);
    try {
      const res = await likeAnswer(questionId, answer.id, 'user1');
      setLiked(res.liked);
      setLikes(res.likes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await postAnswer(questionId, {
        content: replyContent,
        authorId: 'user1',
        authorName: '小王',
        authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
        parentId: answer.id,
      });
      setReplyContent('');
      setShowReply(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginLeft: depth * 20, marginBottom: 8 }}>
      <div style={{
        background: depth === 0 ? '#F8F9FA' : '#F0F2F5',
        borderRadius: 8,
        padding: '12px 14px',
        borderLeft: depth > 0 ? '2px solid #E0D5C5' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <img src={answer.authorAvatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>{answer.authorName}</span>
          <span style={{ fontSize: 11, color: '#bbb' }}>{new Date(answer.createdAt).toLocaleDateString('zh-CN')}</span>
        </div>
        <div style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>{answer.content}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
          <button
            onClick={handleLike}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
              color: liked ? '#FF4444' : '#999', display: 'flex', alignItems: 'center', gap: 4,
              padding: 0,
            }}
          >
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: heartAnim ? 'scale(1.4)' : 'scale(1)',
            }}>
              {liked ? '❤️' : '🤍'}
            </span>
            <span style={{ fontSize: 12 }}>{likes}</span>
          </button>
          <button
            onClick={() => setShowReply(!showReply)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#4A90D9', padding: 0 }}
          >
            回复
          </button>
          {answer.replies.length > 0 && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#999', padding: 0 }}
            >
              {collapsed ? `▶ ${answer.replies.length}条回复` : `▼ 收起回复`}
            </button>
          )}
        </div>

        {showReply && (
          <div style={{ marginTop: 8, animation: 'fadeIn 0.2s ease' }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="写回复..."
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #E0D5C5', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={handleReply}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#4A90D9', color: '#fff', cursor: 'pointer', fontSize: 13 }}
              >
                发送
              </button>
            </div>
          </div>
        )}
      </div>

      {!collapsed && answer.replies.length > 0 && (
        <div>
          {answer.replies.map(reply => (
            <AnswerItem key={reply.id} answer={reply} questionId={questionId} depth={depth + 1} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnswerSection({ answers, questionId, onRefresh }: AnswerSectionProps) {
  const [newAnswer, setNewAnswer] = useState('');

  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim()) return;
    try {
      await postAnswer(questionId, {
        content: newAnswer,
        authorId: 'user1',
        authorName: '小王',
        authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
      });
      setNewAnswer('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input
          value={newAnswer}
          onChange={e => setNewAnswer(e.target.value)}
          placeholder="写下你的回答..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #E0D5C5', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={handleSubmitAnswer}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4A90D9', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
        >
          回答
        </button>
      </div>
      {answers.map(a => (
        <AnswerItem key={a.id} answer={a} questionId={questionId} depth={0} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
