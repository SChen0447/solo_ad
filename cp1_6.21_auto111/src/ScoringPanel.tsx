import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Star, Check, X, Send, Users, Music, Calendar, MessageSquare } from 'lucide-react';
import {
  getRepertoires,
  getPerformers,
  createRehearsal,
  submitFeedback,
  Repertoire,
  Performer,
} from './dataStore';

const presetPhrases = [
  '音准问题',
  '节奏需加强',
  '表现优秀',
  '音色很好',
  '力度控制需注意',
  '进步明显',
  '气息稳定',
  '换把不够流畅',
  '合奏默契度高',
  '需要更多练习',
];

interface PerformerScore {
  performerId: string;
  score: number;
  comment: string;
  selectedPhrases: string[];
}

export default function ScoringPanel() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepertoire, setSelectedRepertoire] = useState('');
  const [rehearsalDate, setRehearsalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPerformers, setSelectedPerformers] = useState<string[]>([]);
  const [step, setStep] = useState<'create' | 'score'>('create');
  const [scores, setScores] = useState<PerformerScore[]>([]);
  const [currentPerformerIndex, setCurrentPerformerIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([getRepertoires(), getPerformers()])
      .then(([reps, perfs]) => {
        setRepertoires(reps);
        setPerformers(perfs);
        if (reps.length > 0) {
          setSelectedRepertoire(reps[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const togglePerformer = (performerId: string) => {
    setSelectedPerformers((prev) =>
      prev.includes(performerId)
        ? prev.filter((id) => id !== performerId)
        : [...prev, performerId]
    );
  };

  const selectAll = () => {
    if (selectedPerformers.length === performers.length) {
      setSelectedPerformers([]);
    } else {
      setSelectedPerformers(performers.map((p) => p.id));
    }
  };

  const startScoring = () => {
    if (!selectedRepertoire || selectedPerformers.length === 0) return;
    const initialScores = selectedPerformers.map((id) => ({
      performerId: id,
      score: 0,
      comment: '',
      selectedPhrases: [] as string[],
    }));
    setScores(initialScores);
    setCurrentPerformerIndex(0);
    setStep('score');
  };

  const setScore = (score: number) => {
    const newScores = [...scores];
    newScores[currentPerformerIndex].score = score;
    setScores(newScores);
  };

  const setComment = (comment: string) => {
    const newScores = [...scores];
    newScores[currentPerformerIndex].comment = comment;
    setScores(newScores);
  };

  const togglePhrase = (phrase: string) => {
    const newScores = [...scores];
    const phrases = newScores[currentPerformerIndex].selectedPhrases;
    if (phrases.includes(phrase)) {
      newScores[currentPerformerIndex].selectedPhrases = phrases.filter((p) => p !== phrase);
    } else {
      newScores[currentPerformerIndex].selectedPhrases = [...phrases, phrase];
    }
    setScores(newScores);
  };

  const submitAll = async () => {
    setSubmitting(true);
    try {
      await createRehearsal(selectedRepertoire, rehearsalDate, selectedPerformers);
      for (const score of scores) {
        if (score.score > 0) {
          const fullComment = [...score.selectedPhrases, score.comment]
            .filter(Boolean)
            .join('。');
          await submitFeedback(
            score.performerId,
            'conductor-1',
            '王指挥',
            score.score,
            fullComment || '排练表现记录'
          );
        }
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setStep('create');
        setSelectedPerformers([]);
        setScores([]);
      }, 2000);
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const currentPerformer = performers.find(
    (p) => p.id === selectedPerformers[currentPerformerIndex]
  );
  const currentScore = scores[currentPerformerIndex];
  const completedCount = scores.filter((s) => s.score > 0).length;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #27AE60, #2ECC71)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'scaleIn 0.5s ease',
          }}
        >
          <Check size={40} color="#fff" />
        </div>
        <h2 style={{ color: '#2C3E50', marginBottom: '8px' }}>提交成功！</h2>
        <p style={{ color: '#7f8c8d' }}>已完成 {completedCount} 位乐手的评分</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">排练打分评价</h1>
        <p className="page-subtitle">创建排练活动并为乐手打分</p>
      </div>

      {step === 'create' ? (
        <div className="scoring-grid">
          <div className="glass-card">
            <div className="form-group">
              <label className="form-label">
                <Music size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                选择曲目
              </label>
              <select
                className="form-select"
                value={selectedRepertoire}
                onChange={(e) => setSelectedRepertoire(e.target.value)}
              >
                {repertoires.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                排练日期
              </label>
              <input
                type="date"
                className="form-input"
                value={rehearsalDate}
                onChange={(e) => setRehearsalDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  参与乐手（{selectedPerformers.length}/{performers.length}）
                </label>
                <button className="btn btn-secondary btn-small" onClick={selectAll}>
                  {selectedPerformers.length === performers.length ? '取消全选' : '全选'}
                </button>
              </div>
            </div>

            <div className="performer-list">
              {performers.map((performer) => (
                <div
                  key={performer.id}
                  className={`performer-item ${
                    selectedPerformers.includes(performer.id) ? 'selected' : ''
                  }`}
                  onClick={() => togglePerformer(performer.id)}
                >
                  <div className="performer-avatar">{performer.name.charAt(0)}</div>
                  <div className="performer-info">
                    <div className="performer-name">{performer.name}</div>
                    <div className="performer-instrument">
                      {performer.instrument} · {performer.part}
                    </div>
                  </div>
                  <div
                    className={`checkbox ${
                      selectedPerformers.includes(performer.id) ? 'checked' : ''
                    }`}
                  >
                    {selectedPerformers.includes(performer.id) && <Check size={14} />}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px' }}
              disabled={selectedPerformers.length === 0}
              onClick={startScoring}
            >
              开始打分
              <Send size={16} />
            </button>
          </div>

          <div className="glass-card">
            <h3
              style={{
                fontSize: '16px',
                color: '#2C3E50',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageSquare size={18} />
              评分说明
            </h3>
            <div style={{ fontSize: '13px', color: '#34495e', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>5星</strong> - 表现优秀，技术娴熟，情感表达到位
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>4星</strong> - 表现良好，整体稳定，有小问题需改进
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>3星</strong> - 表现一般，有明显需要加强的地方
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>2星</strong> - 需要更多练习，基础技能有待提高
              </p>
              <p>
                <strong>1星</strong> - 状态不佳或基础薄弱，需要重点关注
              </p>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
              <h4 style={{ fontSize: '14px', color: '#2C3E50', marginBottom: '12px' }}>预设评语</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {presetPhrases.map((phrase) => (
                  <span key={phrase} className="preset-tag" style={{ cursor: 'default' }}>
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button className="btn btn-secondary btn-small" onClick={() => setStep('create')}>
              <X size={14} />
              取消
            </button>
            <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
              进度：{completedCount}/{scores.length}
            </div>
          </div>

          {currentPerformer && currentScore && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '32px',
                  padding: '16px',
                  background: 'rgba(52, 152, 219, 0.08)',
                  borderRadius: '12px',
                }}
              >
                <div
                  className="performer-avatar"
                  style={{ width: '56px', height: '56px', fontSize: '20px' }}
                >
                  {currentPerformer.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#2C3E50' }}>
                    {currentPerformer.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#7f8c8d' }}>
                    {currentPerformer.instrument} · {currentPerformer.part}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">评分</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div
                      key={star}
                      className="star"
                      onClick={() => setScore(star)}
                    >
                      <Star
                        size={40}
                        fill={star <= currentScore.score ? '#F1C40F' : 'none'}
                        color={star <= currentScore.score ? '#F1C40F' : '#BDC3C7'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">快速评语</label>
                <div className="preset-phrases">
                  {presetPhrases.map((phrase) => (
                    <span
                      key={phrase}
                      className={`preset-tag ${
                        currentScore.selectedPhrases.includes(phrase) ? 'selected' : ''
                      }`}
                      onClick={() => togglePhrase(phrase)}
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">详细评语</label>
                <textarea
                  className="form-textarea"
                  placeholder="输入详细评价..."
                  value={currentScore.comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={currentPerformerIndex === 0}
                  onClick={() => setCurrentPerformerIndex((prev) => prev - 1)}
                >
                  上一位
                </button>
                {currentPerformerIndex < scores.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => setCurrentPerformerIndex((prev) => prev + 1)}
                  >
                    下一位
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={submitAll}
                    disabled={submitting || completedCount === 0}
                  >
                    {submitting ? '提交中...' : '完成提交'}
                    <Send size={16} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
                {scores.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background:
                        idx === currentPerformerIndex
                          ? '#3498DB'
                          : scores[idx].score > 0
                          ? '#27AE60'
                          : '#BDC3C7',
                      transition: 'all 0.2s ease',
                      transform: idx === currentPerformerIndex ? 'scale(1.5)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
