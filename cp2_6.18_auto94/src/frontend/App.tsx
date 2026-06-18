import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ResumeUploader from './ResumeUploader';
import MatchReport from './MatchReport';
import type { ParsedResume, JobRequirement, MatchReport as MatchReportType, HistoryRecord } from '../backend/types';

const JOB_TEMPLATES: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司产品的前端开发工作，包括Web应用和小程序的设计与实现，与后端工程师协作完成产品功能。',
    requiredSkills: ['javascript', 'typescript', 'react', 'html', 'css'],
    preferredSkills: ['vue', 'webpack', 'vite', 'node.js', 'jest', 'sass'],
    experienceYears: 2,
    educationLevel: '本科',
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责公司服务端系统的设计与开发，构建高性能、可扩展的后端服务，保障系统稳定运行。',
    requiredSkills: ['java', 'mysql', 'redis', 'spring', 'linux'],
    preferredSkills: ['node.js', 'mongodb', 'docker', 'kubernetes', 'kafka', 'elasticsearch'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'datascience',
    title: '数据科学家',
    description: '负责数据分析与挖掘工作，构建机器学习模型，为业务决策提供数据支持，推动数据驱动的产品优化。',
    requiredSkills: ['python', '机器学习', '数据分析', 'pandas', 'numpy'],
    preferredSkills: ['tensorflow', 'pytorch', '深度学习', 'spark', 'hadoop', '自然语言处理'],
    experienceYears: 2,
    educationLevel: '硕士',
  },
];

const HISTORY_KEY = 'resume_matcher_history';
const MAX_HISTORY = 10;

