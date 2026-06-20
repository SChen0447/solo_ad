import React, { useState, useCallback } from 'react';
import { CardTemplate, PageType } from './types';
import { CanvasRenderer } from './core/CanvasRenderer';
import TemplateSelector from './components/TemplateSelector';
import CardEditor from './components/CardEditor';
import CardPreview from './components/CardPreview';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [previewRenderer, setPreviewRenderer] = useState<CanvasRenderer | null>(null);

  const handleSelectTemplate = useCallback((template: CardTemplate) => {
    setSelectedTemplate(template);
    setCurrentPage('editor');
  }, []);

  const handlePreview = useCallback((renderer: CanvasRenderer) => {
    setPreviewRenderer(renderer);
    setCurrentPage('preview');
  }, []);

  const handleBackToEditor = useCallback(() => {
    setCurrentPage('editor');
  }, []);

  const handleBackToHome = useCallback(() => {
    setCurrentPage('home');
    setSelectedTemplate(null);
    setPreviewRenderer(null);
  }, []);

  return (
    <div className="app-container">
      <div className="bg-decoration" />
      {currentPage === 'home' && (
        <TemplateSelector onSelect={handleSelectTemplate} />
      )}
      {currentPage === 'editor' && selectedTemplate && (
        <CardEditor
          template={selectedTemplate}
          onPreview={handlePreview}
          onBack={handleBackToHome}
        />
      )}
      {currentPage === 'preview' && previewRenderer && (
        <CardPreview
          renderer={previewRenderer}
          onBack={handleBackToEditor}
        />
      )}
    </div>
  );
};

export default App;
