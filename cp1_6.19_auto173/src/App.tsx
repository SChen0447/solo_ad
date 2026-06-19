import { useState, useEffect, useRef, useCallback } from 'react';
import { Parser, type Furniture } from './Parser';
import { LayoutManager } from './LayoutManager';
import { SceneManager } from './SceneManager';
import TextInputPanel from './components/TextInputPanel';
import ControlBar from './components/ControlBar';
import './App.css';

const App = () => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const layoutManagerRef = useRef<LayoutManager | null>(null);
  const parserRef = useRef<Parser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [furnitureList, setFurnitureList] = useState<Furniture[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    id: string | null;
    x: number;
    y: number;
  }>({
    visible: false,
    id: null,
    x: 0,
    y: 0,
  });
  const [notification, setNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });
  const [isParsing, setIsParsing] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ visible: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 2500);
  }, []);

  useEffect(() => {
    if (!sceneContainerRef.current) return;

    parserRef.current = new Parser();
    layoutManagerRef.current = new LayoutManager();

    const sceneManager = new SceneManager(sceneContainerRef.current, {
      onFurnitureSelect: (id) => {
        setSelectedId(id);
        setContextMenu(prev => ({ ...prev, visible: false }));
      },
      onFurnitureMove: (id, position) => {
        if (layoutManagerRef.current) {
          layoutManagerRef.current.moveFurniture(id, position);
        }
      },
      onContextMenu: (id, screenX, screenY) => {
        setContextMenu({
          visible: true,
          id,
          x: screenX,
          y: screenY,
        });
      },
    });
    sceneManagerRef.current = sceneManager;

    const unsubscribe = layoutManagerRef.current.subscribe((furniture) => {
      setFurnitureList([...furniture]);
    });

    return () => {
      unsubscribe();
      sceneManager.dispose();
    };
  }, []);

  const handleSubmit = useCallback((text: string) => {
    if (!parserRef.current || !layoutManagerRef.current || !sceneManagerRef.current) return;

    setIsParsing(true);
    
    setTimeout(() => {
      try {
        const furniture = parserRef.current!.parse(text);
        
        if (furniture.length === 0) {
          showNotification('未能识别任何家具，请尝试使用更明确的描述', 'error');
          setIsParsing(false);
          return;
        }

        sceneManagerRef.current!.clearAll();
        layoutManagerRef.current!.clearAll();

        furniture.forEach((item, index) => {
          setTimeout(() => {
            layoutManagerRef.current!.addFurniture(item.type, item.position, item.size);
            sceneManagerRef.current!.addFurniture(item);
          }, index * 80);
        });

        showNotification(`成功生成 ${furniture.length} 件家具`, 'success');
      } catch (e) {
        showNotification('解析失败，请重试', 'error');
      } finally {
        setIsParsing(false);
      }
    }, 100);
  }, [showNotification]);

  const handleClearAll = useCallback(() => {
    if (!sceneManagerRef.current || !layoutManagerRef.current) return;
    
    sceneManagerRef.current.clearAll();
    layoutManagerRef.current.clearAll();
    setSelectedId(null);
    showNotification('已清空全部家具', 'info');
  }, [showNotification]);

  const handleSaveLayout = useCallback(() => {
    if (!layoutManagerRef.current) return;
    
    try {
      layoutManagerRef.current.downloadLayout('layout.json');
      showNotification('布局已保存', 'success');
    } catch (e) {
      showNotification('保存失败', 'error');
    }
  }, [showNotification]);

  const handleImportLayout = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !layoutManagerRef.current || !sceneManagerRef.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        layoutManagerRef.current!.importFromJson(content);
        
        const furniture = layoutManagerRef.current!.getFurniture();
        sceneManagerRef.current!.clearAll();
        
        furniture.forEach((item, index) => {
          setTimeout(() => {
            sceneManagerRef.current!.addFurniture(item);
          }, index * 50);
        });

        showNotification(`成功导入 ${furniture.length} 件家具`, 'success');
      } catch (err) {
        showNotification('导入失败：文件格式不正确', 'error');
      }
    };
    reader.readAsText(file);

    event.target.value = '';
  }, [showNotification]);

  const handleDeleteFurniture = useCallback(() => {
    if (!contextMenu.id || !sceneManagerRef.current || !layoutManagerRef.current) return;

    sceneManagerRef.current.removeFurniture(contextMenu.id);
    layoutManagerRef.current.removeFurniture(contextMenu.id);
    setContextMenu(prev => ({ ...prev, visible: false, id: null }));
    setSelectedId(null);
    showNotification('已删除家具', 'info');
  }, [contextMenu.id, showNotification]);

  const handleDuplicateFurniture = useCallback(() => {
    if (!contextMenu.id || !sceneManagerRef.current || !layoutManagerRef.current) return;

    const newFurniture = layoutManagerRef.current.duplicateFurniture(contextMenu.id);
    if (newFurniture) {
      sceneManagerRef.current.addFurniture(newFurniture);
      showNotification('已复制家具', 'success');
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [contextMenu.id, showNotification]);

  const handleSceneClick = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="app-container" onClick={handleSceneClick}>
      <div className="left-panel">
        <div className="panel-header">
          <h1 className="app-title">3D场景布局生成器</h1>
          <p className="app-subtitle">用自然语言描述，一键生成3D家具布局</p>
        </div>
        
        <TextInputPanel onSubmit={handleSubmit} isLoading={isParsing} />
        
        <div className="furniture-count">
          当前家具数量: <span className="count">{furnitureList.length}</span>
        </div>

        <div className="tips-section">
          <h3 className="tips-title">使用提示</h3>
          <ul className="tips-list">
            <li>输入中文描述，如"一个客厅，中央是L型灰色沙发"</li>
            <li>支持家具：沙发、茶几、书架、台灯</li>
            <li>拖拽家具可移动位置</li>
            <li>右键点击家具可删除或复制</li>
            <li>鼠标滚轮缩放，左键旋转，右键平移</li>
          </ul>
        </div>
      </div>

      <div className="right-panel">
        <ControlBar
          onClear={handleClearAll}
          onSave={handleSaveLayout}
          onImport={handleImportLayout}
        />
        
        <div 
          ref={sceneContainerRef} 
          className="scene-container"
          onClick={handleSceneClick}
        />

        {notification.visible && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        {contextMenu.visible && (
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="context-menu-item" onClick={handleDuplicateFurniture}>
              📋 复制
            </button>
            <button className="context-menu-item danger" onClick={handleDeleteFurniture}>
              🗑️ 删除
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default App;
