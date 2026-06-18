import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchMemberDetail,
  MemberDetail as MemberDetailType,
  TrendDataItem,
  AbnormalRecord
} from '../api';

const pageContainerStyle: React.CSSProperties = {
  padding: 24
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginBottom: 24
};

const backButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  color: '#6b7280',
  textDecoration: 'none',
  padding: '6px 12px',
  borderRadius: 8,
  backgroundColor: '#f3f4f6'
};

const avatarStyle = (color: string): React.CSSProperties => ({
  width: 56,
  height: 56,
  borderRadius: '50%',
  backgroundColor: color,
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  fontWeight: 600
});

const memberNameStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#1f2937',
  margin: 0
};

const memberInfoStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#6b7280',
  marginTop: 4
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 32
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1f2937',
  marginBottom: 16
};

const chartContainerStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  overflowX: 'auto'
};

const abnormalListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10
};

const abnormalItemStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  padding: '12px 16px',
  borderRadius: '0 8px 8px 0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const abnormalDateStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#1f2937',
  fontWeight: 500
};

const abnormalReasonStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#6b7280',
  marginTop: 2
};

const abnormalHoursStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#dc2626'
};

const projectsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12
};

const projectTagStyle: React.CSSProperties = {
  backgroundColor: '#e0f2fe',
  color: '#0369a1',
  padding: '6px 12px',
  borderRadius: 16,
  fontSize: 13
};

function getBarColor(hours: number): string {
  if (hours > 12) return '#fca5a5';
  if (hours > 8) return '#fcd34d';
  if (hours >= 4) return '#6ee7b7';
  if (hours > 0) return '#93c5fd';
  return '#e5e7eb';
}

function BarChart({ data }: { data: TrendDataItem[] }) {
  const barWidth = 20;
  const barGap = 6;
  const chartHeight = 220;
  const padding = { top: 20, bottom: 40, left: 40, right: 20 };
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const totalWidth = data.length * (barWidth + barGap) - barGap + padding.left + padding.right;
  const maxHours = 16;

  function formatDate(dateStr: string) {
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
  }

  const yTicks = [0, 4, 8, 12, 16];

  return (
    <div style={chartContainerStyle}>
      <svg width={totalWidth} height={chartHeight} style={{ display: 'block' }}>
        {yTicks.map((tick, i) => {
          const y = padding.top + innerHeight - (tick / maxHours) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={totalWidth - padding.right}
                y2={y}
                stroke="#f3f4f6"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#9ca3af"
              >
                {tick}h
              </text>
            </g>
          );
        })}

        {data.map((item, i) => {
          const x = padding.left + i * (barWidth + barGap);
          const height = (item.hours / maxHours) * innerHeight;
          const y = padding.top + innerHeight - height;
          const isWeekend = (() => {
            const d = new Date(item.date);
            const day = d.getDay();
            return day === 0 || day === 6;
          })();

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={4}
                ry={4}
                fill={getBarColor(item.hours)}
                opacity={isWeekend ? 0.7 : 1}
              >
                <title>{`${item.date}: ${item.hours}小时`}</title>
              </rect>
              {(i % 5 === 0 || i === data.length - 1) && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 15}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#9ca3af"
                >
                  {formatDate(item.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#93c5fd', borderRadius: 2 }} />
          <span style={{ color: '#6b7280' }}>低于4小时</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#6ee7b7', borderRadius: 2 }} />
          <span style={{ color: '#6b7280' }}>4-8小时</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#fcd34d', borderRadius: 2 }} />
          <span style={{ color: '#6b7280' }}>8-12小时</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#fca5a5', borderRadius: 2 }} />
          <span style={{ color: '#6b7280' }}>超过12小时</span>
        </div>
      </div>
    </div>
  );
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<MemberDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDetail(id);
    }
  }, [id]);

  async function loadDetail(memberId: string) {
    try {
      const data = await fetchMemberDetail(memberId);
      setDetail(data);
    } catch (error) {
      console.error('Failed to load member detail:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  }

  if (!detail) {
    return <div style={{ padding: 40, textAlign: 'center' }}>成员不存在</div>;
  }

  return (
    <div style={pageContainerStyle}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={backButtonStyle}>
          <span>←</span>
          返回仪表板
        </Link>
      </div>

      <div style={headerStyle}>
        <div style={avatarStyle(detail.member.avatarColor)}>
          {detail.member.name.charAt(0)}
        </div>
        <div>
          <h1 style={memberNameStyle}>{detail.member.name}</h1>
          <div style={memberInfoStyle}>
            近30天总工时：<strong style={{ color: '#1f2937' }}>{detail.totalHours}</strong> 小时
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>参与项目</h2>
        <div style={projectsContainerStyle}>
          {detail.projects.map(p => (
            <span key={p.id} style={projectTagStyle}>
              {p.name} ({p.totalHours}h)
            </span>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>近30天工时分布</h2>
        <BarChart data={detail.dailyRecords} />
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          异常记录
          <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 'normal', marginLeft: 8 }}>
            ({detail.abnormalRecords.length} 条)
          </span>
        </h2>
        <div style={abnormalListStyle}>
          {detail.abnormalRecords.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              暂无异常记录
            </div>
          ) : (
            detail.abnormalRecords.map((record: AbnormalRecord, index: number) => (
              <div key={index} style={abnormalItemStyle}>
                <div>
                  <div style={abnormalDateStyle}>{record.date}</div>
                  <div style={abnormalReasonStyle}>{record.reason}</div>
                </div>
                <div style={abnormalHoursStyle}>{record.hours}h</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
