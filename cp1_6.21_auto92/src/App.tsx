import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FairDetail from './pages/FairDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/fair/:id" element={<FairDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
