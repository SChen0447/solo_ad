import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { HomePage } from './pages/HomePage';
import { AuctionPage } from './pages/AuctionPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auction/:id" element={<AuctionPage />} />
          </Routes>
        </main>
        <LoginModal />
        <Toaster
          position="top-right"
          gutter={12}
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(22, 33, 62, 0.95)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              borderRadius: '12px',
              padding: '14px 18px',
              fontSize: '14px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1a1a2e' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' },
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
