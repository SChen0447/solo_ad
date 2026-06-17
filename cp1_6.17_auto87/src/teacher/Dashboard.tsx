import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Select,
  Typography,
  Space,
  Spin,
  Tag,
  Button,
} from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getStats, getHistory } from '../api';
import { StudentInfo, ScoreRangeData, HistoryPoint, Submission } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<ScoreRangeData[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [historyChartData, setHistoryChartData] = useState<HistoryPoint[]>([]);
  const [historySubmissions, setHistorySubmissions] = useState<Submission[]>([]);
  const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getStats();
        setChartData(data.chart_data);
        setStudents(data.students);
        if (data.students.length > 0) {
          setSelectedStudent(data.students[0].id);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const fetchHistory = async () => {
      const data = await getHistory(selectedStudent, 6);
      setHistoryChartData(data.chart_data);
      setHistorySubmissions(data.history);
      setStudentName(data.student_name);
    };
    fetchHistory();
  }, [selectedStudent]);

  const getScoreTagColor = (score: number | null): string => {
    if (score === null) return 'default';
    if (score >= 80) return 'green';
    if (score >= 60) return 'blue';
    if (score >= 40) return 'orange';
    return 'red';
  };

  const formatDate = (isoStr: string | null): string => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleString('zh-CN');
  };

  const studentColumns = [
    {
      title: '学生姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: StudentInfo) => (
        <Button
          type="link"
          onClick={() => setSelectedStudent(record.id)}
          style={{ padding: 0, height: 'auto' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '最新得分',
      dataIndex: 'latest_score',
      key: 'latest_score',
      render: (score: number | null) => (
        <Tag color={getScoreTagColor(score)}>{score !== null ? score : '-'}</Tag>
      ),
    },
    {
      title: '提交次数',
      dataIndex: 'submission_count',
      key: 'submission_count',
    },
    {
      title: '最近提交时间',
      dataIndex: 'latest_submitted_at',
      key: 'latest_submitted_at',
      render: (val: string | null) => formatDate(val),
    },
  ];

  const classStatsTab = (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          animation: 'fadeIn 0.4s ease',
        }}
      >
        <Card
          title="班级得分分布"
          style={{
            flex: '1 1 45%',
            minWidth: 350,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="学生人数" fill="#1890ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card
          title="学生历史趋势"
          style={{
            flex: '1 1 45%',
            minWidth: 350,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
          extra={
            <Select
              value={selectedStudent}
              onChange={setSelectedStudent}
              style={{ width: 140 }}
            >
              {students.map((s) => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          }
        >
          {historyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" label={{ value: '提交次数', position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number) => [value + '分', '得分']}
                  labelFormatter={(label) => `第 ${label} 次提交`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  name={`${studentName}的得分`}
                  stroke="#1890ff"
                  strokeWidth={2}
                  dot={{ r: 5, fill: '#1890ff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
              暂无历史数据
            </div>
          )}
        </Card>
      </div>

      <Card
        title="学生列表"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', animation: 'fadeIn 0.5s ease' }}
      >
        <Table
          dataSource={students}
          columns={studentColumns}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </Space>
  );

  const studentDetailTab = (
    <Card
      title={`${studentName} 的提交历史`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)', animation: 'fadeIn 0.4s ease' }}
      extra={
        <Select
          value={selectedStudent}
          onChange={setSelectedStudent}
          style={{ width: 140 }}
        >
          {students.map((s) => (
            <Option key={s.id} value={s.id}>{s.name}</Option>
          ))}
        </Select>
      }
    >
      {historySubmissions.length > 0 ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {historySubmissions.map((sub) => (
            <Card
              key={sub.id}
              size="small"
              style={{ cursor: 'pointer', animation: 'fadeIn 0.4s ease' }}
              onClick={() => navigate(`/submission/${sub.id}`)}
              hoverable
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space direction="vertical" size={4}>
                  <Text strong>提交时间: {formatDate(sub.submitted_at)}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{sub.feedback}</Text>
                </Space>
                <Tag color={getScoreTagColor(sub.score)} style={{ fontSize: 16, padding: '4px 12px' }}>
                  {sub.score} 分
                </Tag>
              </div>
              <pre
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  marginTop: 12,
                  marginBottom: 0,
                  fontSize: 12,
                  maxHeight: 100,
                  overflow: 'auto',
                }}
              >
                {sub.code}
              </pre>
            </Card>
          ))}
        </Space>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
          暂无提交记录
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24, color: '#1890ff' }}>
        教师看板
      </Title>
      <Spin spinning={loading}>
        <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Tabs
            defaultActiveKey="stats"
            items={[
              { key: 'stats', label: '班级统计', children: classStatsTab },
              { key: 'detail', label: '学生详情', children: studentDetailTab },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default Dashboard;
