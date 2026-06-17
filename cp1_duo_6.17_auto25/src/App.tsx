import { Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import GraphPage from './pages/GraphPage';
import { useGraphContext } from './context/GraphContext';

const App: React.FC = () => {
  const { isDataLoaded } = useGraphContext();

  return (
    <div className="app-container" style={{ width: '100%', height: '100%' }}>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route
          path="/graph"
          element={isDataLoaded ? <GraphPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
