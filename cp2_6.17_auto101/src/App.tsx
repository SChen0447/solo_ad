import React, { useState, useEffect } from 'react';
import { Editor } from './editor/Editor';
import { DocumentList } from './components/DocumentList';
import './App.css';

type View = 'list' | 'editor';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docId = params.get('doc');

    if (docId) {
      setSelectedDocumentId(docId);
      setCurrentView('editor');
    }
  }, []);

  const handleSelectDocument = (docId: string) => {
    setIsTransitioning(true);

    setTimeout(() => {
      setSelectedDocumentId(docId);
      setCurrentView('editor');

      const url = new URL(window.location.href);
      url.searchParams.set('doc', docId);
      window.history.pushState({}, '', url.toString());

      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 150);
  };

  const handleBack = () => {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentView('list');
      setSelectedDocumentId(null);

      const url = new URL(window.location.href);
      url.searchParams.delete('doc');
      window.history.pushState({}, '', url.toString());

      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 150);
  };

  return (
    <div className={`app-container ${isTransitioning ? 'transitioning' : ''}`}>
      <div className={`view-container ${currentView === 'list' ? 'active' : ''}`}>
        <DocumentList onSelectDocument={handleSelectDocument} />
      </div>
      <div className={`view-container ${currentView === 'editor' ? 'active' : ''}`}>
        {selectedDocumentId && (
          <Editor documentId={selectedDocumentId} onBack={handleBack} />
        )}
      </div>
    </div>
  );
};

export default App;
