import React, { useState, useCallback, useEffect } from 'react';
import Editor from './components/Editor';
import Card from './components/Card';
import { CardStyle } from './styles/cardStyles';
import { GeneratedContent, generateContent } from './utils/generator';
import './index.css';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('newspaper');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setCardPosition({ x: 0, y: 0 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!inputText.trim()) return;
    
    const startTime = performance.now();
    const content = generateContent(inputText.trim());
    const endTime = performance.now();
    
    console.log(`文案生成耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    setGeneratedContent(content);
    setCardPosition({ x: 0, y: 0 });
  }, [inputText]);

  const handleStyleChange = useCallback((style: CardStyle) => {
    setSelectedStyle(style);
  }, []);

  const handleQuickPhrase = useCallback((phrase: string) => {
    setInputText(phrase);
    const content = generateContent(phrase);
    setGeneratedContent(content);
    setCardPosition({ x: 0, y: 0 });
  }, []);

  const handlePositionChange = useCallback((pos: { x: number; y: number }) => {
    setCardPosition(pos);
  }, []);

  const showCopyToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  }, []);

  const handleCopyImage = useCallback(() => {
    showCopyToast('图片已复制');
  }, [showCopyToast]);

  const handleCopyText = useCallback(() => {
    showCopyToast('文本已复制');
  }, [showCopyToast]);

  return (
    <div className="app-container">
      <div className="app-layout">
        <div className="editor-section">
          <Editor
            inputText={inputText}
            onInputChange={setInputText}
            selectedStyle={selectedStyle}
            onStyleChange={handleStyleChange}
            onGenerate={handleGenerate}
            onQuickPhrase={handleQuickPhrase}
          />
        </div>
        
        <div className="preview-section">
          <div className="wooden-desk">
            <div className="wood-texture" />
            <div className="card-container">
              <Card
                content={generatedContent}
                style={selectedStyle}
                position={cardPosition}
                onPositionChange={handlePositionChange}
                onCopyImage={handleCopyImage}
                onCopyText={handleCopyText}
              />
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="toast-container">
          <div className="toast-message">
            ✅ {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
