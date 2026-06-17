import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Progress, List, Tag, Badge, Space, message, Typography } from 'antd';
import { BellOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { submitCode, getUnreadCount, clearUnread } from '../api';
import { Submission, TestCase } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STUDENT_ID = 'stu_001';

const SubmissionPage: React.FC = () => {
  const [code, setCode] = useState<string>('def add(a, b):\n    return a + b');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Submission | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      const count = await getUnreadCount(STUDENT_ID);
      setUnreadCount(count);
    };
    fetchUnread();
  }, []);

  const handleSubmit = async () => {
    if (!code.trim()) {
      message.warning('请输入代码');
      return;
    }
    if (code.length > 5000) {
      message.warning('代码长度不能超过5000字符');
      return;
    }
    setLoading(true);
    try {
      const submission = await submitCode(code, STUDENT_ID);
      setResult(submission);
      message.success('批改完成');
    } catch (err) {
      message.error('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleClearUnread = async () => {
    if (unreadCount > 0) {
      await clearUnread(STUDENT_ID);
      setUnreadCount(0);
      message.info('已标记所有通知为已读');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890ff';
    if (score >= 40) return '#faad14';
    return '#f5222d';
  };

  const renderTestCase = (tc: TestCase, idx: number) => (
    <List.Item
      key={idx}
      style={{
        padding: '12px 16px',
        backgroundColor: tc.passed ? '#f6ffed' : '#fff1f0',
        borderRadius: 8,
        marginBottom: 8,
        animation: tc.passed ? 'none' : 'flashRed 1.5s ease-in-out',
      }}
    >
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space align="start">
          {tc.passed ? (
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18, marginTop: 2 }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#f5222d', fontSize: 18, marginTop: 2 }} />
          )}
          <div>
            <Text strong>{tc.description}</Text>
            {!tc.passed && tc.error && (
              <div style={{ color: '#f5222d', marginTop: 4, fontSize: 13 }}>{tc.error}</div>
            )}
            {!tc.passed && !tc.error && tc.actual !== undefined && (
              <div style={{ color: '#f5222d', marginTop: 4, fontSize: 13 }}>
                期望: {tc.expected}，实际: {tc.actual}
              </div>
            )}
          </div>
        </Space>
        <Tag color={tc.passed ? 'green' : 'red'}>{tc.passed ? '通过' : '失败'}</Tag>
      </Space>
    </List.Item>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
          代码作业提交
        </Title>
        <Badge count={unreadCount} offset={[-4, 4]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 20 }} />}
            onClick={handleClearUnread}
          />
        </Badge>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 70%', minWidth: 300 }}>
          <Card
            title="代码编辑器"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', animation: 'fadeIn 0.4s ease' }}
          >
            <TextArea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入你的Python代码..."
              autoSize={{ minRows: 20, maxRows: 30 }}
              style={{
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: 14,
                lineHeight: 1.6,
              }}
              maxLength={5000}
              showCount
            />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                size="large"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                提交批改
              </Button>
            </div>
          </Card>
        </div>

        <div style={{ flex: '1 1 28%', minWidth: 280 }}>
          {result ? (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
              <Card
                title="批改结果"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 16 }}
              >
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Progress
                    type="dashboard"
                    percent={result.score}
                    strokeColor={getScoreColor(result.score)}
                    size={140}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>{result.feedback}</Text>
                </div>
              </Card>
              <Card
                title="测试用例详情"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                <List
                  split={false}
                  dataSource={result.test_cases}
                  renderItem={(tc, idx) => renderTestCase(tc, idx)}
                />
              </Card>
            </div>
          ) : (
            <Card
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center', padding: '40px 0' }}
            >
              <Text type="secondary">提交代码后将在此处显示批改结果</Text>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionPage;
