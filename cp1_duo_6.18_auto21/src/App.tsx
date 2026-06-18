import { InputPanel } from './components/InputPanel';
import { PreviewGrid } from './components/PreviewGrid';

const appStyles: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  backgroundColor: '#f5f7fa',
};

const headerStyles: React.CSSProperties = {
  height: '80px',
  backgroundColor: '#2c3e50',
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  letterSpacing: '1px',
};

const containerStyles: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '40px 40px',
  boxSizing: 'border-box',
};

const mainContentStyles: React.CSSProperties = {
  display: 'flex',
  gap: '40px',
  alignItems: 'flex-start',
  transition: 'all 0.2s ease',
};

const responsiveStyles = `
  @media (max-width: 800px) {
    .main-content {
      flex-direction: column !important;
      gap: 20px !important;
    }
    .input-panel {
      width: 100% !important;
    }
    .input-panel-inner {
      width: 100% !important;
    }
    .preview-grid {
      width: 100% !important;
    }
    .preview-grid-inner {
      width: 100% !important;
      grid-template-columns: 1fr !important;
    }
    .locale-panel {
      width: 100% !important;
    }
    .container {
      padding: 20px 20px !important;
    }
  }
`;

export default function App() {
  return (
    <div style={appStyles}>
      <style>{responsiveStyles}</style>
      <header style={headerStyles}>国际化输入格式验证与转换预览</header>
      <div className="container" style={containerStyles}>
        <div className="main-content" style={mainContentStyles}>
          <div className="input-panel">
            <InputPanel />
          </div>
          <div className="preview-grid">
            <PreviewGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
