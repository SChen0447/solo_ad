import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { resultsApi } from '../services/api';
import { difficultyLabels } from '../quizEngine';
import type { WrongQuestion, TagStats } from '../types';
import './ResultsPage.css';

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('sessionId') || '';

  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const data = await resultsApi.getResults(sessionId);
        setScore(data.score);
        setTotal(data.total);
        setAccuracy(data.accuracy);
        setWrongQuestions(data.wrongAnswers);
        setTagStats(data.tags);
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const questionsByTag = useMemo(() => {
    const grouped: Record<string, WrongQuestion[]> = {};
    wrongQuestions.forEach((q) => {
      q.tags.forEach((tag) => {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push(q);
      });
    });
    return grouped;
  }, [wrongQuestions]);

  const toggleTag = (tag: string) => {
    setExpandedTag((prev) => (prev === tag ? null : tag));
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="score-card"
        >
          <h1 className="score-title">测验结果</h1>
          <div className="score-display">
            <div className="score-number">
              <span className="score-value">{score}</span>
              <span className="score-divider">/</span>
              <span className="score-total">{total}</span>
            </div>
            <div className="score-percentage">
              正确率 {(accuracy * 100).toFixed(1)}%
            </div>
          </div>
          <div className="score-summary">
            <div className="summary-item">
              <span className="summary-label">答对</span>
              <span className="summary-value correct">{score} 题</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">答错</span>
              <span className="summary-value wrong">{total - score} 题</span>
            </div>
          </div>
        </motion.div>

        {wrongQuestions.length > 0 ? (
          <div className="wrong-section">
            <h2 className="section-title">错题复盘</h2>
            <div className="tags-grid">
              {tagStats.map((tag, index) => (
                <motion.div
                  key={tag.tag}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={`tag-card ${expandedTag === tag.tag ? 'expanded' : ''}`}
                  onClick={() => toggleTag(tag.tag)}
                >
                  <div className="tag-header">
                    <div className="tag-ring-container">
                      <RingChart
                        wrongCount={tag.wrongCount}
                        totalCount={tag.totalCount}
                      />
                    </div>
                    <div className="tag-info">
                      <h3 className="tag-name">{tag.tag}</h3>
                      <p className="tag-stats">
                        错题 {tag.wrongCount} / {tag.totalCount} 题
                      </p>
                    </div>
                    <span className={`expand-icon ${expandedTag === tag.tag ? 'open' : ''}`}>
                      ▾
                    </span>
                  </div>

                  <AnimatePresence>
                    {expandedTag === tag.tag && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="tag-questions"
                      >
                        <div className="questions-list">
                          {questionsByTag[tag.tag]?.map((question, qIndex) => (
                            <motion.div
                              key={question.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: qIndex * 0.05, duration: 0.2 }}
                              className="wrong-card"
                            >
                              <div className="wrong-card-header">
                                <span className={`difficulty-badge difficulty-${question.difficulty}`}>
                                  {difficultyLabels[question.difficulty]}
                                </span>
                                <span className="your-answer">
                                  你的答案: {String.fromCharCode(65 + question.userAnswer)}
                                </span>
                              </div>
                              <h4 className="wrong-question-text">{question.content}</h4>
                              <div className="options-review">
                                {question.options.map((opt, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className={`option-review ${
                                      optIdx === question.correctAnswer
                                        ? 'correct'
                                        : optIdx === question.userAnswer
                                        ? 'wrong'
                                        : ''
                                    }`}
                                  >
                                    <span className="option-letter">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="option-content">{opt}</span>
                                    {optIdx === question.correctAnswer && (
                                      <span className="correct-mark">✓ 正确</span>
                                    )}
                                    {optIdx === question.userAnswer &&
                                      optIdx !== question.correctAnswer && (
                                        <span className="wrong-mark">✗ 你的选择</span>
                                      )}
                                  </div>
                                ))}
                              </div>
                              <div className="explanation-section">
                                <div className="explanation-item">
                                  <span className="explanation-label">解析：</span>
                                  <span className="explanation-text">
                                    {question.explanation}
                                  </span>
                                </div>
                                <div className="explanation-item">
                                  <span className="suggestion-label">复习建议：</span>
                                  <span className="suggestion-text">
                                    {question.reviewSuggestion}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="no-wrong"
          >
            <div className="no-wrong-icon">🎉</div>
            <p className="no-wrong-text">太棒了！全部答对，没有错题！</p>
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="back-btn"
          onClick={() => navigate('/')}
        >
          返回首页
        </motion.button>
      </div>
    </div>
  );
}

function RingChart({ wrongCount, totalCount }: { wrongCount: number; totalCount: number }) {
  const wrongRate = totalCount > 0 ? (wrongCount / totalCount) * 100 : 0;
  const correctRate = 100 - wrongRate;

  const data = [
    { name: '错题', value: wrongRate },
    { name: '正确', value: correctRate }
  ];

  const COLORS = ['#FF6B6B', '#E2E8F0'];

  return (
    <div className="ring-chart-wrapper">
      <ResponsiveContainer width={80} height={80}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={40}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="ring-center">
        <span className="ring-percent">{wrongRate.toFixed(0)}%</span>
      </div>
    </div>
  );
}
