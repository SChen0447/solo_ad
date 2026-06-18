import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Navbar, { PageRoute } from './components/Navbar';
import RequestList from './components/RequestList';
import RequestForm from './components/RequestForm';
import AdminDashboard from './components/AdminDashboard';
import Toast, { ToastMessage } from './components/Toast';
import LoginModal from './components/LoginModal';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageRoute>('list');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    setIsAdmin(true);
    showToast('success', '登录成功');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setCurrentPage('list');
    showToast('success', '已退出登录');
  };

  const handleFormSuccess = () => {
    setCurrentPage('list');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'form':
        return <RequestForm onSuccess={handleFormSuccess} onShowToast={showToast} />;
      case 'dashboard':
        return <AdminDashboard isAdmin={isAdmin} onShowToast={showToast} />;
      case 'list':
      default:
        return <RequestList />;
    }
  };

  return (
    <div>
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        currentUser={currentUser}
        onLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />
      <main>{renderPage()}</main>
      <Toast toasts={toasts} onRemove={removeToast} />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
};

export default App;
