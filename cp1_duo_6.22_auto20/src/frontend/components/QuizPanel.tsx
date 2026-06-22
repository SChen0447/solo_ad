import React, { useState, useEffect, useRef } from 'react';
import { Question, Difficulty } from '../types';

interface QuizPanelProps {
  onQuizGenerated: (questions: Question[]) => void;
}

const QuizPanel: React.FC<QuizPanelProps> = ({ onQuizGenerated }) => {
  const [knowledges, setKnowledges] = useState<string[]>([]);
  const [selectedKnowledges, setSelectedKnowledges] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>(['easy', 'medium', 'hard']);
  const [questionCount, setQuestionCount] = useState(10);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const difficultyOptions: { value: Difficulty; label: string }[] = [
    { value: 'easy', label: '简单' },
    { value: 'medium', label: '中等' },
    { value: 'hard', label: '困难' },
  ];

  useEffect(() => {
    fetchKnowledges();
  }, []);

  const fetchKnowledges = async () => {
    try {
      const res = await fetch('/api/knowledges');
      const data = await res.json();
      if (data.success) {
        setKnowledges(data.knowledges);
      }
    } catch (e) {
      console.error('Failed to fetch knowledges:', e);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ count: data.count, total: data.total });
        fetchKnowledges();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (e) {
      alert('导入失败，请检查服务器连接');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file);
    } else {
      alert('请上传CSV文件');
    }
  };

  const handleKnowledgeToggle = (knowledge: string) => {
    setSelectedKnowledges((prev) =>
      prev.includes(knowledge)
        ? prev.filter((k) => k !== knowledge)
        : [...prev, knowledge]
    );
  };

  const handleDifficultyToggle = (diff: Difficulty) => {
    setSelectedDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  };

  const handleGenerate = async () => {
    if (selectedDifficulties.length === 0) {
      alert('请至少选择一个难度等级');
      return;
    }

    setGenerating(true);
    setGeneratedQuestions([]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledges: selectedKnowledges.length > 0 ? selectedKnowledges : null,
          difficulties: selectedDifficulties,
          count: questionCount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedQuestions(data.questions);
        setTotalAvailable(data.totalAvailable);
        onQuizGenerated(data.questions);
      } else {
        alert(data.error || '生成失败');
      }
    } catch (e) {
      alert('生成失败，请检查服务器连接');
    } finally {
      setGenerating(false);
    }
  };

  const getDifficultyLabel = (diff: Difficulty) => {
    const map: Record<Difficulty, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return map[diff];
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      fill: '填空题',
    };
    return map[type] || type;
  };

  return (
    <div className="quiz-panel">
      <h2 className="page-title">智能组卷</h2>

      <div className="card">
        <h3 className="card-title">📂 导入题库</h3>
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <p>上传中...</p>
          ) : (
            <>
              <p className="upload-icon">📄</p>
              <p>拖拽CSV文件到此处，或点击选择文件</p>
              <p className="upload-hint">格式：题目,选项A,选项B,选项C,选项D,正确答案,知识点,难度</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        {uploadResult && (
          <div className="upload-result success">
            ✅ 成功导入 {uploadResult.count} 道题，当前题库共 {uploadResult.total} 道题
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">⚙️ 组卷设置</h3>

        <div className="form-group">
          <label className="form-label">知识点（可选，不选则全部）</label>
          <div className="checkbox-group">
            {knowledges.length === 0 ? (
              <p className="text-muted">暂无知识点，请先导入题库</p>
            ) : (
              knowledges.map((k) => (
                <label key={k} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedKnowledges.includes(k)}
                    onChange={() => handleKnowledgeToggle(k)}
                  />
                  <span>{k}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">难度等级</label>
          <div className="checkbox-group">
            {difficultyOptions.map((opt) => (
              <label key={opt.value} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={selectedDifficulties.includes(opt.value)}
                  onChange={() => handleDifficultyToggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            题目数量：<span className="count-value">{questionCount} 道</span>
          </label>
          <input
            type="range"
            min="5"
            max="20"
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
            className="range-slider"
          />
          <div className="range-labels">
            <span>5</span>
            <span>20</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handleGenerate}
          disabled={generating || selectedDifficulties.length === 0}
        >
          {generating ? '生成中...' : '🎯 生成试卷'}
        </button>
      </div>

      {generatedQuestions.length > 0 && (
        <div className="card">
          <h3 className="card-title">
            📋 试卷预览
            <span className="badge">
              {generatedQuestions.length} / {totalAvailable} 道题
            </span>
          </h3>
          <div className="question-preview-list">
            {generatedQuestions.map((q, index) => (
              <div key={q.id} className="question-preview-card">
                <div className="question-header">
                  <span className="question-number">第 {index + 1} 题</span>
                  <span className={`question-type type-${q.type}`}>{getTypeLabel(q.type)}</span>
                  <span className={`question-difficulty diff-${q.difficulty}`}>
                    {getDifficultyLabel(q.difficulty)}
                  </span>
                </div>
                <p className="question-text">{q.question}</p>
                <div className="question-meta">
                  <span className="knowledge-tag">{q.knowledge}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizPanel;
