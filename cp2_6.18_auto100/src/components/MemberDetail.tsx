import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { fetchMemberDetail, type MemberDetail, type AnomalyItem } from '@/api';

function getBarColor(hours: number): string {
  if (hours > 12) return '#fca5a5';
  if (hours > 8) return '#fcd34d';
  if (hours >= 4) return '#6ee7b7';
  return '#93c5fd';
}

function BarChart({ data }: { data: { date: string; hours: number }[] }) {
  const WIDTH = 700;
  const HEIGHT = 260;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 50;
  const CHART_W = WIDTH - PAD_L - PAD_R;
  const CHART_H = HEIGHT - PAD_T - PAD_B;
  const BAR_W = 20;
  const GAP = (CHART_W - BAR_W * data.length) / Math.max(data.length - 1, 1);

  const maxVal = Math.max(...data.map((d) => d.hours), 8);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={WIDTH} height={HEIGHT}>
        {[0, 2, 4, 6, 8, 10, 12].map((val) => {
          if (val > maxVal + 2) return null;
          const y = PAD_T + CHART_H - (val / (maxVal + 2)) * CHART_H;
          return (
            <g key={val}>
              <line
                x1={PAD_L}
                y1={y}
                x2={WIDTH - PAD_R}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4,3"
              />
              <text
                x={PAD_L - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#9ca3af"
              >
                {val}h
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barH = Math.max((d.hours / (maxVal + 2)) * CHART_H, 2);
          const x = PAD_L + i * (BAR_W + GAP);
          const y = PAD_T + CHART_H - barH;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={4}
                ry={4}
                fill={getBarColor(d.hours)}
              />
              {(i % 5 === 0 || i === data.length - 1) && (
                <text
                  x={x + BAR_W / 2}
                  y={PAD_T + CHART_H + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#9ca3af"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AnomalyList({ anomalies }: { anomalies: AnomalyItem[] }) {
  if (anomalies.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '32px 0',
          color: '#9ca3af',
          fontSize: 14,
        }}
      >
        <AlertTriangle size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
        <div>暂无异常工时记录</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {anomalies.map((a) => (
        <div
          key={a.date + a.reason}
          style={{
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
            padding: '12px 16px',
            borderRadius: '0 8px 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>
              {a.date}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {a.reason}
            </div>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            {a.hours}h
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchMemberDetail(id)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 400,
          color: '#9ca3af',
          fontSize: 16,
        }}
      >
        加载中...
      </div>
    );
  }

  if (!detail) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 80,
          color: '#6b7280',
          fontSize: 16,
        }}
      >
        成员不存在
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: '#3b82f6',
          textDecoration: 'none',
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} />
        返回仪表板
      </Link>

      <h2
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: 24,
        }}
      >
        {detail.member.name} - 工时详情
      </h2>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: 16,
          }}
        >
          近30天工时分布
        </h3>
        <BarChart data={detail.dailyRecords} />

        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: '#93c5fd',
              }}
            />
            <span style={{ fontSize: 12, color: '#6b7280' }}>低于4小时</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: '#6ee7b7',
              }}
            />
            <span style={{ fontSize: 12, color: '#6b7280' }}>4-8小时</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: '#fcd34d',
              }}
            />
            <span style={{ fontSize: 12, color: '#6b7280' }}>超过8小时</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: '#fca5a5',
              }}
            />
            <span style={{ fontSize: 12, color: '#6b7280' }}>超过12小时</span>
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: 24,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: 16,
          }}
        >
          异常工时记录
        </h3>
        <AnomalyList anomalies={detail.anomalies} />
      </div>
    </div>
  );
}
