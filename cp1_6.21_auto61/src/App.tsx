import { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import type { Portfolio, Inquiry } from './types';
import PortfolioGrid from './components/PortfolioGrid';
import PortfolioDetail from './components/PortfolioDetail';
import InquiryForm from './components/InquiryForm';
import AdminPanel from './components/AdminPanel';

function App() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [portfoliosRes, inquiriesRes] = await Promise.all([
        fetch('/api/portfolios'),
        fetch('/api/inquiries'),
      ]);
      const [portfoliosData, inquiriesData] = await Promise.all([
        portfoliosRes.json(),
        inquiriesRes.json(),
      ]);
      setPortfolios(portfoliosData);
      setInquiries(inquiriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleInquirySubmitted = () => {
    showNotification('询价已提交成功！我们会尽快与您联系。');
    loadData();
  };

  const handleNewInquiry = () => {
    showNotification('收到新的客户询价！');
    loadData();
  };

  const handleReplySent = () => {
    showNotification('回复已发送！');
    loadData();
  };

  const handleCommentAdded = () => {
    loadData();
  };

  const handleReplyAdded = () => {
    loadData();
  };

  const handleStatusUpdated = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        加载中...
      </div>
    );
  }

  return (
    <div>
      <nav className="nav">
        <div className="container">
          <div className="nav-inner">
            <NavLink to="/" className="brand" style={{ textDecoration: 'none' }}>
              创意工作室
            </NavLink>
            <ul className="nav-links">
              <li>
                <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
                  作品集
                </NavLink>
              </li>
              <li>
                <NavLink to="/inquiry" className={({ isActive }) => (isActive ? 'active' : '')}>
                  项目询价
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
                  管理后台
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route 
            path="/" 
            element={<PortfolioGrid portfolios={portfolios} />} 
          />
          <Route 
            path="/portfolio/:id" 
            element={
              <PortfolioDetail 
                onCommentAdded={handleCommentAdded}
                onReplyAdded={handleReplyAdded}
              />
            } 
          />
          <Route 
            path="/inquiry" 
            element={<InquiryForm onSubmitSuccess={handleInquirySubmitted} />} 
          />
          <Route 
            path="/admin" 
            element={
              <AdminPanel 
                inquiries={inquiries}
                onReplySent={handleReplySent}
                onStatusUpdated={handleStatusUpdated}
                onNewInquiry={handleNewInquiry}
              />
            } 
          />
        </Routes>
      </main>

      {notification && (
        <div className="notification">{notification}</div>
      )}
    </div>
  );
}

export default App;
