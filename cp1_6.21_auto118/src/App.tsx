import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { componentConfigs, componentList } from './components';
import { ComponentDisplay } from './ComponentDisplay';
import { CodeEditor } from './CodeEditor';
import VersionTimeline, { VersionSnapshot } from './VersionTimeline';
import { Square, Type, SlidersHorizontal, MoreHorizontal, RectangleHorizontal } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'square': <Square size={18} />,
  'type': <Type size={18} />,
  'sliders-horizontal': <SlidersHorizontal size={18} />,
  'more-horizontal': <MoreHorizontal size={18} />,
  'rectangle-horizontal': <RectangleHorizontal size={18} />,
};

const MAX_SNAPSHOTS = 10;

const App: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<string>('button');
  const [currentProps, setCurrentProps] = useState<Record<string, any>>({});
  const [currentCode, setCurrentCode] = useState<string>('');
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [isNavAnimating, setIsNavAnimating] = useState(false);
  const [isVersionAnimating, setIsVersionAnimating] = useState(false);
  const [, setVersionCounter] = useState<number>(1);

  const config = useMemo(() => componentConfigs[selectedComponent], [selectedComponent]);

  useEffect(() => {
    if (config) {
      const initialProps = { ...config.defaultProps };
      const initialCode = config.generateCode(initialProps);
      
      setCurrentProps(initialProps);
      setCurrentCode(initialCode);
      
      const initialSnapshot: VersionSnapshot = {
        id: uuidv4(),
        version: 1,
        props: initialProps,
        code: initialCode,
        timestamp: new Date(),
      };
      
      setSnapshots([initialSnapshot]);
      setCurrentVersion(1);
      setVersionCounter(1);
    }
  }, [selectedComponent, config]);

  const handleNavClick = useCallback((componentName: string) => {
    if (componentName === selectedComponent) return;
    
    setIsNavAnimating(true);
    setTimeout(() => {
      setSelectedComponent(componentName);
      setTimeout(() => {
        setIsNavAnimating(false);
      }, 50);
    }, 200);
  }, [selectedComponent]);

  const handlePropsChange = useCallback((newProps: Record<string, any>, newCode: string) => {
    const mergedProps = { ...currentProps, ...newProps };
    setCurrentProps(mergedProps);
    setCurrentCode(newCode);

    setVersionCounter(prev => {
      const newVersionNum = prev + 1;
      
      const newSnapshot: VersionSnapshot = {
        id: uuidv4(),
        version: newVersionNum,
        props: mergedProps,
        code: newCode,
        timestamp: new Date(),
      };

      setSnapshots(prevSnapshots => {
        const updated = [...prevSnapshots, newSnapshot];
        if (updated.length > MAX_SNAPSHOTS) {
          return updated.slice(updated.length - MAX_SNAPSHOTS);
        }
        return updated;
      });
      
      setCurrentVersion(newVersionNum);
      return newVersionNum;
    });
  }, [currentProps]);

  const handleVersionChange = useCallback((snapshot: VersionSnapshot) => {
    setIsVersionAnimating(true);
    setTimeout(() => {
      setCurrentProps(snapshot.props);
      setCurrentCode(snapshot.code);
      setCurrentVersion(snapshot.version);
      setTimeout(() => {
        setIsVersionAnimating(false);
      }, 50);
    }, 150);
  }, []);

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">组件库</h1>
          <p className="sidebar-subtitle">Component Library</p>
        </div>
        <ul className="nav-list">
          {componentList.map((component) => (
          <li
            key={component.name}
            className={`nav-item ${selectedComponent === component.name ? 'active' : ''}`}
            onClick={() => handleNavClick(component.name)}
          >
            <span className="nav-indicator" />
            <span className="nav-icon">
              {iconMap[component.icon]}
            </span>
            <span className="nav-text">{component.displayName}</span>
          </li>
        ))}
        </ul>
      </nav>

      <main className="main-content">
        <div className="content-wrapper">
          <div className={`display-area ${isNavAnimating || isVersionAnimating ? 'fade-transition' : ''}`}>
            <ComponentDisplay
              componentName={selectedComponent}
              props={currentProps}
              code={currentCode}
              isAnimating={isNavAnimating || isVersionAnimating}
            />
          </div>

          <div className="editor-area">
            <CodeEditor
              code={currentCode}
              props={currentProps}
              onChange={handlePropsChange}
              debounceMs={500}
            />
          </div>
        </div>

        <footer className="timeline-area">
          <VersionTimeline
            snapshots={snapshots}
            currentVersion={currentVersion}
            onVersionChange={handleVersionChange}
          />
        </footer>
      </main>
    </div>
  );
};

export default App;
