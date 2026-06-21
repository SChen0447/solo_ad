import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ListBoard from './pages/ListBoard';
import MaterialPage from './pages/MaterialPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ListBoard />} />
        <Route path="/materials" element={<MaterialPage />} />
      </Routes>
    </Layout>
  );
}
