import { useState, useEffect } from 'react';
import ResumeUploader from './ResumeUploader';
import MatchReport from './MatchReport';
import { v4 as uuidv4 } from 'uuid';
import type { ParsedResume, JobRequirement, MatchReport as MatchReportType, HistoryRecord } from '../shared/types';
import { JOB_TEMPLATES } from '../backend/matcher';

const HISTORY_KEY = 'resume_matcher_history';
const MAX_HISTORY = 10;

export default function App() {
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<JobRequirement>(JOB_TEMPLATES[0]);
  const [matchReport, setMatchReport] = useState<MatchReportType | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (parsedResume && selectedJob) {
      runMatch(parsedResume, selectedJob);
    }
  }, [parsedResume, selectedJob]);

  const saveToHistory = (
    fileName: string,
    resume: ParsedResume,
    report: MatchReportType,
    job: JobRequirement
  ) => {
    const record: HistoryRecord = {
      id: uuidv4(),
      fileName,
      jobTitle: job.title,
      matchPercentage: report.matchPercentage,
      overallScore: report.overallScore,
      timestamp: Date.now(),
      parsedResume: resume,
      matchReport: report
    };
    setHistory(prev => {
      const filtered = prev.filter(r => !(r.fileName === fileName && r.jobTitle === job.title));
      const updated = [record, ...filtered];
      return updated.slice(0, MAX_HISTORY);
    });
  };

  const runMatch = async (resume: ParsedResume, job: JobRequirement) => {
    setIsMatching(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, job })
      });
      const report: MatchReportType = await res.json();
      setMatchReport(report);
      if (currentFileName) {
        saveToHistory(currentFileName, resume, report, job);
      }
    } catch (err) {
      console.error('Match failed:', err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleResumeParsed = async (text: string, fileName: string) => {
    setCurrentFileName(fileName);
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const parsed: ParsedResume = await res.json();
      setParsedResume(parsed);
    } catch (err) {
      console.error('Parse failed:', err);
    }
  };

  const handleHistoryClick = (record: HistoryRecord) => {
    setParsedResume(record.parsedResume);
    setCurrentFileName(record.fileName);
    setMatchReport(record.matchReport);
    const job = JOB_TEMPLATES.find(j => j.title === record.jobTitle);
    if (job) setSelectedJob(job);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 70) return '#22c55e';
    if (pct >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>简历解析与岗位匹配评估系统</h1>
          <p style={styles.subtitle}>智能解析 · 精准匹配 · 高效招聘</p>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.splitLayout}>
          <div style={styles.leftPanel}>
            {!parsedResume ? (
              <ResumeUploader onParsed={handleResumeParsed} />
            ) : (
              <div style={styles.parsedContainer}>
                <div style={styles.fileNameBar}>
                  <span style={styles.fileName}>📄 {currentFileName}</span>
                  <button className="reset-btn" style={styles.resetBtn} onClick={() => { setParsedResume(null); setMatchReport(null); setCurrentFileName(''); }}>
                    重新上传
                  </button>
                </div>

                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>👤 基本信息</h3>
                  <p style={styles.nameText}>{parsedResume.name}</p>
                </div>

                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>💡 技能标签</h3>
                  <div style={styles.skillsContainer}>
                    {parsedResume.skills.length > 0 ? parsedResume.skills.map((skill, i) => (
                      <span key={i} className="skill-tag" style={styles.skillTag}>{skill}</span>
                    )) : <p style={styles.emptyText}>未提取到技能信息</p>}
                  </div>
                </div>

                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>💼 工作经历</h3>
                  {parsedResume.workExperience.length > 0 ? (
                    <div style={styles.timeline}>
                      {parsedResume.workExperience.map((exp, i) => (
                        <div key={i} style={styles.timelineItem}>
                          <div style={styles.timelineDot}></div>
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineHeader}>
                              <span style={styles.timelineCompany}>{exp.company}</span>
                              <span style={styles.timelineDate}>{exp.startDate} ~ {exp.endDate}</span>
                            </div>
                            <div style={styles.timelinePosition}>{exp.position}</div>
                            <p style={styles.timelineDesc}>{exp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={styles.emptyText}>未提取到工作经历</p>}
                </div>

                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>🎓 教育背景</h3>
                  {parsedResume.education.length > 0 ? (
                    <div style={styles.timeline}>
                      {parsedResume.education.map((edu, i) => (
                        <div key={i} style={styles.timelineItem}>
                          <div style={{ ...styles.timelineDot, background: '#8b5cf6' }}></div>
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineHeader}>
                              <span style={styles.timelineCompany}>{edu.school}</span>
                              <span style={styles.timelineDate}>{edu.startDate} ~ {edu.endDate}</span>
                            </div>
                            <div style={styles.timelinePosition}>{edu.degree} · {edu.major}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={styles.emptyText}>未提取到教育背景</p>}
                </div>
              </div>
            )}
          </div>

          <div style={styles.rightPanel}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>🎯 选择职位模板</h3>
              <div style={styles.jobTabs}>
                {JOB_TEMPLATES.map(job => (
                  <button
                    key={job.id}
                    className={`job-tab ${selectedJob.id === job.id ? 'job-tab-active' : ''}`}
                    style={{
                      ...styles.jobTab,
                      ...(selectedJob.id === job.id ? styles.jobTabActive : {})
                    }}
                    onClick={() => setSelectedJob(job)}
                  >
                    {job.title}
                  </button>
                ))}
              </div>
              <div style={styles.jobDesc}>
                <p style={styles.jobDescText}>{selectedJob.description}</p>
                <div style={styles.jobSkillsRow}>
                  <span style={styles.jobSkillsLabel}>必备技能：</span>
                  {selectedJob.requiredSkills.map((s, i) => (
                    <span key={i} className="skill-tag" style={{ ...styles.skillTag, background: '#10b981' }}>{s}</span>
                  ))}
                </div>
                <div style={styles.jobSkillsRow}>
                  <span style={styles.jobSkillsLabel}>加分技能：</span>
                  {selectedJob.preferredSkills.map((s, i) => (
                    <span key={i} className="skill-tag" style={{ ...styles.skillTag, background: '#6366f1' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {matchReport ? (
              <MatchReport report={matchReport} isLoading={isMatching} />
            ) : (
              <div style={styles.emptyReport}>
                <div style={{ fontSize: '64px', marginBottom: 16 }}>📊</div>
                <p style={{ color: '#6b7280', fontSize: 16 }}>请先上传简历以生成匹配报告</p>
              </div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div style={styles.historySection}>
            <div style={styles.historyHeader}>
              <h3 style={styles.cardTitle}>🕘 历史记录（最近 {history.length} 条）</h3>
              <button className="clear-btn" style={styles.clearBtn} onClick={clearHistory}>清空记录</button>
            </div>
            <div style={styles.historyGrid}>
              {history.map(record => (
                <div
                  key={record.id}
                  className="history-card"
                  style={styles.historyCard}
                  onClick={() => handleHistoryClick(record)}
                >
                  <div style={styles.historyFileName}>{record.fileName}</div>
                  <div style={styles.historyMeta}>
                    <span style={styles.historyJob}>{record.jobTitle}</span>
                    <span style={{ ...styles.historyPct, color: getScoreColor(record.matchPercentage) }}>
                      {record.matchPercentage}%
                    </span>
                  </div>
                  <div style={styles.historyStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < Math.ceil(record.overallScore / 2) ? '#f59e0b' : '#d1d5db', fontSize: 16 }}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div style={styles.historyTime}>
                    {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f4f4f5',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1f2937'
  },
  header: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    padding: '32px 0',
    color: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0 32px'
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '0.5px'
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: 14,
    opacity: 0.9
  },
  main: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '32px'
  },
  splitLayout: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start'
  },
  leftPanel: {
    flex: 55,
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  rightPanel: {
    flex: 45,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    position: 'sticky',
    top: 24
  },
  parsedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  fileNameBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    padding: '16px 20px',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  fileName: {
    fontWeight: 600,
    fontSize: 15,
    color: '#1f2937'
  },
  resetBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    color: '#4b5563',
    fontWeight: 500,
    transition: 'all 0.15s ease'
  },
  card: {
    width: '100%',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '20px',
    boxSizing: 'border-box'
  },
  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#1f2937'
  },
  nameText: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#111827'
  },
  skillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  skillTag: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: 999,
    background: '#3b82f6',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'default',
    transition: 'transform 0.2s ease'
  },
  emptyText: {
    margin: 0,
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic'
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  timelineItem: {
    display: 'flex',
    gap: 12,
    position: 'relative'
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#3b82f6',
    flexShrink: 0,
    marginTop: 6
  },
  timelineContent: {
    flex: 1,
    background: '#fff',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #e5e7eb'
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  timelineCompany: {
    fontWeight: 600,
    fontSize: 15,
    color: '#1f2937'
  },
  timelineDate: {
    fontSize: 12,
    color: '#6b7280'
  },
  timelinePosition: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: 500,
    marginBottom: 6
  },
  timelineDesc: {
    margin: 0,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.5
  },
  jobTabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 16
  },
  jobTab: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: '#4b5563',
    transition: 'all 0.2s ease'
  },
  jobTabActive: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#fff',
    borderColor: 'transparent',
    boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
  },
  jobDesc: {
    background: '#fff',
    borderRadius: 8,
    padding: '16px',
    border: '1px solid #e5e7eb'
  },
  jobDescText: {
    margin: '0 0 16px 0',
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 1.6
  },
  jobSkillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10
  },
  jobSkillsLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginRight: 4
  },
  emptyReport: {
    background: '#fff',
    borderRadius: 12,
    padding: '80px 24px',
    textAlign: 'center',
    border: '2px dashed #e5e7eb'
  },
  historySection: {
    marginTop: 40
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  clearBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #fee2e2',
    background: '#fff',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500
  },
  historyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16
  },
  historyCard: {
    background: '#fff',
    padding: '16px 20px',
    borderRadius: 12,
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  historyFileName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: 8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  historyMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  historyJob: {
    fontSize: 12,
    color: '#6b7280'
  },
  historyPct: {
    fontSize: 18,
    fontWeight: 700
  },
  historyStars: {
    marginBottom: 6
  },
  historyTime: {
    fontSize: 11,
    color: '#9ca3af'
  }
};
