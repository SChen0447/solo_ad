import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Work } from '../types';
import { getWork } from '../services/works';
import { submitScore } from '../services/scores';
import ScoreSlider from '../components/ScoreSlider';
import RadarChart from '../components/RadarChart';

const Score: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [work, setWork] = useState<Work | null>(null);
  const [composition, setComposition] = useState(5);
  const [color, setColor] = useState(5);
  const [creativity, setCreativity] = useState(5);
  const [emotion, setEmotion] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user?.is_judge) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.is_judge || !id) return;

    const fetchWork = async () => {
      try {
        const response = await getWork(parseInt(id));
        setWork(response.work);
      } catch (err: any) {
        setError(err.response?.data?.message || '加载作品失败');
      } finally {
        setLoading(false);
      }
    };

    fetchWork();
  }, [id, user?.is_judge]);

  const handleSubmit = async () => {
    if (!work) return;

    setSubmitting(true);
    setError(null);

    try {
      const total = composition + color + creativity + emotion;
      const response = await submitScore({
        work_id: work.id,
        composition,
        color,
        creativity,
        emotion,
      });
      setTotalScore(response.score.total_score);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!user?.is_judge || !work) {
    return null;
  }

  const radarData = [
    { label: '构图', value: composition, max: 10 },
    { label: '色彩', value: color, max: 10 },
    { label: '创意', value: creativity, max: 10 },
    { label: '情感表达', value: emotion, max: 10 },
    { label: '总分', value: (composition + color + creativity + emotion) / 4, max: 10 },
  ];

  return (
    <div className="main-content">
      <div className="score-container">
        <div className="score-image">
          <img src={work.image_path} alt={work.title} />
        </div>
        <div className="score-info">
          <h2>{work.title}</h2>
          <p className="author">作者：@{work.author.username}</p>
          <p className="description">{work.description}</p>

          {!submitted ? (
            <>
              <ScoreSlider
                label="构图"
                value={composition}
                onChange={setComposition}
              />
              <ScoreSlider
                label="色彩"
                value={color}
                onChange={setColor}
              />
              <ScoreSlider
                label="创意"
                value={creativity}
                onChange={setCreativity}
              />
              <ScoreSlider
                label="情感表达"
                value={emotion}
                onChange={setEmotion}
              />

              <div className="radar-container">
                <RadarChart data={radarData} width={300} height={300} />
              </div>

              {error && <div className="form-error" style={{ marginTop: '16px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => navigate('/judge')}
                  disabled={submitting}
                >
                  返回
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '提交评分'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="radar-container">
                <RadarChart data={radarData} width={300} height={300} />
              </div>
              <div className="total-score">
                <div className="total-score-label">总分</div>
                <div className="total-score-value">{totalScore}</div>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '20px' }}
                onClick={() => navigate('/judge')}
              >
                返回列表
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Score;
