import React, { useEffect, useRef, useCallback } from 'react';
import { EarthRenderer, MarkerData } from './EarthRenderer';

interface EarthComponentProps {
  earthquakeData: MarkerData[];
  onRendererReady?: (renderer: EarthRenderer) => void;
  children?: React.ReactNode;
}

export const EarthComponent: React.FC<EarthComponentProps> = ({
  earthquakeData,
  onRendererReady,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<EarthRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new EarthRenderer(containerRef.current);
    rendererRef.current = renderer;

    if (onRendererReady) {
      onRendererReady(renderer);
    }

    renderer.start();

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [onRendererReady]);

  const addMarker = useCallback((markerData: MarkerData, markerObject: THREE.Object3D) => {
    if (rendererRef.current) {
      rendererRef.current.addMarker(markerData, markerObject);
    }
  }, []);

  const removeMarker = useCallback((markerId: string) => {
    if (rendererRef.current) {
      rendererRef.current.removeMarker(markerId);
    }
  }, []);

  const getRenderer = useCallback(() => {
    return rendererRef.current;
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      earthquakeData.forEach(data => {
        const existing = rendererRef.current?.getMarker(data.id);
        if (!existing) {
          console.warn(`Marker ${data.id} not added via EarthComponent - use visualizer instead`);
        }
      });
    }
  }, [earthquakeData]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {children && React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            addMarker,
            removeMarker,
            getRenderer
          });
        }
        return child;
      })}
    </div>
  );
};

declare global {
  namespace THREE {
    class Object3D {
      userData: any;
    }
  }
}
