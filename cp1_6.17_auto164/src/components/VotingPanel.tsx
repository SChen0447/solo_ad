import { useState, useEffect } from 'react';
import { EMOTION_CONFIG, EMOTION_ORDER, type EmotionLevel, type ActivityStats } from '../types';
import { submitVote, getActivity, wsClient } from '../services';

interface VotingPanelProps {
  activityId: string;
}

export default function VotingPanel({ activityId }: VotingPanelProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [bouncingEmotion, setBouncingEmotion] = useState<EmotionLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const data = await getActivity(activityId);
        if (mounted) {
          setStats(data);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message || '加载失败');
          setLoading(false);
        }
      }
    };

    loadData();

    wsClient.connect();
    const unsubscribe = wsClient.onStatsUpdate((newStats) => {
      if (mounted && newStats.activity_id === activityId) {
        setStats(newStats);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [activityId]);

  const handleVote = async (emotion: EmotionLevel) => {
    if (voted) return;
    setBouncingEmotion(emotion);
    setTimeout(() => setBouncingEmotion(null), 200);

    try {
      const newStats = await submitVote(activityId, emotion);
      setStats(newStats);
      setVoted(true);
    } catch (e: any) {
      setError(e.message || '投票失败');
    }
  };

  if (loading) {
    return (
      <div className="card voting-panel">
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card voting-panel">
        <p style={{ color: '#E74C3C' }}>{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card voting-panel">
        <p>活动不存在</p>
      </div>
    );
  }

  return (
    <div className="card voting-panel">
      <h2>{stats.activity_name}</h2>
      <p className="topic">{stats.topic}</p>

      {voted && (
        <p style={{ color: '#2ECC71', fontWeight: 600, marginBottom: 24 }}>
          ✓ 感谢您的投票！
        </p>
      )}

      <div className="emoji-buttons">
        {EMOTION_ORDER.map((emotion) => {
          const config = EMOTION_CONFIG[emotion];
          return (
            <button
              key={emotion}
              className={`emoji-btn ${bouncingEmotion === emotion ? 'bounce' : ''}`}
              onClick={() => handleVote(emotion)}
              style={{
                borderColor: voted ? 'transparent' : undefined,
                opacity: voted ? 0.7 : 1,
                cursor: voted ? 'not-allowed' : 'pointer',
              }}
              disabled={voted}
            >
              <span className="emoji" style={{ color: config.color }}>
                {config.emoji}
              </span>
              <span className="label">{config.label}</span>
              <span className="count">{stats.votes[emotion]} 人</span>
            </button>
          );
        })}
      </div>

      <p style={{ color: '#888', fontSize: 14 }}>
        当前共有 <strong>{stats.total_votes}</strong> 人参与投票
      </p>
    </div>
  );
}
