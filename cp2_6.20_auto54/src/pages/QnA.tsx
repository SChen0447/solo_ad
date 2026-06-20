import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchQuestions, type Question } from '../api';
import QuestionCard from '../components/QuestionCard';
import AnswerSection from '../components/AnswerSection';

const containerStyle: React.CSSProperties = {
  padding: '20px 24px',
  maxWidth: 800,
  margin: '0 auto',
};

const expandBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#4A90D9', cursor: 'pointer',
  fontSize: 13, padding: '4px 0', marginTop: 4,
};

export default function QnA() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadQuestions = () => {
    fetchQuestions()
      .then(setQuestions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}>加载中...</div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#333' }}>社区问答</h2>
        <button
          onClick={() => navigate('/ask')}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4A90D9, #357ABD)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
        >
          我要提问
        </button>
      </div>

      {questions.map(q => (
        <div key={q.id}>
          <div onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} style={{ cursor: 'pointer' }}>
            <QuestionCard question={q} />
          </div>
          {expandedId === q.id && (
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#555', lineHeight: 1.6 }}>{q.content}</p>
              <AnswerSection answers={q.answers} questionId={q.id} onRefresh={loadQuestions} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
