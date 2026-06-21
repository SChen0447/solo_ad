import { useState, useEffect } from 'react';
import type { IntegralRecord } from './types';

interface IntegralData {
  integral: number;
  maxIntegral: number;
}

function IntegralPanel() {
  const [integralData, setIntegralData] = useState<IntegralData>({ integral: 0, maxIntegral: 1000 });
  const [records, setRecords] = useState<IntegralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegralData();
    fetchRecords();
  }, []);

  const fetchIntegralData = async () => {
    try {
      const response = await fetch('/api/user/integral');
      const data = await response.json();
      setIntegralData(data);
    } catch (error) {
      console.error('Failed to fetch integral:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/user/records');
      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const percentage = (integralData.integral / integralData.maxIntegral) * 100;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">积分面板</h1>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">积分面板</h1>
      <p style={{ marginBottom: '32px', color: '#718096' }}>
        查看您的积分余额和交易记录
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '48px',
      }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#c4a882"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
            style={{
              transition: 'stroke-dashoffset 0.8s ease',
            }}
          />
          <text
            x="100"
            y="100"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: '24px',
              fontWeight: 600,
              fill: '#5b4637',
            }}
          >
            {integralData.integral}
          </text>
          <text
            x="100"
            y="128"
            textAnchor="middle"
            style={{
              fontSize: '12px',
              fill: '#718096',
            }}
          >
            / {integralData.maxIntegral} 积分上限
          </text>
        </svg>
        
        <div style={{
          marginTop: '16px',
          padding: '12px 24px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <p style={{ fontSize: '14px', color: '#5b4637', margin: 0 }}>
            当前信用等级：<strong style={{ color: '#c4a882' }}>Lv.{Math.floor(integralData.integral / 200) + 1}</strong>
          </p>
        </div>

        <div style={{
          marginTop: '8px',
          fontSize: '13px',
          color: '#718096',
        }}>
          已使用 {percentage.toFixed(1)}% 积分额度
        </div>
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#5b4637',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #f0ebe3',
        }}>
          最近交易记录
        </h2>

        {records.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: '#718096',
          }}>
            暂无交易记录
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {records.map(record => (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: record.type === 'income' ? '#f0fff4' : '#fff5f5',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = record.type === 'income' ? '#e6fffa' : '#fff0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = record.type === 'income' ? '#f0fff4' : '#fff5f5';
                }}
              >
                <img
                  src={record.counterpartAvatar}
                  alt={record.counterpartNickname}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    flexShrink: 0,
                    backgroundColor: '#f5f0e8',
                  }}
                />
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#5b4637',
                    }}>
                      {record.description}
                    </span>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: record.type === 'income' ? '#38a169' : '#e53e3e',
                      marginLeft: '12px',
                      flexShrink: 0,
                    }}>
                      {record.type === 'income' ? '+' : '-'}{record.amount}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#718096',
                    }}>
                      对方：{record.counterpartNickname}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#a0aec0',
                    }}>
                      {formatDateTime(record.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#5b4637',
          marginBottom: '12px',
        }}>
          积分规则说明
        </h3>
        <ul style={{
          fontSize: '13px',
          color: '#718096',
          paddingLeft: '20px',
          lineHeight: 2,
        }}>
          <li>完成任务可获得对应报酬积分，积分上限为1000分</li>
          <li>借用工具需支付相应积分，由工具所有者获得80%</li>
          <li>新用户注册赠送100积分</li>
          <li>积分可用于发布任务、借用工具和兑换社区福利</li>
        </ul>
      </div>
    </div>
  );
}

export default IntegralPanel;
