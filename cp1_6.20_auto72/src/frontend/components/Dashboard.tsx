import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DashboardStats, MemberStats } from '../types';
import { apiService } from '../services/apiService';

interface DashboardProps {
  projectId: string;
  onMemberFilter?: (userId: string | null) => void;
  filterUserId?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ projectId, onMemberFilter, filterUserId }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiService.fetchDashboardStats(projectId);
        setStats(data);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      }
    };
    loadStats();
  }, [projectId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await apiService.exportProjectReport(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${projectId}_report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  if (!stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: '#8892b0', fontFamily: 'Inter, sans-serif' }}>加载中...</div>
      </div>
    );
  }

  const progressData = [
    { name: '已完成', value: stats.completedTasks },
    { name: '未完成', value: stats.totalTasks - stats.completedTasks },
  ];

  const gradientId = 'progressGradient';
  const startColor = '#e74c3c';
  const endColor = '#2ecc71';
  const progressColor = stats.progress >= 66 ? endColor : stats.progress >= 33 ? '#f39c12' : startColor;

  const memberChartData: MemberStats[] = stats.memberStats;

  return (
    <div
      style={{
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: '#1a1a2e',
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
        <h2
          style={{
            margin: 0,
            color: '#e0e0e0',
            fontSize: '20px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          项目仪表盘
        </h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            padding: '10px 20px',
            backgroundColor: exporting ? '#8892b0' : '#e94560',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            transition: 'all 0.25s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            if (!exporting) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#d13650';
            }
          }}
          onMouseLeave={(e) => {
            if (!exporting) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e94560';
            }
          }}
        >
          {exporting ? (
            <>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 0.5s linear infinite',
                }}
              />
              导出中...
            </>
          ) : (
            '导出PDF报告'
          )}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: '16px',
              color: '#e0e0e0',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              alignSelf: 'flex-start',
            }}
          >
            整体完成度
          </h3>
          <div style={{ width: 200, height: 200, position: 'relative' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={startColor} />
                  <stop offset="50%" stopColor="#f39c12" />
                  <stop offset="100%" stopColor={endColor} />
                </linearGradient>
              </defs>
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="16"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${stats.progress * 5.02} 502`}
                transform="rotate(-90 100 100)"
                style={{
                  transition: 'stroke-dasharray 1s ease-out',
                }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  fontFamily: 'Inter, sans-serif',
                  color: progressColor,
                }}
              >
                {stats.progress}%
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8892b0',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {stats.completedTasks} / {stats.totalTasks} 任务
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#16213e',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: '16px',
              color: '#e0e0e0',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            任务状态分布
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={progressData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill="#2ecc71" />
                <Cell fill="#0f3460" />
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16213e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <Legend
                wrapperStyle={{
                  color: '#e0e0e0',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#16213e',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: '16px',
            color: '#e0e0e0',
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          成员任务统计
          {filterUserId && (
            <button
              onClick={() => onMemberFilter?.(null)}
              style={{
                marginLeft: '12px',
                padding: '4px 12px',
                backgroundColor: '#0f3460',
                color: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#e94560';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0f3460';
              }}
            >
              清除筛选
            </button>
          )}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={memberChartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="userName"
              stroke="#8892b0"
              fontFamily="Inter, sans-serif"
              fontSize={12}
            />
            <YAxis
              stroke="#8892b0"
              fontFamily="Inter, sans-serif"
              fontSize={12}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{
                backgroundColor: '#16213e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <Legend
              wrapperStyle={{
                color: '#e0e0e0',
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="taskCount"
              name="总任务数"
              fill="#6c63ff"
              radius={[4, 4, 0, 0]}
              onClick={(data) => onMemberFilter?.(data.userId)}
              style={{ cursor: 'pointer' }}
            />
            <Bar
              dataKey="completedCount"
              name="已完成"
              fill="#2ecc71"
              radius={[4, 4, 0, 0]}
              onClick={(data) => onMemberFilter?.(data.userId)}
              style={{ cursor: 'pointer' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
