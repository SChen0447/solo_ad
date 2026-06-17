import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import domtoimage from 'dom-to-image';
import './CodePreview.css';

export interface CodePreviewHandle {
  getIframe: () => HTMLIFrameElement | null;
  getScreenshot: () => Promise<string | null>;
}

interface CodePreviewProps {
  code: string;
  onLoad?: () => void;
  className?: string;
}

const CodePreview = forwardRef<CodePreviewHandle, CodePreviewProps>(({ code, onLoad, className }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string>('');

  useImperativeHandle(ref, () => ({
    getIframe: () => iframeRef.current,
    getScreenshot: async () => {
      try {
        if (iframeRef.current) {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            return await domtoimage.toPng(iframeDoc.body);
          }
        }
        return null;
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
        return null;
      }
    }
  }));

  useEffect(() => {
    setIsLoading(true);
    
    const cleanHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base target="_blank">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;">
</head>
<body>
${code}
</body>
</html>
`;

    const blob = new Blob([cleanHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [code]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <div className={`code-preview-container ${className || ''}`}>
      {isLoading && (
        <div className="preview-loading">
          <div className="loading-spinner"></div>
          <span className="loading-text">正在渲染预览...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={blobUrl}
        className="preview-iframe"
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin"
        title="Code Preview"
      />
    </div>
  );
});

CodePreview.displayName = 'CodePreview';

export default CodePreview;
