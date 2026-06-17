import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Progress,
  List,
  Tag,
  Input,
  Typography,
  Space,
  Avatar,
  message,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { getSubmission, addComment } from '../api';
import { Submission, TestCase, Comment as CommentType } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getSubmission(id);
        setSubmission(data.submission);
        setComments(data.comments);
      } catch (err) {
        message.error('获取提交详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(id, commentText, '教师');
      setComments([...comments, newComment]);
      setCommentText('');
      message.success('评语已提交');
    } catch (err) {
      message.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#1890ff';
    if (score >= 40) return '#faad14';
    return '#f5222d';
  };

  const formatDate = (isoStr: string): string =>
    new Date(isoStr).toLocaleString('zh-CN');

  const renderTestCase = (tc: TestCase, idx: number) => (
    <List.Item
      key={idx}
      style={{
        padding: '12px 16px',
        backgroundColor: tc.passed ? '#f6ffed' : '#fff1f0',
        borderRadius: 8,
        marginBottom: 8,
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher')}>
          返回看板
        </Button>
        <Card style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">未找到该提交记录</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/teacher')} style={{ marginBottom: 16 }}>
        返回看板
      </Button>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 60%', minWidth: 300 }}>
          <Card
            title={`${submission.student_name} 的提交 - ${formatDate(submission.submitted_at)}`}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 16, animation: 'fadeIn 0.4s ease' }}
          >
            <Title level={5} style={{ marginBottom: 8 }}>代码内容</Title>
            <pre
              style={{
                backgroundColor: '#f6f8fa',
                padding: 16,
                borderRadius: 8,
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: 13,
                lineHeight: 1.6,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {submission.code}
            </pre>
          </Card>

          <Card
            title="批改评语"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 16, animation: 'fadeIn 0.5s ease' }}
          >
            <div
              style={{
                backgroundColor: '#e6f7ff',
                padding: 16,
                borderRadius: 8,
                borderLeft: '4px solid #1890ff',
              }}
            >
              <Text style={{ fontSize: 15 }}>{submission.feedback}</Text>
            </div>
          </Card>

          <Card
            title="教师评语"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', animation: 'fadeIn 0.5s ease' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
              {comments.length === 0 ? (
                <Text type="secondary" style={{ alignSelf: 'center' }}>暂无评语</Text>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <div style={{ maxWidth: '70%' }}>
                      <div
                        style={{
                          backgroundColor: '#1890ff',
                          color: '#fff',
                          padding: '10px 14px',
                          borderRadius: 16,
                          borderBottomRightRadius: 4,
                        }}
                      >
                        {c.content}
                      </div>
                      <div style={{ textAlign: 'right', marginTop: 4 }}>
                        <Avatar size="small" style={{ backgroundColor: '#1890ff', marginRight: 6 }}>
                          {c.author[0]}
                        </Avatar>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {c.author} · {formatDate(c.created_at)}
                        </Text>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Space>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <TextArea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="输入评语..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                loading={submitting}
                disabled={!commentText.trim()}
              >
                发送
              </Button>
            </div>
          </Card>
        </div>

        <div style={{ flex: '1 1 35%', minWidth: 280 }}>
          <Card
            title="得分"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 16, textAlign: 'center', animation: 'fadeIn 0.4s ease' }}
          >
            <Progress
              type="dashboard"
              percent={submission.score}
              strokeColor={getScoreColor(submission.score)}
              size={180}
            />
          </Card>
          <Card
            title="测试用例详情"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', animation: 'fadeIn 0.5s ease' }}
          >
            <List
              split={false}
              dataSource={submission.test_cases}
              renderItem={(tc, idx) => renderTestCase(tc, idx)}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetail;
