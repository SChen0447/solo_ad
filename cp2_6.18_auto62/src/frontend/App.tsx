import { useState, useEffect } from 'react';
import ResumeUploader from './ResumeUploader';
import MatchReport from './MatchReport';
import type { ParsedResume, MatchReport as MatchReportType, JobRequirement, HistoryRecord } from './types';

const STORAGE_KEY = 'resume_matcher_history';
const MAX_HISTORY = 10;

const jobTemplates: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司产品的前端开发工作，参与技术架构设计，优化用户体验。',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Git'],
    preferredSkills: ['Vue.js', 'Next.js', 'Webpack', 'Vite', 'Node.js', 'UI/UX'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责后端服务的设计与开发，保障系统高可用、高性能，参与技术选型。',
    requiredSkills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Git', 'RESTful'],
    preferredSkills: ['微服务', '分布式', 'Docker', 'Kubernetes', 'MongoDB', 'Linux'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'datascientist',
    title: '数据科学家',
    description: '负责数据分析与挖掘，构建机器学习模型，为业务决策提供数据支持。',
    requiredSkills: ['Python', 'Machine Learning', 'SQL', '数据分析', 'Pandas', 'NumPy'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'Deep Learning', '数据挖掘', 'Scikit-learn', '统计学'],
    experienceYears: 2,
    educationLevel: '硕士',
  },
];

export default function App() {
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('frontend');
  const [report, setReport] = useState<MatchReportType | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [fileName, setFileName] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('加载历史记录失败', e);
      }
    }
  }, []);

  useEffect(() => {
    if (resume) {
      handleMatch(resume);
    }
  }, [selectedJobId, resume]);

  const handleTextExtracted = async (text: string, name: string) => {
    setIsParsing(true);
    setFileName(name);
    
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResume(result.data);
      }
    } catch (error) {
      console.error('解析失败:', error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMatch = async (resumeData: ParsedResume) => {
    setIsMatching(true);
    
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeData, jobId: selectedJobId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setReport(result.data);
        
        saveToHistory(resumeData, result.data, fileName);
      }
    } catch (error) {
      console.error('匹配失败:', error);
    } finally {
      setIsMatching(false);
    }
  };

  const saveToHistory = (resumeData: ParsedResume, reportData: MatchReportType, fname: string) => {
    const job = jobTemplates.find(j => j.id === selectedJobId);
    
    const record: HistoryRecord = {
      id: Date.now().toString(),
      fileName: fname || '未知简历',
      jobId: selectedJobId,
      jobTitle: job?.title || '',
      matchPercentage: reportData.matchPercentage,
      resume: resumeData,
      report: reportData,
      timestamp: Date.now(),
    };
    
    setHistory(prev => {
      const filtered = prev.filter(h => h.fileName !== fname || h.jobId !== selectedJobId);
      const updated = [record, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleHistoryClick = (record: HistoryRecord) => {
    setResume(record.resume);
    setReport(record.report);
    setFileName(record.fileName);
    setSelectedJobId(record.jobId);
  };

  const selectedJob = jobTemplates.find(j => j.id === selectedJobId);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>简历解析与岗位匹配评估系统</h1>
        <p className="subtitle">快速解析简历，智能匹配岗位</p>
      </header>

      <main className="main-content">
        <div className="left-panel">
          <ResumeUploader 
            onTextExtracted={handleTextExtracted}
            isParsing={isParsing}
          />
          
          {resume && (
            <div className="resume-info">
              <div className="info-card">
                <h3 className="section-title">👤 基本信息</h3>
                <p className="name">{resume.name}</p>
              </div>

              <div className="info-card">
                <h3 className="section-title">💡 技能标签</h3>
                <div className="skills-list">
                  {resume.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>

              {resume.workExperience.length > 0 && (
                <div className="info-card">
                  <h3 className="section-title">💼 工作经历</h3>
                  <div className="timeline">
                    {resume.workExperience.map((exp, index) => (
                      <div key={index} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="company">{exp.company}</span>
                            <span className="position">{exp.position}</span>
                          </div>
                          <div className="timeline-date">
                            {exp.startDate} - {exp.endDate}
                          </div>
                          {exp.description && (
                            <p className="timeline-desc">{exp.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resume.education.length > 0 && (
                <div className="info-card">
                  <h3 className="section-title">🎓 教育背景</h3>
                  <div className="education-list">
                    {resume.education.map((edu, index) => (
                      <div key={index} className="edu-item">
                        <span className="school">{edu.school}</span>
                        <span className="degree-major">{edu.degree} · {edu.major}</span>
                        {edu.graduationDate && (
                          <span className="grad-date">{edu.graduationDate}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="job-selector">
            <h3 className="section-title">🎯 选择职位</h3>
            <div className="job-tabs">
              {jobTemplates.map(job => (
                <button
                  key={job.id}
                  className={`job-tab ${selectedJobId === job.id ? 'active' : ''}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  {job.title}
                </button>
              ))}
            </div>
            {selectedJob && (
              <p className="job-desc">{selectedJob.description}</p>
            )}
          </div>

          <MatchReport 
            report={report} 
            isLoading={isMatching}
            job={selectedJob}
          />
        </div>
      </main>

      {history.length > 0 && (
        <section className="history-section">
          <h3 className="section-title">📋 历史记录</h3>
          <div className="history-list">
            {history.map(record => (
              <div 
                key={record.id} 
                className="history-card"
                onClick={() => handleHistoryClick(record)}
              >
                <div className="history-left">
                  <span className="history-filename">{record.fileName}</span>
                  <span className="history-job">{record.jobTitle}</span>
                </div>
                <div className="history-right">
                  <span className={`history-score ${record.matchPercentage >= 70 ? 'high' : record.matchPercentage >= 50 ? 'medium' : 'low'}`}>
                    {record.matchPercentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
