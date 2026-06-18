import { useCallback } from 'react';
import { useSandboxStore } from '../store';
import { snapToGrid, isPositionInBounds, checkOverlap } from '../analysis/LineOfSight';
import type { ElementType, SceneElement } from '../types';

interface UsePlacementReturn {
  validatePosition: (
    position: { x: number; y: number; z: number },
    ignoreId?: string
  ) => { valid: boolean; reason?: string };
  placeElement: (
    type: ElementType,
    position: { x: number; y: number; z: number },
    height: number
  ) => { success: boolean; element?: SceneElement; reason?: string };
  moveElement: (
    elementId: string,
    newPosition: { x: number; y: number; z: number }
  ) => { success: boolean; reason?: string };
}

export const usePlacement = (): UsePlacementReturn => {
  const elements = useSandboxStore((state) => state.elements);
  const addElement = useSandboxStore((state) => state.addElement);
  const updateElement = useSandboxStore((state) => state.updateElement);

  const validatePosition = useCallback(
    (
      position: { x: number; y: number; z: number },
      ignoreId?: string
    ): { valid: boolean; reason?: string } => {
      const snapped = snapToGrid(position);

      if (!isPositionInBounds(snapped)) {
        return { valid: false, reason: '超出边界' };
      }

      if (checkOverlap(snapped, elements, ignoreId)) {
        return { valid: false, reason: '位置重叠' };
      }

      if (elements.length >= 50) {
        return { valid: false, reason: '元素数量已达上限' };
      }

      return { valid: true };
    },
    [elements]
  );

  const placeElement = useCallback(
    (
      type: ElementType,
      position: { x: number; y: number; z: number },
      height: number
    ): { success: boolean; element?: SceneElement; reason?: string } => {
      const validation = validatePosition(position);
      if (!validation.valid) {
        return { success: false, reason: validation.reason };
      }

      const snapped = snapToGrid(position);
      const newElement = {
        type,
        position: { x: snapped.x, y: snapped.y, z: snapped.z },
        height,
      };

      addElement(newElement);

      const elementList = useSandboxStore.getState().elements;
      const placedElement = elementList[elementList.length - 1];

      return { success: true, element: placedElement };
    },
    [validatePosition, addElement]
  );

  const moveElement = useCallback(
    (
      elementId: string,
      newPosition: { x: number; y: number; z: number }
    ): { success: boolean; reason?: string } => {
      const validation = validatePosition(newPosition, elementId);
      if (!validation.valid) {
        return { success: false, reason: validation.reason };
      }

      const snapped = snapToGrid(newPosition);
      updateElement(elementId, {
        position: { x: snapped.x, y: snapped.y, z: snapped.z },
      });

      return { success: true };
    },
    [validatePosition, updateElement]
  );

  return {
    validatePosition,
    placeElement,
    moveElement,
  };
};

export const getElementTypeName = (type: ElementType): string => {
  const names: Record<ElementType, string> = {
    terrain: '地形格',
    building: '建筑块',
    tree: '树木',
  };
  return names[type];
};

export const getElementColor = (type: ElementType): string => {
  const colors: Record<ElementType, string> = {
    terrain: '#4a7c59',
    building: '#a0a0a0',
    tree: '#2d5a27',
  };
  return colors[type];
};
