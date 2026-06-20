import React, { useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Editor from './components/Editor';
import { NoteEditor } from './modules/NoteEditor';
import { PlaybackEngine } from './modules/PlaybackEngine';

const App: React.FC = () => {
  const noteEditorRef = useRef<NoteEditor | null>(null);
  const playbackEngineRef = useRef<PlaybackEngine | null>(null);

  if (!noteEditorRef.current) {
    noteEditorRef.current = new NoteEditor();
  }

  if (!playbackEngineRef.current) {
    playbackEngineRef.current = new PlaybackEngine();
  }

  useEffect(() => {
    return () => {
      if (playbackEngineRef.current) {
        playbackEngineRef.current.dispose();
      }
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Editor
              noteEditor={noteEditorRef.current}
              playbackEngine={playbackEngineRef.current}
            />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
