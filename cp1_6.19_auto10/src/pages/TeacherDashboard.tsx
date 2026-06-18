import { useState, useEffect } from 'react';
import { useQuizStore } from '../store/quizStore';
import { Question, QuestionType, Submission } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatAnswerDisplay } from '../utils/grading';

const colorInterpolate = (t: number): string => {
  const r = Math.round(239 + (34 - 239) * t);
  const g = Math.round(68 + (197 - 68) * t);
  const b = Math.round(68 + (94 - 68) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const questionTypeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  fill: '填空题',
  judge: '判断题',
};

function TeacherDashboard() {
  const {
    currentQuiz,
    submissions,
    quizStats,
    loading,
    error,
    createQuiz,
    fetchSubmissions,
    publishResults,
    fetchStats,
    setSelectedStudent,
    selectedStudent,
    setCurrentQuiz,
  } = useQuizStore();

  const [view, setView] = useState<'create' | 'dashboard' | 'studentDetail'>('create');
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState<Omit<Question, 'id'>[]>([]);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('single');
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (polling && currentQuiz && !currentQuiz.isPublished) {
      interval = setInterval(() => {
        fetchSubmissions(currentQuiz.id);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [polling, currentQuiz, fetchSubmissions]);

  const addQuestion = () => {
    const newQuestion: Omit<Question, 'id'> = {
      type: newQuestionType,
      content: '',
      score: 1,
      answer: newQuestionType === 'multiple' ? [] : newQuestionType === 'judge' ? true : '',
      options:
        newQuestionType === 'single' || newQuestionType === 'multiple'
          ? ['', '', '', '']
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<Omit<Question, 'id'>>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      alert('请输入测验标题');
      return;
    }
    if (questions.length === 0) {
      alert('请至少添加一道题目');
      return;
    }

    const validQuestions = questions.filter((q) => q.content.trim());
    if (validQuestions.length === 0) {
      alert('请填写题目内容');
      return;
    }

    const quiz = await createQuiz(quizTitle, validQuestions);
    if (quiz) {
      setView('dashboard');
      setPolling(true);
      fetchSubmissions(quiz.id);
    }
  };

  const handlePublish = async () => {
    if (!currentQuiz) return;
    await publishResults(currentQuiz.id);
    await fetchStats(currentQuiz.id);
    setPolling(false);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const handleBackToCreate = () => {
    setCurrentQuiz(null);
    setSelectedStudent(null);
    setQuizTitle('');
    setQuestions([]);
    setView('create');
    setPolling(false);
  };

  const renderCreateForm = () => (
    <div className="container">
      <header className="header">
        <h1>创建数学测验</h1>
        <p className="subtitle">快速创建互动式测验，实时收集学生作答数据</p>
      </header>

      <div className="card">
        <div className="form-group">
          <label>测验标题</label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="请输入测验标题"
            className="input"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>题目列表</h2>
          <div className="add-question-row">
            <select
              value={newQuestionType}
              onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
              className="select"
            >
              <option value="single">单选题</option>
              <option value="multiple">多选题</option>
              <option value="fill">填空题</option>
              <option value="judge">判断题</option>
            </select>
            <button onClick={addQuestion} className="btn btn-primary">
              + 添加题目
            </button>
          </div>
        </div>

        {questions.length === 0 && (
          <div className="empty-state">
            <p>还没有题目，点击上方"添加题目"开始创建</p>
          </div>
        )}

        {questions.map((q, qIndex) => (
          <div key={qIndex} className="question-item">
            <div className="question-header">
              <span className="question-number">第 {qIndex + 1} 题</span>
              <span className="question-type-badge">{questionTypeLabels[q.type]}</span>
              <button onClick={() => removeQuestion(qIndex)} className="btn btn-text btn-danger">
                删除
              </button>
            </div>

            <div className="form-group">
              <label>题目内容</label>
              <textarea
                value={q.content}
                onChange={(e) => updateQuestion(qIndex, { content: e.target.value })}
                placeholder="请输入题目内容"
                className="textarea"
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>分值</label>
                <input
                  type="number"
                  value={q.score}
                  onChange={(e) =>
                    updateQuestion(qIndex, { score: parseInt(e.target.value) || 1 })
                  }
                  className="input input-small"
                  min={1}
                />
              </div>
            </div>

            {(q.type === 'single' || q.type === 'multiple') && q.options && (
              <div className="options-list">
                <label>选项</label>
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="option-row">
                    <span className="option-label">{String.fromCharCode(65 + optIndex)}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...(q.options || [])];
                        newOptions[optIndex] = e.target.value;
                        updateQuestion(qIndex, { options: newOptions });
                      }}
                      placeholder={`选项 ${String.fromCharCode(65 + optIndex)}`}
                      className="input"
                    />
                    {q.type === 'single' ? (
                      <input
                        type="radio"
                        name={`answer-${qIndex}`}
                        checked={q.answer === opt}
                        onChange={() => updateQuestion(qIndex, { answer: opt })}
                        className="radio"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={Array.isArray(q.answer) && q.answer.includes(opt)}
                        onChange={(e) => {
                          const currentAnswer = Array.isArray(q.answer) ? q.answer : [];
                          if (e.target.checked) {
                            updateQuestion(qIndex, {
                              answer: [...currentAnswer, opt],
                            });
                          } else {
                            updateQuestion(qIndex, {
                              answer: currentAnswer.filter((a) => a !== opt),
                            });
                          }
                        }}
                        className="checkbox"
                      />
                    )}
                  </div>
                ))}
                <p className="hint">勾选 radio/checkbox 设置正确答案</p>
              </div>
            )}

            {q.type === 'fill' && (
              <div className="form-group">
                <label>正确答案</label>
                <input
                  type="text"
                  value={q.answer as string}
                  onChange={(e) => updateQuestion(qIndex, { answer: e.target.value })}
                  placeholder="请输入正确答案"
                  className="input"
                />
              </div>
            )}

            {q.type === 'judge' && (
              <div className="form-group">
                <label>正确答案</label>
                <div className="judge-options">
                  <label className="judge-option">
                    <input
                      type="radio"
                      name={`judge-${qIndex}`}
                      checked={q.answer === true}
                      onChange={() => updateQuestion(qIndex, { answer: true })}
                    />
                    <span>正确</span>
                  </label>
                  <label className="judge-option">
                    <input
                      type="radio"
                      name={`judge-${qIndex}`}
                      checked={q.answer === false}
                      onChange={() => updateQuestion(qIndex, { answer: false })}
                    />
                    <span>错误</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={handleCreateQuiz} className="btn btn-primary btn-large" disabled={loading}>
          {loading ? '创建中...' : '创建测验'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );

  const renderDashboard = () => {
    const chartData =
      quizStats?.questionStats.map((stat, index) => ({
        name: `第${index + 1}题`,
        正确率: Math.round(stat.correctRate * 100),
        correctRate: stat.correctRate,
      })) || [];

    return (
      <div className="container dashboard">
        <header className="header">
          <div className="header-row">
            <div>
              <h1>{currentQuiz?.title}</h1>
              <p className="subtitle">邀请码: {currentQuiz?.code}</p>
            </div>
            <button onClick={handleBackToCreate} className="btn btn-outline">
              返回创建
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h2>实时看板</h2>
              <span className="badge">
                {submissions.length} 人已提交
              </span>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-state">
                <p>暂无学生提交</p>
                <p className="hint">等待学生输入邀请码加入测验</p>
              </div>
            ) : (
              <div className="student-list">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="student-card"
                    onClick={() => {
                      if (currentQuiz?.isPublished) {
                        setSelectedStudent(sub);
                        setView('studentDetail');
                      }
                    }}
                  >
                    <div className="student-info">
                      <span className="student-name">{sub.studentName}</span>
                      <span className="submit-time">{formatTime(sub.submittedAt)}</span>
                    </div>
                    {currentQuiz?.isPublished && (
                      <div className="student-score">
                        <span className="score-number">{sub.totalScore}</span>
                        <span className="score-label">分</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!currentQuiz?.isPublished && (
              <div className="actions">
                <button
                  onClick={handlePublish}
                  className="btn btn-primary btn-large"
                  disabled={loading || submissions.length === 0}
                >
                  {loading ? '公布中...' : '公布结果'}
                </button>
              </div>
            )}
          </div>

          {currentQuiz?.isPublished && quizStats && (
            <div className="card">
              <div className="card-header">
                <h2>全班正确率统计</h2>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fill: '#1e3a5f' }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#1e3a5f' }} unit="%" />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, '正确率']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="正确率" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colorInterpolate(entry.correctRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="stats-summary">
                <div className="stat-item">
                  <span className="stat-value">{submissions.length}</span>
                  <span className="stat-label">参考人数</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {submissions.length > 0
                      ? Math.round(
                          (submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) /
                            submissions.length) *
                            10
                        ) / 10
                      : 0}
                  </span>
                  <span className="stat-label">平均分</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {currentQuiz.questions.reduce((sum, q) => sum + q.score, 0)}
                  </span>
                  <span className="stat-label">满分</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudentDetail = () => {
    if (!selectedStudent || !currentQuiz) return null;

    return (
      <div className="container">
        <header className="header">
          <div className="header-row">
            <div>
              <h1>{selectedStudent.studentName} 的答题详情</h1>
              <p className="subtitle">
                总分: {selectedStudent.totalScore} /{' '}
                {currentQuiz.questions.reduce((sum, q) => sum + q.score, 0)} 分 | 正确率:{' '}
                {selectedStudent.correctCount}/{currentQuiz.questions.length}
              </p>
            </div>
            <button onClick={() => setView('dashboard')} className="btn btn-outline">
              返回看板
            </button>
          </div>
        </header>

        <div className="card">
          {selectedStudent.questionResults?.map((result, index) => {
            const question = currentQuiz.questions.find((q) => q.id === result.questionId);
            if (!question) return null;

            return (
              <div
                key={result.questionId}
                className={`question-detail ${result.isCorrect ? '' : 'question-wrong'}`}
              >
                <div className="question-detail-header">
                  <span className="question-number">第 {index + 1} 题</span>
                  <span className={`result-badge ${result.isCorrect ? 'correct' : 'wrong'}`}>
                    {result.isCorrect ? '✓ 正确' : '✗ 错误'}
                  </span>
                  <span className="score-text">
                    {result.earnedScore}/{result.score} 分
                  </span>
                </div>
                <p className="question-content">{question.content}</p>
                <div className="answer-compare">
                  <div className="answer-row">
                    <span className="answer-label">学生答案：</span>
                    <span className="answer-text">
                      {formatAnswerDisplay(result.studentAnswer, question.options)}
                    </span>
                  </div>
                  <div className="answer-row">
                    <span className="answer-label">正确答案：</span>
                    <span className="answer-text correct-answer">
                      {formatAnswerDisplay(result.correctAnswer, question.options)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {view === 'create' && renderCreateForm()}
      {view === 'dashboard' && renderDashboard()}
      {view === 'studentDetail' && renderStudentDetail()}

      <style>{`
        .app {
          min-height: 100vh;
          background-color: #f0f4f8;
          padding: 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 24px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        h1 {
          color: #1e3a5f;
          font-size: 28px;
          margin-bottom: 4px;
        }

        h2 {
          color: #1e3a5f;
          font-size: 18px;
        }

        .subtitle {
          color: #64748b;
          font-size: 14px;
        }

        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 24px;
          margin-bottom: 20px;
          transition: box-shadow 0.3s ease;
        }

        .card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #1e3a5f;
          font-weight: 500;
          font-size: 14px;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          background: #fff;
        }

        .input:focus {
          outline: none;
          border-color: #1e3a5f;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
        }

        .input-small {
          width: 100px;
        }

        .textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
        }

        .textarea:focus {
          outline: none;
          border-color: #1e3a5f;
        }

        .select {
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 14px;
          background: #fff;
          cursor: pointer;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .btn:active {
          transform: scale(0.97);
        }

        .btn-primary {
          background-color: #1e3a5f;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2a4a73;
        }

        .btn-primary:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }

        .btn-outline {
          background-color: transparent;
          color: #1e3a5f;
          border: 1px solid #1e3a5f;
        }

        .btn-outline:hover {
          background-color: rgba(30, 58, 95, 0.05);
        }

        .btn-text {
          background: none;
          padding: 4px 8px;
          font-size: 13px;
        }

        .btn-danger {
          color: #ef4444;
        }

        .btn-large {
          padding: 14px 32px;
          font-size: 16px;
        }

        .add-question-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .question-item {
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1px solid #e2e8f0;
        }

        .question-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .question-number {
          font-weight: 600;
          color: #1e3a5f;
        }

        .question-type-badge {
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 12px;
        }

        .options-list {
          margin-top: 12px;
        }

        .options-list > label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #1e3a5f;
          font-size: 14px;
        }

        .option-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .option-label {
          color: #64748b;
          min-width: 24px;
        }

        .radio, .checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .hint {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
        }

        .judge-options {
          display: flex;
          gap: 24px;
        }

        .judge-option {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .actions {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-top: 16px;
          text-align: center;
        }

        .badge {
          background: #1e3a5f;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
        }

        .student-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .student-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #f8fafc;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .student-card:hover {
          background: #f1f5f9;
        }

        .student-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .student-name {
          font-weight: 500;
          color: #1e3a5f;
        }

        .submit-time {
          font-size: 12px;
          color: #94a3b8;
        }

        .student-score {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .score-number {
          font-size: 24px;
          font-weight: 700;
          color: #1e3a5f;
        }

        .score-label {
          font-size: 12px;
          color: #64748b;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .chart-container {
          width: 100%;
          height: 300px;
        }

        .stats-summary {
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 28px;
          font-weight: 700;
          color: #1e3a5f;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
        }

        .question-detail {
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #e5e7eb;
        }

        .question-wrong {
          background-color: #fee2e2;
        }

        .question-detail-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .result-badge {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .result-badge.correct {
          background: #dcfce7;
          color: #16a34a;
        }

        .result-badge.wrong {
          background: #fee2e2;
          color: #dc2626;
        }

        .score-text {
          margin-left: auto;
          color: #64748b;
          font-size: 14px;
        }

        .question-content {
          font-size: 15px;
          margin-bottom: 12px;
          color: #1e293b;
        }

        .answer-compare {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
        }

        .answer-row {
          display: flex;
          gap: 8px;
        }

        .answer-label {
          color: #64748b;
          min-width: 70px;
        }

        .answer-text {
          color: #1e293b;
        }

        .correct-answer {
          color: #16a34a;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .app {
            padding: 12px;
          }
          
          h1 {
            font-size: 22px;
          }
          
          .card {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default TeacherDashboard;
