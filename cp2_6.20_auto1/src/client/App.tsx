import React, { useState, useEffect, useRef, useCallback } from 'react';
import ResumeUploader from './components/ResumeUploader';
import SkillMatchingChart from './components/SkillMatchingChart';
import ReportView from './components/ReportView';
import { ParsedResume, MatchResult, JobRequirement, SkillMatch } from './types';
import { getSkillMatch, getJobs } from './api';

const App: React.FC = () => {
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [jobs, setJobs] = useState<JobRequirement[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('frontend');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedSkill, setHighlightedSkill] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobList = await getJobs();
        setJobs(jobList);
      } catch (err: any) {
        console.error('Failed to load jobs:', err);
      }
    };
    loadJobs();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (parsedResume) {
      const loadMatchResult = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await getSkillMatch(parsedResume.id, selectedJobId);
          setMatchResult(result);
        } catch (err: any) {
          setError(err.message || '技能匹配失败');
        } finally {
          setIsLoading(false);
        }
      };
      loadMatchResult();
    }
  }, [parsedResume, selectedJobId]);

  const handleParseComplete = useCallback((resume: ParsedResume) => {
    setParsedResume(resume);
  }, []);

  const handleJobChange = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
    setHighlightedSkill(null);
  }, []);

  const handleReset = useCallback(() => {
    setParsedResume(null);
    setMatchResult(null);
    setError(null);
    setHighlightedSkill(null);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleDrag = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const newWidth = (mouseX / containerWidth) * 100;
      setLeftWidth(Math.max(30, Math.min(60, newWidth)));
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const getSkillColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#F97316';
    return '#EF4444';
  };

  const getSkillMatchScore = (skillName: string): number => {
    if (!matchResult) return 0;
    const match = matchResult.skills.find(s => s.skill === skillName);
    return match ? match.score : 0;
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="app">
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-content">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M6 4H22L28 10V26C28 27.1046 27.1046 28 26 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4Z"
                fill="#1E3A5F"
              />
              <path
                d="M22 4V10H28"
                stroke="#FF6B35"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 18H22M10 22H18"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <h1>简历智能解析平台</h1>
          </div>

          <div className="nav-controls">
            <div className="job-select-wrapper">
              <label className="select-label">目标岗位:</label>
              <select
                className="job-select"
                value={selectedJobId}
                onChange={(e) => handleJobChange(e.target.value)}
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.name}</option>
                ))}
              </select>
            </div>

            <button className="reset-btn" onClick={handleReset}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12.5 8C12.5 10.4853 10.4853 12.5 8 12.5C5.51472 12.5 3.5 10.4853 3.5 8C3.5 5.51472 5.51472 3.5 8 3.5C9.23317 3.5 10.3683 4.00077 11.2119 4.78819M11.2119 4.78819L11 2.5M11.2119 4.78819L13.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              重置
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="job-tabs">
          {jobs.map((job) => (
            <button
              key={job.id}
              className={`job-tab ${selectedJobId === job.id ? 'active' : ''}`}
              onClick={() => handleJobChange(job.id)}
            >
              {job.name}
              <span className="tab-underline" />
            </button>
          ))}
        </div>

        <div className="layout-container" ref={containerRef}>
          <div
            className="left-panel"
            style={{
              width: isMobile ? '100%' : `${leftWidth}%`,
              minWidth: isMobile ? 'auto' : '300px',
            }}
          >
            <div className="panel-card">
              <h2 className="panel-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M16.5 5V15C16.5 15.8284 15.8284 16.5 15 16.5H5C4.17157 16.5 3.5 15.8284 3.5 15V5C3.5 4.17157 4.17157 3.5 5 3.5H15C15.8284 3.5 16.5 4.17157 16.5 5Z"
                    stroke="#1E3A5F"
                    strokeWidth="2"
                  />
                  <path
                    d="M6.5 7.5H13.5M6.5 10H13.5M6.5 12.5H10.5"
                    stroke="#1E3A5F"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                上传简历
              </h2>
              <ResumeUploader onParseComplete={handleParseComplete} />
            </div>

            {parsedResume && matchResult && (
              <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <ReportView
                  resume={parsedResume}
                  matchResult={matchResult}
                  highlightedSkill={highlightedSkill}
                  onSkillHighlight={setHighlightedSkill}
                />
              </div>
            )}

            {parsedResume && !matchResult && !isLoading && (
              <div className="panel-card" style={{ animation: 'fadeIn 0.4s ease' }}>
                <h2 className="panel-title">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 15L3.5 11.5L10 8L16.5 11.5L10 15Z"
                      stroke="#1E3A5F"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.5 13V17"
                      stroke="#1E3A5F"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13.5 13.5V17.5"
                      stroke="#1E3A5F"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16.5 11.5V15"
                      stroke="#1E3A5F"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  教育经历
                </h2>
                <div className="timeline">
                  {parsedResume.education.map((edu, index) => (
                    <div
                      key={edu.id}
                      className="timeline-item"
                      style={{ animation: `slideInLeft 0.5s ease ${index * 0.1}s both` }}
                    >
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="timeline-date">
                          {edu.startDate} - {edu.endDate}
                        </div>
                        <h3 className="edu-school">{edu.school}</h3>
                        <p className="edu-detail">
                          {edu.degree} {edu.major && `· ${edu.major}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isMobile && (
            <div
              className={`divider-bar ${isDragging ? 'dragging' : ''}`}
              onMouseDown={handleDragStart}
            >
              <div className="divider-handle">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div
            className="right-panel"
            style={{
              width: isMobile ? '100%' : `${100 - leftWidth - 2}%`,
            }}
          >
            {isLoading && (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>正在分析技能匹配度...</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z"
                    stroke="#FF6B35"
                    strokeWidth="2"
                  />
                  <path
                    d="M24 16V26M24 32H24.02"
                    stroke="#FF6B35"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <p>{error}</p>
              </div>
            )}

            {matchResult && !isLoading && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <SkillMatchingChart
                  skills={matchResult.skills}
                  jobName={selectedJob?.name || ''}
                  overallScore={matchResult.overallScore}
                  highlightedSkill={highlightedSkill}
                  onHighlightChange={setHighlightedSkill}
                />
              </div>
            )}

            {!parsedResume && (
              <div className="empty-state">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <path
                    d="M40 72C57.6731 72 72 57.6731 72 40C72 22.3269 57.6731 8 40 8C22.3269 8 8 22.3269 8 40C8 57.6731 22.3269 72 40 72Z"
                    stroke="#CBD5E0"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M40 24V44L54 44"
                    stroke="#A0AEC0"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3>上传简历开始分析</h3>
                <p>支持PDF文件上传或直接粘贴简历文本内容，系统将自动提取技能并与目标岗位进行匹配度分析</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          background: linear-gradient(180deg, #E8F0FE 0%, #F0F5FF 100%);
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.2s ease;
          border-bottom: 1px solid transparent;
        }

        .navbar.scrolled {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border-bottom-color: #E2E8F0;
        }

        .navbar-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1E3A5F;
          margin: 0;
        }

        .nav-controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .job-select-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .select-label {
          font-size: 14px;
          font-weight: 500;
          color: #4A5568;
        }

        .job-select {
          padding: 10px 20px;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #1E3A5F;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(8px);
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          min-width: 160px;
        }

        .job-select:hover {
          border-color: #1E3A5F;
        }

        .job-select:focus {
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
          border-color: #1E3A5F;
        }

        .reset-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: 1px solid #CBD5E0;
          border-radius: 8px;
          background: #fff;
          color: #4A5568;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-btn:hover {
          background: #F7FAFC;
          border-color: #1E3A5F;
          color: #1E3A5F;
          transform: translateY(-2px);
        }

        .main-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px 32px 48px;
        }

        .job-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          width: fit-content;
        }

        .job-tab {
          position: relative;
          padding: 10px 24px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #4A5568;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .job-tab:hover {
          color: #1E3A5F;
          background: rgba(255, 255, 255, 0.8);
        }

        .job-tab.active {
          color: #1E3A5F;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .tab-underline {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 3px;
          background: #FF6B35;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .job-tab.active .tab-underline {
          width: 60%;
        }

        .layout-container {
          display: flex;
          gap: 0;
          align-items: flex-start;
        }

        @media (max-width: 768px) {
          .layout-container {
            flex-direction: column;
            gap: 24px;
          }
        }

        .left-panel,
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .divider-bar {
          width: 8px;
          cursor: col-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .divider-bar::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #E2E8F0;
          transform: translateX(-50%);
        }

        .divider-bar:hover::before,
        .divider-bar.dragging::before {
          background: #1E3A5F;
          width: 3px;
        }

        .divider-handle {
          display: flex;
          gap: 3px;
          padding: 20px 2px;
          border-radius: 4px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 1;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .divider-bar:hover .divider-handle,
        .divider-bar.dragging .divider-handle {
          opacity: 1;
        }

        .divider-handle span {
          width: 3px;
          height: 20px;
          background: #CBD5E0;
          border-radius: 2px;
        }

        .panel-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .panel-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0 0 20px 0;
        }

        .skill-count {
          margin-left: auto;
          font-size: 13px;
          font-weight: 500;
          color: #718096;
          background: #F1F5F9;
          padding: 4px 12px;
          border-radius: 12px;
        }

        .timeline {
          position: relative;
          padding-left: 24px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: linear-gradient(180deg, #1E3A5F 0%, #60A5FA 100%);
          border-radius: 1px;
        }

        .timeline-item {
          position: relative;
          padding-bottom: 20px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-dot {
          position: absolute;
          left: -24px;
          top: 4px;
          width: 12px;
          height: 12px;
          background: #FF6B35;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        .timeline-content {
          background: #F8FAFC;
          padding: 16px;
          border-radius: 12px;
          border-left: 3px solid #1E3A5F;
        }

        .timeline-date {
          font-size: 12px;
          font-weight: 600;
          color: #FF6B35;
          margin-bottom: 6px;
        }

        .edu-school {
          font-size: 15px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 0 0 4px 0;
        }

        .edu-detail {
          font-size: 13px;
          color: #4A5568;
          margin: 0;
        }

        .extracted-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .extracted-skill-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: 1px solid;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .extracted-skill-tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .skill-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .loading-state,
        .empty-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          text-align: center;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #E8F0FE;
          border-top-color: #1E3A5F;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .loading-state p,
        .empty-state p,
        .error-state p {
          font-size: 14px;
          color: #718096;
          margin: 0;
          max-width: 360px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1E3A5F;
          margin: 16px 0 8px 0;
        }

        .error-state p {
          color: #FF6B35;
          margin-top: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .navbar-content {
            flex-direction: column;
            gap: 16px;
            padding: 16px 20px;
          }

          .logo h1 {
            font-size: 18px;
          }

          .nav-controls {
            width: 100%;
            justify-content: space-between;
          }

          .job-select {
            min-width: auto;
            flex: 1;
          }

          .main-content {
            padding: 16px 16px 32px;
          }

          .job-tabs {
            overflow-x: auto;
            width: 100%;
            -webkit-overflow-scrolling: touch;
          }

          .job-tabs::-webkit-scrollbar {
            display: none;
          }

          .job-tab {
            white-space: nowrap;
          }

          .panel-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
