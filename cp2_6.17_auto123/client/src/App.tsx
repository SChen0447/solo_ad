import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Register from './pages/Register';
import Login from './pages/Login';
import ProfileEditor from './pages/ProfileEditor';
import CardExchange from './pages/CardExchange';
import CardFolder from './pages/CardFolder';
import PublicProfile from './pages/PublicProfile';
import Scanner from './pages/Scanner';

function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const navItems = [
    { path: '/profile', label: '我的名片', icon: 'fa-id-card' },
    { path: '/exchange', label: '二维码', icon: 'fa-qrcode' },
    { path: '/my-cards', label: '名片夹', icon: 'fa-address-book' },
  ];

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-logo">
          <i className="fas fa-address-card"></i>
          <span>数字名片</span>
        </div>
        <div className="nav-links">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
          <button className="nav-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>退出</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="app">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exchange"
            element={
              <ProtectedRoute>
                <CardExchange />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-cards"
            element={
              <ProtectedRoute>
                <CardFolder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scanner"
            element={
              <ProtectedRoute>
                <Scanner />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
