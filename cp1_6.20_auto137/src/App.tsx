import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CalendarGallery from './components/CalendarGallery';
import EmotionDiary from './components/EmotionDiary';
import CollagePreview from './components/CollagePreview';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cream font-body">
        <Routes>
          <Route path="/" element={<CalendarGallery />} />
          <Route path="/diary/new" element={<EmotionDiary />} />
          <Route path="/diary/:id" element={<CollagePreview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
