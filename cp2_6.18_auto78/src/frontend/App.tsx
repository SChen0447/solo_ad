import React, { useState, useCallback, useEffect } from 'react';
import ResumeUploader from './ResumeUploader';
import MatchReport from './MatchReport';
import type { ParsedResume, JobRequirement, MatchReport as MatchReportType, HistoryRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

const JOB_TEMPLATES: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司Web产品的前端开发工作，使用React、TypeScript等技术栈构建高质量的用户界面。',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'],
    preferredSkills: ['Vue', 'Webpack', 'Vite', 'Tailwind', 'Jest', 'Node.js'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责公司后端服务的设计与开发，构建高可用、高性能的分布式系统。',
    requiredSkills: ['Node.js', 'Express', 'MySQL', 'MongoDB', 'REST API'],
    preferredSkills: ['Redis', 'Docker', 'Kubernetes', '微服务', 'Python', 'Java'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'datascientist',
    title: '数据科学家',
    description: '负责数据分析、机器学习模型的研发与落地，为业务决策提供数据支持。',
    requiredSkills: ['Python', 'SQL', 'Pandas', 'NumPy', '机器学习'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'Scikit-learn', '深度学习', '数据挖掘'],
    experienceYears: 2,
    educationLevel: '硕士',
  },
];

const STORAGE_KEY = 'resume_match_history';

const App: React.FC = () => {
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRequirement>(JOB_TEMPLATES[0]);
  const [matchReport, setMatchReport] = useState<MatchReportType | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('加载历史记录失败', e);
    }
  }, []);

  const saveHistory = useCallback((record: HistoryRecord) => {
    setHistory(prev => {
      const updated = [record, ...prev].slice(0, 10);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('保存历史记录失败', e);
      }
      return updated;
    });
  }, []);

  const handleTextExtracted = useCallback(async (text: string, name: string) => {
    setFileName(name);
    setMatchReport(null);
    setLoadingText('正在解析简历...');
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const result = await response.json();
      if (result.success) {
        setParsedResume(result.data);
      }
    } catch (e) {
      console.error('解析失败', e);
    }
    setLoadingText('');
  }, []);

  const handleMatch = useCallback(async () => {
    if (!parsedResume) return;
    setIsMatching(true);
    setLoadingText('正在计算匹配度...');
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: parsedResume, job: selectedJob }),
      });
      const result = await response.json();
      if (result.success) {
        setMatchReport(result.data);
        const record: HistoryRecord = {
          id: uuidv4(),
          fileName,
          jobTitle: selectedJob.title,
          matchPercentage: result.data.matchPercentage,
          timestamp: Date.now(),
          parsedResume,
          matchReport: result.data,
        };
        saveHistory(record);
      }
    } catch (e) {
      console.error('匹配失败', e);
    }
    setIsMatching(false);
    setLoadingText('');
  }, [parsedResume, selectedJob, fileName, saveHistory]);

  const handleHistoryClick = useCallback((record: HistoryRecord) => {
    setParsedResume(record.parsedResume);
    setMatchReport(record.matchReport);
    setFileName(record.fileName);
    const job = JOB_TEMPLATES.find(j => j.title === record.jobTitle);
    if (job) setSelectedJob(job);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (parsedResume && !matchReport && !isMatching) {
      handleMatch();
    }
  }, [parsedResume, selectedJob]);

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            简历解析与岗位匹配评估系统
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>
            上传PDF简历，自动提取关键信息并智能匹配岗位要求
          </p>
        </header>

        {loadingText && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            marginBottom: 20,
            background: '#eff6ff',
            borderRadius: 12,
            color: '#1d4ed8',
            fontWeight: 500,
          }}>
            {loadingText}
          </div>
        )}

        <ResumeUploader onTextExtracted={handleTextExtracted} />

        {parsedResume && (
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }} className="fade-in">
            <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <InfoCard title="基本信息">
                <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                  {parsedResume.name}
                </div>
                <div style={{ marginTop: 4, color: '#6b7280', fontSize: 13 }}>
                  文件：{fileName}
                </div>
              </InfoCard>

              <InfoCard title="技能">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {parsedResume.skills.length > 0 ? (
                    parsedResume.skills.map((skill, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 14px',
                          borderRadius: 9999,
                          background: '#3b82f6',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'default',
                          transition: 'transform 0.2s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#9ca3af' }}>未提取到技能信息</span>
                  )}
                </div>
              </InfoCard>

              <InfoCard title="工作经历">
                {parsedResume.workExperience.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {parsedResume.workExperience.map((exp, i) => (
                      <div key={i} style={{ position: 'relative', paddingLeft: 20 }}>
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 6,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: '#3b82f6',
                        }} />
                        <div style={{
                          position: 'absolute',
                          left: 4,
                          top: 18,
                          bottom: -8,
                          width: 2,
                          background: '#e5e7eb',
                        }} />
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {exp.position || '未知职位'} · {exp.company || '未知公司'}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          {exp.startDate} - {exp.endDate}
                        </div>
                        {exp.description && (
                          <div style={{ fontSize: 14, color: '#4b5563', marginTop: 6 }}>
                            {exp.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af' }}>未提取到工作经历</span>
                )}
              </InfoCard>

              <InfoCard title="教育背景">
                {parsedResume.education.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {parsedResume.education.map((edu, i) => (
                      <div key={i}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>
                          {edu.school || '未知学校'}
                          {edu.degree && ` · ${edu.degree}`}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                          {edu.major}
                          {edu.startDate && ` · ${edu.startDate} - ${edu.endDate}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af' }}>未提取到教育背景</span>
                )}
              </InfoCard>
            </div>

            <div style={{ flex: '0 0 calc(45% - 24px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                background: '#ffffff',
                borderRadius: 12,
                padding: 20,
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, color: '#111827' }}>
                  选择职位模板
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {JOB_TEMPLATES.map(job => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: selectedJob.id === job.id
                          ? '2px solid #3b82f6'
                          : '1px solid #e5e7eb',
                        background: selectedJob.id === job.id ? '#eff6ff' : '#ffffff',
                        color: '#111827',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => {
                        if (selectedJob.id !== job.id) {
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={e => {
                        if (selectedJob.id !== job.id) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        {job.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {matchReport && (
                <MatchReport report={matchReport} job={selectedJob} />
              )}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div style={{ marginTop: 40 }} className="fade-in">
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: '#111827' }}>
              历史记录
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {history.map(record => (
                <div
                  key={record.id}
                  onClick={() => handleHistoryClick(record)}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 18,
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    {record.fileName}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                    {record.jobTitle}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: getScoreColor(record.matchPercentage),
                    }}>
                      {record.matchPercentage}%
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    background: '#f9fafb',
    borderRadius: 8,
    padding: 20,
    border: '1px solid #e5e7eb',
    width: '100%',
    height: 'auto',
  }}>
    <h3 style={{
      fontSize: 14,
      fontWeight: 600,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 14,
    }}>
      {title}
    </h3>
    {children}
  </div>
);

export default App;
