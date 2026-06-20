import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Assignment, EvaluationProgress, EvaluationResult, TestResult } from '../types';
import { runTests, onEvaluationProgress, onEvaluationComplete } from '../services/api';
import RadarChart from './RadarChart';

interface SubmissionPanelProps {
  assignment: Assignment;
  onBack: () => void;
  userEmail: string;
  onLogout: () => void;
  onViewHistory: () => void;
}

const SubmissionPanel: React.FC<SubmissionPanelProps> = ({
  assignment,
  onBack,
  userEmail,
  onLogout,
  onViewHistory,
}) => {
  const [code, setCode] = useState<string>(`# 请在这里编写你的Python代码\n# ${assignment.title}\n\n`);
  const [lineCount, setLineCount] = useState(1);
  const [charCount, setCharCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState<EvaluationProgress | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [finalResult, setFinalResult] = useState<EvaluationResult | null>(null);
  const [leftWidth, setLeftWidth] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const lines = code.split('\n');
    setLineCount(lines.length);
    setCharCount(code.length);
  }, [code]);

  useEffect(() => {
    const unsubscribeProgress = onEvaluationProgress((data) => {
      if (data.user === userEmail && data.assignment_id === assignment.id) {
        setEvaluationProgress(data);
        setTestResults((prev) => {
          const updated = [...prev];
          updated[data.test_case - 1] = data.result;
          return updated;
        });
      }
    });

    const unsubscribeComplete = onEvaluationComplete((data) => {
      if (data.email === userEmail && data.assignment_id === assignment.id) {
        setFinalResult(data);
        setTestResults(data.test_results);
        setIsEvaluating(false);
      }
    });

    return () => {
      unsubscribeProgress();
      unsubscribeComplete();
    };
  }, [userEmail, assignment.id]);

  useEffect(() => {
    if (isDragging && containerRef.current) {
      const handleMouseMove = (e: MouseEvent) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
          setLeftWidth(Math.min(Math.max(newWidth, 20), 80));
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const debouncedRunTests = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      if (isEvaluating) return;
      setIsEvaluating(true);
      setTestResults(Array(10).fill(null).map((_, i) => ({
        test_case: i + 1,
        status: 'pending',
        input: '',
        expected: '',
        actual: '',
        error: '',
        passed: false,
        execution_time: 0,
      })));
      setFinalResult(null);
      setEvaluationProgress(null);
      try {
        await runTests(code, assignment.id);
      } catch (err) {
        console.error('Failed to run tests:', err);
        setIsEvaluating(false);
      }
    }, 300);
  }, [code, assignment.id, isEvaluating]);

  const handleSubmit = () => {
    debouncedRunTests();
  };

  const getDotColor = (status: string | undefined) => {
    if (!status || status === 'pending') return '#cbd5e1';
    if (status === 'passed') return '#22c55e';
    if (status === 'failed' || status === 'error' || status === 'timeout') return '#ef4444';
    return '#cbd5e1';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '等待中',
      passed: '通过',
      failed: '失败',
      timeout: '超时',
      error: '错误',
    };
    return labels[status] || status;
  };

  const progressPercent = finalResult
    ? 100
    : evaluationProgress
    ? (evaluationProgress.test_case / evaluationProgress.total) * 100
    : 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button className="btn btn-outline back-btn" onClick={onBack}>
              ← 返回
            </button>
            <h1 className="app-title">{assignment.title}</h1>
          </div>
          <div className="header-actions">
            <span className="user-email">{userEmail}</span>
            <button className="btn btn-secondary" onClick={onViewHistory}>
              历史记录
            </button>
            <button className="btn btn-outline" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="submission-container" ref={containerRef}>
          <div
            className="problem-description"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="description-content">
              <h2 className="problem-title">{assignment.title}</h2>
              <div className="problem-section">
                <h3>题目描述</h3>
                <p>{assignment.description}</p>
              </div>
              <div className="problem-section">
                <h3>输入格式</h3>
                <p>{assignment.input_format}</p>
              </div>
              <div className="problem-section">
                <h3>输出格式</h3>
                <p>{assignment.output_format}</p>
              </div>
              <div className="problem-section">
                <h3>示例</h3>
                <div className="code-block">
                  <div className="code-label">输入</div>
                  <pre>{assignment.example_input}</pre>
                </div>
                <div className="code-block">
                  <div className="code-label">输出</div>
                  <pre>{assignment.example_output}</pre>
                </div>
              </div>
            </div>
          </div>

          <div
            className="resize-handle"
            onMouseDown={() => setIsDragging(true)}
          />

          <div
            className="editor-section"
            style={{ width: `${100 - leftWidth}%` }}
          >
            <div className="editor-header">
              <div className="editor-stats">
                <span>行号: {lineCount}</span>
                <span>字数: {charCount}</span>
              </div>
              <button
                className="btn btn-primary submit-btn"
                onClick={handleSubmit}
                disabled={isEvaluating}
              >
                {isEvaluating ? '评测中...' : '提交评测'}
              </button>
            </div>

            {lineCount > 500 && (
              <div className="code-warning">
                ⚠️ 代码已超过500行，建议优化代码结构
              </div>
            )}

            <div className="editor-wrapper">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: true },
                  lineNumbers: 'on',
                  autoIndent: 'advanced',
                  formatOnType: true,
                  formatOnPaste: true,
                  automaticLayout: true,
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>

            {(isEvaluating || finalResult) && (
              <div className="evaluation-results">
                <div className="results-header">
                  <h3>评测结果</h3>
                  {finalResult && (
                    <div className="score-display">
                      得分: {finalResult.score}/{finalResult.max_score}
                    </div>
                  )}
                </div>

                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="test-dots">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className="test-dot"
                      style={{
                        backgroundColor: getDotColor(result?.status),
                        animation: 'fadeIn 0.3s ease-in-out',
                      }}
                      title={result ? `测试用例 ${index + 1}: ${getStatusLabel(result.status)}` : ''}
                    />
                  ))}
                </div>

                {finalResult && (
                  <div className="test-details">
                    {finalResult.test_results.map((result) => (
                      <div
                        key={result.test_case}
                        className={`test-case ${result.status}`}
                      >
                        <div className="test-case-header">
                          <span className="test-case-number">测试用例 {result.test_case}</span>
                          <span className={`test-case-status ${result.status}`}>
                            {getStatusLabel(result.status)}
                          </span>
                        </div>
                        {result.status !== 'passed' && (
                          <div className="test-case-details">
                            {result.error && (
                              <div className="error-output">
                                <strong>错误信息:</strong>
                                <pre>{result.error}</pre>
                              </div>
                            )}
                            <div className="output-comparison">
                              <div>
                                <strong>期望输出:</strong>
                                <pre>{result.expected}</pre>
                              </div>
                              <div>
                                <strong>实际输出:</strong>
                                <pre>{result.actual}</pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {finalResult && (
                  <RadarChart styleAnalysis={finalResult.style_analysis} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubmissionPanel;
