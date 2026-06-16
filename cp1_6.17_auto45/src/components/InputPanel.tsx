import React, { useState } from 'react';

interface InputPanelProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  selectedCardId: string | null;
}

const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, isGenerating, selectedCardId }) => {
  const [prompt, setPrompt] = useState('');
  const maxLength = 300;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim());
    }
  };

  const charCount = prompt.length;
  const isOverLimit = charCount > maxLength;
  const isDisabled = !prompt.trim() || isGenerating || isOverLimit;

  return (
    <div className="input-panel">
      <form onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的漫画场景... (支持中英文，最多300字)"
            maxLength={maxLength + 50}
            disabled={isGenerating}
            className={`prompt-input ${isOverLimit ? 'over-limit' : ''}`}
          />
          <div className={`char-count ${isOverLimit ? 'error' : ''}`}>
            {charCount}/{maxLength}
          </div>
        </div>

        <div className="input-actions">
          <button
            type="submit"
            disabled={isDisabled}
            className={`generate-btn ${isGenerating ? 'loading' : ''}`}
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                <span>生成中...</span>
              </>
            ) : selectedCardId ? (
              '为选中卡片生成'
            ) : (
              '生成漫画图像'
            )}
          </button>

          {prompt.trim() && !isGenerating && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setPrompt('')}
            >
              清空
            </button>
          )}
        </div>
      </form>

      <style>{`
        .input-panel {
          width: 100%;
          padding: 20px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .input-wrapper {
          position: relative;
          margin-bottom: 16px;
        }

        .prompt-input {
          width: 100%;
          min-height: 100px;
          padding: 16px;
          padding-bottom: 40px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 15px;
          line-height: 1.6;
          resize: vertical;
          transition: all 0.3s ease-out;
          background: #fafafa;
          color: #333333;
        }

        .prompt-input:focus {
          outline: none;
          border-color: #5B9BD5;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(91, 155, 213, 0.15);
        }

        .prompt-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .prompt-input.over-limit {
          border-color: #e74c3c;
          background: #fff5f5;
        }

        .prompt-input.over-limit:focus {
          box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.15);
        }

        .char-count {
          position: absolute;
          bottom: 12px;
          right: 12px;
          font-size: 12px;
          color: #999999;
          font-family: 'Noto Sans SC', sans-serif;
        }

        .char-count.error {
          color: #e74c3c;
          font-weight: 500;
        }

        .input-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .generate-btn {
          flex: 1;
          padding: 14px 32px;
          border: none;
          border-radius: 8px;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: #ffffff;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          transition: all 0.3s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .generate-btn:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .generate-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .generate-btn:disabled {
          background: linear-gradient(135deg, #cccccc 0%, #999999 100%);
          cursor: not-allowed;
          transform: none;
        }

        .generate-btn.loading {
          cursor: progress;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .clear-btn {
          padding: 14px 24px;
          border: 2px solid #8FBC8F;
          border-radius: 8px;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: #8FBC8F;
          background: transparent;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .clear-btn:hover {
          background: #8FBC8F;
          color: #ffffff;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .input-panel {
            padding: 16px;
          }

          .input-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .generate-btn,
          .clear-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default InputPanel;
