import React from 'react';
import { useCardStore } from './store';
import TemplateSelector from './components/TemplateSelector';
import CardEditor from './components/CardEditor';
import CardPreview from './components/CardPreview';

const App: React.FC = () => {
  const currentPage = useCardStore((state) => state.currentPage);
  const selectedTemplate = useCardStore((state) => state.selectedTemplate);

  return (
    <div className="app-container">
      <div className="bg-decoration" />
      {currentPage === 'home' && <TemplateSelector />}
      {currentPage === 'editor' && selectedTemplate && <CardEditor />}
      {currentPage === 'preview' && <CardPreview />}
    </div>
  );
};

export default App;
