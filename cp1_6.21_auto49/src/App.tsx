import { Routes, Route, NavLink } from 'react-router-dom';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-content">
          <span className="nav-logo">💬 产品反馈中心</span>
          <NavLink to="/" className="nav-link" end>
            提交反馈
          </NavLink>
          <NavLink to="/admin" className="nav-link">
            管理后台
          </NavLink>
        </div>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={<SubmitPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
