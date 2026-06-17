import { Routes, Route } from 'react-router-dom';
import DocumentList from './components/DocumentList';
import Editor from './editor/Editor';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<DocumentList />} />
        <Route path="/doc/:docId" element={<Editor />} />
        <Route path="/new" element={<Editor />} />
      </Routes>
    </div>
  );
}
