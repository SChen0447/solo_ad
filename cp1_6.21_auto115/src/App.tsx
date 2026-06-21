import React, { useState, useEffect, useCallback } from 'react';
import { Star, Plus, BarChart3, Home, X, Settings, Coffee } from 'lucide-react';
import RecordCard from './components/RecordCard';
import AnalysisChart from './components/AnalysisChart';
import { api } from './api';
import type {
  BrewRecord,
  FlavorEval,
  FlavorTag,
  RoastLevel,
  Weights,
} from './types';
import { FLAVOR_TAG_LABELS, ROAST_LABELS } from './types';

type Page = 'home' | 'analysis';

const DEFAULT_WEIGHTS: Weights = {
  acidity: 0.25,
  sweetness: 0.25,
  bitterness: 0.25,
  body: 0.25,
};

const PRESET_COFFEES = [
  '埃塞俄比亚',
  '哥伦比亚',
  '肯尼亚',
  '巴西',
  '危地马拉',
  '曼特宁',
  '耶加雪菲',
  '瑰夏',
];

const FLAVOR_TAGS: FlavorTag[] = [
  'floral',
  'fruity',
  'nutty',
  'chocolate',
  'caramel',
  'spicy',
];

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [records, setRecords] = useState<BrewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEvalPanel, setShowEvalPanel] = useState(false);
  const [showWeightPanel, setShowWeightPanel] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BrewRecord | null>(null);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [pulsingStar, setPulsingStar] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    coffeeName: '',
    customCoffeeName: '',
    roastLevel: 'medium' as RoastLevel,
    grindSize: 5,
    waterTemp: 92,
    ratio: 15,
    totalTime: 120,
  });

  const [evalData, setEvalData] = useState({
    acidity: 3,
    sweetness: 3,
    bitterness: 3,
    body: 3,
    flavorTags: [] as FlavorTag[],
  });

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await api.getRecords();
      setRecords(data.sort((a, b) => b.recordNumber - a.recordNumber));
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = useCallback(
    (data: {
      acidity: number;
      sweetness: number;
      bitterness: number;
      body: number;
    }): number => {
      return (
        data.acidity * weights.acidity +
        data.sweetness * weights.sweetness +
        (6 - data.bitterness) * weights.bitterness +
        data.body * weights.body
      );
    },
    [weights]
  );

  const handleCreateRecord = async () => {
    const coffeeName = formData.coffeeName === 'custom'
      ? formData.customCoffeeName
      : formData.coffeeName;

    if (!coffeeName.trim()) {
      alert('请输入咖啡豆名称');
      return;
    }

    try {
      const newRecord = await api.createRecord({
        coffeeName: coffeeName.trim(),
        roastLevel: formData.roastLevel,
        grindSize: formData.grindSize,
        waterTemp: formData.waterTemp,
        ratio: formData.ratio,
        totalTime: formData.totalTime,
      });
      setRecords((prev) => [newRecord, ...prev]);
      setShowCreateForm(false);
      setFormData({
        coffeeName: '',
        customCoffeeName: '',
        roastLevel: 'medium',
        grindSize: 5,
        waterTemp: 92,
        ratio: 15,
        totalTime: 120,
      });
    } catch (error) {
      console.error('Failed to create record:', error);
    }
  };

  const handleStarClick = (dimension: keyof Omit<FlavorEval, 'flavorTags' | 'overallScore'>, value: number) => {
    setPulsingStar(`${dimension}-${value}`);
    setTimeout(() => setPulsingStar(null), 200);
    setEvalData((prev) => ({ ...prev, [dimension]: value }));
  };

  const handleTagToggle = (tag: FlavorTag) => {
    setEvalData((prev) => {
      if (prev.flavorTags.includes(tag)) {
        return { ...prev, flavorTags: prev.flavorTags.filter((t) => t !== tag) };
      }
      if (prev.flavorTags.length >= 3) {
        return prev;
      }
      return { ...prev, flavorTags: [...prev.flavorTags, tag] };
    });
  };

  const handleEvaluate = async () => {
    if (!selectedRecord) return;

    const flavorEval: FlavorEval = {
      acidity: evalData.acidity,
      sweetness: evalData.sweetness,
      bitterness: evalData.bitterness,
      body: evalData.body,
      flavorTags: evalData.flavorTags,
      overallScore: calculateOverallScore(evalData),
    };

    try {
      const updated = await api.evaluateRecord(selectedRecord.id, flavorEval);
      setRecords((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
      setShowEvalPanel(false);
      setSelectedRecord(null);
      setEvalData({
        acidity: 3,
        sweetness: 3,
        bitterness: 3,
        body: 3,
        flavorTags: [],
      });
    } catch (error) {
      console.error('Failed to evaluate:', error);
    }
  };

  const openEvalPanel = (record: BrewRecord) => {
    if (record.flavorEval) {
      setEvalData({
        acidity: record.flavorEval.acidity,
        sweetness: record.flavorEval.sweetness,
        bitterness: record.flavorEval.bitterness,
        body: record.flavorEval.body,
        flavorTags: record.flavorEval.flavorTags,
      });
    }
    setSelectedRecord(record);
    setShowEvalPanel(true);
  };

  const renderStars = (
    dimension: 'acidity' | 'sweetness' | 'bitterness' | 'body',
    label: string,
    color: string
  ) => {
    const current = evalData[dimension];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ width: '60px', fontSize: '14px', color: '#5D4037' }}>
          {label}
        </span>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={28}
            fill={n <= current ? color : 'transparent'}
            color={color}
            style={{
              cursor: 'pointer',
              transition: 'transform 200ms ease',
              transform: pulsingStar === `${dimension}-${n}` ? 'scale(1.2)' : 'scale(1)',
            }}
            onClick={() => handleStarClick(dimension, n)}
          />
        ))}
        <span
          style={{
            marginLeft: '8px',
            fontSize: '14px',
            fontWeight: 600,
            color: color,
            minWidth: '20px',
          }}
        >
          {current}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#8B5E3C',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#F5F0EB',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Coffee size={32} color="#8B5E3C" />
            <div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#5D4037',
                }}
              >
                咖啡冲泡记录
              </div>
              <div style={{ fontSize: '13px', color: '#8B5E3C', opacity: 0.7 }}>
                记录每一杯好咖啡
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowWeightPanel(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '12px',
                border: 'none',
                background: '#fff',
                color: '#8B5E3C',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(139, 94, 60, 0.1)',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#FAFAF7')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = '#fff')
              }
            >
              <Settings size={18} />
              权重设置
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                background: '#D4A574',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(212, 165, 116, 0.4)',
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#C4956A';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#D4A574';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={18} />
              新建记录
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            background: '#EDE5DD',
            padding: '6px',
            borderRadius: '12px',
            width: 'fit-content',
          }}
        >
          <button
            onClick={() => setPage('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: page === 'home' ? '#fff' : 'transparent',
              color: page === 'home' ? '#5D4037' : '#8B5E3C',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 200ms ease',
            }}
          >
            <Home size={18} />
            记录列表
          </button>
          <button
            onClick={() => setPage('analysis')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: page === 'analysis' ? '#fff' : 'transparent',
              color: page === 'analysis' ? '#5D4037' : '#8B5E3C',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 200ms ease',
            }}
          >
            <BarChart3 size={18} />
            数据分析
          </button>
        </div>

        {page === 'home' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEvaluate={openEvalPanel}
              />
            ))}
            {records.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 20px',
                  color: '#8B5E3C',
                }}
              >
                <Coffee size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                  还没有冲泡记录
                </div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>
                  点击"新建记录"开始记录你的第一杯咖啡
                </div>
              </div>
            )}
          </div>
        )}

        {page === 'analysis' && <AnalysisChart records={records} />}
      </div>

      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowCreateForm(false)}
        >
          <div
            style={{
              background: '#F5F0EB',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#5D4037' }}>
                新建冲泡记录
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8B5E3C',
                  padding: '4px',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5D4037', marginBottom: '8px', fontWeight: 500 }}>
                  咖啡豆名称
                </label>
                <select
                  value={formData.coffeeName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, coffeeName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid #E8E0D8',
                    fontSize: '14px',
                    background: '#fff',
                    color: '#5D4037',
                    outline: 'none',
                    transition: 'border-color 200ms ease',
                  }}
                >
                  <option value="">请选择咖啡豆</option>
                  {PRESET_COFFEES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                  <option value="custom">自定义...</option>
                </select>
                {formData.coffeeName === 'custom' && (
                  <input
                    type="text"
                    value={formData.customCoffeeName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customCoffeeName: e.target.value }))
                    }
                    placeholder="输入咖啡豆名称"
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '2px solid #E8E0D8',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5D4037', marginBottom: '8px', fontWeight: 500 }}>
                  烘焙度
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['light', 'medium', 'dark'] as RoastLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFormData((prev) => ({ ...prev, roastLevel: level }))}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '12px',
                        border: '2px solid',
                        borderColor: formData.roastLevel === level ? '#D4A574' : '#E8E0D8',
                        background: formData.roastLevel === level ? '#D4A574' : '#fff',
                        color: formData.roastLevel === level ? '#fff' : '#5D4037',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                      }}
                    >
                      {ROAST_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5D4037', marginBottom: '8px', fontWeight: 500 }}>
                  研磨度: {formData.grindSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={formData.grindSize}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, grindSize: Number(e.target.value) }))
                  }
                  style={{ width: '100%', accentColor: '#D4A574' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8B5E3C', opacity: 0.7 }}>
                  <span>细</span>
                  <span>粗</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5D4037', marginBottom: '8px', fontWeight: 500 }}>
                  水温: {formData.waterTemp}°C
                </label>
                <input
                  type="range"
                  min="70"
                  max="100"
                  step="1"
                  value={formData.waterTemp}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, waterTemp: Number(e.target.value) }))
                  }
                  style={{ width: '100%', accentColor: '#D4A574' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8B5E3C', opacity: 0.7 }}>
                  <span>70°C</span>
                  <span>100°C</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5D4037', marginBottom: '8px', fontWeight: 500 }}>
                  粉水比: 1:{formData.ratio}
                </label>
                <input
                  type="range"
                  min="10"
                  max="18"
                  step="0.5"
                  value={formData.ratio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ratio: Number(e.target.value) }))
                  }
                  style={{ width: '100%', accentColor: '#D4A574' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#8B5E3C', opacity: 0.7 }}>
                  <span>1:10</span>
                  <span>1:18</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#5D4037', marginBottom: '8px', fontWeight: 500 }}>
                  总注水时间: {formData.totalTime} 秒
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={formData.totalTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, totalTime: Number(e.target.value) }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '2px solid #E8E0D8',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleCreateRecord}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#D4A574',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#C4956A')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = '#D4A574')
                }
              >
                创建记录
              </button>
            </div>
          </div>
        </div>
      )}

      {showEvalPanel && selectedRecord && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 100,
              transition: 'opacity 300ms ease',
            }}
            onClick={() => setShowEvalPanel(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '100%',
              maxWidth: '480px',
              height: '100vh',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
              zIndex: 101,
              animation: 'slideIn 300ms ease forwards',
              overflowY: 'auto',
            }}
          >
            <style>{`
              @keyframes slideIn {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }
            `}</style>

            <div style={{ padding: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#5D4037' }}>
                    #{selectedRecord.recordNumber} {selectedRecord.coffeeName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#8B5E3C', marginTop: '4px' }}>
                    {ROAST_LABELS[selectedRecord.roastLevel]} · 研磨度{selectedRecord.grindSize} ·{' '}
                    {selectedRecord.waterTemp}°C · 1:{selectedRecord.ratio} · {selectedRecord.totalTime}s
                  </div>
                </div>
                <button
                  onClick={() => setShowEvalPanel(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#8B5E3C',
                    padding: '4px',
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div
                  style={{
                    background: 'rgba(212, 165, 116, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#5D4037', marginBottom: '16px' }}>
                    风味评价
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {renderStars('acidity', '酸度', '#E67E22')}
                    {renderStars('sweetness', '甜度', '#F1C40F')}
                    {renderStars('bitterness', '苦度', '#5D4037')}
                    {renderStars('body', '醇厚度', '#8B4513')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#5D4037', marginBottom: '12px' }}>
                    风味标签 (最多选3个)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {FLAVOR_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        disabled={
                          !evalData.flavorTags.includes(tag) &&
                          evalData.flavorTags.length >= 3
                        }
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: '2px solid',
                          borderColor: evalData.flavorTags.includes(tag)
                            ? '#D4A574'
                            : '#E8E0D8',
                          background: evalData.flavorTags.includes(tag)
                            ? '#D4A574'
                            : 'transparent',
                          color: evalData.flavorTags.includes(tag)
                            ? '#fff'
                            : '#5D4037',
                          fontSize: '13px',
                          cursor:
                            !evalData.flavorTags.includes(tag) &&
                            evalData.flavorTags.length >= 3
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            !evalData.flavorTags.includes(tag) &&
                            evalData.flavorTags.length >= 3
                              ? 0.4
                              : 1,
                          transition: 'all 200ms ease',
                        }}
                      >
                        {FLAVOR_TAG_LABELS[tag]}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: 'linear-gradient(135deg, #D4A574 0%, #8B5E3C 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>
                    综合评分
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 700 }}>
                    {calculateOverallScore(evalData).toFixed(1)}
                  </div>
                </div>

                <button
                  onClick={handleEvaluate}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#8B5E3C',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#7A4E2B')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#8B5E3C')
                  }
                >
                  {selectedRecord.flavorEval ? '更新评价' : '提交评价'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showWeightPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowWeightPanel(false)}
        >
          <div
            style={{
              background: '#F5F0EB',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '450px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#5D4037' }}>
                评分权重设置
              </div>
              <button
                onClick={() => setShowWeightPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8B5E3C',
                  padding: '4px',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(['acidity', 'sweetness', 'bitterness', 'body'] as const).map((key) => {
                const labels: Record<string, string> = {
                  acidity: '酸度',
                  sweetness: '甜度',
                  bitterness: '苦度 (反向)',
                  body: '醇厚度',
                };
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#5D4037', fontWeight: 500 }}>
                        {labels[key]}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#D4A574' }}>
                        {Math.round(weights[key] * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weights[key]}
                      onChange={(e) =>
                        setWeights((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      style={{ width: '100%', accentColor: '#D4A574' }}
                    />
                  </div>
                );
              })}

              <div
                style={{
                  padding: '12px',
                  background: 'rgba(212, 165, 116, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#8B5E3C',
                  textAlign: 'center',
                }}
              >
                当前权重合计: {Math.round(Object.values(weights).reduce((a, b) => a + b, 0) * 100)}%
              </div>

              <button
                onClick={() => setShowWeightPanel(false)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#D4A574',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#C4956A')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = '#D4A574')
                }
              >
                完成设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
