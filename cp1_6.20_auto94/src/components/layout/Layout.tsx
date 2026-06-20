import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import TickerBar from './TickerBar';
import Toast from '../common/Toast';
import { useAppStore } from '@/store/useAppStore';

export default function Layout() {
  const { currentUser } = useAppStore();

  return (
    <div className="app-layout">
      <Navbar />
      {currentUser?.role === 'admin' && <TickerBar />}
      <main className="main-content">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
