import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect as KonvaRect, Circle as KonvaCircle, Line, Group } from 'react-konva';
import { AnimatePresence, motion } from 'framer-motion';
import type { Annotation, Template, CanvasElement, Point } from '../types';
import { getTemplates, saveTemplate, deleteTemplate } from '../api';

interface TemplateManagerProps {
  currentAnnotations: Annotation[];
  onApplyTemplate: (annotations: Annotation[]) => void;
}

const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 120;
const SCALE_X = THUMBNAIL_WIDTH / 1200;
const SCALE_Y = THUMBNAIL_HEIGHT / 800;

const TemplateThumbnail: React.FC<{ annotations: Annotation[] }> = ({ annotations }) => {
  const scalePoint = (p: Point): Point => ({
    x: p.x * SCALE_X,
    y: p.y * SCALE_Y,
  });

  const renderElement = (element: CanvasElement) => {
    const sp = scalePoint(element.startPoint);
    const ep = scalePoint(element.endPoint);
    const strokeWidth = Math.max(1, element.strokeWidth * Math.min(SCALE_X, SCALE_Y));
    const color = element.color;

    if (element.type === 'arrow') {
      const dx = ep.x - sp.x;
      const dy = ep.y - sp.y;
      const angle = Math.atan2(dy, dx);
      const headLength = 6;
      const headWidth = 4;
      const arrowTip = { x: ep.x, y: ep.y };
      const base1 = {
        x: arrowTip.x - headLength * Math.cos(angle) + headWidth * Math.sin(angle) / 2,
        y: arrowTip.y - headLength * Math.sin(angle) - headWidth * Math.cos(angle) / 2,
      };
      const base2 = {
        x: arrowTip.x - headLength * Math.cos(angle) - headWidth * Math.sin(angle) / 2,
        y: arrowTip.y - headLength * Math.sin(angle) + headWidth * Math.cos(angle) / 2,
      };
      return (
        <Group key={element.id}>
          <Line points={[sp.x, sp.y, ep.x, ep.y]} stroke={color} strokeWidth={strokeWidth} />
          <Line
            points={[base1.x, base1.y, arrowTip.x, arrowTip.y, base2.x, base2.y]}
            stroke={color}
            strokeWidth={strokeWidth}
            closed
            fill={color}
          />
        </Group>
      );
    }

    if (element.type === 'rect') {
      return (
        <KonvaRect
          key={element.id}
          x={Math.min(sp.x, ep.x)}
          y={Math.min(sp.y, ep.y)}
          width={Math.abs(ep.x - sp.x)}
          height={Math.abs(ep.y - sp.y)}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      );
    }

    if (element.type === 'circle') {
      return (
        <KonvaCircle
          key={element.id}
          x={(sp.x + ep.x) / 2}
          y={(sp.y + ep.y) / 2}
          radiusX={Math.abs(ep.x - sp.x) / 2}
          radiusY={Math.abs(ep.y - sp.y) / 2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeScaleEnabled={false}
        />
      );
    }

    return null;
  };

  return (
    <Stage width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} style={{ backgroundColor: '#FFFFFF', borderRadius: 4 }}>
      <Layer>
        {annotations.map((a) => renderElement(a.element))}
      </Layer>
    </Stage>
  );
};

