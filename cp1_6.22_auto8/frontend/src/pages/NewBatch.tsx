import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TemperatureCurveEditor from '../components/TemperatureCurveEditor';
import FlavorRadarChart from '../components/FlavorRadarChart';
import StarRating from '../components/StarRating';
import { BEAN_TYPES, FLAVOR_DIMENSIONS } from '../types';
import type { CurvePoint, FlavorScore } from '../types';
import { batchApi } from '../utils/api';

const NewBatch: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'roast' | 'flavor'>('roast');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedBean, setSelectedBean] = useState<string>('');
  const [roastDate, setRoastDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(12);
  const [inTemp, setInTemp] = useState(200);
  const [outTemp, setOutTemp] = useState(215);
  const [notes, setNotes] = useState('');

  const defaultCurve = useMemo<CurvePoint[]>(() => {
    const points: CurvePoint[] = [];
    const totalPoints = 8;
    for (let i = 0; i <= totalPoints; i++) {
      const time = (i / totalPoints) * duration;
      const temp = inTemp + ((outTemp - inTemp) * Math.pow(i / totalPoints, 1.3));
      points.push({ time: Math.round(time * 10) / 10, temp: Math.round(temp) });
    }
    return points;
  }, []);

  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>(defaultCurve);

  const [flavors, setFlavors] = useState<FlavorScore[]>(
    FLAVOR_DIMENSIONS.map(name => ({ name, score: 5, note: '' }))
  );

  const handleFlavorChange = (index: number, score: number) => {
    const newFlavors = [...flavors];
    newFlavors[index] = { ...newFlavors[index], score };
    setFlavors(newFlavors);
  };

  const handleNoteChange = (index: number, note: string) => {
    if (note.length <= 50) {
      const newFlavors = [...flavors];
      newFlavors[index] = { ...newFlavors[index], note };
      setFlavors(newFlavors);
    }
  };

  const handleCurveChange = (points: CurvePoint[]) => {
    setCurvePoints(points);
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = Number(e.target.value);
    setDuration(newDuration);

    const newPoints = curvePoints.map(p => ({
      ...p,
      time: Math.min(p.time, newDuration),
    }));
    if (newPoints[newPoints.length - 1].time < newDuration) {
      newPoints[newPoints.length - 1] = {
        ...newPoints[newPoints.length - 1],
        time: newDuration,
      };
    }
    setCurvePoints(newPoints);
  };

  const handleSubmit = async () => {
    if (!selectedBean) {
      alert('请选择豆种');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await batchApi.create({
        beanId: selectedBean,
        date: roastDate,
        duration,
        inTemp: Number(inTemp),
        outTemp: Number(outTemp),
        curveData: curvePoints,
        flavors,
        notes,
      });

      if (result.success) {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to create batch:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBeanInfo = BEAN_TYPES.find(b => b.id === selectedBean);

  const avgScore = flavors.reduce((sum, f) => sum + f.score, 0) / flavors.length;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{
        color: '#4A2C1A',
        fontSize: '28px',
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        {step === 'roast' ? '新建烘焙记录' : '风味评价'}
      </h1>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px',
      }}>
        <div style={{
          width: '40px',
          height: '8px',
          borderRadius: '4px',
          background: step === 'roast' ? '#8B4513' : step === 'flavor' ? '#8B4513' : '#D4C4B0',
          transition: 'background 0.3s ease',
        }} />
        <div style={{
          width: '40px',
          height: '8px',
          borderRadius: '4px',
          background: step === 'flavor' ? '#8B4513' : '#D4C4B0',
          transition: 'background 0.3s ease',
        }} />
      </div>

      {step === 'roast' && (
        <div style={{
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '16px' }}>
              选择豆种
            </h2>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              {BEAN_TYPES.map(bean => (
                <button
                  key={bean.id}
                  onClick={() => setSelectedBean(bean.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: selectedBean === bean.id ? '2px solid #4A2C1A' : '2px solid transparent',
                    background: bean.gradient,
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedBean === bean.id ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: selectedBean === bean.id ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {bean.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '20px' }}>
              烘焙参数
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', color: '#6B4423', fontSize: '14px', marginBottom: '8px' }}>
                  烘焙日期
                </label>
                <input
                  type="date"
                  value={roastDate}
                  onChange={e => setRoastDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D4C4B0',
                    fontSize: '14px',
                    color: '#4A2C1A',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#6B4423', fontSize: '14px', marginBottom: '8px' }}>
                  烘焙时长: <span style={{ fontWeight: 'bold', color: '#8B4513' }}>{duration} 分钟</span>
                </label>
                <input
                  type="range"
                  min="8"
                  max="20"
                  value={duration}
                  onChange={handleDurationChange}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '3px',
                    background: '#E8DFD5',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9C8B7A', marginTop: '4px' }}>
                  <span>8分钟</span>
                  <span>20分钟</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', color: '#6B4423', fontSize: '14px', marginBottom: '8px' }}>
                  入豆温度 (°C)
                </label>
                <input
                  type="number"
                  value={inTemp}
                  onChange={e => setInTemp(Number(e.target.value))}
                  min={100}
                  max={250}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D4C4B0',
                    fontSize: '14px',
                    color: '#4A2C1A',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#6B4423', fontSize: '14px', marginBottom: '8px' }}>
                  出豆温度 (°C)
                </label>
                <input
                  type="number"
                  value={outTemp}
                  onChange={e => setOutTemp(Number(e.target.value))}
                  min={100}
                  max={250}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #D4C4B0',
                    fontSize: '14px',
                    color: '#4A2C1A',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '16px' }}>
              温度曲线
            </h2>
            <p style={{ color: '#6B4423', fontSize: '13px', marginBottom: '16px' }}>
              拖动曲线上的控制点调整温度
            </p>
            <TemperatureCurveEditor
              value={curvePoints}
              onChange={handleCurveChange}
              duration={duration}
              color={selectedBeanInfo?.colorEnd || '#8B4513'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep('flavor')}
              disabled={!selectedBean}
              style={{
                padding: '14px 36px',
                borderRadius: '12px',
                border: 'none',
                background: selectedBean ? 'linear-gradient(135deg, #8B4513, #654321)' : '#D4C4B0',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: selectedBean ? 'pointer' : 'not-allowed',
                boxShadow: selectedBean ? '0 4px 12px rgba(139, 69, 19, 0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              下一步：风味评价 →
            </button>
          </div>
        </div>
      )}

      {step === 'flavor' && (
        <div style={{ animation: 'fadeInUp 0.3s ease-out' }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 20px',
              borderRadius: '20px',
              background: selectedBeanInfo?.gradient || '#8B4513',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}>
              {selectedBeanInfo?.name || '未选择'}
            </div>
            <p style={{ color: '#6B4423', fontSize: '14px', margin: '8px 0' }}>
              {roastDate} · {duration}分钟
            </p>
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#8B4513',
            }}>
              {avgScore.toFixed(1)}
              <span style={{ fontSize: '16px', color: '#6B4423' }}> / 10</span>
            </div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
          }}>
            <FlavorRadarChart
              flavors={flavors}
              color={selectedBeanInfo?.colorEnd || '#8B4513'}
              size={280}
            />
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '20px' }}>
              风味评价
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              {flavors.map((flavor, index) => (
                <div key={flavor.name} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#FFFAF0',
                  border: '1px solid #F0E6D8',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <span style={{
                      color: '#4A2C1A',
                      fontWeight: 600,
                      fontSize: '15px',
                    }}>
                      {flavor.name}
                    </span>
                    <StarRating
                      value={flavor.score}
                      onChange={score => handleFlavorChange(index, score)}
                      size={22}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="添加品鉴笔记（最多50字）..."
                    value={flavor.note}
                    onChange={e => handleNoteChange(index, e.target.value)}
                    maxLength={50}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E8DFD5',
                      fontSize: '13px',
                      color: '#4A2C1A',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#9C8B7A', marginTop: '4px' }}>
                    {flavor.note.length}/50
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(74, 44, 26, 0.08)',
            marginBottom: '20px',
          }}>
            <h2 style={{ color: '#4A2C1A', fontSize: '18px', marginBottom: '12px' }}>
              总体笔记
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="记录这次烘焙的心得体会..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #E8DFD5',
                fontSize: '14px',
                color: '#4A2C1A',
                background: '#FFFAF0',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep('roast')}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: '2px solid #8B4513',
                background: 'transparent',
                color: '#8B4513',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ← 返回
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '14px 36px',
                borderRadius: '12px',
                border: 'none',
                background: isSubmitting ? '#D4C4B0' : 'linear-gradient(135deg, #8B4513, #654321)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(139, 69, 19, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {isSubmitting ? '保存中...' : '完成 ✓'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8B4513;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(139, 69, 19, 0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8B4513;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(139, 69, 19, 0.3);
        }
      `}</style>
    </div>
  );
};

export default NewBatch;
