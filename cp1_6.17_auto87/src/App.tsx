import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import SubmissionPage from './student/SubmissionPage';
import Dashboard from './teacher/Dashboard';
import SubmissionDetail from './teacher/SubmissionDetail';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { key: '/student', label: <Link to="/student">学生端</Link> },
    { key: '/teacher', label: <Link to="/teacher">教师端</Link> },
  ];

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/teacher') || location.pathname.startsWith('/submission')) {
      return '/teacher';
    }
    return '/student';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '0 24px',
        }}
      >
        <Title level={4} style={{ margin: '0 24px 0 0', color: '#1890ff' }}>
          代码作业批改系统
        </Title>
        <Menu
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ flex: 1, borderBottom: 'none' }}
        />
      </Header>
      <Content style={{ backgroundColor: '#f0f2f5' }}>
        <Routes>
          <Route path="/" element={<SubmissionPage />} />
          <Route path="/student" element={<SubmissionPage />} />
          <Route path="/teacher" element={<Dashboard />} />
          <Route path="/submission/:id" element={<SubmissionDetail />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default App;
