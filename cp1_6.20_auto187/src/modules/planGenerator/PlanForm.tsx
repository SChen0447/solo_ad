import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlanFormData, MarketPosition, PlanBookData } from '../../types';
import { MARKET_POSITION_OPTIONS, MARKET_POSITION_CONFIG, TARGET_USER_OPTIONS } from '../../types';
import { generatePlanbook } from '../../api/apiService';

interface PlanFormProps {
  onGenerated: (data: PlanBookData) => void;
}

const PlanForm: React.FC<PlanFormProps> = ({ onGenerated }) => {
  const [projectName, setProjectName] = useState('');
  const [vision, setVision] = useState('');
  const [marketPosition, setMarketPosition] = useState<MarketPosition | ''>('');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTargetUserToggle = (user: string) => {
    setTargetUsers(prev =>
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) { setError('请输入项目名称'); return; }
    if (!vision.trim()) { setError('请输入一句话愿景'); return; }
    if (!marketPosition) { setError('请选择市场定位'); return; }
    if (targetUsers.length === 0) { setError('请选择至少一个目标用户画像'); return; }

    setLoading(true);
    try {
      const formData: PlanFormData = {
        projectName: projectName.trim(),
        vision: vision.trim(),
        marketPosition: marketPosition as MarketPosition,
        targetUsers,
      };
      const result = await generatePlanbook(formData);
      onGenerated(result);
    } catch {
      setError('生成计划书失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const posConfig = marketPosition ? MARKET_POSITION_CONFIG[marketPosition] : null;

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      style={styles.form}
    >
      <h2 style={styles.title}>创建商业计划书</h2>

      <div style={styles.field}>
        <label style={styles.label}>项目名称 <span style={styles.hint}>（最多50字符）</span></label>
        <input
          style={styles.input}
          type="text"
          maxLength={50}
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder="输入您的项目名称"
        />
        <span style={styles.count}>{projectName.length}/50</span>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>一句话愿景 <span style={styles.hint}>（最多100字符）</span></label>
        <textarea
          style={{ ...styles.input, ...styles.textarea }}
          maxLength={100}
          value={vision}
          onChange={e => setVision(e.target.value)}
          placeholder="描述您的项目愿景"
        />
        <span style={styles.count}>{vision.length}/100</span>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>市场定位</label>
        <div style={styles.badgeRow}>
          {MARKET_POSITION_OPTIONS.map(pos => {
            const cfg = MARKET_POSITION_CONFIG[pos];
            const selected = marketPosition === pos;
            return (
              <motion.button
                key={pos}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMarketPosition(pos)}
                style={{
                  ...styles.badge,
                  color: selected ? '#fff' : cfg.color,
                  backgroundColor: selected ? cfg.color : cfg.bg,
                  borderColor: cfg.color,
                }}
              >
                {pos}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>目标用户画像 <span style={styles.hint}>（多选）</span></label>
        <div style={styles.badgeRow}>
          {TARGET_USER_OPTIONS.map(user => {
            const selected = targetUsers.includes(user);
            return (
              <motion.button
                key={user}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTargetUserToggle(user)}
                style={{
                  ...styles.badge,
                  color: selected ? '#fff' : '#1e3a5f',
                  backgroundColor: selected ? '#1e3a5f' : '#f4f6f9',
                  borderColor: selected ? '#1e3a5f' : '#d1d5db',
                }}
              >
                {user}
              </motion.button>
            );
          })}
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          ...styles.submitBtn,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '生成中...' : '生成计划书'}
      </motion.button>

      {posConfig && (
        <div style={{ ...styles.previewBar, backgroundColor: posConfig.bg, borderColor: posConfig.color }}>
          <span style={{ color: posConfig.color, fontWeight: 600 }}>当前定位：</span>
          <span style={{ color: posConfig.color }}>{marketPosition}</span>
        </div>
      )}
    </motion.form>
  );
};

const styles: Record<string, React.CSSProperties> = {
  form: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '40px 32px',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e3a5f',
    marginBottom: 28,
    textAlign: 'center' as const,
  },
  field: {
    marginBottom: 24,
    position: 'relative' as const,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 400,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1.5px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    minHeight: 72,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  count: {
    position: 'absolute' as const,
    right: 12,
    bottom: 8,
    fontSize: 12,
    color: '#9ca3af',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  badge: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 20,
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 0',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#f59e0b',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: 8,
  },
  error: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  previewBar: {
    marginTop: 16,
    padding: '10px 16px',
    borderRadius: 8,
    borderLeft: '4px solid',
    fontSize: 14,
  },
};

export default PlanForm;
