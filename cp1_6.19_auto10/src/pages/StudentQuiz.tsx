import { useState, useEffect } from 'react';
import { useQuizStore } from '../store/quizStore';
import { Quiz, StudentAnswer } from '../types';

function StudentQuiz() {
  const { currentQuiz, loading, error, fetchQuizByCode, submitAnswers } = useQuizStore();

  const [step, setStep] = useState<'join' | 'quiz' | 'submitted'>('join');
  const [inviteCode, setInviteCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState<Map<string, string | string[] | boolean>>(new Map());
  const [quizData, setQuizData] = useState<Quiz | null>(null);

  const handleJoinQuiz = async () => {
    if (!inviteCode.trim()) {
      alert('请输入邀请码');
      return;
    }
    if (!studentName.trim()) {
      alert('请输入您的姓名');
      return;
    }

    const quiz = await fetchQuizByCode(inviteCode.trim().toUpperCase());
    if (quiz) {
      setQuizData(quiz);
      setStep('quiz');
    }
  };

  const handleSingleChoice = (questionId: string, option: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, option);
    setAnswers(newAnswers);
  };

  const handleMultipleChoice = (questionId: string, option: string) => {
    const newAnswers = new Map(answers);
    const current = (newAnswers.get(questionId) as string[]) || [];
    if (current.includes(option)) {
      newAnswers.set(
        questionId,
        current.filter((o) => o !== option)
      );
    } else {
      newAnswers.set(questionId, [...current, option]);
    }
    setAnswers(newAnswers);
  };

  const handleFillBlank = (questionId: string, value: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, value);
    setAnswers(newAnswers);
  };

  const handleJudge = (questionId: string, value: boolean) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, value);
    setAnswers(newAnswers);
  };

  const isQuestionAnswered = (questionId: string): boolean => {
    if (!answers.has(questionId)) return false;
    const ans = answers.get(questionId);
    if (Array.isArray(ans)) return ans.length > 0;
    if (typeof ans === 'string') return ans.trim() !== '';
    return ans !== undefined && ans !== null;
  };

  const handleSubmit = async () => {
    if (!quizData) return;

    const unanswered = quizData.questions.filter((q) => !isQuestionAnswered(q.id));
    if (unanswered.length > 0) {
      if (!confirm(`还有 ${unanswered.length} 道题未作答，确定要提交吗？`)) {
        return;
      }
    }

    const answerList: StudentAnswer[] = quizData.questions.map((q) => ({
      questionId: q.id,
      answer: answers.get(q.id) ?? (q.type === 'multiple' ? [] : ''),
    }));

    const result = await submitAnswers(quizData.id, studentName, answerList);
    if (result) {
      setStep('submitted');
    }
  };

  const renderJoinForm = () => (
    <div className="container">
      <div className="join-card">
        <div className="card-header-center">
          <h1>加入测验</h1>
          <p className="subtitle">输入邀请码加入数学测验</p>
        </div>

        <div className="form-group">
          <label>邀请码</label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="请输入6位邀请码"
            className="input input-large"
            maxLength={6}
          />
        </div>

        <div className="form-group">
          <label>您的姓名</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="请输入您的姓名"
            className="input input-large"
          />
        </div>

        <button
          onClick={handleJoinQuiz}
          className="btn btn-primary btn-large btn-block"
          disabled={loading}
        >
          {loading ? '加入中...' : '加入测验'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );

  const renderQuiz = () => {
    if (!quizData) return null;

    const answeredCount = quizData.questions.filter((q) => isQuestionAnswered(q.id)).length;

    return (
      <div className="container">
        <header className="quiz-header">
          <div>
            <h1>{quizData.title}</h1>
            <p className="subtitle">
              共 {quizData.questions.length} 题 | 已答 {answeredCount} 题
            </p>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(answeredCount / quizData.questions.length) * 100}%` }}
            />
          </div>
        </header>

        <div className="question-list">
          {quizData.questions.map((question, qIndex) => (
            <div key={question.id} className="card question-card">
              <div className="question-card-header">
                <span className="question-number">第 {qIndex + 1} 题</span>
                <span className={`status-dot ${isQuestionAnswered(question.id) ? 'answered' : 'unanswered'}`} />
              </div>
              <p className="question-text">{question.content}</p>
              <p className="question-score">（{question.score} 分）</p>

              {question.type === 'single' && question.options && (
                <div className="options">
                  {question.options.map((opt, optIndex) => (
                    <label
                      key={optIndex}
                      className={`option-item ${
                        answers.get(question.id) === opt ? 'selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        checked={answers.get(question.id) === opt}
                        onChange={() => handleSingleChoice(question.id, opt)}
                      />
                      <span className="option-label">{String.fromCharCode(65 + optIndex)}.</span>
                      <span className="option-text">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'multiple' && question.options && (
                <div className="options">
                  {question.options.map((opt, optIndex) => {
                    const selected = (answers.get(question.id) as string[]) || [];
                    return (
                      <label
                        key={optIndex}
                        className={`option-item ${
                          selected.includes(opt) ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => handleMultipleChoice(question.id, opt)}
                        />
                        <span className="option-label">{String.fromCharCode(65 + optIndex)}.</span>
                        <span className="option-text">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {question.type === 'fill' && (
                <div className="fill-input">
                  <input
                    type="text"
                    value={(answers.get(question.id) as string) || ''}
                    onChange={(e) => handleFillBlank(question.id, e.target.value)}
                    placeholder="请输入答案"
                    className="input"
                  />
                </div>
              )}

              {question.type === 'judge' && (
                <div className="judge-options">
                  <label
                    className={`judge-option ${
                      answers.get(question.id) === true ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={`judge-${question.id}`}
                      checked={answers.get(question.id) === true}
                      onChange={() => handleJudge(question.id, true)}
                    />
                    <span>✓ 正确</span>
                  </label>
                  <label
                    className={`judge-option ${
                      answers.get(question.id) === false ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={`judge-${question.id}`}
                      checked={answers.get(question.id) === false}
                      onChange={() => handleJudge(question.id, false)}
                    />
                    <span>✗ 错误</span>
                  </label>
                </div>
              )}

              <div className="status-indicator">
                <span className="status-text">
                  {isQuestionAnswered(question.id) ? '已作答' : '未作答'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="submit-section">
          <button
            onClick={handleSubmit}
            className="btn btn-primary btn-large"
            disabled={loading}
          >
            {loading ? '提交中...' : '提交答案'}
          </button>
        </div>
      </div>
    );
  };

  const renderSubmitted = () => (
    <div className="container">
      <div className="submitted-card">
        <div className="check-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2>提交成功！</h2>
        <p className="subtitle">等待教师公布结果</p>
        <div className="waiting-animation">
          <div className="dots">
            <span />
            <span />
            <span />
          </div>
        </div>
        <p className="student-name-display">{studentName}</p>
      </div>
    </div>
  );

  return (
    <div className="app">
      {step === 'join' && renderJoinForm()}
      {step === 'quiz' && renderQuiz()}
      {step === 'submitted' && renderSubmitted()}

      <style>{`
        .app {
          min-height: 100vh;
          background-color: #f0f4f8;
          padding: 20px;
        }

        .container {
          max-width: 700px;
          margin: 0 auto;
        }

        h1 {
          color: #1e3a5f;
          font-size: 24px;
          margin-bottom: 4px;
        }

        h2 {
          color: #1e3a5f;
          font-size: 20px;
          margin-bottom: 8px;
        }

        .subtitle {
          color: #64748b;
          font-size: 14px;
        }

        .join-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 40px;
          margin-top: 60px;
          transition: box-shadow 0.3s ease;
        }

        .join-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .card-header-center {
          text-align: center;
          margin-bottom: 32px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #1e3a5f;
          font-weight: 500;
          font-size: 14px;
        }

        .input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 15px;
          transition: border-color 0.2s;
          background: #fff;
        }

        .input:focus {
          outline: none;
          border-color: #1e3a5f;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
        }

        .input-large {
          padding: 14px 18px;
          font-size: 16px;
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

        .btn-large {
          padding: 14px 32px;
          font-size: 16px;
        }

        .btn-block {
          width: 100%;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-top: 16px;
          text-align: center;
          font-size: 14px;
        }

        .quiz-header {
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          margin-top: 12px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #1e3a5f, #3b82f6);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .question-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 24px;
          transition: box-shadow 0.3s ease;
        }

        .card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .question-card {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .question-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .question-number {
          font-weight: 600;
          color: #1e3a5f;
          font-size: 15px;
        }

        .question-text {
          font-size: 16px;
          color: #1e293b;
          margin-bottom: 8px;
          line-height: 1.6;
        }

        .question-score {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .status-dot.unanswered {
          background-color: #d1d5db;
        }

        .status-dot.answered {
          background-color: #22c55e;
        }

        .options {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .option-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .option-item:hover {
          background: #f1f5f9;
        }

        .option-item.selected {
          background: #e0f2fe;
          border-color: #1e3a5f;
        }

        .option-item input[type="radio"],
        .option-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #1e3a5f;
        }

        .option-label {
          font-weight: 600;
          color: #1e3a5f;
          min-width: 20px;
        }

        .option-text {
          color: #334155;
          flex: 1;
        }

        .fill-input {
          margin-bottom: 16px;
        }

        .judge-options {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .judge-option {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          background: #f8fafc;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
          font-weight: 500;
        }

        .judge-option:hover {
          background: #f1f5f9;
        }

        .judge-option.selected {
          background: #e0f2fe;
          border-color: #1e3a5f;
        }

        .judge-option input[type="radio"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #1e3a5f;
        }

        .status-indicator {
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }

        .status-text {
          font-size: 13px;
          color: #64748b;
        }

        .submit-section {
          display: flex;
          justify-content: center;
          margin-top: 24px;
          padding-bottom: 40px;
        }

        .submitted-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 60px 40px;
          margin-top: 60px;
          text-align: center;
          transition: box-shadow 0.3s ease;
        }

        .submitted-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .check-icon {
          margin-bottom: 24px;
        }

        .check-icon svg {
          animation: checkmark 0.5s ease-in-out;
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        .waiting-animation {
          margin: 24px 0;
        }

        .dots {
          display: inline-flex;
          gap: 6px;
        }

        .dots span {
          width: 8px;
          height: 8px;
          background: #1e3a5f;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .student-name-display {
          color: #64748b;
          font-size: 14px;
          margin-top: 16px;
        }

        @media (max-width: 768px) {
          .app {
            padding: 12px;
          }
          
          .join-card {
            padding: 24px;
            margin-top: 30px;
          }
          
          .submitted-card {
            padding: 40px 24px;
            margin-top: 30px;
          }
          
          h1 {
            font-size: 20px;
          }
          
          .card {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default StudentQuiz;
