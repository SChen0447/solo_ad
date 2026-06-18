import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtocolList from './components/ProtocolList';
import ProtocolForm from './components/ProtocolForm';
import SignPage from './pages/SignPage';
import DetailPage from './pages/DetailPage';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="app-container">
        <Routes>
          <Route path="/" element={<ProtocolList />} />
          <Route path="/create" element={<ProtocolForm />} />
          <Route path="/sign/:id" element={<SignPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
