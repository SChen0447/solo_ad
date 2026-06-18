import React, { useEffect, useRef, useState, useDeferredValue } from 'react';

interface PreviewPanelProps {
  html: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = React.memo(({ html }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const deferredHtml = useDeferredValue(html);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, [deferredHtml]);

  useEffect(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img');
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const img = entry.target as HTMLImageElement;
          if (entry.isIntersecting && !img.dataset.loaded) {
            img.dataset.loaded = 'true';
            
            const placeholder = document.createElement('div');
            placeholder.className = 'img-placeholder';
            placeholder.style.cssText = `
              width: 100%;
              height: 200px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              border-radius: 8px;
              margin: 1.5em auto;
            `;
            
            img.style.opacity = '0';
            img.style.transition = 'opacity 300ms ease-in-out';
            
            img.onload = () => {
              img.style.opacity = '1';
              placeholder.remove();
            };
            
            img.onerror = () => {
              img.style.opacity = '1';
              placeholder.remove();
            };
            
            if (!img.complete) {
              img.parentNode?.insertBefore(placeholder, img);
            } else {
              img.style.opacity = '1';
            }
            
            if (img.dataset.src) {
              img.src = img.dataset.src;
            }
            
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '50px', threshold: 0.1 }
    );

    images.forEach((img) => {
      if (!img.getAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
      observer.observe(img);
    });

    return () => observer.disconnect();
  }, [deferredHtml]);

  return (
    <div
      ref={containerRef}
      className="preview-panel h-full overflow-y-auto bg-[#faf3e3] p-8"
      style={{
        boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        className={`preview-content max-w-[700px] mx-auto transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        dangerouslySetInnerHTML={{ __html: deferredHtml }}
      />

      <style>{`
        .preview-content :first-child {
          margin-top: 0 !important;
        }

        .preview-content h1,
        .preview-content h2,
        .preview-content h3,
        .preview-content h4,
        .preview-content h5,
        .preview-content h6 {
          font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 0.5em;
          line-height: 1.3;
        }

        .preview-content h1 {
          font-size: 2rem;
          padding-bottom: 0.3em;
          border-bottom: 2px solid #4a90d9;
          margin-top: 0;
        }

        .preview-content h2 {
          font-size: 1.5rem;
          padding-bottom: 0.3em;
          border-bottom: 2px solid #e0e0e0;
          margin-top: 1.5em;
        }

        .preview-content h3 {
          font-size: 1.2rem;
          padding-bottom: 0.3em;
          border-bottom: 2px solid #f0f0f0;
          margin-top: 1.2em;
        }

        .preview-content p {
          font-family: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
          margin-bottom: 1.5em;
          line-height: 1.75;
          text-align: justify;
          text-indent: 2em;
          color: #2c3e50;
        }

        .preview-content p:first-of-type {
          text-indent: 0;
        }

        .preview-content strong {
          font-weight: 700;
          color: #2c3e50;
        }

        .preview-content em {
          font-style: italic;
        }

        .preview-content del {
          text-decoration: line-through;
          color: #999;
        }

        .preview-content ul,
        .preview-content ol {
          font-family: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
          margin-bottom: 1.5em;
          padding-left: 2em;
          line-height: 1.75;
          color: #2c3e50;
        }

        .preview-content ul li {
          list-style: disc;
          margin-bottom: 0.5em;
        }

        .preview-content ul li::marker {
          color: #4a90d9;
          font-size: 1em;
        }

        .preview-content ol li {
          list-style: decimal;
          margin-bottom: 0.5em;
        }

        .preview-content ol li::marker {
          font-weight: 700;
          color: #2c3e50;
        }

        .preview-content blockquote {
          font-family: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
          border-left: 4px solid #4a90d9;
          background: #f0f4f8;
          padding: 1em 1.5em;
          margin: 1.5em 0;
          font-style: italic;
          color: #555;
          line-height: 1.75;
        }

        .preview-content blockquote p {
          margin-bottom: 0;
          text-indent: 0;
        }

        .preview-content code {
          font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
          font-size: 0.9em;
          background: #e8e8e8;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          color: #e74c3c;
          text-indent: 0;
        }

        .preview-content pre {
          background: #1e1e1e;
          padding: 1.5em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5em 0;
          position: relative;
        }

        .preview-content pre code {
          background: none;
          padding: 0;
          color: #d4d4d4;
          font-size: 0.9em;
          line-height: 1.6;
          text-indent: 0;
          display: block;
        }

        .preview-content .code-line {
          display: flex;
          min-height: 1.6em;
        }

        .preview-content .line-number {
          color: #858585;
          text-align: right;
          padding-right: 1em;
          user-select: none;
          min-width: 3em;
          border-right: 1px solid #333;
          margin-right: 1em;
        }

        .preview-content .line-content {
          flex: 1;
        }

        .preview-content hr {
          border: none;
          border-top: 2px dashed #999;
          margin: 16px 0;
        }

        .preview-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1.5em auto;
          border: 1px solid #d4b896;
          border-radius: 8px;
          background: #fff;
          padding: 4px;
        }

        .preview-content a {
          color: #4a90d9;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s ease;
        }

        .preview-content a:hover {
          border-bottom-color: #4a90d9;
        }

        .preview-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          font-family: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
        }

        .preview-content th,
        .preview-content td {
          padding: 0.75em 1em;
          border: 1px solid #e0e0e0;
          text-align: left;
          line-height: 1.75;
        }

        .preview-content th {
          background: #f8f9fa;
          font-weight: 700;
          font-family: 'Noto Sans SC', sans-serif;
        }

        .preview-content tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.5);
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .img-placeholder {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
