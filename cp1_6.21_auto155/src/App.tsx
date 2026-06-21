import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import Tasks from '@/pages/Tasks';
import Profile from '@/pages/Profile';
import CaregiverDetail from '@/pages/CaregiverDetail';
import Login from '@/pages/Login';
import Navbar from '@/components/Navbar';
import EvaluateModal from '@/components/EvaluateModal';
import { useAppStore } from '@/store';

export default function App() {
  const { evaluateModalTask } = useAppStore();

  return (
    <BrowserRouter>
      <div className="pt-16">
        <Navbar />
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/caregiver/:id" element={<CaregiverDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
        {evaluateModalTask && <EvaluateModal />}
      </div>
    </BrowserRouter>
  );
}