const App: React.FC = () => {
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [matchReport, setMatchReport] = useState<MatchReportType | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('frontend');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  }, []);

  const saveToHistory = useCallback((record: HistoryRecord) => {
    setHistory(prev => {
      const filtered = prev.filter(r => r.id !== record.id);
      const updated = [record, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('保存历史记录失败:', e);
      }
      return updated;
    });
  }, []);

  const parseResume = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error('解析失败');
      return await response.json() as ParsedResume;
    } catch (e) {
      console.error('解析API调用失败:', e);
      throw e;
    }
  }, []);

  const matchResume = useCallback(async (resume: ParsedResume, jobId: string) => {
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobId }),
      });
      if (!response.ok) throw new Error('匹配失败');
      return await response.json() as { report: MatchReportType; job: JobRequirement };
    } catch (e) {
      console.error('匹配API调用失败:', e);
      throw e;
    }
  }, []);

  const handleTextExtracted = useCallback(async (text: string, fileName: string) => {
    setCurrentFileName(fileName);
    setIsLoading(true);
    setMatchReport(null);

    try {
      const parsed = await parseResume(text);
      setParsedResume(parsed);

      const result = await matchResume(parsed, selectedJobId);
      setMatchReport(result.report);

      const record: HistoryRecord = {
        id: uuidv4(),
        fileName,
        jobTitle: result.job.title,
        matchPercentage: result.report.matchPercentage,
        timestamp: Date.now(),
        resume: parsed,
        report: result.report,
      };
      saveToHistory(record);
    } catch (e) {
      alert('简历解析或匹配失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [parseResume, matchResume, selectedJobId, saveToHistory]);

  const handleJobChange = useCallback(async (jobId: string) => {
    setSelectedJobId(jobId);
    if (parsedResume) {
      setIsLoading(true);
      setMatchReport(null);
      try {
        const result = await matchResume(parsedResume, jobId);
        setMatchReport(result.report);

        const record: HistoryRecord = {
          id: uuidv4(),
          fileName: currentFileName || '历史简历',
          jobTitle: result.job.title,
          matchPercentage: result.report.matchPercentage,
          timestamp: Date.now(),
          resume: parsedResume,
          report: result.report,
        };
        saveToHistory(record);
      } catch (e) {
        alert('匹配计算失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }
  }, [parsedResume, matchResume, currentFileName, saveToHistory]);

  const handleHistoryClick = useCallback((record: HistoryRecord) => {
    const job = JOB_TEMPLATES.find(j => j.title === record.jobTitle);
    if (job) {
      setSelectedJobId(job.id);
    }
    setParsedResume(record.resume);
    setMatchReport(record.report);
    setCurrentFileName(record.fileName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const selectedJob = JOB_TEMPLATES.find(j => j.id === selectedJobId) || JOB_TEMPLATES[0];

  const getMatchLevel = (percentage: number) => {
    if (percentage >= 70) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>简历解析与岗位匹配评估系统</h1>
        <p>上传PDF简历，智能提取关键信息，一键生成职位匹配度报告</p>
      </div>

      <div className="main-layout">
        <div className="left-panel">
          <ResumeUploader onTextExtracted={handleTextExtracted} isLoading={isLoading} />

          {parsedResume && (
            <>
              <div className="card">
                <div className="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  候选人信息
                </div>

                <div className="info-card">
                  <div className="info-label">姓名</div>
                  <div className="info-value">{parsedResume.name}</div>
                </div>

                <div className="info-card">
                  <div className="info-label">技能标签</div>
                  <div className="skills-container">
                    {parsedResume.skills.length > 0 ? (
                      parsedResume.skills.map((skill, i) => (
                        <span key={i} className="skill-tag">{skill}</span>
                      ))
                    ) : (
                      <span style={{ color: '#a1a1aa', fontSize: '13px' }}>未识别到技能信息</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  工作经历
                </div>

                {parsedResume.workExperience.length > 0 ? (
                  parsedResume.workExperience.map((exp, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-title">{exp.position}</div>
                      <div className="timeline-subtitle">{exp.company}</div>
                      <div className="timeline-date">
                        {exp.startDate || '—'} {exp.startDate || exp.endDate ? ' — ' : ''} {exp.endDate || '—'}
                      </div>
                      {exp.description && <div className="timeline-desc">{exp.description}</div>}
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: '16px' }}>
                    未识别到工作经历信息
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                  教育背景
                </div>

                {parsedResume.education.length > 0 ? (
                  parsedResume.education.map((edu, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-title">{edu.school}</div>
                      <div className="timeline-subtitle">
                        {edu.degree}
                        {edu.major ? ` · ${edu.major}` : ''}
                      </div>
                      <div className="timeline-date">
                        {edu.startDate || '—'} {edu.startDate || edu.endDate ? ' — ' : ''} {edu.endDate || '—'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: '16px' }}>
                    未识别到教育背景信息
                  </div>
                )}
              </div>
            </>
          )}

          {!parsedResume && (
            <div className="card">
              <div className="card-title">解析结果预览</div>
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                上传简历后将在此处展示提取的结构化信息
              </div>
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              选择职位模板
            </div>

            <div className="job-tabs">
              {JOB_TEMPLATES.map(job => (
                <button
                  key={job.id}
                  className={`job-tab ${selectedJobId === job.id ? 'active' : ''}`}
                  onClick={() => handleJobChange(job.id)}
                  disabled={isLoading}
                >
                  {job.title}
                </button>
              ))}
            </div>

            <div className="job-description">{selectedJob.description}</div>

            <div className="job-meta">
              <div className="job-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {selectedJob.experienceYears}年以上经验
              </div>
              <div className="job-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                </svg>
                {selectedJob.educationLevel}
              </div>
            </div>

            <div className="section-divider"></div>

            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#18181b' }}>
              必备技能
            </div>
            <div className="skills-container" style={{ marginBottom: '12px' }}>
              {selectedJob.requiredSkills.map((skill, i) => (
                <span key={i} className="skill-tag" style={{ background: '#1e293b' }}>{skill}</span>
              ))}
            </div>

            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#18181b' }}>
              加分技能
            </div>
            <div className="skills-container">
              {selectedJob.preferredSkills.map((skill, i) => (
                <span key={i} className="skill-tag" style={{ background: '#64748b' }}>{skill}</span>
              ))}
            </div>
          </div>

          <MatchReport report={matchReport} />
        </div>
      </div>

      <div className="history-section">
        <div className="history-title">历史记录（最近10条）</div>
        {history.length > 0 ? (
          <div className="history-list">
            {history.map(record => (
              <div
                key={record.id}
                className="history-card"
                onClick={() => handleHistoryClick(record)}
              >
                <div className="history-filename">{record.fileName}</div>
                <div className="history-meta">
                  <span>{record.jobTitle}</span>
                  <span className={`history-match ${getMatchLevel(record.matchPercentage)}`}>
                    {record.matchPercentage}%
                  </span>
                </div>
                <div className="history-date">{formatDate(record.timestamp)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="history-empty">暂无历史记录，上传简历后将自动保存</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
