import React, { useState, useEffect } from 'react';
import { Typography, List, Avatar, Space, Tag, Drawer, Button } from 'antd';
import { HistoryOutlined, CloseOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import type { ActivityLog as ActivityLogType } from '@/types';
import { useProjectStore } from '@/store/useProjectStore';

const { Title, Text, Paragraph } = Typography;

const TYPE_ICONS: Record<string, string> = {
  recipe_add: '➕',
  recipe_edit: '✏️',
  recipe_delete: '🗑️',
  ingredient_edit: '🔢',
  shopping_export: '📤'
};

const TYPE_COLORS: Record<string, string> = {
  recipe_add: '#6B8E23',
  recipe_edit: '#F4A460',
  recipe_delete: '#E74C3C',
  ingredient_edit: '#4A90D9',
  shopping_export: '#9B59B6'
};

interface ActivityLogProps {
  isMobile?: boolean;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ isMobile = false }) => {
  const logs = useProjectStore(state => state.logs);
  const isLogPanelOpen = useProjectStore(state => state.isLogPanelOpen);
  const setIsLogPanelOpen = useProjectStore(state => state.setIsLogPanelOpen);
  const [visibleLogs, setVisibleLogs] = useState<ActivityLogType[]>([]);
  const [newLogId, setNewLogId] = useState<string | null>(null);

  useEffect(() => {
    setVisibleLogs(logs.slice(0, 30));
    if (logs.length > 0) {
      setNewLogId(logs[0].id);
      const timer = setTimeout(() => setNewLogId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [logs]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderContent = () => (
    <div className="activity-log-content">
      <div className="timeline">
        {visibleLogs.map((log, index) => {
          const isNew = log.id === newLogId && index === 0;
          return (
            <div
              key={log.id}
              className={`timeline-item ${isNew ? 'new-item' : ''}`}
              style={{
                animation: isNew ? 'slideInUp 0.4s ease-out' : 'none'
              }}
            >
              <div className="timeline-line" />
              
              <div className="timeline-dot" style={{ background: TYPE_COLORS[log.type] || '#999' }}>
                <span style={{ fontSize: 14 }}>{TYPE_ICONS[log.type] || '📝'}</span>
              </div>
              
              <div className="timeline-content">
                <Space align="flex-start" size={8} style={{ width: '100%' }}>
                  <Avatar 
                    size={36} 
                    src={log.userAvatar}
                    style={{ 
                      border: `2px solid ${TYPE_COLORS[log.type] || '#ccc'}`,
                      background: '#FFF8E7'
                    }}
                  >
                    {log.userName.charAt(0)}
                  </Avatar>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space wrap size={4}>
                      <Text strong style={{ color: '#333' }}>{log.userName}</Text>
                      <Tag 
                        color={TYPE_COLORS[log.type]} 
                        style={{ 
                          fontSize: 11, 
                          padding: '0 6px',
                          margin: 0
                        }}
                      >
                        {log.type === 'recipe_add' ? '添加菜谱' :
                         log.type === 'recipe_edit' ? '编辑菜谱' :
                         log.type === 'recipe_delete' ? '删除菜谱' :
                         log.type === 'ingredient_edit' ? '修改用量' :
                         '导出清单'}
                      </Tag>
                    </Space>
                    
                    <Paragraph 
                      style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: 13,
                        color: '#555',
                        lineHeight: 1.5
                      }}
                    >
                      {log.action}
                    </Paragraph>
                    
                    <Text 
                      type="secondary" 
                      style={{ fontSize: 11, marginTop: 2, display: 'block' }}
                    >
                      {formatTime(log.timestamp)}
                    </Text>
                  </div>
                </Space>
              </div>
            </div>
          );
        })}
        
        {visibleLogs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <HistoryOutlined style={{ fontSize: 48, opacity: 0.3, marginBottom: 12 }} />
            <Paragraph type="secondary">暂无活动记录</Paragraph>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="primary"
          icon={<HistoryOutlined />}
          onClick={() => setIsLogPanelOpen(true)}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 100,
            borderRadius: '50%',
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #F4A460 0%, #F5B87A 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(244, 164, 96, 0.4)'
          }}
        />
        <Drawer
          title={
            <Space>
              <HistoryOutlined style={{ color: '#F4A460' }} />
              <Title level={5} style={{ margin: 0, color: '#F4A460' }}>
                活动日志
              </Title>
            </Space>
          }
          placement="bottom"
          height="60%"
          onClose={() => setIsLogPanelOpen(false)}
          open={isLogPanelOpen}
          extra={
            <Button type="text" onClick={() => setIsLogPanelOpen(false)}>
              <CloseOutlined />
            </Button>
          }
        >
          {renderContent()}
        </Drawer>
      </>
    );
  }

  return (
    <div className={`activity-log-panel ${isLogPanelOpen ? 'open' : 'collapsed'}`}>
      {isLogPanelOpen ? (
        <>
          <div className="panel-header">
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <HistoryOutlined style={{ color: '#F4A460', fontSize: 18 }} />
                <Title level={5} style={{ margin: 0, color: '#F4A460' }}>
                  活动日志
                </Title>
                <Tag color="orange" style={{ margin: 0 }}>{visibleLogs.length}</Tag>
              </Space>
              <Button
                type="text"
                size="small"
                icon={<MenuFoldOutlined />}
                onClick={() => setIsLogPanelOpen(false)}
              />
            </Space>
          </div>
          {renderContent()}
        </>
      ) : (
        <div className="collapsed-panel" onClick={() => setIsLogPanelOpen(true)}>
          <Button
            type="text"
            icon={<MenuUnfoldOutlined style={{ color: '#F4A460' }} />}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}
    </div>
  );
};
