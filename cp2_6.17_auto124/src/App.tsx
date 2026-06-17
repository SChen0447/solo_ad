import { BrowserRouter as Router, Link, Routes, Route, useLocation } from 'react-router-dom';
import Home from '@/pages/Home';
import CreatePage from '@/pages/CreatePage';
import DetailPage from '@/pages/DetailPage';
import ResponsePage from '@/pages/ResponsePage';

function Navbar() {
  const loc = useLocation();
  const isResponse = loc.pathname.startsWith('/response/');
  if (isResponse) return null;
  return (
    <nav className="nav-bar">
      <Link to="/" className="flex items-center gap-3">
        <div className="app-logo">?</div>
        <span className="text-lg font-semibold text-slate-800">
          微型问卷工坊
        </span>
      </Link>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 font-medium">
          T
        </div>
        <span>test@example.com</span>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/response/:id" element={<ResponsePage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </Router>
  );
}
