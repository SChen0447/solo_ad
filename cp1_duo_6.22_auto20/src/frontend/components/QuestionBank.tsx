import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterKnowledge, setFilterKnowledge] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [knowledges, setKnowledges] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragError, setDragError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidCsvFile = (file: File): boolean => {
    if (!file) return false;
    const isCsvByName = file.name.toLowerCase().endsWith('.csv');
    const isCsvByType =
      file.type === 'text/csv' ||
      file.type === 'application/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'text/plain';
    return isCsvByName || isCsvByType;
  };

  useEffect(() => {
    fetchQuestions();
    fetchKnowledges();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error('Failed to fetch questions:', e);
    } finally {
      setLoading(false);
    }
  };

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

    if (!isValidCsvFile(file)) {
      alert(`不支持的文件类型：${file.name}\n请上传CSV格式的题库文件。`);
      return;
    }

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
        fetchQuestions();
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
    if (!file) {
      setDragError(false);
      return;
    }
    if (isValidCsvFile(file)) {
      setDragError(false);
      handleFileUpload(file);
    } else {
      setDragError(true);
      alert(`不支持的文件类型：${file.name}\n请上传CSV格式的题库文件。`);
      setTimeout(() => setDragError(false), 1500);
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      single: '单选题',
      multiple: '多选题',
      fill: '填空题',
    };
    return map[type] || type;
  };

  const getDifficultyLabel = (diff: string) => {
    const map: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    };
    return map[diff] || diff;
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterKnowledge && q.knowledge !== filterKnowledge) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  const stats = {
    total: questions.length,
    single: questions.filter((q) => q.type === 'single').length,
    multiple: questions.filter((q) => q.type === 'multiple').length,
    fill: questions.filter((q) => q.type === 'fill').length,
  };

  return (
    <div className="question-bank">
      <h2 className="page-title">📚 题库管理</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-number">{stats.total}</p>
          <p className="stat-label">题目总数</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.single}</p>
          <p className="stat-label">单选题</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.multiple}</p>
          <p className="stat-label">多选题</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.fill}</p>
          <p className="stat-label">填空题</p>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">� 导入题库</h3>
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''} ${dragError ? 'drag-error' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && !isValidCsvFile(file)) {
              setDragError(true);
            } else {
              setDragError(false);
            }
            setDragOver(true);
          }}
          onDragLeave={() => {
            setDragOver(false);
            setDragError(false);
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <p>上传中...</p>
          ) : dragError ? (
            <>
              <p className="upload-icon">❌</p>
              <p style={{ color: '#ef4444', fontWeight: 500 }}>不支持的文件类型</p>
              <p className="upload-hint">请上传CSV格式的题库文件</p>
            </>
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
        <h3 className="card-title">�� 筛选题目</h3>
        <div className="filter-row">
          <div className="filter-item">
            <label>知识点：</label>
            <select
              value={filterKnowledge}
              onChange={(e) => setFilterKnowledge(e.target.value)}
              className="form-select"
            >
              <option value="">全部</option>
              {knowledges.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>难度：</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="form-select"
            >
              <option value="">全部</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={fetchQuestions}>
            🔄 刷新
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          📋 题目列表
          <span className="badge">{filteredQuestions.length} 道</span>
        </h3>
        {loading ? (
          <p>加载中...</p>
        ) : filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📭</p>
            <p>暂无题目，请先导入题库</p>
          </div>
        ) : (
          <div className="question-list">
            {filteredQuestions.map((q, index) => (
              <div key={q.id} className="question-item">
                <div className="question-item-header">
                  <span className="question-number">{index + 1}.</span>
                  <span className={`question-type type-${q.type}`}>{getTypeLabel(q.type)}</span>
                  <span className={`question-difficulty diff-${q.difficulty}`}>
                    {getDifficultyLabel(q.difficulty)}
                  </span>
                  <span className="knowledge-tag">{q.knowledge}</span>
                </div>
                <p className="question-text">{q.question}</p>
                {q.options.length > 0 && (
                  <div className="question-options">
                    {q.options.map((opt, i) => (
                      <div key={i} className="option-text-small">
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
                <div className="question-answer">
                  <span className="answer-label">正确答案：</span>
                  <span className="answer-value">
                    {Array.isArray(q.correctAnswer)
                      ? q.correctAnswer.join(', ')
                      : q.correctAnswer}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionBank;
