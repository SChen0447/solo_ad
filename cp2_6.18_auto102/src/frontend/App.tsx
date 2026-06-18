import React, { useState, useEffect, useCallback } from 'react';
import ResumeUploader from './ResumeUploader';
import MatchReport from './MatchReport';
import type { ParsedResume, JobRequirement, MatchReport as MatchReportType, HistoryRecord } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'resume_match_history_v1';
const MAX_HISTORY = 10;

const App: React.FC = () => {
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<JobRequirement[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('frontend');
  const [report, setReport] = useState<MatchReportType | null>(null);
  const [currentJob, setCurrentJob] = useState<JobRequirement | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [hoveredSkillIdx, setHoveredSkillIdx] = useState<number | null>(null);
  const [pressedTab, setPressedTab] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const loadHistory = useCallback((): HistoryRecord[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item: any) =>
        item && typeof item === 'object' && item.id && item.fileName
      ) as HistoryRecord[];
    } catch (err) {
      console.warn('加载历史记录失败，已重置:', err);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return [];
    }
  }, []);

  const saveHistory = useCallback((newHistory: HistoryRecord[]) => {
    const trimmed = newHistory.slice(0, MAX_HISTORY);

    const trySave = (records: HistoryRecord[], attempt: number = 0): boolean => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
      } catch (err: any) {
        const isQuotaError =
          err?.name === 'QuotaExceededError' ||
          err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          (err && typeof err.message === 'string' && (
            err.message.includes('quota') ||
            err.message.includes('Quota') ||
            err.message.includes('storage') ||
            err.message.includes('空间不足')
          ));

        if (isQuotaError && records.length > 1 && attempt < 5) {
          const reduced = records.slice(0, -1);
          return trySave(reduced, attempt + 1);
        }

        if (!isQuotaError) {
          console.warn('保存历史记录失败:', err);
        } else {
          console.warn('存储空间已满，已清理旧数据但仍无法保存');
          try {
            localStorage.removeItem(STORAGE_KEY);
            if (records.length > 0) {
              const minimal = records.slice(0, 1);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
              } catch {
                /* ignore */
              }
            }
          } catch {
            /* ignore */
          }
        }
        return false;
      }
    };

    trySave(trimmed);
  }, []);

  const addToHistory = useCallback((record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
    setHistory(prev => {
      const newRecord: HistoryRecord = {
        ...record,
        id: uuidv4(),
        timestamp: Date.now(),
      };
      const updated = [newRecord, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  useEffect(() => {
    setHistory(loadHistory());
  }, [loadHistory]);

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(data => {
        setJobs(data);
        if (data.length > 0 && !selectedJobId) {
          setSelectedJobId(data[0].id);
        }
      })
      .catch(err => console.error('加载职位模板失败:', err));
  }, []);

  useEffect(() => {
    if (parsedResume && selectedJobId && jobs.length > 0) {
      runMatch(parsedResume, selectedJobId);
    }
  }, [parsedResume, selectedJobId]);

  const runMatch = async (resume: ParsedResume, jobId: string) => {
    setMatchLoading(true);
    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobId }),
      });
      const result = await response.json();
      if (result.success) {
        setReport(result.data);
        setCurrentJob(result.job);

        addToHistory({
          fileName: currentFileName,
          jobTitle: result.job.title,
          matchPercentage: result.data.matchPercentage,
          parsedResume: resume,
          report: result.data,
        });
      }
    } catch (err) {
      console.error('匹配失败:', err);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleParseComplete = (data: ParsedResume, fileName: string) => {
    setIsLoading(false);
    setParsedResume(data);
    setCurrentFileName(fileName);
  };

  const handleHistoryClick = (record: HistoryRecord) => {
    setParsedResume(record.parsedResume);
    setCurrentFileName(record.fileName);
    setReport(record.report);
    const job = jobs.find(j => j.title === record.jobTitle);
    if (job) {
      setSelectedJobId(job.id);
      setCurrentJob(job);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getBadgeColor = (pct: number) => {
    if (pct >= 70) return { bg: '#dcfce7', color: '#15803d' };
    if (pct >= 50) return { bg: '#fef3c7', color: '#a16207' };
    return { bg: '#fee2e2', color: '#b91c1c' };
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h1 style={styles.appTitle}>简历解析与岗位匹配评估系统</h1>
          </div>
          <span style={styles.versionTag}>v1.0</span>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.content}>
          <div style={styles.leftPanel}>
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                上传简历
              </h2>
              <ResumeUploader
                onParseComplete={handleParseComplete}
                isLoading={isLoading}
              />
              {currentFileName && parsedResume && (
                <div style={styles.fileBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span style={{ flex: 1, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentFileName}
                  </span>
                  <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>已解析</span>
                </div>
              )}
            </div>

            {parsedResume ? (
              <div style={{ marginTop: 20 }}>
                <h2 style={styles.sectionTitle}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  解析结果 - <span style={{ color: '#3b82f6' }}>{parsedResume.name}</span>
                </h2>

                <div style={{ ...styles.card, ...styles.cardMargin }}>
                  <h3 style={styles.cardTitle}>个人信息</h3>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>姓名</span>
                    <span style={styles.infoValue}>{parsedResume.name}</span>
                  </div>
                </div>

                <div style={{ ...styles.card, ...styles.cardMargin }}>
                  <h3 style={styles.cardTitle}>
                    技能标签
                    <span style={{ ...styles.countBadge, marginLeft: 'auto' }}>
                      {parsedResume.skills.length} 项
                    </span>
                  </h3>
                  {parsedResume.skills.length > 0 ? (
                    <div style={styles.skillsContainer}>
                      {parsedResume.skills.map((skill, idx) => (
                        <span
                          key={`${skill}-${idx}`}
                          onMouseEnter={() => setHoveredSkillIdx(idx)}
                          onMouseLeave={() => setHoveredSkillIdx(null)}
                          style={{
                            ...styles.skillTag,
                            transform: hoveredSkillIdx === idx ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: hoveredSkillIdx === idx ? '0 4px 12px rgba(59, 130, 246, 0.35)' : 'none',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={styles.emptyText}>未提取到技能信息</p>
                  )}
                </div>

                <div style={{ ...styles.card, ...styles.cardMargin }}>
                  <h3 style={styles.cardTitle}>
                    工作经历
                    <span style={{ ...styles.countBadge, marginLeft: 'auto' }}>
                      {parsedResume.workExperience.length} 段
                    </span>
                  </h3>
                  {parsedResume.workExperience.length > 0 ? (
                    <div style={styles.timeline}>
                      {parsedResume.workExperience.map((exp, idx) => (
                        <div key={idx} style={styles.timelineItem}>
                          <div style={styles.timelineDot} />
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineHeader}>
                              <span style={styles.timelinePosition}>{exp.position}</span>
                              <span style={styles.timelineDate}>
                                {exp.startDate || '?'} - {exp.endDate || '至今'}
                              </span>
                            </div>
                            <div style={styles.timelineCompany}>{exp.company}</div>
                            {exp.description && (
                              <p style={styles.timelineDesc}>{exp.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={styles.emptyText}>未提取到工作经历信息</p>
                  )}
                </div>

                <div style={{ ...styles.card, ...styles.cardMargin }}>
                  <h3 style={styles.cardTitle}>
                    教育背景
                    <span style={{ ...styles.countBadge, marginLeft: 'auto' }}>
                      {parsedResume.education.length} 段
                    </span>
                  </h3>
                  {parsedResume.education.length > 0 ? (
                    <div style={styles.eduList}>
                      {parsedResume.education.map((edu, idx) => (
                        <div key={idx} style={styles.eduItem}>
                          <div style={styles.eduHeader}>
                            <span style={styles.eduSchool}>{edu.school}</span>
                            <span style={styles.timelineDate}>
                              {edu.startDate || '?'} - {edu.endDate || '?'}
                            </span>
                          </div>
                          <div style={styles.eduDetail}>
                            {edu.degree && <span style={styles.eduDegree}>{edu.degree}</span>}
                            {edu.major && (
                              <span style={styles.eduMajor}>
                                {edu.degree ? ' · ' : ''}{edu.major}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={styles.emptyText}>未提取到教育背景信息</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.placeholderCard}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <p style={styles.placeholderTitle}>暂无解析结果</p>
                <p style={styles.placeholderText}>上传PDF简历后，将在此处显示提取的结构化信息</p>
              </div>
            )}
          </div>

          <div style={styles.rightPanel}>
            <div style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                选择职位模板
              </h2>
              <div style={styles.jobTabs}>
                {jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    onMouseDown={() => setPressedTab(job.id)}
                    onMouseUp={() => setPressedTab(null)}
                    onMouseLeave={() => setPressedTab(null)}
                    style={{
                      ...styles.jobTab,
                      ...(selectedJobId === job.id ? styles.jobTabActive : {}),
                      ...(selectedJobId !== job.id ? { filter: 'brightness(1)' } : {}),
                      transform: pressedTab === job.id ? 'translateY(1px)' : 'translateY(0)',
                    }}
                  >
                    {job.title}
                  </button>
                ))}
              </div>
              {jobs.length > 0 && (
                <div style={styles.jobInfoCard}>
                  <div style={styles.jobInfoRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span style={styles.jobInfoText}>
                      必备技能 {jobs.find(j => j.id === selectedJobId)?.requiredSkills.length || 0} 项 ·
                      优先技能 {jobs.find(j => j.id === selectedJobId)?.preferredSkills.length || 0} 项
                    </span>
                  </div>
                </div>
              )}
            </div>

            {matchLoading && (
              <div style={{ ...styles.sectionCard, marginTop: 20 }}>
                <div style={styles.loadingBox}>
                  <div style={styles.spinner} />
                  <span style={{ marginLeft: 12, fontSize: 14, color: '#6b7280' }}>正在计算匹配度...</span>
                </div>
              </div>
            )}

            {report && currentJob && !matchLoading && (
              <div style={{ marginTop: 20 }}>
                <MatchReport
                  report={report}
                  job={currentJob}
                  resumeSkills={parsedResume?.skills || []}
                />
              </div>
            )}

            {!report && !matchLoading && (
              <div style={{ ...styles.placeholderCard, marginTop: 20, minHeight: 300 }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <p style={styles.placeholderTitle}>等待匹配分析</p>
                <p style={styles.placeholderText}>上传简历并选择职位后，将生成详细的匹配度报告</p>
              </div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <section style={styles.historySection}>
            <h2 style={styles.sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              历史记录
              <span style={{ ...styles.countBadge, marginLeft: 'auto' }}>
                最近 {history.length}/{MAX_HISTORY} 条
              </span>
            </h2>
            <div style={styles.historyGrid}>
              {history.map(record => {
                const badge = getBadgeColor(record.matchPercentage);
                const isHovered = hoveredCard === record.id;
                return (
                  <div
                    key={record.id}
                    onClick={() => handleHistoryClick(record)}
                    onMouseEnter={() => setHoveredCard(record.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      ...styles.historyCard,
                      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                      boxShadow: isHovered ? '0 8px 20px rgba(0, 0, 0, 0.08)' : 'none',
                      borderColor: isHovered ? '#bfdbfe' : '#e5e7eb',
                    }}
                  >
                    <div style={styles.historyCardHeader}>
                      <div style={styles.historyIcon}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <span
                        style={{
                          ...styles.historyPct,
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {record.matchPercentage}%
                      </span>
                    </div>
                    <div style={styles.historyFileName}>{record.fileName}</div>
                    <div style={styles.historyJobRow}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                      </svg>
                      <span style={styles.historyJobTitle}>{record.jobTitle}</span>
                    </div>
                    <div style={styles.historyTime}>{formatDate(record.timestamp)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f4f4f5',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
  },
  headerInner: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    marginLeft: 10,
  },
  versionTag: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 10px',
    borderRadius: 6,
  },
  main: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px',
  },
  content: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  leftPanel: {
    width: '55%',
    flexShrink: 0,
  },
  rightPanel: {
    width: '45%',
    flexShrink: 0,
    position: 'sticky',
    top: 88,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    padding: '20px 24px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '16px 18px',
  },
  cardMargin: {
    marginBottom: 16,
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    padding: '2px 8px',
    borderRadius: 10,
    textTransform: 'none',
    letterSpacing: 0,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    width: 70,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  skillsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    display: 'inline-block',
    padding: '5px 14px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'default',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  timeline: {
    position: 'relative',
    paddingLeft: 4,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: 20,
    paddingBottom: 16,
    borderLeft: '2px solid #e5e7eb',
  },
  timelineDot: {
    position: 'absolute',
    left: -6,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    border: '2px solid #ffffff',
    boxShadow: '0 0 0 2px #3b82f6',
  },
  timelineContent: {
    paddingBottom: 4,
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelinePosition: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  timelineDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500,
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
    padding: '2px 8px',
    borderRadius: 4,
  },
  timelineCompany: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: 600,
    marginBottom: 4,
  },
  timelineDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.6,
  },
  eduList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  eduItem: {
    padding: '10px 12px',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
  },
  eduHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eduSchool: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  eduDetail: {
    display: 'flex',
    alignItems: 'center',
  },
  eduDegree: {
    fontSize: 12,
    fontWeight: 600,
    color: '#059669',
    backgroundColor: '#d1fae5',
    padding: '2px 8px',
    borderRadius: 4,
  },
  eduMajor: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  placeholderCard: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px dashed #e5e7eb',
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 13,
    color: '#9ca3af',
    maxWidth: 300,
    lineHeight: 1.6,
  },
  fileBadge: {
    marginTop: 14,
    padding: '10px 14px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
  },
  jobTabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  jobTab: {
    flex: 1,
    minWidth: 100,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  jobTabActive: {
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#ffffff',
    borderColor: 'transparent',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
  },
  jobInfoCard: {
    marginTop: 14,
    padding: '10px 14px',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
  },
  jobInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  jobInfoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  historySection: {
    marginTop: 40,
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
  },
  historyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 14,
  },
  historyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    padding: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  historyCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyPct: {
    fontSize: 13,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 6,
  },
  historyFileName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  historyJobRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  historyJobTitle: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: 500,
  },
  historyTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;