const TemplateManager: React.FC<TemplateManagerProps> = ({
  currentAnnotations,
  onApplyTemplate,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(200);
  const startYRef = useRef(0);
  const startHeightRef = useRef(200);

  const loadTemplates = useCallback(async () => {
    const result = await getTemplates();
    if (result.success && result.data) {
      setTemplates(result.data);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || currentAnnotations.length === 0) return;

    setIsLoading(true);
    const tags = templateTags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await saveTemplate({
      name: templateName.trim(),
      tags,
      annotations: currentAnnotations,
    });

    if (result.success && result.data) {
      setTemplates((prev) => [result.data!, ...prev]);
      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateTags('');
    }
    setIsLoading(false);
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    const result = await deleteTemplate(templateId);
    if (result.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
    setIsLoading(false);
  };

  const handleApplyTemplate = (template: Template) => {
    onApplyTemplate(template.annotations);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = drawerHeight;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.touches[0].clientY;
    const newHeight = Math.min(Math.max(200, startHeightRef.current + deltaY), window.innerHeight - 100);
    setDrawerHeight(newHeight);
  };

  const handleDrawerTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDrawerMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = drawerHeight;
    document.addEventListener('mousemove', handleDrawerMouseMove);
    document.addEventListener('mouseup', handleDrawerMouseUp);
  };

  const handleDrawerMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - e.clientY;
    const newHeight = Math.min(Math.max(200, startHeightRef.current + deltaY), window.innerHeight - 100);
    setDrawerHeight(newHeight);
  };

  const handleDrawerMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDrawerMouseMove);
    document.removeEventListener('mouseup', handleDrawerMouseUp);
  };

  const panelContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #0F3460',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'system-ui',
          }}
        >
          批注模板
        </h2>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={currentAnnotations.length === 0}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: currentAnnotations.length === 0 ? '#2A2A4A' : '#FF3366',
            color: '#FFFFFF',
            cursor: currentAnnotations.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontFamily: 'system-ui',
            opacity: currentAnnotations.length === 0 ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          保存模板
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
        }}
      >
        {templates.length === 0 ? (
          <div
            style={{
              color: '#666',
              fontSize: 13,
              textAlign: 'center',
              padding: '40px 20px',
              fontFamily: 'system-ui',
            }}
          >
            暂无模板，创建批注后点击"保存模板"
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: '#0F3460' }}
                onClick={() => handleApplyTemplate(template)}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  backgroundColor: '#16213E',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: 'system-ui',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {template.name}
                    </div>
                    {template.tags.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        {template.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              backgroundColor: '#0F3460',
                              color: '#8888AA',
                              fontSize: 11,
                              fontFamily: 'system-ui',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                    disabled={isLoading}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#FF3366')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
                  >
                    ×
                  </button>
                </div>
                <TemplateThumbnail annotations={template.annotations} />
                <div
                  style={{
                    color: '#666',
                    fontSize: 11,
                    marginTop: 6,
                    fontFamily: 'system-ui',
                  }}
                >
                  {template.annotations.length} 个批注
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 100,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                width: '100%',
                maxWidth: 280,
                padding: 20,
                backgroundColor: '#1A1A2E',
                borderRadius: 12,
                border: '1px solid #0F3460',
              }}
            >
              <h3
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  marginBottom: 16,
                  fontFamily: 'system-ui',
                }}
              >
                保存为模板
              </h3>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: 'block',
                    color: '#888',
                    fontSize: 12,
                    marginBottom: 6,
                    fontFamily: 'system-ui',
                  }}
                >
                  模板名称 <span style={{ color: '#FF3366' }}>*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="输入模板名称..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #2A2A4A',
                    backgroundColor: '#0F0F1E',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontFamily: 'system-ui',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#FF3366')}
                  onBlur={(e) => (e.target.style.borderColor = '#2A2A4A')}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: 'block',
                    color: '#888',
                    fontSize: 12,
                    marginBottom: 6,
                    fontFamily: 'system-ui',
                  }}
                >
                  标签（用逗号分隔）
                </label>
                <input
                  type="text"
                  value={templateTags}
                  onChange={(e) => setTemplateTags(e.target.value)}
                  placeholder="例如：构图,色彩,线条"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #2A2A4A',
                    backgroundColor: '#0F0F1E',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontFamily: 'system-ui',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#FF3366')}
                  onBlur={(e) => (e.target.style.borderColor = '#2A2A4A')}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setTemplateName('');
                    setTemplateTags('');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#2A2A4A',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'system-ui',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || isLoading}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: !templateName.trim() || isLoading ? '#2A2A4A' : '#FF3366',
                    color: '#FFFFFF',
                    cursor: !templateName.trim() || isLoading ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontFamily: 'system-ui',
                    opacity: !templateName.trim() || isLoading ? 0.5 : 1,
                  }}
                >
                  {isLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {!drawerOpen && (
          <motion.button
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            onClick={() => {
              setDrawerOpen(true);
              setDrawerHeight(300);
            }}
            style={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#FF3366',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 4px 16px rgba(255,51,102,0.4)',
              cursor: 'pointer',
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            📋
          </motion.button>
        )}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: drawerHeight,
                backgroundColor: '#16213E',
                borderRadius: '16px 16px 0 0',
                zIndex: 100,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                onMouseDown={handleDrawerMouseDown}
                onTouchStart={handleDrawerTouchStart}
                onTouchMove={handleDrawerTouchMove}
                onTouchEnd={handleDrawerTouchEnd}
                style={{
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  flexShrink: 0,
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#444',
                  }}
                />
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: 8,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#0F3460',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>{panelContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        backgroundColor: '#16213E',
        borderLeft: '1px solid #0F3460',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {panelContent}
    </div>
  );
};

export default TemplateManager;
