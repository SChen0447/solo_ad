import { useState, useRef, useEffect } from 'react';
import type { WordCloudData } from '../api/timeline';

const PRESET_TAGS = ['生日', '纪念日', '心情', '年度总结'];
const MAX_LENGTH = 500;

interface InputPanelProps {
  onGenerate: (text: string) => void;
  isGenerating: boolean;
  canSave: boolean;
  onSave: (text: string, tags: string[], imageDataUrl: string) => void;
  cloudData: WordCloudData | null;
}

export default function InputPanel({
  onGenerate,
  isGenerating,
  canSave,
  onSave,
  cloudData,
}: InputPanelProps) {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const prevOverLimit = useRef(false);

  const charCount = text.length;
  const isOverLimit = charCount > MAX_LENGTH;

  useEffect(() => {
    if (isOverLimit && !prevOverLimit.current) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 300);
      return () => clearTimeout(timer);
    }
    prevOverLimit.current = isOverLimit;
  }, [isOverLimit]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = () => {
    if (text.trim() && !isOverLimit) {
      onGenerate(text.trim());
    }
  };

  const handleSave = () => {
    if (cloudData) {
      onSave(text.trim(), tags, cloudData.imageDataUrl);
      setText('');
      setTags([]);
    }
  };

  const canGenerate = text.trim().length > 0 && !isOverLimit && !isGenerating;

  return (
    <div className="input-panel">
      <h2 className="input-panel-title">写下此刻的心情</h2>

      <div className="textarea-wrapper">
        <textarea
          className={`text-input ${isOverLimit || isShaking ? 'over-limit' : ''}`}
          value={text}
          onChange={handleTextChange}
          placeholder="在这个特别的日子里，你想说些什么？把心情、感受、愿望都写下来吧..."
          maxLength={MAX_LENGTH + 50}
        />
        <div className={`char-count ${isOverLimit ? 'over-limit' : ''}`}>
          {charCount}/{MAX_LENGTH}
        </div>
      </div>

      <div className="tag-selector">
        {PRESET_TAGS.map(tag => (
          <div
            key={tag}
            className={`tag-pill ${tags.includes(tag) ? 'selected' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </div>
        ))}
      </div>

      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        {isGenerating ? '生成中...' : '生成词云'}
      </button>

      {canSave && (
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={!canSave}
        >
          保存到时间线
        </button>
      )}
    </div>
  );
}
