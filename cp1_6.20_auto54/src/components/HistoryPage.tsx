import React, { useState, useEffect } from 'react';
import { Submission, EvaluationResult } from '../types';
import { getSubmissions, getResult } from '../services/api';
import RadarChart from './RadarChart';

interface HistoryPageProps {
  onBack: () => void;
  onLogout: () => void;
  userEmail: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, onLogout, userEmail }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailedResult, setDetailedResult] = useState<EvaluationResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const assignmentTitles: Record<string, string> = {
    '1': '两数之和',
    '2': '阶乘计算',
    '3': '质数判断',
    '4': '字符串反转',
    '5': '最大值查找',
  };

  useEffect(() => {
    fetchSubmissions();
  }, [page]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await getSubmissions(page, 10);
      setSubmissions(data.submissions);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (submissionId: string) => {
    if (expandedId === submissionId) {
      setExpandedId(null);
      setDetailedResult(null);
      return;
    }

    setExpandedId(submissionId);
    setLoadingDetail(true);
    try {
      const result = await getResult(submissionId);
      setDetailedResult(result);
    } catch (err) {
      console.error('Failed to fetch result:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percent = (score / maxScore) * 100;
    if (percent >= 80) return '#22c55e';
    if (percent >= 60) return '#eab308';
    return '#ef4444';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      passed: '通过',
      failed: '失败',
      timeout: '超时',
      error: '错误',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button className="btn btn-outline back-btn" onClick={onBack}>
              ← 返回
            </button>
            <h1 className="app-title">提交历史</h1>
          </div>
          <div className="header-actions">
            <span className="user-email">{userEmail}</span>
            <button className="btn btn-outline" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {submissions.length === 0 ? (
          <div className="empty-state">
            <p>暂无提交记录</p>
          </div>
        ) : (
          <>
            <div className="submission-list">
              {submissions.map((submission) => (
                <div
                  key={submission.submission_id}
                  className={`submission-item ${expandedId === submission.submission_id ? 'expanded' : ''}`}
                >
                  <div
                    className="submission-header"
                    onClick={() => handleExpand(submission.submission_id)}
                  >
                    <div className="submission-info">
                      <span className="submission-title">
                        {assignmentTitles[submission.assignment_id] || '未知作业'}
                      </span>
                      <span className="submission-time">
                        {submission.submitted_at}
                      </span>
                    </div>
                    <div className="submission-meta">
                      <span
                        className="submission-score"
                        style={{ color: getScoreColor(submission.score, submission.max_score) }}
                      >
                        {submission.score}/{submission.max_score}
                      </span>
                      <span className="submission-complexity">
                        复杂度: {submission.style_analysis.complexity_level}
                      </span>
                      <span className="expand-icon">
                        {expandedId === submission.submission_id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {expandedId === submission.submission_id && (
                    <div className="submission-detail">
                      {loadingDetail ? (
                        <div className="detail-loading">加载中...</div>
                      ) : detailedResult ? (
                        <>
                          <div className="detail-section">
                            <h4>测试结果</h4>
                            <div className="test-dots detail-dots">
                              {detailedResult.test_results.map((result) => (
                                <div
                                  key={result.test_case}
                                  className="test-dot"
                                  title={`测试用例 ${result.test_case}: ${getStatusLabel(result.status)}`}
                                  style={{
                                    backgroundColor:
                                      result.status === 'passed'
                                        ? '#22c55e'
                                        : result.status === 'pending'
                                        ? '#cbd5e1'
                                        : '#ef4444',
                                  }}
                                />
                              ))}
                            </div>
                            <div className="test-detail-list">
                              {detailedResult.test_results.map((result) => (
                                <div
                                  key={result.test_case}
                                  className={`test-case ${result.status}`}
                                >
                                  <div className="test-case-header">
                                    <span>测试用例 {result.test_case}</span>
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
                          </div>
                          <RadarChart styleAnalysis={detailedResult.style_analysis} />
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </button>
                <span className="page-info">
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
