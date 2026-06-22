import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../api';
import { Part, PartCategory } from '../types';
import CarPreview from '../components/CarPreview';
import ReactECharts from 'echarts-for-react';

const CATEGORY_LABELS: Record<PartCategory, { label: string; icon: string }> = {
  engine: { label: '引擎', icon: '⚙️' },
  tire: { label: '轮胎', icon: '🛞' },
  suspension: { label: '悬挂', icon: '🔩' },
  wing: { label: '尾翼', icon: '🪶' }
};

const STAT_COLORS = {
  acceleration: '#f97316',
  topSpeed: '#3b82f6',
  grip: '#22c55e',
  cornering: '#a855f7'
};

const STAT_LABELS = {
  acceleration: '加速',
  topSpeed: '极速',
  grip: '抓地力',
  cornering: '过弯稳定性'
};

export default function GaragePage() {
  const { selection, stats, parts, updateSelection, refreshSetups, setups } = useApp();
  const [saveName, setSaveName] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [activeCategory, setActiveCategory] = useState<PartCategory>('engine');

  const handleSelectPart = (category: PartCategory, partId: string) => {
    const newSelection = { ...selection, [category]: partId };
    updateSelection(newSelection);
  };

  const handleSaveSetup = async () => {
    if (!saveName.trim()) {
      setSaveMsg('请输入方案名称');
      setTimeout(() => setSaveMsg(''), 2000);
      return;
    }
    try {
      await api.saveSetup(saveName.trim(), selection);
      setSaveMsg('方案保存成功！');
      setSaveName('');
      await refreshSetups();
    } catch (e: any) {
      setSaveMsg(e.message || '保存失败');
    }
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleLoadSetup = async (id: string) => {
    try {
      const setup = await api.loadSetup(id);
      updateSelection(setup.selection);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSetup = async (id: string) => {
    try {
      await api.deleteSetup(id);
      await refreshSetups();
    } catch (e) {
      console.error(e);
    }
  };

  const selectedTire = parts.tire.find(p => p.id === selection.tire);
  const tireColor = selectedTire?.color || '#1e293b';

  const barChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 30, top: 10, bottom: 30 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#cbd5e1' },
      splitLine: { lineStyle: { color: '#334155' } }
    },
    yAxis: {
      type: 'category',
      data: ['加速', '极速', '抓地力', '过弯稳定性'],
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#f8fafc', fontSize: 13 }
    },
    series: [
      {
        type: 'bar',
        data: [
          { value: stats.acceleration, itemStyle: { color: STAT_COLORS.acceleration } },
          { value: stats.topSpeed, itemStyle: { color: STAT_COLORS.topSpeed } },
          { value: stats.grip, itemStyle: { color: STAT_COLORS.grip } },
          { value: stats.cornering, itemStyle: { color: STAT_COLORS.cornering } }
        ],
        barWidth: 22,
        label: {
          show: true,
          position: 'right',
          color: '#f8fafc',
          fontWeight: 600,
          formatter: '{c}'
        },
        animationDuration: 300,
        animationEasing: 'cubicOut'
      }
    ]
  };

  const renderPartCard = (part: Part, isSelected: boolean) => (
    <div
      key={part.id}
      onClick={() => handleSelectPart(part.category, part.id)}
      style={{
        padding: '14px',
        borderRadius: '12px',
        backgroundColor: '#334155',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: isSelected ? '2px solid #f97316' : '2px solid transparent',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600, color: '#f8fafc' }}>{part.name}</span>
        {isSelected && <span style={{ color: '#f97316', fontSize: '12px' }}>✓ 已选</span>}
      </div>
      <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '8px' }}>{part.description}</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Object.entries(part.stats).filter(([, v]) => v > 0).map(([k, v]) => (
          <span key={k} style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: (STAT_COLORS as any)[k],
            color: '#fff'
          }}>
            {STAT_LABELS[k as keyof typeof STAT_LABELS]} +{v}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{
          flex: '0 0 380px',
          minWidth: '300px',
          backgroundColor: '#0f172a',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h2 style={{ fontSize: '18px', color: '#f97316', marginBottom: '4px' }}>🔧 改装部件</h2>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(Object.keys(CATEGORY_LABELS) as PartCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: activeCategory === cat ? '#f97316' : '#334155',
                  color: '#f8fafc',
                  transition: 'all 0.2s ease'
                }}
              >
                {CATEGORY_LABELS[cat].icon} {CATEGORY_LABELS[cat].label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {parts[activeCategory].map(part =>
              renderPartCard(part, selection[activeCategory] === part.id)
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            overflow: 'hidden',
            height: '360px'
          }}>
            <CarPreview selection={selection} tireColor={tireColor} />
          </div>

          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '16px 20px'
          }}>
            <h3 style={{ fontSize: '16px', color: '#f97316', marginBottom: '8px' }}>📊 赛车综合性能参数</h3>
            <div style={{ height: '200px' }}>
              <ReactECharts option={barChartOption} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'canvas' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <span style={{ fontSize: '14px', color: '#cbd5e1' }}>
                参数总和：<span style={{ color: '#f97316', fontWeight: 700, fontSize: '18px' }}>
                  {stats.acceleration + stats.topSpeed + stats.grip + stats.cornering}
                </span> / 100
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ fontSize: '16px', color: '#f97316', marginBottom: '14px' }}>💾 改装方案管理</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="输入方案名称..."
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #475569',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleSaveSetup}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              backgroundColor: '#f97316',
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ea580c')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f97316')}
          >
            保存当前方案
          </button>
          {saveMsg && (
            <span style={{ alignSelf: 'center', color: saveMsg.includes('成功') ? '#22c55e' : '#ef4444', fontSize: '14px' }}>
              {saveMsg}
            </span>
          )}
        </div>

        {setups.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {setups.map(s => (
              <div key={s.id} style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{s.name}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(s.stats).map(([k, v]) => (
                    <span key={k} style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: (STAT_COLORS as any)[k],
                      color: '#fff'
                    }}>
                      {STAT_LABELS[k as keyof typeof STAT_LABELS]} {v}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleLoadSetup(s.id)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#f97316',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    载入
                  </button>
                  <button
                    onClick={() => handleDeleteSetup(s.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#ef4444',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>暂无保存的改装方案，可在上方输入名称后保存当前方案</p>
        )}
      </div>

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
