import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../api';
import { Track, TrackMatchResult, Recommendation } from '../types';
import ReactECharts from 'echarts-for-react';

export default function TrackPage() {
  const { stats, setups, applySetup } = useApp();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<TrackMatchResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getTracks().then(setTracks).catch(console.error);
  }, []);

  const handleSelectTrack = async (trackId: string) => {
    setSelectedTrackId(trackId);
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });

    try {
      const [match, recs] = await Promise.all([
        api.calculateTrack(trackId, stats),
        api.getRecommendations(trackId, setups)
      ]);
      setMatchResult(match);
      setRecommendations(recs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyRecommendation = (rec: Recommendation) => {
    const fakeSetup = {
      id: rec.setupId,
      name: rec.setupName,
      selection: rec.selection,
      stats: rec.stats,
      createdAt: Date.now()
    };
    applySetup(fakeSetup);
    navigate('/garage');
  };

  const radarOption = matchResult ? {
    tooltip: {},
    radar: {
      indicator: [
        { name: '加速效率', max: 100 },
        { name: '极速效率', max: 100 },
        { name: '抓地力效率', max: 100 },
        { name: '过弯效率', max: 100 }
      ],
      axisName: { color: '#cbd5e1', fontSize: 12 },
      splitLine: { lineStyle: { color: '#334155' } },
      splitArea: { areaStyle: { color: ['#1e293b', '#0f172a'] } },
      axisLine: { lineStyle: { color: '#475569' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          matchResult.efficiency.accelerationEfficiency,
          matchResult.efficiency.topSpeedEfficiency,
          matchResult.efficiency.gripEfficiency,
          matchResult.efficiency.corneringEfficiency
        ],
        name: '当前方案',
        areaStyle: { color: 'rgba(249, 115, 22, 0.3)' },
        lineStyle: { color: '#f97316', width: 2 },
        itemStyle: { color: '#f97316' }
      }]
    }]
  } : null;

  const TrackCard = ({ track }: { track: Track }) => {
    const isFlipped = flippedCards.has(track.id);
    const isSelected = selectedTrackId === track.id;

    return (
      <div
        onClick={() => handleSelectTrack(track.id)}
        style={{
          perspective: '1000px',
          cursor: 'pointer',
          height: '260px',
          flex: '1 1 300px',
          minWidth: '280px'
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transition: 'transform 0.6s',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
          onMouseEnter={(e) => {
            if (!isFlipped) {
              e.currentTarget.style.transform = 'translateY(-8px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isFlipped) {
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            padding: '24px',
            backgroundColor: '#334155',
            border: isSelected ? '2px solid #f97316' : '2px solid transparent',
            boxShadow: isSelected
              ? '0 12px 32px rgba(249, 115, 22, 0.25)'
              : '0 4px 16px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '40px' }}>{track.icon}</span>
              <div>
                <h3 style={{ fontSize: '18px', color: '#f8fafc', fontWeight: 700 }}>{track.name}</h3>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#475569', color: '#cbd5e1' }}>
                    {track.surface}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#475569', color: '#cbd5e1' }}>
                    {track.condition}
                  </span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, flex: 1 }}>{track.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
              <span>加速 {(track.weights.acceleration * 100).toFixed(0)}%</span>
              <span>极速 {(track.weights.topSpeed * 100).toFixed(0)}%</span>
              <span>抓地 {(track.weights.grip * 100).toFixed(0)}%</span>
              <span>过弯 {(track.weights.cornering * 100).toFixed(0)}%</span>
            </div>
            <div style={{ textAlign: 'center', color: '#f97316', fontSize: '13px', fontWeight: 500 }}>
              点击查看匹配详情 →
            </div>
          </div>

          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            padding: '20px',
            backgroundColor: '#0f172a',
            border: '2px solid #f97316',
            boxShadow: '0 12px 32px rgba(249, 115, 22, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#f97316', fontSize: '16px' }}>{track.icon} {track.name}</h4>
              {matchResult && selectedTrackId === track.id && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>当前方案匹配度</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#f97316' }}>{matchResult.matchScore}<span style={{ fontSize: '14px' }}>/100</span></div>
                </div>
              )}
            </div>
            {matchResult && selectedTrackId === track.id && (
              <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>加速贡献: <span style={{ color: '#f97316', fontWeight: 600 }}>{matchResult.weightedContribution.acceleration}</span></div>
                <div>极速贡献: <span style={{ color: '#3b82f6', fontWeight: 600 }}>{matchResult.weightedContribution.topSpeed}</span></div>
                <div>抓地贡献: <span style={{ color: '#22c55e', fontWeight: 600 }}>{matchResult.weightedContribution.grip}</span></div>
                <div>过弯贡献: <span style={{ color: '#a855f7', fontWeight: 600 }}>{matchResult.weightedContribution.cornering}</span></div>
              </div>
            )}
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', marginTop: 'auto' }}>
              再次点击返回
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '20px', color: '#f97316', marginBottom: '8px' }}>🏁 选择赛道</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>选择赛道类型查看当前方案的匹配度，系统将为您推荐最佳改装方案</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {tracks.map(track => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>

      {selectedTrackId && matchResult && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            flex: '0 0 380px',
            minWidth: '320px',
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ color: '#f97316', fontSize: '16px', marginBottom: '12px' }}>📈 参数效率雷达图</h3>
            <div style={{ height: '320px' }}>
              {radarOption && <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />}
            </div>
          </div>

          <div style={{
            flex: 1,
            minWidth: '320px',
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ color: '#f97316', fontSize: '16px', marginBottom: '16px' }}>🏆 推荐改装方案</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {recommendations.map((rec, idx) => (
                <div key={rec.setupId} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#334155',
                  border: idx === 0 ? '2px solid #f97316' : '2px solid transparent',
                  boxShadow: idx === 0 ? '0 4px 16px rgba(249, 115, 22, 0.2)' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {idx === 0 && <span style={{ fontSize: '20px' }}>🥇</span>}
                      {idx === 1 && <span style={{ fontSize: '20px' }}>🥈</span>}
                      {idx === 2 && <span style={{ fontSize: '20px' }}>🥉</span>}
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{rec.setupName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '32px', fontWeight: 800, color: '#f97316' }}>{rec.matchScore}</span>
                      <span style={{ color: '#94a3b8', fontSize: '14px' }}>/100</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {rec.pros.map((pro, i) => (
                      <div key={`pro-${i}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#22c55e' }}>✓</span>
                        <span style={{ fontSize: '13px', color: '#86efac' }}>{pro}</span>
                      </div>
                    ))}
                    {rec.cons.map((con, i) => (
                      <div key={`con-${i}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#ef4444' }}>!</span>
                        <span style={{ fontSize: '13px', color: '#fca5a5' }}>{con}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {Object.entries(rec.stats).map(([k, v]) => {
                      const colors: Record<string, string> = {
                        acceleration: '#f97316',
                        topSpeed: '#3b82f6',
                        grip: '#22c55e',
                        cornering: '#a855f7'
                      };
                      const labels: Record<string, string> = {
                        acceleration: '加速',
                        topSpeed: '极速',
                        grip: '抓地',
                        cornering: '过弯'
                      };
                      return (
                        <span key={k} style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: colors[k],
                          color: '#fff',
                          fontWeight: 500
                        }}>
                          {labels[k]} {v}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleApplyRecommendation(rec)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: '#f97316',
                      color: '#f8fafc',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ea580c')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
                  >
                    应用此方案 →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="flex: 0 0 380px"] {
            flex: 1 1 100% !important;
            min-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
