import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SkillRadarChart from '../components/SkillRadarChart';
import { analyzeResume, getJobSuggestions, AnalysisResult, SkillItem, SuggestionItem } from '../utils/api';

const AnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileId = searchParams.get('fileId') || '';
  const analysisIdParam = searchParams.get('analysisId') || '';

  const [jobTitle, setJobTitle] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set([0]));
  const debounceRef = useRef<number>();

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    if (analysisIdParam) {
      loadAnalysisDetail();
    }
  }, [analysisIdParam]);

  const loadAnalysisDetail = async () => {
    try {
      const { getAnalysisDetail } = await import('../utils/api');
      const data = await getAnalysisDetail(analysisIdParam);
      setResult(data);
      setJobTitle(data.job_title);
    } catch (err) {
      console.error('加载分析详情失败', err);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (jobTitle.trim().length > 0) {
      debounceRef.current = window.setTimeout(async () => {
        try {
          const data = await getJobSuggestions(jobTitle);
          setSuggestions(data);
          setShowSuggestions(true);
        } catch (err) {
          console.error('获取建议失败', err);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [jobTitle]);

  const handleAnalyze = async () => {
    if (!fileId && !analysisIdParam) {
      alert('请先上传简历');
      return;
    }
    if (!jobTitle.trim()) {
      alert('请输入目标岗位');
      return;
    }
    setIsAnalyzing(true);
    try {
      const data = await analyzeResume(fileId || 'mock', jobTitle, bioText);
      setResult(data);
    } catch (err) {
      console.error('分析失败', err);
      alert('分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setJobTitle(suggestion);
    setShowSuggestions(false);
  };

  const toggleSuggestion = (index: number) => {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getScoreClass = (score: number): string => {
    if (score >= 75) return 'match-score-high';
    if (score >= 50) return 'match-score-medium';
    return 'match-score-low';
  };

  const getSeverityClass = (severity: string): string => {
    if (severity === 'high') return 'severity-high';
    if (severity === 'medium') return 'severity-medium';
    return 'severity-low';
  };

  const getSeverityLabel = (severity: string): string => {
    if (severity === 'high') return '高';
    if (severity === 'medium') return '中';
    return '低';
  };

  const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return <span style={{ color: '#bdc3c7' }}>输入内容将在此实时预览...</span>;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let processed = line;
      processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
      processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
      if (/^### (.+)/.test(processed)) {
        return <h3 key={idx} dangerouslySetInnerHTML={{ __html: processed.replace(/^###\s/, '') }} />;
      }
      if (/^## (.+)/.test(processed)) {
        return <h2 key={idx} dangerouslySetInnerHTML={{ __html: processed.replace(/^##\s/, '') }} />;
      }
      if (/^# (.+)/.test(processed)) {
        return <h1 key={idx} dangerouslySetInnerHTML={{ __html: processed.replace(/^#\s/, '') }} />;
      }
      return <p key={idx} dangerouslySetInnerHTML={{ __html: processed || '&nbsp;' }} />;
    });
  };

  const displaySkills: SkillItem[] = result?.skills || [
    { name: '技能1', score: 0 },
    { name: '技能2', score: 0 },
    { name: '技能3', score: 0 },
    { name: '技能4', score: 0 },
    { name: '技能5', score: 0 },
    { name: '技能6', score: 0 }
  ];

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="initial"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <h1 className="page-title">简历分析</h1>
      <p className="page-subtitle">输入目标岗位，系统将为您分析匹配度并提供建议</p>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="card-title">目标岗位</h3>
          <div className="job-input-wrapper">
            <input
              type="text"
              className="job-input"
              placeholder="输入目标岗位名称，如：前端开发工程师"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  className="suggestions-dropdown"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="suggestion-item"
                      onMouseDown={() => selectSuggestion(s)}
                    >
                      {s}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bio-section">
            <h3 className="card-title">个人简介（可选，支持Markdown）</h3>
            <div className="markdown-editor">
              <textarea
                className="bio-textarea"
                placeholder="在此补充简历中未覆盖的信息，如：\n# 个人优势\n* 5年**前端开发**经验\n* 精通`React`和`TypeScript`"
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
              />
              <div className="markdown-preview">
                {renderMarkdown(bioText)}
              </div>
            </div>
          </div>

          <motion.button
            className="analyze-btn"
            whileHover={!isAnalyzing ? { scale: 1.03 } : {}}
            whileTap={!isAnalyzing ? { scale: 0.97 } : {}}
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '分析中...' : '开始分析'}
          </motion.button>
        </div>

        <div className="dashboard-card">
          <h3 className="card-title">技能匹配雷达图</h3>
          <SkillRadarChart skills={displaySkills} size={360} />
          <div className="match-score-section">
            <div className="match-score-label">整体匹配度</div>
            <AnimatePresence mode="wait">
              <motion.div
                key={result?.overall_score || 0}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className={`match-score-value ${getScoreClass(result?.overall_score || 0)}`}
              >
                {result?.overall_score || 0}%
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            className="loading-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loading-spinner"></div>
            <div className="loading-text">正在分析简历，请稍候...</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="card-title" style={{ fontSize: '20px', marginBottom: '16px' }}>修改建议</h2>
            <div className="suggestions-list">
              {result.suggestions.map((suggestion: SuggestionItem, idx: number) => (
                <div key={idx} className="suggestion-card">
                  <div
                    className="suggestion-header"
                    onClick={() => toggleSuggestion(idx)}
                  >
                    <span className={`severity-tag ${getSeverityClass(suggestion.severity)}`}>
                      {getSeverityLabel(suggestion.severity)}
                    </span>
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className={`suggestion-toggle ${expandedSuggestions.has(idx) ? 'open' : ''}`}>▼</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {expandedSuggestions.has(idx) && (
                      <motion.div
                        className="suggestion-body-wrapper"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="suggestion-body">
                          {suggestion.description}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnalysisPage;
