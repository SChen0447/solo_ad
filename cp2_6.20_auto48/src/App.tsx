import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TemplateSelector from '@/pages/TemplateSelector';
import CardEditor from '@/components/CardEditor';
import CardPreview from '@/components/CardPreview';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TemplateSelector />} />
        <Route path="/editor" element={<CardEditor />} />
        <Route path="/preview" element={<CardPreview />} />
      </Routes>
    </Router>
  );
}
