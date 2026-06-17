import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CanvasRenderer } from './canvasRenderer';
import { CollaborationModule } from './collaborationModule';
import { HistoryService } from './historyService';
import type { ToolType, UserInfo, DrawElement, Snapshot } from './types';
import { COLOR_PALETTE } from './types';

const PenIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const RectIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const TextIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const StickyIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
    <polyline points="14 3 14 10 21 10" />
  </svg>
);

const ImageIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const ChevronRightIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const SaveIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const HistoryIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const collaborationRef = useRef<CollaborationModule | null>(null);
  const historyServiceRef = useRef<HistoryService | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roomId, setRoomId] = useState<string>('');
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [penWidth, setPenWidth] = useState<number>(2);
  const [penColor, setPenColor] = useState<string>('#333333');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isHistoryMode, setIsHistoryMode] = useState<boolean>(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);
  const [colorPickerVisible, setColorPickerVisible] = useState<boolean>(false);
  const [toolbarExpanded, setToolbarExpanded] = useState<boolean>(true);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/board\/(.+)/);
    const room = match ? match[1] : 'default';
    setRoomId(room);

    const userId = localStorage.getItem('board_user_id') || uuidv4();
    const userName = localStorage.getItem('board_user_name') || `\u7528\u6237${Math.floor(Math.random() * 1000)}`;
    const userColorIndex = parseInt(localStorage.getItem('board_user_color') || String(Math.floor(Math.random() * COLOR_PALETTE.length)));
    const userColor = COLOR_PALETTE[userColorIndex % COLOR_PALETTE.length];

    localStorage.setItem('board_user_id', userId);
    localStorage.setItem('board_user_name', userName);
    localStorage.setItem('board_user_color', String(userColorIndex));

    setUserInfo({ id: userId, name: userName, color: userColor });
  }, []);

  const handleLocalDraw = useCallback((element: DrawElement) => {
    if (collaborationRef.current) {
      collaborationRef.current.sendDrawEvent(element);
    }
  }, []);

  const handleRemoteDraw = useCallback((element: DrawElement) => {
    if (rendererRef.current) {
      rendererRef.current.handleRemoteDraw(element);
    }
  }, []);

  const handleInitSync = useCallback((elements: DrawElement[]) => {
    if (rendererRef.current) {
      rendererRef.current.setElements(elements);
    }
  }, []);

  const handleSnapshotRestore = useCallback((elements: DrawElement[]) => {
    if (rendererRef.current) {
      rendererRef.current.setElements(elements);
    }
  }, []);

  const handleHistoryModeChange = useCallback((isHistory: boolean) => {
    setIsHistoryMode(isHistory);
  }, []);

  const handleUserJoined = useCallback((user: UserInfo) => {
    setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
  }, []);

  const handleUserLeft = useCallback((userId: string) => {
    setOnlineUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !userInfo) return;

    const renderer = new CanvasRenderer({
      canvas: canvasRef.current,
      userInfo,
      onLocalDraw: handleLocalDraw
    });
    rendererRef.current = renderer;

    const collaboration = new CollaborationModule({
      roomId,
      userInfo,
      onRemoteDraw: handleRemoteDraw,
      onInitSync: handleInitSync,
      onUserJoined: handleUserJoined,
      onUserLeft: handleUserLeft,
      onConnectionStatusChange: setIsConnected
    });
    collaborationRef.current = collaboration;
    collaboration.connect();

    const historyService = new HistoryService({
      roomId,
      onSnapshotRestore: handleSnapshotRestore,
      onHistoryModeChange: handleHistoryModeChange
    });
    historyServiceRef.current = historyService;

    historyService.startAutoSave(
      () => renderer.getElements(),
      () => renderer.generateThumbnail()
    );

    historyService.getSnapshots().then(setSnapshots);

    return () => {
      renderer.unbindEvents();
      collaboration.disconnect();
      historyService.destroy();
    };
  }, [userInfo, roomId, handleLocalDraw, handleRemoteDraw, handleInitSync, handleSnapshotRestore, handleHistoryModeChange, handleUserJoined, handleUserLeft]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTool(currentTool);
    }
  }, [currentTool]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPenWidth(penWidth);
    }
  }, [penWidth]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPenColor(penColor);
    }
  }, [penColor]);

  const handleToolClick = (tool: ToolType) => {
    setCurrentTool(tool);
    setColorPickerVisible(false);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && rendererRef.current) {
      rendererRef.current.addImageElement(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefreshSnapshots = async () => {
    if (historyServiceRef.current) {
      const snaps = await historyServiceRef.current.getSnapshots();
      setSnapshots(snaps);
    }
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (historyServiceRef.current) {
      await historyServiceRef.current.restoreSnapshot(snapshotId);
    }
  };

  const handleExitHistoryMode = () => {
    if (historyServiceRef.current) {
      historyServiceRef.current.exitHistoryMode();
    }
  };

  const handleManualSave = async () => {
    if (historyServiceRef.current && rendererRef.current) {
      const elements = rendererRef.current.getElements();
      const thumbnail = rendererRef.current.generateThumbnail();
      await historyServiceRef.current.saveSnapshot(elements, thumbnail);
      await handleRefreshSnapshots();
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const tools: { type: ToolType; Icon: React.FC; label: string }[] = [
    { type: 'pen', Icon: PenIcon, label: '\u94A2\u7B14' },
    { type: 'rect', Icon: RectIcon, label: '\u77E9\u5F62' },
    { type: 'text', Icon: TextIcon, label: '\u6587\u5B57' },
    { type: 'sticky', Icon: StickyIcon, label: '\u4FBF\u7B7E' },
    { type: 'image', Icon: ImageIcon, label: '\u56FE\u7247' }
  ];

  const penWidths = [2, 4, 6];

  const getToolStatusText = (): string => {
    const toolLabels: Record<ToolType, string> = {
      pen: '\u94A2\u7B14',
      rect: '\u77E9\u5F62',
      text: '\u6587\u5B57',
      sticky: '\u4FBF\u7B7E',
      image: '\u56FE\u7247'
    };
    const label = toolLabels[currentTool];
    if (currentTool === 'pen') {
      return `${label} - ${penWidth}px`;
    }
    return label;
  };

  if (!userInfo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white' }}>
        ...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.toolbar,
          ...(toolbarExpanded ? styles.toolbarExpanded : styles.toolbarCollapsed)
        }}
        onMouseEnter={() => setToolbarExpanded(true)}
        onMouseLeave={() => {
          setToolbarExpanded(false);
          setColorPickerVisible(false);
        }}
      >
        {!toolbarExpanded && (
          <div style={styles.collapsedHandle}>
            <ChevronRightIcon />
          </div>
        )}

        {toolbarExpanded && (
          <>
            {tools.map((tool) => (
              <div
                key={tool.type}
                className={`tool-btn ${currentTool === tool.type ? 'tool-btn-active' : ''}`}
                style={styles.toolButton}
                onClick={() => tool.type === 'image' ? handleImageUploadClick() : handleToolClick(tool.type)}
                title={tool.label}
              >
                {currentTool === tool.type && <div style={styles.toolIndicator} className="tool-indicator" />}
                <tool.Icon />
              </div>
            ))}

            <div style={styles.divider} />

            {currentTool === 'pen' && (
              <>
                <div
                  style={{
                    ...styles.colorButton,
                    backgroundColor: penColor
                  }}
                  onClick={() => setColorPickerVisible(!colorPickerVisible)}
                  title="\u9009\u62E9\u989C\u8272"
                />
                {colorPickerVisible && (
                  <div style={styles.colorPicker}>
                    {COLOR_PALETTE.map(color => (
                      <div
                        key={color}
                        style={{
                          ...styles.colorOption,
                          backgroundColor: color,
                          ...(penColor === color ? styles.colorOptionActive : {})
                        }}
                        onClick={() => {
                          setPenColor(color);
                          setColorPickerVisible(false);
                        }}
                      />
                    ))}
                    <div style={styles.colorOptionRow}>
                      <input
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        style={styles.colorInput}
                      />
                    </div>
                  </div>
                  )}

                <div style={styles.widthSelector}>
                  {penWidths.map(width => (
                    <div
                      key={width}
                      style={{
                        ...styles.widthButton,
                        ...(penWidth === width ? styles.widthButtonActive : {})
                      }}
                      onClick={() => setPenWidth(width)}
                      title={`${width}px`}
                    >
                      <div style={{
                        ...styles.widthDot,
                        width: width * 2,
                        height: width * 2
                      }} />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={styles.divider} />

            <div
              className="tool-btn"
              style={styles.toolButton}
              onClick={handleManualSave}
              title="\u624B\u52A8\u4FDD\u5B58\u5FEB\u7167"
            >
              <SaveIcon />
            </div>

            <div
              className={`tool-btn ${showHistoryPanel ? 'tool-btn-active' : ''}`}
              style={styles.toolButton}
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              title="\u5386\u53F2\u7248\u672C"
            >
              <HistoryIcon />
            </div>

            <div style={{ flex: 1 }} />

            <div style={styles.toolStatusLabel}>
              {getToolStatusText()}
            </div>
          </>
        )}
      </div>

      <canvas
        ref={canvasRef}
        style={styles.canvas}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {showHistoryPanel && (
        <div style={styles.historyPanel}>
          <div style={styles.historyHeader}>
            <h3 style={styles.historyTitle}>{"\u5386\u53F2\u7248\u672C"}</h3>
            <button
              style={styles.refreshButton}
              onClick={handleRefreshSnapshots}
            >
              {"\u5237\u65B0"}
            </button>
          </div>
          <div style={styles.historyList}>
            {snapshots.length === 0 ? (
              <div style={styles.emptyHistory}>
                {"\u6682\u65E0\u5386\u53F2\u5FEB\u7167"}
              </div>
            ) : (
              snapshots.map((snapshot, index) => (
                <div
                  key={snapshot.id}
                  style={{
                    ...styles.historyItem,
                    ...(historyServiceRef.current?.getCurrentSnapshotIndex() === index ? styles.historyItemActive : {})
                  }}
                  onClick={() => handleRestoreSnapshot(snapshot.id)}
                >
                  {snapshot.thumbnail && (
                    <img
                      src={snapshot.thumbnail}
                      alt="thumbnail"
                      style={styles.thumbnail}
                    />
                  )}
                  <div style={styles.historyInfo}>
                    <div style={styles.historyTime}>
                      {formatTimestamp(snapshot.timestamp)}
                    </div>
                    <div style={styles.historyCount}>
                      {snapshot.elements.length} {"\u4E2A\u5143\u7D20"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isHistoryMode && (
        <div style={styles.historyOverlay} onClick={handleExitHistoryMode}>
          <div style={styles.historyOverlayContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.overlayTitle}>{"\u5386\u53F2\u89C6\u56FE\u6A21\u5F0F"}</h3>
            <p style={styles.overlayText}>{"\u5F53\u524D\u6B63\u5728\u67E5\u770B\u5386\u53F2\u7248\u672C\uFF0C\u70B9\u51FB\u4EFB\u610F\u4F4D\u7F6E\u9000\u51FA"}</p>
            <button style={styles.exitButton} onClick={handleExitHistoryMode}>
              {"\u9000\u51FA\u5386\u53F2\u89C6\u56FE"}
            </button>
          </div>
        </div>
      )}

      <div style={styles.statusBar}>
        <div style={styles.roomInfo}>
          <span style={styles.roomLabel}>{"\u623F\u95F4:"}</span>
          <span style={styles.roomId}>{roomId}</span>
        </div>
        <div style={styles.connectionStatus}>
          <div style={{
            ...styles.statusDot,
            backgroundColor: isConnected ? '#4caf50' : '#f44336'
          }} />
          <span style={styles.statusText}>
            {isConnected ? '\u5DF2\u8FDE\u63A5' : '\u672A\u8FDE\u63A5'}
          </span>
        </div>
        <div style={styles.userInfoBar}>
          <div style={{
            ...styles.userColorDot,
            backgroundColor: userInfo.color
          }} />
          <span style={styles.userName}>{userInfo.name}</span>
        </div>
        {onlineUsers.length > 0 && (
          <div style={styles.onlineUsers}>
            <span style={styles.onlineLabel}>{"\u5728\u7EBF:"}</span>
            {onlineUsers.map(user => (
              <div
                key={user.id}
                style={{
                  ...styles.userAvatar,
                  backgroundColor: user.color
                }}
                title={user.name}
              >
                {user.name.charAt(0)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.helpTip}>
        <span>{"\uD83D\uDCA1 \u6309\u4F4F Alt + \u9F20\u6807\u5DE6\u952E \u6216 \u9F20\u6807\u4E2D\u952E \u53EF\u4EE5\u5E73\u79FB\u753B\u5E03 | \u6EDA\u8F6E\u7F29\u653E (0.1x - 5x)"}</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a'
  },
  toolbar: {
    position: 'absolute',
    left: '20px',
    top: '30vh',
    transform: 'translateY(-50%)',
    backgroundColor: '#2d2d2d',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 100,
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  toolbarExpanded: {
    width: '48px',
    padding: '8px 0',
    minHeight: '300px'
  },
  toolbarCollapsed: {
    width: '12px',
    height: '80px',
    padding: '0',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  collapsedHandle: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8
  },
  toolButton: {
    position: 'relative',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent'
  },
  toolIndicator: {
    position: 'absolute',
    left: '-8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '24px',
    backgroundColor: '#4fc3f7',
    borderRadius: '0 3px 3px 0',
    transition: 'opacity 0.2s ease',
    opacity: 0
  },
  divider: {
    width: '32px',
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '4px 0'
  },
  colorButton: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    border: '2px solid rgba(255,255,255,0.3)',
    transition: 'all 0.2s ease'
  },
  colorPicker: {
    position: 'absolute',
    left: '60px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
    padding: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 200
  },
  colorOption: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease'
  },
  colorOptionActive: {
    borderColor: '#4fc3f7',
    transform: 'scale(1.1)'
  },
  colorOptionRow: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '4px'
  },
  colorInput: {
    width: '100%',
    height: '24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  widthSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '4px 0'
  },
  widthButton: {
    width: '32px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  widthButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  widthDot: {
    borderRadius: '50%',
    backgroundColor: '#ffffff'
  },
  toolStatusLabel: {
    fontSize: '12px',
    color: '#999999',
    marginTop: '4px',
    marginBottom: '8px',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'crosshair'
  },
  historyPanel: {
    position: 'absolute',
    right: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '280px',
    maxHeight: '70vh',
    backgroundColor: '#2d2d2d',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflow: 'hidden'
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  historyTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600
  },
  refreshButton: {
    padding: '4px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s ease'
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px'
  },
  emptyHistory: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    padding: '40px 20px',
    fontSize: '14px'
  },
  historyItem: {
    display: 'flex',
    gap: '12px',
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'background-color 0.2s ease',
    border: '2px solid transparent'
  },
  historyItemActive: {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    borderColor: '#4fc3f7'
  },
  thumbnail: {
    width: '60px',
    height: '60px',
    objectFit: 'cover',
    borderRadius: '4px',
    backgroundColor: '#f5f5f5'
  },
  historyInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  historyTime: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    marginBottom: '4px'
  },
  historyCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px'
  },
  historyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    cursor: 'pointer'
  },
  historyOverlayContent: {
    backgroundColor: '#2d2d2d',
    padding: '32px 48px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    cursor: 'default'
  },
  overlayTitle: {
    margin: '0 0 12px 0',
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 600
  },
  overlayText: {
    margin: '0 0 24px 0',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px'
  },
  exitButton: {
    padding: '10px 32px',
    backgroundColor: '#4fc3f7',
    color: '#1a1a1a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statusBar: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '8px 20px',
    backgroundColor: 'rgba(45, 45, 45, 0.9)',
    borderRadius: '20px',
    zIndex: 100
  },
  roomInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  roomLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px'
  },
  roomId: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 500
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  statusText: {
    color: '#ffffff',
    fontSize: '12px'
  },
  userInfoBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  userColorDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  userName: {
    color: '#ffffff',
    fontSize: '12px'
  },
  onlineUsers: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  onlineLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '12px'
  },
  userAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 600
  },
  helpTip: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '6px 16px',
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: '16px',
    zIndex: 100
  }
};

export default App;
