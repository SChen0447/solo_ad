import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Upload, FileType, StickyNote, GraduationCap,
  Sparkles, AlertCircle, FileText
} from 'lucide-react';
import type { ParsedResume, MatchResult, JobTemplate, SkillMatch } from '../../types';
import { uploadResume } from '../api';

interface ResumeUploaderProps {
  onUploaded: (resume: ParsedResume) => void;
  currentJobId: string;
  onJobChange: (jobId: string) => void;
  jobs: JobTemplate[];
  isLoading: boolean;
  matchResult: MatchResult | null;
  sortedMatchSkills: SkillMatch[];
  parsedResume: ParsedResume | null;
}

const defaultJobs: JobTemplate[] = [
  { id: 'frontend', name: '前端工程师', requiredSkills: [], relatedKeywords: {} },
  { id: 'data', name: '数据分析师', requiredSkills: [], relatedKeywords: {} },
  { id: 'pm', name: '产品经理', requiredSkills: [], relatedKeywords: {} },
];

const scoreToColor = (score: number): string => {
  const clamped = Math.max(0, Math.min(100, score));
  const t = clamped / 100;
  const r = Math.round(239 * (1 - t) + 16 * t);
  const g = Math.round(68 * (1 - t) + 185 * t);
  const b = Math.round(68 * (1 - t) + 129 * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onUploaded, currentJobId, onJobChange, jobs,
  isLoading, matchResult, sortedMatchSkills, parsedResume
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const displayJobs = jobs.length > 0 ? jobs : defaultJobs;
  const currentJobIndex = useMemo(
    () => displayJobs.findIndex(j => j.id === currentJobId),
    [displayJobs, currentJobId]
  );

  React.useLayoutEffect(() => {
    const updateIndicator = () => {
      const btn = tabRefs.current[currentJobIndex];
      if (btn && tabsRef.current) {
        const tabsRect = tabsRef.current.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        setTabIndicatorStyle({
          left: btnRect.left - tabsRect.left + 6,
          width: btnRect.width - 12,
        });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [currentJobIndex, displayJobs]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过5MB');
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const resume = await uploadResume({
        file,
        onProgress: (p) => setUploadProgress(p),
      });
      onUploaded(resume);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  }, [onUploaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFile]);

  const handleZoneClick = useCallback(() => {
    if (!isUploading && !isLoading) {
      fileInputRef.current?.click();
    }
  }, [isUploading, isLoading]);

  const handleTextSubmit = useCallback(async () => {
    setError(null);
    const text = pastedText.trim();
    if (text.length < 20) {
      setError('请粘贴至少20个字符的简历内容');
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const resume = await uploadResume({
        text,
        onProgress: (p) => setUploadProgress(p),
      });
      onUploaded(resume);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  }, [pastedText, onUploaded]);

  const hasResults = parsedResume !== null;

  return (
    <>
      <div className="card animate-fadeIn">
        <h2 className="card-title">
          <Upload className="card-title-icon" size={18} />
          上传简历
        </h2>

        <div
          className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleZoneClick}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {isUploading ? (
            <div className="upload-progress">
              <div className={`circular-progress ${uploadProgress >= 100 ? 'complete' : ''}`}>
                <svg viewBox="0 0 64 64">
                  <circle className="progress-bg" cx="32" cy="32" r="29" />
                  <circle
                    className="progress-bar"
                    cx="32" cy="32" r="29"
                    style={{ strokeDashoffset: 182.212 * (1 - uploadProgress / 100) }}
                  />
                </svg>
                <div className="progress-text">{uploadProgress}%</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {uploadProgress >= 100 ? '解析完成！' : '正在解析简历...'}
              </div>
            </div>
          ) : (
            <>
              <Upload className="upload-icon" strokeWidth={1.5} />
              <div className="upload-text">
                {isDragging ? '松开鼠标以上传文件' : '拖拽PDF文件到此处，或点击选择'}
              </div>
              <div className="upload-hint">支持 PDF / TXT 格式，最大 5MB</div>
            </>
          )}
        </div>

        <div className="text-paste-section">
          <div className="text-paste-label">
            <StickyNote size={14} />
            或粘贴简历文本
          </div>
          <textarea
            className="text-paste-area"
            placeholder="在此粘贴简历内容..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            disabled={isUploading || isLoading}
          />
          <button
            className="btn-primary"
            onClick={handleTextSubmit}
            disabled={isUploading || isLoading || pastedText.trim().length < 10}
          >
            <FileType size={16} />
            <span>解析粘贴的文本</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--color-danger)',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="card animate-fadeIn" style={{ animationDelay: '50ms' }}>
        <h2 className="card-title">
          <Sparkles className="card-title-icon" size={18} />
          目标岗位
        </h2>
        <div className="job-tabs" ref={tabsRef}>
          {displayJobs.map((job, idx) => (
            <button
              key={job.id}
              ref={(el) => { tabRefs.current[idx] = el; }}
              className={`job-tab ${job.id === currentJobId ? 'active' : ''}`}
              onClick={() => onJobChange(job.id)}
            >
              {job.name}
            </button>
          ))}
          <div
            className="job-tab-indicator"
            style={{
              transform: `translateX(${tabIndicatorStyle.left}px)`,
              width: `${tabIndicatorStyle.width}px`,
            }}
          />
        </div>
      </div>

      {hasResults && (
        <>
          <div className="card animate-slideInLeft" style={{ animationDelay: '100ms' }}>
            <h2 className="card-title">
              <Sparkles className="card-title-icon" size={18} />
              技能列表
              {matchResult && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-accent)',
                  }}
                >
                  共 {sortedMatchSkills.length} 项
                </span>
              )}
            </h2>
            <div className="skills-section">
              {sortedMatchSkills.length > 0 ? (
                <div className="skills-list">
                  {sortedMatchSkills.map((sm, idx) => (
                    <span
                      key={sm.skill}
                      className="skill-tag"
                      style={{
                        backgroundColor: scoreToColor(sm.score),
                        animationDelay: `${idx * 40}ms`,
                      }}
                    >
                      {sm.skill}
                      <span className="skill-tag-score">{sm.score}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="skills-list">
                  {parsedResume.skills.slice(0, 20).map((s, idx) => (
                    <span
                      key={s}
                      className="skill-tag"
                      style={{
                        backgroundColor: 'var(--color-primary-light)',
                        animationDelay: `${idx * 40}ms`,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card animate-slideInLeft" style={{ animationDelay: '180ms' }}>
            <h2 className="card-title">
              <GraduationCap className="card-title-icon" size={18} />
              教育经历
            </h2>
            {parsedResume.education.length > 0 ? (
              <div className="timeline">
                {parsedResume.education.map((edu, idx) => (
                  <div
                    key={`${edu.school}-${idx}`}
                    className="timeline-item"
                    style={{ animationDelay: `${idx * 120 + 200}ms` }}
                  >
                    <div className="timeline-dot" />
                    <div className="timeline-date">
                      {edu.startDate} - {edu.endDate}
                    </div>
                    <div className="timeline-school">
                      {edu.school}
                    </div>
                    <div className="timeline-detail">
                      {edu.degree !== '未明确' && <span>{edu.degree}</span>}
                      {edu.degree !== '未明确' && edu.major !== '未明确' && <span> · </span>}
                      {edu.major !== '未明确' && <span>{edu.major}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 12px' }}>
                <FileText className="empty-state-icon" size={32} />
                <div className="empty-state-text">未识别到明确的教育经历</div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default React.memo(ResumeUploader);
