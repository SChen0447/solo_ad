import { useState } from 'react';
import type { GradeResult } from './api';

interface ResultCardProps {
  result: GradeResult;
  index: number;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export function ResultCard({ result, index }: ResultCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  const getOptionClass = (optIndex: number) => {
    const classes = ['result-option'];
    const isCorrect = optIndex === result.correctAnswer;
    const isUserChoice = optIndex === result.userAnswer;

    if (isCorrect) {
      classes.push('correct');
      if (result.isCorrect) {
        classes.push('glow-green');
      }
    }
    if (isUserChoice && !result.isCorrect) {
      classes.push('wrong');
      classes.push('shake');
    }
    return classes.join(' ');
  };

  const getOptionIcon = (optIndex: number) => {
    const isCorrect = optIndex === result.correctAnswer;
    const isUserChoice = optIndex === result.userAnswer;

    if (isCorrect) {
      return <span className="icon-correct">✓</span>;
    }
    if (isUserChoice && !result.isCorrect) {
      return <span className="icon-wrong">✗</span>;
    }
    return <span className="icon-neutral">{optionLabels[optIndex]}</span>;
  };

  return (
    <div className={`result-card ${result.isCorrect ? 'card-correct' : 'card-wrong'}`}>
      <div className="result-header">
        <span className="question-number">第 {index + 1} 题</span>
        <span className={`status-badge ${result.isCorrect ? 'status-correct' : 'status-wrong'}`}>
          {result.isCorrect ? '回答正确' : '回答错误'}
        </span>
      </div>

      <div className="question-tags">
        {result.tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>

      <p className="question-text">{result.question}</p>

      <div className="options-list">
        {result.options.map((option, optIndex) => (
          <div key={optIndex} className={getOptionClass(optIndex)}>
            {getOptionIcon(optIndex)}
            <span className="option-text">{option}</span>
          </div>
        ))}
      </div>

      {!result.isCorrect && (
        <div className="answer-summary">
          <span>你的答案：{result.userAnswer !== null ? optionLabels[result.userAnswer] : '未作答'}</span>
          <span>正确答案：{optionLabels[result.correctAnswer]}</span>
        </div>
      )}

      <button
        type="button"
        className="toggle-explanation"
        onClick={() => setShowExplanation(!showExplanation)}
      >
        {showExplanation ? '收起解析 ▲' : '查看解析 ▼'}
      </button>

      {showExplanation && (
        <div className="explanation-box">
          <strong>解析：</strong>
          <p>{result.explanation}</p>
        </div>
      )}
    </div>
  );
}
