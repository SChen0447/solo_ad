import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Question, QuestionType } from '../api/examApi';

interface QuestionCardProps {
  question: Question;
  index?: number;
  mode: 'exam' | 'practice' | 'review' | 'edit';
  userAnswer?: string | string[];
  correctAnswer?: string | string[];
  isCorrect?: boolean;
  earnedScore?: number;
  maxScore?: number;
  explanation?: string;
  showResult?: boolean;
  disabled?: boolean;
  onChange?: (answer: string | string[]) => void;
}

const typeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  fill: '填空题',
};

const diffColors: Record<string, string> = {
  简单: '#4caf50',
  中等: '#ffb300',
  困难: '#e53935',
};

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  mode,
  userAnswer,
  correctAnswer,
  isCorrect,
  earnedScore,
  maxScore,
  explanation,
  showResult = false,
  disabled = false,
  onChange,
}) => {
  const [localSingle, setLocalSingle] = useState<string>('');
  const [localMultiple, setLocalMultiple] = useState<string[]>([]);
  const [localFill, setLocalFill] = useState<string>('');

  useEffect(() => {
    if (userAnswer !== undefined) {
      if (question.type === 'single') setLocalSingle(userAnswer as string);
      else if (question.type === 'multiple') setLocalMultiple(userAnswer as string[]);
      else if (question.type === 'fill') setLocalFill(userAnswer as string);
    }
  }, [userAnswer, question.type]);

  const getCorrectSet = (): Set<string> => {
    if (!correctAnswer) return new Set();
    if (Array.isArray(correctAnswer)) return new Set(correctAnswer);
    if (question.type === 'fill' && typeof correctAnswer === 'string') {
      try {
        const parsed = JSON.parse(correctAnswer);
        if (Array.isArray(parsed)) return new Set(parsed);
      } catch {}
      return new Set([correctAnswer]);
    }
    return new Set([correctAnswer]);
  };

  const getUserSet = (): Set<string> => {
    if (question.type === 'single') return new Set([localSingle]);
    if (question.type === 'multiple') return new Set(localMultiple);
    if (question.type === 'fill') return new Set([localFill]);
    return new Set();
  };

  const correctSet = showResult ? getCorrectSet() : new Set();

  const handleSingleSelect = (opt: string) => {
    if (disabled || showResult) return;
    setLocalSingle(opt);
    onChange?.(opt);
  };

  const handleMultipleToggle = (opt: string) => {
    if (disabled || showResult) return;
    const next = localMultiple.includes(opt)
      ? localMultiple.filter((o) => o !== opt)
      : [...localMultiple, opt];
    setLocalMultiple(next);
    onChange?.(next);
  };

  const handleFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || showResult) return;
    setLocalFill(e.target.value);
    onChange?.(e.target.value);
  };

  const getOptionStyle = (opt: string, idx: number) => {
    const base = 'inline-flex items-center px-4 py-2 rounded border cursor-pointer transition-all select-none';
    if (showResult) {
      const userSet = getUserSet();
      const isUserSelected = userSet.has(opt) || userSet.has(optionLabels[idx]);
      const isCorrectAns = correctSet.has(opt) || correctSet.has(optionLabels[idx]);
      if (isCorrectAns) return `${base} bg-[#4caf50] text-white border-[#4caf50]`;
      if (isUserSelected && !isCorrectAns) return `${base} bg-[#e53935] text-white border-[#e53935]`;
      return `${base} bg-[#eceff1] text-gray-700 border-[#eceff1] cursor-default`;
    }
    const isSelected =
      question.type === 'single'
        ? localSingle === opt || localSingle === optionLabels[idx]
        : localMultiple.includes(opt) || localMultiple.includes(optionLabels[idx]);
    if (isSelected) return `${base} bg-[#1a237e] text-white border-[#1a237e]`;
    return `${base} bg-[#eceff1] text-gray-700 border-[#eceff1] hover:bg-[#dde3e8]`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-[#e0e0e0] shadow-sm p-6 mb-4"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {index !== undefined && (
            <span className="text-[#1a237e] font-bold text-lg">{index + 1}.</span>
          )}
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: '#1a237e' }}
          >
            {typeLabels[question.type]}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: diffColors[question.difficulty] }}
          >
            {question.difficulty}
          </span>
          <span className="text-sm text-gray-500">分值：{question.score}分</span>
          {question.knowledge_tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {question.knowledge_tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-xs bg-blue-50 text-[#42a5f5] border border-blue-100"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {showResult && earnedScore !== undefined && maxScore !== undefined && (
          <div
            className={`px-4 py-1 rounded-full text-sm font-bold ${
              isCorrect ? 'bg-green-50 text-[#4caf50]' : 'bg-red-50 text-[#e53935]'
            }`}
          >
            {earnedScore}/{maxScore}分
          </div>
        )}
      </div>

      <div className="text-gray-800 text-base leading-relaxed mb-5 whitespace-pre-wrap">
        {question.content}
      </div>

      {question.type === 'single' && question.options && (
        <div className="flex flex-col gap-3">
          {question.options.map((opt, idx) => (
            <div
              key={idx}
              className={getOptionStyle(opt, idx)}
              onClick={() => handleSingleSelect(opt)}
            >
              <span className="mr-2 font-semibold">{optionLabels[idx]}.</span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === 'multiple' && question.options && (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-gray-500 mb-1">（至少两个正确答案，请选择所有正确选项）</div>
          {question.options.map((opt, idx) => (
            <div
              key={idx}
              className={getOptionStyle(opt, idx)}
              onClick={() => handleMultipleToggle(opt)}
            >
              <span className="mr-2 font-semibold">{optionLabels[idx]}.</span>
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === 'fill' && (
        <div>
          <input
            type="text"
            className={`w-full px-4 py-3 border-2 rounded-lg text-base outline-none transition-all ${
              showResult
                ? isCorrect
                  ? 'border-[#4caf50] bg-green-50'
                  : 'border-[#e53935] bg-red-50'
                : 'border-[#e0e0e0] focus:border-[#1a237e] bg-white'
            }`}
            placeholder="请填写答案..."
            value={localFill}
            onChange={handleFillChange}
            disabled={disabled || showResult}
          />
          {showResult && !isCorrect && (
            <div className="mt-2 text-sm text-[#4caf50]">
              正确答案：{Array.from(correctSet).join(' 或 ')}
            </div>
          )}
        </div>
      )}

      {showResult && explanation && (
        <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="text-sm font-semibold text-[#1a237e] mb-2">📝 解析</div>
          <div className="text-sm text-gray-700 leading-relaxed">{explanation}</div>
        </div>
      )}
    </motion.div>
  );
};

export default QuestionCard;
