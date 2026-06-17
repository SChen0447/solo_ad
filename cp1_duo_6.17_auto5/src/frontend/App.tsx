import React, { useEffect, useState } from 'react';
import { Whiteboard } from '../components/Whiteboard';
import { Sidebar } from '../components/Sidebar';
import { useCanvasStore } from './store';

const App: React.FC = () => {
  const { nodes, connections, zoom, setZoom } = useCanvasStore();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowSidebar(true);
        setMobileMenuOpen(false);
      } else {
        setShowSidebar(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExportJSON = () => {
    const data = {
      nodes,
      connections,
      version: '1.0',
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.nodes && data.connections) {
            console.log('Imported data:', data);
            alert('概念图导入成功！（演示模式）');
          } else {
            alert('文件格式错误');
          }
        } catch (err) {
          alert('文件解析失败');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `concept-map-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.2, 0.5));
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          height: 56,
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          zIndex: 10,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#666',
              transition: 'transform 0.15s ease-out',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.92)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ☰
          </button>
        )}

        <div
          style={{
            fontSize: isMobile ? 15 : 16,
            fontWeight: 600,
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>🧠</span>
          <span>协作概念图</span>
        </div>

        {!isMobile && (
          <>
            <div
              style={{
                padding: '4px 10px',
                backgroundColor: '#f0f7fa',
                borderRadius: 6,
                fontSize: 12,
                color: '#45B7D1',
                fontWeight: 500,
              }}
            >
              节点: {nodes.length} | 连线: {connections.length}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        {!isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              backgroundColor: '#f5f5f5',
              borderRadius: 8,
            }}
          >
            <button
              onClick={handleZoomOut}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 18,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease-out',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.92)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              −
            </button>
            <span style={{ fontSize: 12, color: '#666', minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 18,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease-out',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.92)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              +
            </button>
          </div>
        )}

        <button
          onClick={handleImportJSON}
          style={{
            padding: isMobile ? '8px 12px' : '8px 16px',
            backgroundColor: '#fff',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: isMobile ? 13 : 14,
            cursor: 'pointer',
            transition: 'transform 0.15s ease-out, background-color 0.15s',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isMobile ? '📥' : '📥 导入'}
        </button>

        <button
          onClick={handleExportJSON}
          style={{
            padding: isMobile ? '8px 12px' : '8px 16px',
            backgroundColor: '#45B7D1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: isMobile ? 13 : 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'transform 0.15s ease-out, background-color 0.15s',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3a9fb7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#45B7D1';
          }}
        >
          {isMobile ? '📤' : '📤 导出'}
        </button>

        {!isMobile && (
          <button
            onClick={handleExportPNG}
            style={{
              padding: '8px 16px',
              backgroundColor: '#96CEB4',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'transform 0.15s ease-out, background-color 0.15s',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#83b99e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#96CEB4';
            }}
          >
            🖼️ PNG
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Sidebar */}
        {!isMobile ? (
          showSidebar && <Sidebar isOpen={showSidebar} isMobile={isMobile} />
        ) : (
          mobileMenuOpen && (
            <Sidebar
              isOpen={mobileMenuOpen}
              isMobile={isMobile}
              onClose={() => setMobileMenuOpen(false)}
            />
          )
        )}

        {/* Mobile Overlay */}
        {isMobile && mobileMenuOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 15,
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Whiteboard Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Whiteboard />

          {/* Mobile Bottom Quick Actions */}
          {isMobile && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 5,
              }}
            >
              <button
                onClick={handleZoomOut}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  fontSize: 20,
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease-out',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.92)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                −
              </button>
              <button
                onClick={handleZoomIn}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                  fontSize: 20,
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease-out',
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.92)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
