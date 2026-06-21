import React, { useState, useEffect, useRef } from 'react';
import { ComponentType, Framework, VariableOverride } from '../types';
import { renderComponent, getFrameworkName } from '../utils/componentRenderer';

interface PreviewPanelProps {
  componentType: ComponentType;
  variableOverrides: Record<Framework, VariableOverride>;
  selectedFramework: Framework;
}

const frameworks: Framework[] = [Framework.BOOTSTRAP, Framework.TAILWIND, Framework.BULMA];

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  componentType,
  variableOverrides,
  selectedFramework
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<Framework>(Framework.BOOTSTRAP);
  const [isResetting, setIsResetting] = useState<Framework | null>(null);
  const iframeRefs = useRef<Record<Framework, HTMLIFrameElement | null>>({
    [Framework.BOOTSTRAP]: null,
    [Framework.TAILWIND]: null,
    [Framework.BULMA]: null
  });

  const prevComponentType = useRef(componentType);
  const prevSelectedFramework = useRef(selectedFramework);

  useEffect(() => {
    if (prevComponentType.current !== componentType) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      prevComponentType.current = componentType;
      return () => clearTimeout(timer);
    }
  }, [componentType]);

  useEffect(() => {
    if (prevSelectedFramework.current !== selectedFramework) {
      setIsResetting(selectedFramework);
      const timer = setTimeout(() => {
        setIsResetting(null);
      }, 500);
      prevSelectedFramework.current = selectedFramework;
      return () => clearTimeout(timer);
    }
  }, [selectedFramework]);

  useEffect(() => {
    frameworks.forEach((framework) => {
      const iframe = iframeRefs.current[framework];
      if (iframe) {
        const html = renderComponent(componentType, framework, variableOverrides[framework]);
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
        }
      }
    });
  }, [componentType, variableOverrides]);

  const setIframeRef = (framework: Framework) => (el: HTMLIFrameElement | null) => {
    iframeRefs.current[framework] = el;
    if (el) {
      const html = renderComponent(componentType, framework, variableOverrides[framework]);
      const doc = el.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  };

  return (
    <section className="preview-panel">
      <div className="preview-panel__tabs">
        {frameworks.map((framework) => (
          <button
            key={framework}
            className={`preview-panel__tab ${activeTab === framework ? 'is-active' : ''}`}
            onClick={() => setActiveTab(framework)}
          >
            {getFrameworkName(framework)}
          </button>
        ))}
      </div>

      <div className={`preview-panel__columns ${isAnimating ? 'is-fading' : ''}`}>
        {frameworks.map((framework) => (
          <div
            key={framework}
            className={`preview-panel__column ${
              activeTab === framework ? 'is-visible' : ''
            } ${isResetting === framework ? 'is-resetting' : ''}`}
          >
            <div className="preview-panel__column-header">
              <span className="preview-panel__framework-name">
                {getFrameworkName(framework)}
              </span>
            </div>
            <div className="preview-panel__card">
              <div className="preview-panel__card-inner">
                <iframe
                  ref={setIframeRef(framework)}
                  className="preview-panel__iframe"
                  title={`${getFrameworkName(framework)} preview`}
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PreviewPanel;
