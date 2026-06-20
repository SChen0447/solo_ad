import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import { difficultyLabels } from '../quizEngine';
import type { QuizQuestion, Difficulty } from '../types';
import './QuizPage.css';

const TOTAL_QUESTIONS = 10;

export default function QuizPage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('easy');
  const [answeredCount, setAnsweredCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [score, setScore] = useState(0);

  const startQuiz = useCallback(async () => {
    try {
      const data = await quizApi.startQuiz(1, TOTAL_QUESTIONS);
      setSessionId(data.sessionId);
      setCurrentQuestion(data.firstQuestion);
      setCurrentDifficulty(data.currentDifficulty);
      setQuizStarted(true);
      setAnsweredCount(0);
      setScore(0);
    } catch (error) {
      console.error('Failed to start quiz:', error);
    }
  }, []);

  const handleAnswer = async (answerIndex: number) => {
    if (isSubmitting || !currentQuestion || showFeedback) return;

    setSelectedAnswer(answerIndex);
    setIsSubmitting(true);

    try {
      const data = await quizApi.submitAnswer(sessionId, currentQuestion.id, answerIndex);
      setIsCorrect(data.isCorrect);
      setShowFeedback(true);
      setCurrentDifficulty(data.currentDifficulty);
      setAnsweredCount(data.answeredCount);

      if (data.isCorrect) {
        setScore((prev) => prev + 1);
      }

      setTimeout(() => {
        if (data.isFinished) {
          navigate(`/results?sessionId=${sessionId}`);
        } else if (data.nextQuestion) {
          setCurrentQuestion(data.nextQuestion);
          setSelectedAnswer(null);
          setShowFeedback(false);
          setIsSubmitting(false);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setIsSubmitting(false);
    }
  };

  const progress = (answeredCount / TOTAL_QUESTIONS) * 100;

  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <AnimatePresence mode="wait">
          {!quizStarted ? (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="start-card"
            >
              <h1 className="start-title">自适应知识测验</h1>
              <p className="start-desc">
                系统将根据您的答题情况自动调整题目难度，
                为您提供个性化的测验体验。
              </p>
              <div className="start-info">
                <div className="info-item">
                  <span className="info-label">题目数量</span>
                  <span className="info-value">{TOTAL_QUESTIONS} 题</span>
                </div>
                <div className="info-item">
                  <span className="info-label">难度等级</span>
                  <span className="info-value">简单 → 中等 → 困难</span>
                </div>
              </div>
              <button className="start-btn" onClick={startQuiz}>
                开始测验
              </button>
            </motion.div>
          ) : (
            currentQuestion && (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="quiz-card"
              >
                <div className="quiz-header">
                  <div className="progress-bar-container">
                    <motion.div
                      className="progress-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="quiz-meta">
                    <span className="question-count">
                      第 {answeredCount + 1} / {TOTAL_QUESTIONS} 题
                    </span>
                    <span className={`difficulty-badge difficulty-${currentDifficulty}`}>
                      {difficultyLabels[currentDifficulty]}
                    </span>
                  </div>
                </div>

                <div className="question-content">
                  <h2 className="question-text">{currentQuestion.content}</h2>
                </div>

                <div className="options-list">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      className={`option-btn ${selectedAnswer === index ? 'selected' : ''} ${
                        showFeedback && selectedAnswer === index
                          ? isCorrect
                            ? 'correct'
                            : 'wrong'
                          : ''
                      } ${
                        showFeedback && index === currentQuestion.correctAnswer
                          ? 'correct'
                          : ''
                      }`}
                      onClick={() => handleAnswer(index)}
                      disabled={isSubmitting}
                      whileHover={!isSubmitting ? { y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' } : {}}
                      whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="option-label">{String.fromCharCode(65 + index)}</span>
                      <span className="option-text">{option}</span>
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className={`feedback-toast ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}
                    >
                      {isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
