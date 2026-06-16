import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MindMapCanvas } from './components/MindMapCanvas';
import { NodePanel } from './components/NodePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { websocketService } from './services/websocket';
import { apiService } from './services/api';
import { MindMapNode, Connection, HistoryRecord, MindMapState } from './types';

const PRESET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#FF8C69',
  '#6B8E23',
];

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getRandomColor = (): string => {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
};

const getRandomUsername = (): string => {
  const adjectives = ['快乐的', '聪明的', '勇敢的', '可爱的', '神秘的', '阳光的'];
  const nouns = ['小猫', '小狗', '小兔', '小熊', '小鸟', '小鱼'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}`;
};

const App: React.FC = () => {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [scale, setScale] = useState(1);
  const [isNodePanelOpen, setIsNodePanelOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const getCurrentState = useCallback((): MindMapState => {
    return {
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
  }, [nodes, connections]);

  useEffect(() => {
    const savedUsername = localStorage.getItem('mindmap-username');
    const newUsername = savedUsername || getRandomUsername();
    if (!savedUsername) {
      localStorage.setItem('mindmap-username', newUsername);
    }
    setUsername(newUsername);

    const init = async () => {
      try {
        const initialState = await apiService.getMindMap();
        setNodes(initialState.nodes);
        setConnections(initialState.connections);

        const historyData = await apiService.getHistory();
        setHistory(historyData);

        const usersData = await apiService.getOnlineUsers();
        setOnlineCount(usersData.count);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }

      try {
        await websocketService.connect(newUsername);
        setIsConnected(true);

        websocketService.on('users:update', (data: { count: number; users: string[] }) => {
          setOnlineCount(data.count);
        });

        websocketService.on('node:create', (data: { node: MindMapNode; username: string }) => {
          setNodes((prev) => {
            if (prev.some((n) => n.id === data.node.id)) return prev;
            return [...prev, data.node];
          });
        });

        websocketService.on('node:update', (data: { node: MindMapNode; username: string }) => {
          setNodes((prev) =>
            prev.map((n) => (n.id === data.node.id ? { ...n, ...data.node } : n))
          );
        });

        websocketService.on('node:move', (data: { nodeId: string; x: number; y: number; username: string }) => {
          setNodes((prev) =>
            prev.map((n) => (n.id === data.nodeId ? { ...n, x: data.x, y: data.y } : n))
          );
        });

        websocketService.on('node:delete', (data: { nodeId: string; username: string }) => {
          setNodes((prev) => prev.filter((n) => n.id !== data.nodeId));
          setConnections((prev) =>
            prev.filter((c) => c.fromNodeId !== data.nodeId && c.toNodeId !== data.nodeId)
          );
        });

        websocketService.on('connection:create', (data: { connection: Connection; username: string }) => {
          setConnections((prev) => {
            if (prev.some((c) => c.id === data.connection.id)) return prev;
            return [...prev, data.connection];
          });
        });

        websocketService.on('connection:delete', (data: { connectionId: string; username: string }) => {
          setConnections((prev) => prev.filter((c) => c.id !== data.connectionId));
        });

        websocketService.on('history:add', (data: { record: HistoryRecord }) => {
          setHistory((prev) => {
            if (prev.some((r) => r.id === data.record.id)) return prev;
            return [data.record, ...prev];
          });
        });

        websocketService.on('history:rollback', (data: { state: MindMapState; record: HistoryRecord }) => {
          setNodes(data.state.nodes);
          setConnections(data.state.connections);
          setHistory((prev) => {
            if (prev.some((r) => r.id === data.record.id)) return prev;
            return [data.record, ...prev];
          });
        });
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    init();

    return () => {
      websocketService.disconnect();
    };
  }, []);

  const handleNodeCreate = useCallback(
    (x: number, y: number) => {
      const newNode: MindMapNode = {
        id: generateId(),
        x,
        y,
        text: '新节点',
        color: getRandomColor(),
        radius: 30,
      };

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setIsNodePanelOpen(true);

      if (websocketService.isConnected()) {
        websocketService.sendNodeCreate(newNode);
      }
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<MindMapNode>) => {
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)));

      if (websocketService.isConnected()) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          websocketService.sendNodeUpdate({ ...node, ...updates });
        }
      }
    },
    [nodes]
  );

  const handleNodeMove = useCallback((nodeId: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, x, y } : n)));
  }, []);

  const handleNodeDragEnd = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (websocketService.isConnected()) {
        websocketService.sendNodeMove(nodeId, x, y);
      }
    },
    []
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setConnections((prev) =>
        prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId)
      );
      setSelectedNodeId(null);

      if (websocketService.isConnected()) {
        websocketService.sendNodeDelete(nodeId);
      }
    },
    []
  );

  const handleAddChildNode = useCallback(
    (parentId: string) => {
      const parentNode = nodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const childNode: MindMapNode = {
        id: generateId(),
        x: parentNode.x + 120,
        y: parentNode.y + 60,
        text: '新节点',
        color: parentNode.color,
        radius: 30,
      };

      const newConnection: Connection = {
        id: generateId(),
        fromNodeId: parentId,
        toNodeId: childNode.id,
      };

      setNodes((prev) => [...prev, childNode]);
      setConnections((prev) => [...prev, newConnection]);
      setSelectedNodeId(childNode.id);

      if (websocketService.isConnected()) {
        websocketService.sendNodeCreate(childNode);
        setTimeout(() => {
          websocketService.sendConnectionCreate(parentId, childNode.id);
        }, 50);
      }
    },
    [nodes]
  );

  const handleConnectionCreate = useCallback(
    (fromId: string, toId: string) => {
      const exists = connections.some(
        (c) =>
          (c.fromNodeId === fromId && c.toNodeId === toId) ||
          (c.fromNodeId === toId && c.toNodeId === fromId)
      );

      if (exists) return;

      const newConnection: Connection = {
        id: generateId(),
        fromNodeId: fromId,
        toNodeId: toId,
      };

      setConnections((prev) => [...prev, newConnection]);

      if (websocketService.isConnected()) {
        websocketService.sendConnectionCreate(fromId, toId);
      }
    },
    [connections]
  );

  const handleConnectionDelete = useCallback(
    (connectionId: string) => {
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));

      if (websocketService.isConnected()) {
        websocketService.sendConnectionDelete(connectionId);
      }
    },
    []
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setIsNodePanelOpen(true);
    }
  }, []);

  const handleRollback = useCallback(
    (historyId: string) => {
      const record = history.find((r) => r.id === historyId);
      if (!record) return;

      setNodes(record.state.nodes);
      setConnections(record.state.connections);

      if (websocketService.isConnected()) {
        websocketService.sendRollback(historyId);
      }
    },
    [history]
  );

  const handleExportPNG = useCallback(() => {
    if (!canvasRef.current) return;

    const stage = canvasRef.current.querySelector('canvas');
    if (!stage) return;

    const link = document.createElement('a');
    link.download = `mindmap-${Date.now()}.png`;
    link.href = stage.toDataURL('image/png');
    link.click();
  }, []);

  const handleExportJSON = useCallback(() => {
    const state = getCurrentState();
    apiService.downloadJSON(state);
  }, [getCurrentState]);

  const appStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    position: 'relative',
  };

  const headerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333333',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const onlineBadgeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#F0F8F5',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#4ECDC4',
    fontWeight: 500,
  };

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#4ECDC4',
    animation: 'pulse 2s infinite',
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    backgroundColor: '#ffffff',
    padding: '12px 20px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  };

  const toolbarButtonStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: '#F8F9FA',
    color: '#333333',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const scaleControlStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#666666',
  };

  const sideButtonsStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 100,
    display: 'flex',
    gap: '10px',
  };

  const sideButtonStyle: React.CSSProperties = {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s, box-shadow 0.2s',
  };

  const canvasContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  };

  const darkenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
    const B = Math.max((num & 0x0000ff) - amt, 0);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  return (
    <div style={appStyle}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

      <div style={headerStyle}>
        <div style={logoStyle}>
          <span style={{ fontSize: '28px' }}>🧠</span>
          <span>协作导图</span>
        </div>
        <div style={onlineBadgeStyle}>
          <div style={dotStyle}></div>
          <span>{onlineCount} 人在线</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: isConnected ? '#E8F8F5' : '#FFF5F5',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '13px',
          color: isConnected ? '#4ECDC4' : '#FF6B6B',
          fontWeight: 500,
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#4ECDC4' : '#FF6B6B',
          }}></div>
          <span>{username}</span>
        </div>
      </div>

      <div style={sideButtonsStyle}>
        <button
          style={sideButtonStyle}
          onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
          title="操作历史"
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📋
        </button>
        <button
          style={sideButtonStyle}
          onClick={() => setIsNodePanelOpen(!isNodePanelOpen)}
          title="节点面板"
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⚙️
        </button>
      </div>

      <div ref={canvasRef} style={canvasContainerStyle}>
        <MindMapCanvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onNodeMove={handleNodeMove}
          onNodeCreate={handleNodeCreate}
          onNodeDragEnd={handleNodeDragEnd}
          onConnectionCreate={handleConnectionCreate}
          onConnectionDelete={handleConnectionDelete}
          scale={scale}
          onScaleChange={setScale}
        />
      </div>

      <div style={toolbarStyle}>
        <button
          style={toolbarButtonStyle}
          onClick={handleExportPNG}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = darkenColor('#F8F9FA', 10);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8F9FA';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📷 导出 PNG
        </button>
        <button
          style={toolbarButtonStyle}
          onClick={handleExportJSON}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = darkenColor('#F8F9FA', 10);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8F9FA';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📄 导出 JSON
        </button>
        <div style={scaleControlStyle}>
          <span>缩放</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{ width: '100px', cursor: 'pointer' }}
          />
          <span style={{ minWidth: '36px', textAlign: 'right' }}>
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      <NodePanel
        isOpen={isNodePanelOpen}
        onClose={() => setIsNodePanelOpen(false)}
        selectedNode={selectedNode}
        onNodeUpdate={handleNodeUpdate}
        onAddChildNode={handleAddChildNode}
        onDeleteNode={handleNodeDelete}
      />

      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        history={history}
        onRollback={handleRollback}
      />
    </div>
  );
};

export default App;
