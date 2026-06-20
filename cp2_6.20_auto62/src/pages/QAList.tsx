import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchQuestions,
  postAnswer,
  likeAnswer,
  postReply,
  CURRENT_USER,
  type Question,
  type Answer,
} from '../api';

export default function QAList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [replyVisible, setReplyVisible] = useState<Record<string, boolean>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [likedAnim, setLikedAnim] = useState<Record<string, boolean>>({});

  const loadQuestions = async () => {
    try {
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedQ(prev => (prev === id ? null : id));
  };

  const handlePostAnswer = async (questionId: string) => {
    const content = answerTexts[questionId]?.trim();
    if (!content) return;
    try {
      await postAnswer(questionId, {
        content,
        authorId: CURRENT_USER.id,
        authorName: CURRENT_USER.name,
      });
      setAnswerTexts(prev => ({ ...prev, [questionId]: '' }));
      loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (questionId: string, answerId: string) => {
    try {
      await likeAnswer(questionId, answerId, CURRENT_USER.id);
      setLikedAnim(prev => ({ ...prev, [answerId]: true }));
      setTimeout(() => {
        setLikedAnim(prev => ({ ...prev, [answerId]: false }));
      }, 300);
      loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleReply = (answerId: string) => {
    setReplyVisible(prev => ({ ...prev, [answerId]: !prev[answerId] }));
  };

  const handlePostReply = async (questionId: string, answerId: string) => {
    const content = replyTexts[answerId]?.trim();
    if (!content) return;
    try {
      await postReply(questionId, answerId, {
        content,
        authorId: CURRENT_USER.id,
        authorName: CURRENT_USER.name,
      });
      setReplyTexts(prev => ({ ...prev, [answerId]: '' }));
      setReplyVisible(prev => ({ ...prev, [answerId]: false }));
      loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const isLikedByUser = (answer: Answer) => answer.likedBy.includes(CURRENT_USER.id);

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">社区问答</h1>
        <div className="page-header-actions">
          <Link to="/qa/ask">我要提问</Link>
        </div>
      </div>

      {questions.length === 0 && (
        <div className="empty-state">暂无问题，快来提问吧！</div>
      )}

      {questions.map(q => (
        <div key={q.id} className="qa-card">
          <div className="qa-title" onClick={() => toggleExpand(q.id)}>
            {q.title}
          </div>
          <div className="qa-content">{q.content}</div>
          <div className="qa-tags">
            {q.tags.map((tag, i) => (
              <span key={i} className="qa-tag">{tag}</span>
            ))}
          </div>
          <div className="qa-meta">
            {q.authorName} · {new Date(q.createdAt).toLocaleDateString('zh-CN')} · {q.answers.length} 个回答
          </div>

          {expandedQ === q.id && (
            <>
              <div className="answer-list">
                {q.answers.map(a => (
                  <div key={a.id} className="answer-item">
                    <div className="answer-content">{a.content}</div>
                    <div className="answer-actions">
                      <button
                        className={`btn-like ${isLikedByUser(a) ? 'liked' : ''} ${likedAnim[a.id] ? 'heart-bounce' : ''}`}
                        onClick={() => handleLike(q.id, a.id)}
                      >
                        ♥ {a.likes}
                      </button>
                      <button
                        className="btn-reply-trigger"
                        onClick={() => toggleReply(a.id)}
                      >
                        回复
                      </button>
                      <span style={{ color: '#aaa', fontSize: 12 }}>
                        {a.authorName} · {new Date(a.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {replyVisible[a.id] && (
                      <div className="reply-box">
                        <textarea
                          className="reply-input"
                          placeholder="写下你的回复..."
                          value={replyTexts[a.id] || ''}
                          onChange={e => setReplyTexts(prev => ({ ...prev, [a.id]: e.target.value }))}
                        />
                        <button
                          className="reply-submit"
                          onClick={() => handlePostReply(q.id, a.id)}
                        >
                          发送回复
                        </button>
                      </div>
                    )}

                    {a.replies.length > 0 && (
                      <div className="reply-list">
                        {a.replies.map(r => (
                          <div key={r.id} className="reply-item">
                            <span className="reply-author">{r.authorName}</span>：{r.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="answer-section">
                <textarea
                  className="answer-textarea"
                  placeholder="写下你的回答..."
                  value={answerTexts[q.id] || ''}
                  onChange={e => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
                <button
                  className="answer-submit-btn"
                  onClick={() => handlePostAnswer(q.id)}
                >
                  提交回答
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
