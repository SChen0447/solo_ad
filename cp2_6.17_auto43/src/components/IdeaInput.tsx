import { useState, useRef } from 'react';

interface IdeaInputProps {
  isLocked: boolean;
  onSubmit: (content: string, participantName: string) => Promise<boolean>;
  participantName: string;
  onNameChange: (name: string) => void;
  isLoading: boolean;
}

function IdeaInput({ isLocked, onSubmit, participantName, onNameChange, isLoading }: IdeaInputProps) {
  const [content, setContent] = useState('');
  const [showSubmitted, setShowSubmitted] = useState(false);
  const submittedTimeoutRef = useRef<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked || isLoading || !content.trim() || !participantName.trim()) {
      return;
    }
    
    const success = await onSubmit(content, participantName);
    
    if (success) {
      setContent('');
      setShowSubmitted(true);
      
      if (submittedTimeoutRef.current) {
        clearTimeout(submittedTimeoutRef.current);
      }
      
      submittedTimeoutRef.current = setTimeout(() => {
        setShowSubmitted(false);
      }, 1000);
    }
  };

  return (
    <div className={`idea-input-container ${isLocked ? 'locked' : ''}`}>
      <form onSubmit={handleSubmit} className="idea-input-form">
        <div className="name-input-wrapper">
          <input
            type="text"
            className="name-input"
            placeholder="请输入您的名字"
            value={participantName}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={isLocked || isLoading}
            maxLength={50}
          />
        </div>
        
        <div className="content-input-wrapper">
          <textarea
            className="content-textarea"
            placeholder={isLocked ? '计时已结束，无法提交想法' : '输入您的想法...'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLocked || isLoading}
            maxLength={1000}
          />
        </div>
        
        <div className="submit-wrapper">
          <button
            type="submit"
            className="submit-btn"
            disabled={isLocked || isLoading || !content.trim() || !participantName.trim()}
          >
            {isLoading ? '提交中...' : '提交想法'}
          </button>
          
          {showSubmitted && (
            <span className="submitted-toast">已提交</span>
          )}
        </div>
      </form>
      
      <style>{`
        .idea-input-container {
          background: #ffffff;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }
        
        .idea-input-container.locked {
          opacity: 0.7;
        }
        
        .idea-input-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .name-input-wrapper {
          display: flex;
        }
        
        .name-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          background: #fafafa;
        }
        
        .name-input:focus {
          border-color: #4A90D9;
          box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.1);
        }
        
        .name-input:disabled {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }
        
        .content-input-wrapper {
          display: flex;
        }
        
        .content-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px 14px;
          border: 1px solid #4A90D9;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          background: #ffffff;
        }
        
        .content-textarea:focus {
          border-width: 2px;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
        }
        
        .content-textarea:disabled {
          background: #f5f5f5;
          border-color: #ccc;
          color: #999;
          cursor: not-allowed;
        }
        
        .submit-wrapper {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .submit-btn {
          padding: 12px 32px;
          background: #4A90D9;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #357ABD;
        }
        
        .submit-btn:disabled {
          background: #ccc;
          color: #666;
        }
        
        .submitted-toast {
          color: #43A047;
          font-size: 14px;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .idea-input-container {
            padding: 18px;
          }
          
          .submit-btn {
            padding: 10px 24px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}

export default IdeaInput;
