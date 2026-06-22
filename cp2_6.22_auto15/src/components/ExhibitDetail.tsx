import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Exhibit, HourlyStat, getStats } from '../utils/api';

interface Props {
  exhibit: Exhibit;
  onClose: () => void;
}

export default function ExhibitDetail({ exhibit, onClose }: Props) {
  const [stats, setStats] = useState<HourlyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getStats(exhibit.id);
        if (active) setStats(data);
      } catch (err) {
        console.error('获取统计数据失败:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [exhibit.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#00000080',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
    animation: 'fadeIn 0.2s ease-out',
  };

  const contentStyle: React.CSSProperties = {
    background: '#FFFFFFD9',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    zIndex: 10,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'block',
    objectFit: 'cover',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    marginBottom: '6px',
  };

  const authorStyle: React.CSSProperties = {
    fontSize: '15px',
    color: '#6B7280',
    margin: 0,
    marginBottom: '16px',
  };

  const metaStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #E5E7EB',
  };

  const metaItemStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#4B5563',
  };

  const metaLabelStyle: React.CSSProperties = {
    color: '#6B7280',
    marginRight: '4px',
  };

  const descStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.6,
    margin: 0,
    marginBottom: '24px',
  };

  const statsWrapStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  };

  const statCardStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px 16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '10px',
    border: '1px solid #F3F4F6',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '2px',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6B7280',
  };

  const chartTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    marginBottom: '12px',
  };

  const chartContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '200px',
  };

  function barColor(index: number, total: number) {
    const ratio = total <= 1 ? 0 : index / (total - 1);
    const r1 = 99, g1 = 102, b1 = 241;
    const r2 = 192, g2 = 132, b2 = 252;
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .recharts-bar-rectangle path {
          border-radius: 4px 4px 0 0;
        }
      `}</style>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <button
          style={closeBtnStyle}
          onClick={onClose}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
          aria-label="关闭"
        >
          ×
        </button>

        {exhibit.imageUrl && (
          <img src={exhibit.imageUrl} alt={exhibit.name} style={imageStyle} />
        )}

        <h2 style={titleStyle}>{exhibit.name}</h2>
        <p style={authorStyle}>作者：{exhibit.author}</p>

        <div style={metaStyle}>
          {exhibit.material && (
            <div style={metaItemStyle}>
              <span style={metaLabelStyle}>材质：</span>
              {exhibit.material}
            </div>
          )}
          {exhibit.size && (
            <div style={metaItemStyle}>
              <span style={metaLabelStyle}>尺寸：</span>
              {exhibit.size}
            </div>
          )}
        </div>

        <p style={descStyle}>{exhibit.description}</p>

        <div style={statsWrapStyle}>
          <div style={statCardStyle}>
            <div style={statValueStyle}>{exhibit.scanCount}</div>
            <div style={statLabelStyle}>扫码次数</div>
          </div>
          <div style={statCardStyle}>
            <div style={statValueStyle}>{exhibit.likeCount}</div>
            <div style={statLabelStyle}>点赞数</div>
          </div>
        </div>

        <h3 style={chartTitleStyle}>近 24 小时互动热度</h3>
        <div style={chartContainerStyle}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#6B7280', padding: '40px 0' }}>
              加载统计数据...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} barCategoryGap="12px" barSize={40}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  interval={Math.floor(stats.length / 6)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats.map((_, idx) => (
                    <Cell key={idx} fill={barColor(idx, stats.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
