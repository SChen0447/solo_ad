import React, { useState, useEffect, useCallback } from 'react';
import { useQuizStore } from './store';
import { ChoiceQuestion, FillQuestion, SortQuestion, QuizResult } from './types';

const AnswerPanel: React.FC = () => {
  const {
    questions,
    currentQuestionIndex,
    answers,
    studentName,
    setStudentName,
    startQuiz,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    setViewMode,
    setCurrentResult,
    startQuestionTimer
  } = useQuizStore();

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [animatingOption, setAnimatingOption] = useState<number | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);

  useEffect(() => {
    if (currentQuestion && quizStarted) {
      if (currentQuestion.type === 'choice') {
        setSelectedChoice(currentAnswer ? (currentAnswer.userAnswer as number) : null);
      } else if (currentQuestion.type === 'fill') {
        setFillAnswers(currentAnswer ? (currentAnswer.userAnswer as string[]) : Array(currentQuestion.blanks.length).fill(''));
      } else if (currentQuestion.type === 'sort') {
        const items = currentQuestion.items;
        if (currentAnswer) {
          setSortOrder(currentAnswer.userAnswer as number[]);
        } else {
          setSortOrder(items.map((_, i) => i));
        }
      }
      setShowFeedback(false);
      setIsCorrect(false);
      startQuestionTimer();
    }
  }, [currentQuestionIndex, quizStarted, currentQuestion, currentAnswer, startQuestionTimer]);

  const checkAnswer = useCallback((): boolean => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === 'choice') {
      return selectedChoice === (currentQuestion as ChoiceQuestion).correctAnswer;
    } else if (currentQuestion.type === 'fill') {
      const q = currentQuestion as FillQuestion;
      return fillAnswers.every((ans, i) => 
        ans.trim().toLowerCase() === q.blanks[i].trim().toLowerCase()
      );
    } else if (currentQuestion.type === 'sort') {
      const q = currentQuestion as SortQuestion;
      return JSON.stringify(sortOrder) === JSON.stringify(q.correctOrder);
    }
    return false;
  }, [currentQuestion, selectedChoice, fillAnswers, sortOrder]);

  const handleSubmit = () => {
    if (!currentQuestion) return;

    let answer: number | string[] | number[];
    if (currentQuestion.type === 'choice') {
      if (selectedChoice === null) {
        alert('请选择一个选项');
        return;
      }
      answer = selectedChoice;
    } else if (currentQuestion.type === 'fill') {
      if (fillAnswers.some(a => !a.trim())) {
        alert('请填写所有空位');
        return;
      }
      answer = fillAnswers;
    } else {
      answer = sortOrder;
    }

    const correct = checkAnswer();
    setIsCorrect(correct);
    setShowFeedback(true);

    if (currentQuestion.type === 'choice' && selectedChoice !== null) {
      setAnimatingOption(selectedChoice);
      setTimeout(() => setAnimatingOption(null), 500);
    }

    submitAnswer(currentQuestion.id, answer, correct);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const allAnswers = answers;
    const correctCount = allAnswers.filter(a => a.isCorrect).length;
    const totalScore = Math.round((correctCount / questions.length) * 100);
    const totalTime = allAnswers.reduce((sum, a) => sum + a.timeSpent, 0);

    const resultData = {
      studentName: studentName || '匿名学生',
      answers: allAnswers,
      totalScore,
      totalTime
    };

    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
      });
      
      if (response.ok) {
        const savedResult = await response.json();
        setCurrentResult(savedResult);
      } else {
        const mockResult: QuizResult = {
          ...resultData,
          id: 'local-' + Date.now(),
          createdAt: new Date().toISOString()
        };
        setCurrentResult(mockResult);
      }
    } catch (error) {
      const mockResult: QuizResult = {
        ...resultData,
        id: 'local-' + Date.now(),
        createdAt: new Date().toISOString()
      };
      setCurrentResult(mockResult);
    }

    setViewMode('analytics');
  };

  const handleStartQuiz = () => {
    if (!studentName.trim()) {
      alert('请输入您的姓名');
      return;
    }
    setQuizStarted(true);
    startQuiz();
  };

  const handleChoiceClick = (index: number) => {
    if (showFeedback) return;
    setSelectedChoice(index);
  };

  const handleFillChange = (index: number, value: string) => {
    if (showFeedback) return;
    const newAnswers = [...fillAnswers];
    newAnswers[index] = value;
    setFillAnswers(newAnswers);
  };

  const handleDragStart = (index: number) => {
    if (showFeedback) return;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (showFeedback || dragIndex === null || dragIndex === index) return;

    const newOrder = [...sortOrder];
    const draggedItem = newOrder[dragIndex];
    newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    
    setSortOrder(newOrder);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const getTypeColor = () => {
    if (!currentQuestion) return '#3498db';
    switch (currentQuestion.type) {
      case 'choice': return '#3498db';
      case 'fill': return '#2ecc71';
      case 'sort': return '#e67e22';
    }
  };

  const getTypeLabel = () => {
    if (!currentQuestion) return '';
    switch (currentQuestion.type) {
      case 'choice': return '单选题';
      case 'fill': return '填空题';
      case 'sort': return '排序题';
    }
  };

  if (!quizStarted) {
    return (
      <div className="answer-panel">
        <div className="start-quiz-card">
          <h2>开始答题</h2>
          <p className="quiz-info">
            共 <strong>{questions.length}</strong> 道题目，包含单选题、填空题和排序题。
          </p>
          <div className="name-input">
            <label>请输入您的姓名：</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="请输入姓名"
            />
          </div>
          <button className="start-btn" onClick={handleStartQuiz}>
            开始答题
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="answer-panel">
        <div className="no-questions">
          <p>暂无题目，请先在题目编辑器中添加题目。</p>
          <button onClick={() => setViewMode('editor')}>去编辑题目</button>
        </div>
      </div>
    );
  }

  return (
    <div className="answer-panel">
      <div className="quiz-header">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="progress-text">
          第 {currentQuestionIndex + 1} / {questions.length} 题
        </div>
      </div>

      <div className={`question-card ${showFeedback ? (isCorrect ? 'correct' : 'wrong') : ''}`}>
        <div 
          className="question-type-bar"
          style={{ backgroundColor: getTypeColor() }}
        />
        <div className="question-content">
          <div className="question-meta">
            <span className="type-tag" style={{ backgroundColor: getTypeColor() + '20', color: getTypeColor() }}>
              {getTypeLabel()}
            </span>
          </div>
          <h3 className="question-title">{currentQuestion.title}</h3>

          {currentQuestion.type === 'choice' && (
            <div className="choice-options">
              {(currentQuestion as ChoiceQuestion).options.map((option, index) => {
                const isSelected = selectedChoice === index;
                const isCorrectOption = index === (currentQuestion as ChoiceQuestion).correctAnswer;
                const showCorrect = showFeedback && isCorrectOption;
                const showWrong = showFeedback && isSelected && !isCorrect;
                const isAnimating = animatingOption === index;

                return (
                  <button
                    key={index}
                    className={`choice-option 
                      ${isSelected ? 'selected' : ''}
                      ${showCorrect ? 'correct-option' : ''}
                      ${showWrong ? 'wrong-option' : ''}
                      ${isAnimating && isCorrect ? 'bounce-animation' : ''}
                      ${isAnimating && !isCorrect ? 'shake-animation' : ''}
                    `}
                    onClick={() => handleChoiceClick(index)}
                    disabled={showFeedback}
                  >
                    <span className="option-label">{String.fromCharCode(65 + index)}.</span>
                    <span className="option-text">{option}</span>
                    {showCorrect && <span className="correct-icon">✓</span>}
                    {showWrong && <span className="wrong-icon">✗</span>}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'fill' && (
            <div className="fill-blanks">
              {Array.from({ length: (currentQuestion as FillQuestion).blanks.length }).map((_, index) => (
                <div key={index} className="fill-blank-row">
                  <span className="blank-label">空 {index + 1}：</span>
                  <input
                    type="text"
                    value={fillAnswers[index] || ''}
                    onChange={(e) => handleFillChange(index, e.target.value)}
                    placeholder={`请输入第 ${index + 1} 个空的答案`}
                    className={`fill-input 
                      ${showFeedback ? (
                        fillAnswers[index]?.trim().toLowerCase() === 
                        (currentQuestion as FillQuestion).blanks[index].trim().toLowerCase()
                          ? 'correct-input'
                          : 'wrong-input'
                      ) : ''}
                    `}
                    disabled={showFeedback}
                  />
                  {showFeedback && (
                    <span className="correct-answer">
                      正确答案：{(currentQuestion as FillQuestion).blanks[index]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentQuestion.type === 'sort' && (
            <div className="sort-items">
              <p className="sort-hint">拖拽选项调整顺序</p>
              {sortOrder.map((itemIndex, position) => {
                const isCorrectPosition = showFeedback && 
                  (currentQuestion as SortQuestion).correctOrder[position] === itemIndex;
                
                return (
                  <div
                    key={itemIndex}
                    className={`sort-item 
                      ${dragIndex === position ? 'dragging' : ''}
                      ${showFeedback ? (isCorrectPosition ? 'correct-sort' : 'wrong-sort') : ''}
                    `}
                    draggable={!showFeedback}
                    onDragStart={() => handleDragStart(position)}
                    onDragOver={(e) => handleDragOver(e, position)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="sort-handle">⋮⋮</span>
                    <span className="sort-position">{position + 1}.</span>
                    <span className="sort-text">
                      {(currentQuestion as SortQuestion).items[itemIndex]}
                    </span>
                    {showFeedback && (
                      isCorrectPosition 
                        ? <span className="correct-icon">✓</span>
                        : <span className="wrong-icon">✗</span>
                    )}
                  </div>
                );
              })}
              {showFeedback && (
                <div className="correct-order">
                  <strong>正确顺序：</strong>
                  {(currentQuestion as SortQuestion).correctOrder.map((idx, i) => (
                    <span key={idx} className="correct-order-item">
                      {i + 1}. {(currentQuestion as SortQuestion).items[idx]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showFeedback && (
          <div className={`feedback-banner ${isCorrect ? 'correct-banner' : 'wrong-banner'}`}>
            {isCorrect ? '✓ 回答正确！' : '✗ 回答错误'}
          </div>
        )}
      </div>

      <div className="quiz-navigation">
        <button 
          className="nav-btn prev-btn"
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          上一题
        </button>
        
        {!showFeedback ? (
          <button className="nav-btn submit-btn" onClick={handleSubmit}>
            提交答案
          </button>
        ) : (
          <button className="nav-btn next-btn" onClick={handleNext}>
            {currentQuestionIndex < questions.length - 1 ? '下一题' : '查看成绩'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AnswerPanel;
