import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import PlanList from './pages/PlanList';
import CreatePlan from './pages/CreatePlan';
import PlanDetail from './pages/PlanDetail';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const token = useStore((s) => s.token);

  return (
    <BrowserRouter>
      <div className={`app-layout ${token ? 'has-sidebar' : ''}`}>
        {token && <Sidebar />}
        <main className="main-content">
          <Routes>
            <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
            <Route path="/" element={<PrivateRoute><PlanList /></PrivateRoute>} />
            <Route path="/create" element={<PrivateRoute><CreatePlan /></PrivateRoute>} />
            <Route path="/plan/:id" element={<PrivateRoute><PlanDetail /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
