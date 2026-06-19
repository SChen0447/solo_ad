import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FileText, RotateCcw, Briefcase } from 'lucide-react';
import type { ParsedResume, MatchResult, JobTemplate, ToastMessage } from '../types';
import { uploadResume, getSkillMatch, getJobTemplates } from './api';
import ResumeUploader from './components/ResumeUploader';
import SkillMatchingChart from './components/SkillMatchingChart';

const DEFAULT_JOB_ID = 'frontend';

const App: React.FC = () => {
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>(DEFAULT_JOB_ID);
  const [jobs, setJobs] = useState<JobTemplate[]>([]);
  const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number>(40);
  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [isRadarSwitching, setIsRadarSwitching] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const splitLayoutRef = useRef<HTMLDivElement>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsNavbarScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    getJobTemplates().then(setJobs).catch(() => {});
  }, []);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = `toast_${++toastIdRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  }, []);

  const fetchMatchResult = useCallback(async (resumeId: string, jobId: string) => {
    setMatchLoading(true);
    try {
      const result = await getSkillMatch(resumeId, jobId);
      setMatchResult(result);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '匹配计算失败', 'error');
    } finally {
      setTimeout(() => setMatchLoading(false), 200);
    }
  }, [showToast]);

  const handleJobChange = useCallback((jobId: string) => {
    if (jobId === currentJobId) return;
    setCurrentJobId(jobId);
    setIsRadarSwitching(true);
    setTimeout(() => setIsRadarSwitching(false), 400);
    if (parsedResume) {
      fetchMatchResult(parsedResume.id, jobId);
    }
  }, [currentJobId, parsedResume, fetchMatchResult]);

  const handleNavbarJobChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    handleJobChange(e.target.value);
  }, [handleJobChange]);

  const handleResumeUploaded = useCallback(async (resume: ParsedResume) => {
    setIsLoading(true);
    try {
      setParsedResume(resume);
      showToast('简历解析成功！正在计算匹配度...', 'success');
      await fetchMatchResult(resume.id, currentJobId);
      showToast('技能匹配分析完成！', 'success');
    } finally {
      setIsLoading(false);
    }
  }, [currentJobId, fetchMatchResult, showToast]);

  const handleReset = useCallback(() => {
    setParsedResume(null);
    setMatchResult(null);
    setIsLoading(false);
    setMatchLoading(false);
    setCurrentJobId(DEFAULT_JOB_ID);
    showToast('已重置所有内容', 'info');
  }, [showToast]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isMobile]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!splitLayoutRef.current) return;
      const rect = splitLayoutRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(25, Math.min(60, newWidth));
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleCopyKeyword = useCallback((keyword: string) => {
    navigator.clipboard?.writeText(keyword)
      .then(() => showToast(`已复制: ${keyword}`, 'success'))
      .catch(() => showToast('复制失败，请手动复制', 'error'));
  }, [showToast]);

  const sortedMatchSkills = useMemo(() => {
    if (!matchResult) return [];
    return [...matchResult.skills].sort((a, b) => b.score - a.score);
  }, [matchResult]);

  return (
    <div className="app-container">
      <nav className={`navbar ${isNavbarScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <div className="navbar-brand">
            <div className="navbar-brand-icon">
              <FileText size={18} strokeWidth={2.5} />
            </div>
            <span>简历智能分析</span>
          </div>

          <div className="navbar-actions">
            <select
              className="glass-select"
              value={currentJobId}
              onChange={handleNavbarJobChange}
              aria-label="选择目标岗位"
            >
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
              {jobs.length === 0 && (
                <>
                  <option value="frontend">前端工程师</option>
                  <option value="data">数据分析师</option>
                  <option value="pm">产品经理</option>
                </>
              )}
            </select>

            <button
              className="btn-reset"
              onClick={handleReset}
              title="重置所有内容"
            >
              <RotateCcw size={15} />
              <span>重置</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="split-layout" ref={splitLayoutRef}>
          <div
            className="split-left"
            style={isMobile ? undefined : { width: `${leftWidth}%` }}
          >
            <ResumeUploader
              onUploaded={handleResumeUploaded}
              currentJobId={currentJobId}
              onJobChange={handleJobChange}
              jobs={jobs}
              isLoading={isLoading}
              matchResult={matchResult}
              sortedMatchSkills={sortedMatchSkills}
              parsedResume={parsedResume}
            />
          </div>

          <div
            className={`divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleDividerMouseDown}
            role="separator"
            aria-orientation="vertical"
          />

          <div
            className="split-right"
            style={isMobile ? undefined : { width: `${100 - leftWidth}%` }}
          >
            <SkillMatchingChart
              matchResult={matchResult}
              parsedResume={parsedResume}
              isLoading={matchLoading}
              isSwitching={isRadarSwitching}
              onCopyKeyword={handleCopyKeyword}
            />
          </div>
        </div>
      </main>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && <Briefcase size={14} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
