import { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import AnimationEditor from '@/modules/editor/AnimationEditor';
import PreviewPanel from '@/modules/preview/PreviewPanel';
import CodeExportModal from '@/modules/export/CodeExportModal';
import { AnimationConfig, createDefaultConfig, AnimationType } from '@/types/animation';
import { generateCSS } from '@/utils/cssExporter';

const AppContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.header`
  height: 56px;
  background: #1E1B4B;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  z-index: 100;
`;

const Title = styled.h1`
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(90deg, #8B5CF6, #3B82F6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ExportButton = styled.button`
  width: 140px;
  height: 36px;
  border-radius: 18px;
  background: linear-gradient(90deg, #8B5CF6, #3B82F6);
  color: white;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`;

const EditorPanel = styled.div<{ $collapsed: boolean }>`
  width: 380px;
  background: #FFFFFF;
  padding: 16px;
  overflow-y: auto;
  flex-shrink: 0;
  border-right: 1px solid #E5E7EB;
  transition: all 0.3s ease;

  @media (max-width: 900px) {
    width: 100%;
    max-height: ${props => props.$collapsed ? '0' : '50vh'};
    padding: ${props => props.$collapsed ? '0 16px' : '16px'};
    border-right: none;
    border-bottom: 1px solid #E5E7EB;
    overflow: ${props => props.$collapsed ? 'hidden' : 'auto'};
  }
`;

const PreviewPanelWrapper = styled.div`
  flex: 1;
  background: #F3F4F6;
  overflow: hidden;
  position: relative;
`;

const MobileToggle = styled.button`
  display: none;
  background: rgba(139, 92, 246, 0.2);
  color: white;
  border: 1px solid rgba(139, 92, 246, 0.5);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;

  @media (max-width: 900px) {
    display: block;
  }

  &:hover {
    background: rgba(139, 92, 246, 0.3);
  }
`;

const Toast = styled.div<{ $show: boolean }>`
  position: fixed;
  bottom: ${props => props.$show ? '30px' : '-60px'};
  left: 50%;
  transform: translateX(-50%);
  background: #1F2937;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1000;
  transition: bottom 0.3s ease;
  pointer-events: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
`;

const App = () => {
  const [animations, setAnimations] = useState<AnimationConfig[]>([
    createDefaultConfig('1', '动画 A', 'translate'),
    createDefaultConfig('2', '动画 B', 'rotate'),
    createDefaultConfig('3', '动画 C', 'scale'),
    createDefaultConfig('4', '动画 D', 'bounce'),
  ]);

  const [selectedAnimationId, setSelectedAnimationId] = useState<string>('1');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playKey, setPlayKey] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const currentTimeRef = useRef(0);

  const selectedAnimation = animations.find(a => a.id === selectedAnimationId);
  const totalDuration = Math.max(...animations.map(a => a.duration + a.delay), 1);

  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  useEffect(() => {
    if (!isPlaying || isSeeking) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      currentTimeRef.current = (currentTimeRef.current + delta) % totalDuration;
      setCurrentTime(currentTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, isSeeking, totalDuration]);

  const handleAnimationChange = useCallback((id: string, updates: Partial<AnimationConfig>) => {
    setAnimations(prev =>
      prev.map(anim => (anim.id === id ? { ...anim, ...updates } : anim))
    );
  }, []);

  const handleAnimationTypeChange = useCallback((id: string, type: AnimationType) => {
    setAnimations(prev =>
      prev.map(anim => (anim.id === id ? { ...anim, type } : anim))
    );
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    lastTimeRef.current = performance.now();
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleRestart = useCallback(() => {
    currentTimeRef.current = 0;
    setCurrentTime(0);
    setPlayKey(prev => prev + 1);
    setIsPlaying(true);
    lastTimeRef.current = performance.now();
  }, []);

  const handleSeek = useCallback((time: number) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
  }, []);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsSeeking(false);
    lastTimeRef.current = performance.now();
  }, []);

  const handleAddAnimation = useCallback(() => {
    if (animations.length >= 4) {
      showToastMessage('最多只能添加 4 个动画实例');
      return;
    }
    const newId = String(Date.now());
    const newAnim = createDefaultConfig(newId, `动画 ${String.fromCharCode(65 + animations.length)}`, 'translate');
    setAnimations(prev => [...prev, newAnim]);
    setSelectedAnimationId(newId);
  }, [animations.length, showToastMessage]);

  const handleRemoveAnimation = useCallback((id: string) => {
    if (animations.length <= 1) {
      showToastMessage('至少需要保留 1 个动画实例');
      return;
    }
    setAnimations(prev => prev.filter(a => a.id !== id));
    if (selectedAnimationId === id) {
      const remaining = animations.filter(a => a.id !== id);
      setSelectedAnimationId(remaining[0]?.id || '');
    }
  }, [animations.length, selectedAnimationId, showToastMessage]);

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handleCopyCode = () => {
    if (selectedAnimation) {
      const cssCode = generateCSS(selectedAnimation);
      navigator.clipboard.writeText(cssCode).then(() => {
        showToastMessage('代码已复制到剪贴板');
      }).catch(() => {
        showToastMessage('复制失败，请手动复制');
      });
    }
  };

  return (
    <AppContainer>
      <Header>
        <Title>CSS 动画沙盒</Title>
        <HeaderActions>
          <MobileToggle onClick={() => setIsEditorCollapsed(!isEditorCollapsed)}>
            {isEditorCollapsed ? '展开编辑' : '收起编辑'}
          </MobileToggle>
          <ExportButton onClick={handleExport}>导出代码</ExportButton>
        </HeaderActions>
      </Header>

      <MainContent>
        <EditorPanel $collapsed={isEditorCollapsed}>
          <AnimationEditor
            animations={animations}
            selectedId={selectedAnimationId}
            onSelect={setSelectedAnimationId}
            onChange={handleAnimationChange}
            onTypeChange={handleAnimationTypeChange}
            onAdd={handleAddAnimation}
            onRemove={handleRemoveAnimation}
          />
        </EditorPanel>

        <PreviewPanelWrapper>
          <PreviewPanel
            animations={animations}
            selectedId={selectedAnimationId}
            isPlaying={isPlaying}
            currentTime={currentTime}
            totalDuration={totalDuration}
            playKey={playKey}
            isSeeking={isSeeking}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onSeekStart={handleSeekStart}
            onSeekEnd={handleSeekEnd}
            onRestart={handleRestart}
            onSelect={setSelectedAnimationId}
          />
        </PreviewPanelWrapper>
      </MainContent>

      {isExportModalOpen && selectedAnimation && (
        <CodeExportModal
          animation={selectedAnimation}
          onClose={() => setIsExportModalOpen(false)}
          onCopy={handleCopyCode}
        />
      )}

      <Toast $show={showToast}>{toastMessage}</Toast>
    </AppContainer>
  );
};

export default App;
