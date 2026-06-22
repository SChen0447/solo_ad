import { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { AnimationConfig } from '@/types/animation';
import { generateCSS } from '@/utils/cssExporter';

interface CodeExportModalProps {
  animation: AnimationConfig;
  onClose: () => void;
  onCopy: () => void;
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #F3F4F6;
  color: #6B7280;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #E5E7EB;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
`;

const CodeBlock = styled.pre`
  background: #1F2937;
  color: #E5E7EB;
  padding: 20px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  overflow-x: auto;
  margin: 0;
`;

const Highlight = styled.span`
  background: rgba(139, 92, 246, 0.3);
  color: #C4B5FD;
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 600;
`;

const Keyword = styled.span`
  color: #C084FC;
`;

const Property = styled.span`
  color: #60A5FA;
`;

const StringValue = styled.span`
  color: #34D399;
`;

const NumberValue = styled.span`
  color: #FBBF24;
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #E5E7EB;
  display: flex;
  justify-content: center;
`;

const CopyButton = styled.button`
  width: 140px;
  height: 44px;
  border-radius: 22px;
  background: #1F2937;
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #374151;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CodeExportModal = ({ animation, onClose, onCopy }: CodeExportModalProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleCopy = useCallback(() => {
    const cssCode = generateCSS(animation);
    navigator.clipboard.writeText(cssCode).then(() => {
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 2000);
    });
  }, [animation, onCopy]);

  const highlightCSS = (code: string) => {
    const lines = code.split('\n');
    return lines.map((line, index) => {
      let highlighted = line;
      
      highlighted = highlighted.replace(
        /(@keyframes)\s+(\w+)/g,
        '<keyword>$1</keyword> <string>$2</string>'
      );
      
      highlighted = highlighted.replace(
        /^(\s*)(\d+%|from|to)(\s*\{)/,
        '$1<property>$2</property>$3'
      );
      
      highlighted = highlighted.replace(
        /(transform|background-color|animation)\s*:/g,
        '<property>$1</property>:'
      );
      
      highlighted = highlighted.replace(
        /:\s*(\d*\.?\d+)s/g,
        ': <number>$1s</number>'
      );
      
      highlighted = highlighted.replace(
        /(translateX|translateY|rotate|scale)\(([^)]+)\)/g,
        '<string>$1</string>(<number>$2</number>)'
      );
      
      highlighted = highlighted.replace(
        /(#[0-9A-Fa-f]{6})/g,
        '<number>$1</number>'
      );
      
      highlighted = highlighted.replace(
        /(ease|linear|ease-in|ease-out|ease-in-out|infinite)/g,
        '<keyword>$1</keyword>'
      );
      
      highlighted = highlighted.replace(
        /cubic-bezier\(([^)]+)\)/g,
        '<keyword>cubic-bezier</keyword>(<number>$1</number>)'
      );

      return { __html: highlighted, index };
    });
  };

  const cssCode = generateCSS(animation);
  const highlightedLines = highlightCSS(cssCode);

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>导出 CSS 代码</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <ModalBody>
          <CodeBlock>
            {highlightedLines.map((line, idx) => (
              <div key={idx} dangerouslySetInnerHTML={{
                __html: line.__html
                  .replace(/<keyword>(.*?)<\/keyword>/g, '<span style="color: #C084FC;">$1</span>')
                  .replace(/<property>(.*?)<\/property>/g, '<span style="color: #60A5FA;">$1</span>')
                  .replace(/<string>(.*?)<\/string>/g, '<span style="color: #34D399;">$1</span>')
                  .replace(/<number>(.*?)<\/number>/g, '<span style="color: #FBBF24;">$1</span>')
              }} />
            ))}
          </CodeBlock>
        </ModalBody>

        <ModalFooter>
          <CopyButton onClick={handleCopy}>
            {copied ? '✓ 已复制' : '复制代码'}
          </CopyButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CodeExportModal;
