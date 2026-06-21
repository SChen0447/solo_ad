import React, { useState, useEffect, useCallback } from 'react';
import { CardStyle, cardStyles, styleThumbnails } from '../styles/cardStyles';
import { getRandomPhrases } from '../data/phrases';
import { Sparkles, RefreshCw, Wand2 } from 'lucide-react';

interface EditorProps {
  inputText: string;
  onInputChange: (text: string) => void;
  selectedStyle: CardStyle;
  onStyleChange: (style: CardStyle) => void;
  onGenerate: () => void;
  onQuickPhrase: (phrase: string) => void;
}

const Editor: React.FC<EditorProps> = ({
  inputText,
  onInputChange,
  selectedStyle,
  onStyleChange,
  onGenerate,
  onQuickPhrase
}) => {
  const [quickPhrases, setQuickPhrases] = useState<string[]>([]);
  const maxLength = 100;

  useEffect(() => {
    setQuickPhrases(getRandomPhrases(5));
  }, []);

  const refreshPhrases = useCallback(() => {
    setQuickPhrases(getRandomPhrases(5));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= maxLength) {
      onInputChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (inputText.trim()) {
        onGenerate();
      }
    }
  };

  const handleQuickPhraseClick = (phrase: string) => {
    onQuickPhrase(phrase);
  };

  const styles: CardStyle[] = ['newspaper', 'typewriter', 'handwritten', 'poster'];

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <h1 className="editor-title">
          <Sparkles size={24} className="title-icon" />
          地摊文学生成器
        </h1>
        <p className="editor-subtitle">一键生成复古吸睛文案</p>
      </div>

      <div className="input-section">
        <label className="input-label">
          输入文案主题
          <span className="char-count">
            {inputText.length}/{maxLength}
          </span>
        </label>
        <textarea
          className="text-input"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="例如：早上吃了三个包子..."
          maxLength={maxLength}
          rows={4}
        />
      </div>

      <div className="style-section">
        <label className="section-label">选择复古风格</label>
        <div className="style-buttons">
          {styles.map((style) => (
            <button
              key={style}
              className={`style-btn ${selectedStyle === style ? 'active' : ''}`}
              onClick={() => onStyleChange(style)}
              title={cardStyles[style].name}
            >
              <span className="style-thumbnail">{styleThumbnails[style]}</span>
              <span className="style-name">{cardStyles[style].name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={onGenerate}
        disabled={!inputText.trim()}
      >
        <Wand2 size={18} />
        <span>生成文案</span>
        <span className="generate-hint">Ctrl+Enter</span>
      </button>

      <div className="phrase-section">
        <div className="phrase-header">
          <label className="section-label">快捷短语</label>
          <button
            className="refresh-btn"
            onClick={refreshPhrases}
            title="换一批"
          >
            <RefreshCw size={14} />
            <span>换一批</span>
          </button>
        </div>
        <div className="phrase-buttons">
          {quickPhrases.map((phrase, index) => (
            <button
              key={`${phrase}-${index}`}
              className="phrase-btn"
              onClick={() => handleQuickPhraseClick(phrase)}
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-tips">
        <p>💡 提示：点击快捷短语可自动生成，拖拽卡片可调整位置</p>
      </div>
    </div>
  );
};

export default Editor;
