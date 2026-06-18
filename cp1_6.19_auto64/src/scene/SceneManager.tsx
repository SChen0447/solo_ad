import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSandboxStore } from '../store';
import { SunShadowSystem } from '../analysis/SunShadow';
import {
  checkLineOfSight,
  getOccluderPoints,
  snapToGrid,
  isPositionInBounds,
  checkOverlap,
} from '../analysis/LineOfSight';
import {
  AnimatedElement,
  ElementRenderer,
  GridHelper,
  AxesHelper,
  GroundPlane,
  LineOfSightVisualization,
} from './Elements';
import type { ElementType, SceneElement } from '../types';

interface SceneContentProps {
  onCanvasClick: (point: { x: number; y: number; z: number }) => void;
  onMouseMove: (point: { x: number; y: number; z: number } | null) => void;
}

const SceneContent: React.FC<SceneContentProps> = ({
  onCanvasClick,
  onMouseMove,
}) => {
  const { camera, gl, raycaster, mouse } = useThree();
  const groundRef = useRef<THREE.Mesh>(null);
  const elements = useSandboxStore((state) => state.elements);
  const selectedElementId = useSandboxStore((state) => state.selectedElementId);
  const selectElement = useSandboxStore((state) => state.selectElement);
  const toolMode = useSandboxStore((state) => state.toolMode);
  const placingElementType = useSandboxStore(
    (state) => state.placingElementType
  );
  const placingHeight = useSandboxStore((state) => state.placingHeight);
  const addElement = useSandboxStore((state) => state.addElement);
  const previewPosition = useSandboxStore((state) => state.previewPosition);
  const isPreviewValid = useSandboxStore((state) => state.isPreviewValid);
  const setPreviewPosition = useSandboxStore(
    (state) => state.setPreviewPosition
  );
  const lineOfSightStart = useSandboxStore(
    (state) => state.lineOfSightStart
  );
  const lineOfSightResult = useSandboxStore(
    (state) => state.lineOfSightResult
  );
  const setLineOfSightStart = useSandboxStore(
    (state) => state.setLineOfSightStart
  );
  const setLineOfSightResult = useSandboxStore(
    (state) => state.setLineOfSightResult
  );
  const isDragging = useSandboxStore((state) => state.isDragging);
  const setIsDragging = useSandboxStore((state) => state.setIsDragging);
  const updateElement = useSandboxStore((state) => state.updateElement);
  const shiftPressed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftPressed.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        shiftPressed.current = false;
        setIsDragging(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setIsDragging]);

  const getGroundIntersection = useCallback((): {
    x: number;
    y: number;
    z: number;
  } | null => {
    if (!groundRef.current) return null;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(groundRef.current);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      return { x: point.x, y: 0, z: point.z };
    }
    return null;
  }, [camera, mouse, raycaster]);

  const getElementIntersection = useCallback((): {
    element: SceneElement;
    point: { x: number; y: number; z: number };
  } | null => {
    raycaster.setFromCamera(mouse, camera);
    for (const element of elements) {
      const halfSize = 0.25;
      const box = new THREE.Box3(
        new THREE.Vector3(
          element.position.x - halfSize,
          element.position.y,
          element.position.z - halfSize
        ),
        new THREE.Vector3(
          element.position.x + halfSize,
          element.position.y + element.height,
          element.position.z + halfSize
        )
      );
      const intersectPoint = new THREE.Vector3();
      if (raycaster.ray.intersectBox(box, intersectPoint)) {
        return {
          element,
          point: {
            x: intersectPoint.x,
            y: intersectPoint.y,
            z: intersectPoint.z,
          },
        };
      }
    }
    return null;
  }, [camera, elements, mouse, raycaster]);

  const handlePointerMove = useCallback(() => {
    if (toolMode === 'place' && placingElementType) {
      const groundPoint = getGroundIntersection();
      if (groundPoint) {
        const snapped = snapToGrid(groundPoint);
        const inBounds = isPositionInBounds(snapped);
        const overlap = checkOverlap(snapped, elements);
        setPreviewPosition(
          { x: snapped.x, y: 0, z: snapped.z },
          inBounds && !overlap
        );
        onMouseMove(snapped);
      } else {
        setPreviewPosition(null, false);
        onMouseMove(null);
      }
    } else if (toolMode === 'select' && shiftPressed.current && isDragging && selectedElementId) {
      const groundPoint = getGroundIntersection();
      if (groundPoint) {
        const snapped = snapToGrid(groundPoint);
        const inBounds = isPositionInBounds(snapped);
        const overlap = checkOverlap(snapped, elements, selectedElementId);
        if (inBounds && !overlap) {
          updateElement(selectedElementId, {
            position: { x: snapped.x, y: 0, z: snapped.z },
          });
        }
      }
    } else if (toolMode === 'lineOfSight') {
      const elementHit = getElementIntersection();
      const groundPoint = getGroundIntersection();
      if (elementHit) {
        const topPoint = {
          x: elementHit.point.x,
          y: elementHit.element.position.y + elementHit.element.height,
          z: elementHit.point.z,
        };
        onMouseMove(topPoint);
      } else if (groundPoint) {
        onMouseMove(groundPoint);
      } else {
        onMouseMove(null);
      }
    }
  }, [
    toolMode,
    placingElementType,
    getGroundIntersection,
    getElementIntersection,
    elements,
    setPreviewPosition,
    onMouseMove,
    isDragging,
    selectedElementId,
    updateElement,
  ]);

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      
      if (toolMode === 'place' && placingElementType && previewPosition && isPreviewValid) {
        addElement({
          type: placingElementType,
          position: {
            x: previewPosition.x,
            y: previewPosition.y,
            z: previewPosition.z,
          },
          height: placingHeight,
        });
        onCanvasClick(previewPosition);
        return;
      }

      if (toolMode === 'select') {
        if (shiftPressed.current && selectedElementId) {
          setIsDragging(true);
          return;
        }

        const elementHit = getElementIntersection();
        if (elementHit) {
          selectElement(elementHit.element.id);
        } else {
          selectElement(null);
        }
        return;
      }

      if (toolMode === 'lineOfSight') {
        const elementHit = getElementIntersection();
        const groundPoint = getGroundIntersection();

        let clickPoint: { x: number; y: number; z: number } | null = null;

        if (elementHit) {
          clickPoint = {
            x: elementHit.point.x,
            y: elementHit.element.position.y + elementHit.element.height,
            z: elementHit.point.z,
          };
        } else if (groundPoint) {
          clickPoint = groundPoint;
        }

        if (clickPoint) {
          if (!lineOfSightStart) {
            setLineOfSightStart(clickPoint);
          } else {
            const result = checkLineOfSight(
              lineOfSightStart,
              clickPoint,
              elements
            );
            setLineOfSightResult(result);
            setLineOfSightStart(null);
          }
          onCanvasClick(clickPoint);
        }
      }
    },
    [
      toolMode,
      placingElementType,
      previewPosition,
      isPreviewValid,
      addElement,
      placingHeight,
      onCanvasClick,
      getElementIntersection,
      getGroundIntersection,
      selectElement,
      lineOfSightStart,
      setLineOfSightStart,
      setLineOfSightResult,
      elements,
      setIsDragging,
      selectedElementId,
    ]
  );

  useFrame(() => {
    handlePointerMove();
  });

  const occluderPoints = lineOfSightResult
    ? getOccluderPoints(
        lineOfSightResult.startPoint,
        lineOfSightResult.endPoint,
        elements
      )
    : [];

  return (
    <>
      <SunShadowSystem />

      <group onClick={handleClick}>
        <GroundPlane />
        <mesh
          ref={groundRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.002, 0]}
          visible={false}
        >
          <planeGeometry args={[10, 10]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      <GridHelper />
      <AxesHelper />

      {elements.map((element) => (
        <AnimatedElement
          key={element.id}
          type={element.type}
          targetHeight={element.height}
          props={{
            position: [element.position.x, element.position.y, element.position.z],
            height: element.height,
            color: element.color,
            isSelected: selectedElementId === element.id,
            isPreview: false,
            isValid: true,
          }}
        />
      ))}

      {previewPosition && placingElementType && (
        <ElementRenderer
          type={placingElementType}
          props={{
            position: [previewPosition.x, previewPosition.y, previewPosition.z],
            height: placingHeight,
            isSelected: false,
            isPreview: true,
            isValid: isPreviewValid,
          }}
        />
      )}

      {lineOfSightStart && (
        <mesh position={[lineOfSightStart.x, lineOfSightStart.y, lineOfSightStart.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#4a9eff" />
        </mesh>
      )}

      {lineOfSightResult && (
        <LineOfSightVisualization
          startPoint={lineOfSightResult.startPoint}
          endPoint={lineOfSightResult.endPoint}
          occluderPoints={occluderPoints}
        />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={30}
        target={[0, 0, 0]}
        enablePan={true}
        panSpeed={1}
        rotateSpeed={0.3}
        zoomSpeed={0.8}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        enabled={!isDragging}
      />
    </>
  );
};

interface SceneManagerProps {
  onCanvasClick?: (point: { x: number; y: number; z: number }) => void;
  onMouseMove?: (point: { x: number; y: number; z: number } | null) => void;
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  onCanvasClick = () => {},
  onMouseMove = () => {},
}) => {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 8, 10], fov: 50 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent onCanvasClick={onCanvasClick} onMouseMove={onMouseMove} />
    </Canvas>
  );
};
