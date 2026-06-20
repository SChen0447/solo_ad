import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopologyRenderer } from './renderer';
import { DataRouter } from './dataRouter';
import { generateTopology } from './topologyGenerator';
import { ControlPanel } from './components/ControlPanel';
import { MobileBanner } from './components/MobileBanner';
import type { TopologyType, RoutingSpeed, SelectedNodeInfo } from './types';

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TopologyRenderer | null>(null);
  const routerRef = useRef<DataRouter | null>(null);
  const routingStepRef = useRef<'idle' | 'selectStart' | 'selectEnd'>('idle');
  const startNodeRef = useRef<number | null>(null);

  const [topologyType, setTopologyType] = useState<TopologyType>('ring');
  const [nodeCount, setNodeCount] = useState(12);
  const [connectionProbability, setConnectionProbability] = useState(0.5);
  const [routingSpeed, setRoutingSpeed] = useState<RoutingSpeed>('medium');
  const [isRoutingActive, setIsRoutingActive] = useState(false);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<SelectedNodeInfo | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [routingStep, setRoutingStep] = useState<'idle' | 'selectStart' | 'selectEnd'>('idle');
  const [startNode, setStartNode] = useState<number | null>(null);
  const [endNode, setEndNode] = useState<number | null>(null);

  useEffect(() => {
    routingStepRef.current = routingStep;
  }, [routingStep]);

  useEffect(() => {
    startNodeRef.current = startNode;
  }, [startNode]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const initialData = generateTopology(topologyType, {
      nodeCount,
      connectionProbability,
    });

    const renderer = new TopologyRenderer(canvasContainerRef.current);
    const router = new DataRouter(initialData);

    renderer.setDataRouter(router);
    renderer.updateTopology(initialData);

    renderer.setOnNodeSelect((info) => {
      setSelectedNodeInfo(info);

      if (routingStepRef.current === 'selectStart' && info) {
        setStartNode(info.id);
        setRoutingStep('selectEnd');
      } else if (routingStepRef.current === 'selectEnd' && info && info.id !== startNodeRef.current) {
        setEndNode(info.id);
        setRoutingStep('idle');
      }
    });

    rendererRef.current = renderer;
    routerRef.current = router;

    return () => {
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !routerRef.current) return;

    const data = generateTopology(topologyType, {
      nodeCount,
      connectionProbability,
    });

    routerRef.current.setTopology(data);
    rendererRef.current.updateTopology(data);
    setIsRoutingActive(false);
    setStartNode(null);
    setEndNode(null);
    setRoutingStep('idle');
  }, [topologyType, nodeCount, connectionProbability]);

  useEffect(() => {
    if (routerRef.current) {
      routerRef.current.setSpeed(routingSpeed);
    }
  }, [routingSpeed]);

  const handleStartRouting = useCallback(() => {
    if (isRoutingActive) {
      routerRef.current?.stopRouting();
      setIsRoutingActive(false);
      return;
    }

    if (startNode !== null && endNode !== null) {
      const success = routerRef.current?.startRouting(startNode, endNode);
      if (success) {
        setIsRoutingActive(true);
      }
    } else {
      setRoutingStep('selectStart');
      setStartNode(null);
      setEndNode(null);
    }
  }, [isRoutingActive, startNode, endNode]);

  const handleStopRouting = useCallback(() => {
    routerRef.current?.stopRouting();
    setIsRoutingActive(false);
    setStartNode(null);
    setEndNode(null);
    setRoutingStep('idle');
  }, []);

  const panelContent = (
    <ControlPanel
      topologyType={topologyType}
      setTopologyType={setTopologyType}
      nodeCount={nodeCount}
      setNodeCount={setNodeCount}
      connectionProbability={connectionProbability}
      setConnectionProbability={setConnectionProbability}
      routingSpeed={routingSpeed}
      setRoutingSpeed={setRoutingSpeed}
      isRoutingActive={isRoutingActive}
      onStartRouting={handleStartRouting}
      onStopRouting={handleStopRouting}
      selectedNodeInfo={selectedNodeInfo}
    />
  );

  return (
    <div style={styles.container}>
      <div ref={canvasContainerRef} style={styles.canvasContainer} />

      {routingStep !== 'idle' && (
        <div style={styles.routingHint}>
          {routingStep === 'selectStart' ? '👆 点击选择起点节点' : '👆 点击选择终点节点'}
        </div>
      )}

      {startNode !== null && endNode !== null && !isRoutingActive && (
        <div style={styles.routingHint}>
          起点: #{startNode} | 终点: #{endNode} | 点击"开始路由"按钮
        </div>
      )}

      {isMobile ? (
        <MobileBanner isExpanded={isPanelExpanded} onToggle={() => setIsPanelExpanded(!isPanelExpanded)}>
          {panelContent}
        </MobileBanner>
      ) : (
        <div style={styles.desktopPanel}>{panelContent}</div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  desktopPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    zIndex: 100,
  },
  routingHint: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 20px',
    background: 'rgba(20, 25, 40, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#00ffff',
    borderRadius: 8,
    fontSize: 14,
    zIndex: 50,
    border: '1px solid rgba(0, 255, 255, 0.3)',
  },
};

export default App;
