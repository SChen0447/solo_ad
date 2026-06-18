import { useRef, useCallback } from 'react';
import { useDesignStore } from './store/designStore';
import TemplateCanvas, { TemplateCanvasRef } from './components/TemplateCanvas';
import LogoUploader from './components/LogoUploader';
import ColorPanel from './components/ColorPanel';
import TemplateTabs from './components/TemplateTabs';
import ControlPanel from './components/ControlPanel';
import ExportButton from './components/ExportButton';
import LoadingOverlay from './components/LoadingOverlay';
import { TemplateType } from './types/design';
import { generatePDF, TemplateCanvasRef as ExportCanvasRef } from './utils/exportUtil';
import { getTemplateSize } from './utils/layoutCalculator';
import { darkenColor } from './utils/colorUtils';
import './styles/App.css';

const ALL_TEMPLATES: TemplateType[] = [
  'business-card-front',
  'business-card-back',
  'letterhead',
  'twitter-cover',
  'instagram-cover',
  'linkedin-cover'
];

function App() {
  const { primaryColor, activeTemplate, isExporting, setIsExporting } = useDesignStore();
  const canvasRefs = useRef<Record<TemplateType, TemplateCanvasRef | null>>({} as Record<TemplateType, TemplateCanvasRef | null>);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    setTimeout(async () => {
      try {
        const exportCanvases: Record<TemplateType, ExportCanvasRef> = {} as Record<TemplateType, ExportCanvasRef>;
        
        ALL_TEMPLATES.forEach((template) => {
          const ref = canvasRefs.current[template];
          if (ref) {
            exportCanvases[template] = {
              toDataURL: (type?: string, quality?: number) => ref.toDataURL(type, quality)
            };
          }
        });

        await generatePDF(exportCanvases);
      } catch (error) {
        console.error('Export failed:', error);
        alert('导出失败，请重试');
      } finally {
        setIsExporting(false);
      }
    }, 1500);
  }, [setIsExporting]);

  const templateSize = getTemplateSize(activeTemplate);
  const darkerColor = darkenColor(primaryColor, 10);
  const navStyle = {
    background: `linear-gradient(135deg, ${primaryColor}dd 0%, ${darkerColor}dd 100%)`,
    backdropFilter: 'blur(10px)'
  };

  const isWideTemplate = activeTemplate.includes('cover');

  return (
    <div className="app">
      <header className="app-header" style={navStyle}>
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🎨</span>
            <h1>品牌视觉规范生成器</h1>
          </div>
          <ExportButton onClick={handleExport} />
        </div>
      </header>

      <div className="app-body">
        <aside className="left-panel">
          <div className="glass-panel">
            <LogoUploader />
          </div>
          <div className="glass-panel">
            <ColorPanel />
          </div>
          <div className="glass-panel">
            <ControlPanel templateType={activeTemplate} />
          </div>
        </aside>

        <main className="right-panel">
          <div className="glass-panel preview-container">
            <TemplateTabs />
            <div className={`preview-area ${isWideTemplate ? 'wide' : ''}`}>
              <div 
                className="preview-card-wrapper"
                style={{
                  aspectRatio: `${templateSize.width} / ${templateSize.height}`,
                  maxWidth: isWideTemplate ? '100%' : '400px',
                  width: '100%'
                }}
              >
                <TemplateCanvas
                  ref={(el) => {
                    canvasRefs.current[activeTemplate] = el;
                  }}
                  templateType={activeTemplate}
                  interactive={true}
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      {ALL_TEMPLATES.map((template) => (
        template !== activeTemplate && (
          <div key={template} className="hidden-canvases">
            <TemplateCanvas
              ref={(el) => {
                canvasRefs.current[template] = el;
              }}
              templateType={template}
              interactive={false}
            />
          </div>
        )
      ))}

      <LoadingOverlay visible={isExporting} text="正在生成 PDF..." />
    </div>
  );
}

export default App;
