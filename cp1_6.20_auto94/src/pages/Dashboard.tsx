import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import type { BookStatus } from '@/types';

const STATUS_ORDER: BookStatus[] = ['待估值', '竞标中', '已分配', '已入库', '借阅中', '已归还'];

export default function Dashboard() {
  const { books, getBookStatusCounts, operationLogs } = useAppStore();
  const counts = useMemo(() => getBookStatusCounts(), [books, getBookStatusCounts]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const totalBooks = books.length;

  const auctionCount = counts['竞标中'] + counts['已分配'];
  const inventoryCount = counts['已入库'] + counts['借阅中'] + counts['已归还'];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">仪表盘</h1>
        <p className="page-subtitle">全局书籍流转状态总览</p>
      </div>

      <div className="dashboard-stats">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="stat-card"
        >
          <div className="stat-label">书籍总数</div>
          <div className="stat-value">{totalBooks}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="stat-card"
        >
          <div className="stat-label">待处理估值</div>
          <div className="stat-value" style={{ color: '#e67e22' }}>{counts['待估值']}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="stat-label">竞标/分配中</div>
          <div className="stat-value" style={{ color: '#2980b9' }}>{auctionCount}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="stat-card"
        >
          <div className="stat-label">在库/借阅</div>
          <div className="stat-value" style={{ color: '#27ae60' }}>{inventoryCount}</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="status-chart"
      >
        <div className="chart-title">📊 书籍状态分布</div>
        <div className="bar-chart">
          {STATUS_ORDER.map((status, idx) => {
            const heightPercent = (counts[status] / maxCount) * 100;
            return (
              <div key={status} className="bar-item">
                <div style={{ position: 'relative', width: '100%', height: 180 }}>
                  {counts[status] > 0 && (
                    <motion.div
                      className="bar-count"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + idx * 0.05 }}
                    >
                      {counts[status]}
                    </motion.div>
                  )}
                  <motion.div
                    className={`bar bar-${status}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{
                      duration: 0.6,
                      delay: 0.3 + idx * 0.08,
                      ease: 'easeOut'
                    }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0
                    }}
                  />
                </div>
                <div className="bar-label">{status}</div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="status-chart"
      >
        <div className="chart-title">📋 最近操作记录</div>
        <div className="history-list">
          {operationLogs.slice(0, 8).map((log, idx) => (
            <div key={log.id} className="history-item" style={{
              gridTemplateColumns: '120px 120px 1fr',
              fontSize: 13
            }}>
              <span style={{ color: '#888' }}>
                {new Date(log.timestamp).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: idx % 2 === 0 ? '#e3f2fd' : '#fce4ec',
                  fontSize: 12,
                  marginRight: 8
                }}>
                  {log.operatorName}
                </span>
              </span>
              <span>
                <span style={{ color: '#2c3e50' }}>{log.action}</span>
                <span style={{ color: '#4a90d9', fontWeight: 500, marginLeft: 6 }}>
                  《{log.targetName}》
                </span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
