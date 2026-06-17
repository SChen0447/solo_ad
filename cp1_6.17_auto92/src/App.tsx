import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HexCoord, PlacedUnit, Formation, DeploymentState, COLORS } from './types';
import { FORMATIONS, getFormationById } from './data';
import { calculateFormationPositions, hexEquals, isAdjacent } from './hexGrid';
import HexRenderer from './hexRenderer';
import DeploymentPanel from './deploymentPanel';

const ANIMATION_DURATION_ENTER = 400;
const ANIMATION_DURATION_EXIT = 300;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const App: React.FC = () => {
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(null);
  const [placedUnits, setPlacedUnits] = useState<PlacedUnit[]>([]);
  const [history, setHistory] = useState<DeploymentState[]>([]);
  const [previewCenter, setPreviewCenter] = useState<HexCoord | null>(null);
  const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);
  const [draggingUnit, setDraggingUnit] = useState<PlacedUnit | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOriginalPosition, setDragOriginalPosition] = useState<HexCoord | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const saveToHistory = useCallback((units: PlacedUnit[]) => {
    const snapshot: DeploymentState = {
      placedUnits: units.map(u => ({ ...u, animationState: 'idle' as const })),
      timestamp: Date.now()
    };
    setHistory(prev => [...prev.slice(-9), snapshot]);
  }, []);

  const handleSelectFormation = useCallback((id: string) => {
    setSelectedFormationId(prev => prev === id ? null : id);
    setPreviewCenter(null);
  }, []);

  const handleHexHover = useCallback((hex: HexCoord | null) => {
    if (selectedFormationId && !draggingUnit) {
      setPreviewCenter(hex);
    }
  }, [selectedFormationId, draggingUnit]);

  const handleHexClick = useCallback((hex: HexCoord) => {
    setSelectedHex(hex);

    if (!selectedFormationId) return;

    const formation = getFormationById(selectedFormationId);
    if (!formation) return;

    const formationPositions = calculateFormationPositions(formation, hex);
    if (formationPositions.length === 0) return;

    saveToHistory(placedUnits);

    setPlacedUnits(prev => {
      const now = Date.now();
      const exitingUnits = prev
        .filter(u => u.animationState !== 'exiting')
        .map(u => ({
          ...u,
          animationState: 'exiting' as const,
          animationStart: now
        }));

      setTimeout(() => {
        setPlacedUnits(current => current.filter(u => u.animationState !== 'exiting'));
      }, ANIMATION_DURATION_EXIT);

      const newUnits = formationPositions.map((pos, index) => ({
        instanceId: generateId(),
        unit: pos.unit,
        position: pos.position,
        animationState: 'entering' as const,
        animationStart: now + index * 30
      }));

      setTimeout(() => {
        setPlacedUnits(current =>
          current.map(u =>
            u.animationState === 'entering'
              ? { ...u, animationState: 'idle' as const }
              : u
          )
        );
      }, ANIMATION_DURATION_ENTER + formationPositions.length * 30);

      return [...exitingUnits, ...newUnits];
    });
  }, [selectedFormationId, placedUnits, saveToHistory]);

  const handleUnitDragStart = useCallback((unit: PlacedUnit, position: { x: number; y: number }) => {
    setDraggingUnit(unit);
    setDragPosition(position);
    setDragOriginalPosition(unit.position);
    setPlacedUnits(prev =>
      prev.map(u =>
        u.instanceId === unit.instanceId
          ? { ...u, animationState: 'dragging' as const }
          : u
      )
    );
  }, []);

  const handleUnitDragMove = useCallback((position: { x: number; y: number }) => {
    setDragPosition(position);
  }, []);

  const handleUnitDragEnd = useCallback((targetHex: HexCoord | null) => {
    if (!draggingUnit || !dragOriginalPosition) return;

    if (targetHex && isAdjacent(dragOriginalPosition, targetHex)) {
      const isOccupied = placedUnits.some(
        u => u.instanceId !== draggingUnit.instanceId &&
             hexEquals(u.position, targetHex) &&
             u.animationState !== 'exiting'
      );

      if (!isOccupied) {
        saveToHistory(placedUnits);
        setPlacedUnits(prev =>
          prev.map(u =>
            u.instanceId === draggingUnit.instanceId
              ? { ...u, position: targetHex, animationState: 'idle' as const }
              : u
          )
        );
        setDraggingUnit(null);
        setDragPosition(null);
        setDragOriginalPosition(null);
        return;
      }
    }

    setPlacedUnits(prev =>
      prev.map(u =>
        u.instanceId === draggingUnit.instanceId
          ? { ...u, animationState: 'idle' as const }
          : u
      )
    );
    setDraggingUnit(null);
    setDragPosition(null);
    setDragOriginalPosition(null);
  }, [draggingUnit, dragOriginalPosition, placedUnits, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const prevState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    const now = Date.now();
    setPlacedUnits(prev => {
      const exitingUnits = prev
        .filter(u => u.animationState !== 'exiting')
        .map(u => ({
          ...u,
          animationState: 'exiting' as const,
          animationStart: now
        }));

      setTimeout(() => {
        setPlacedUnits(current => current.filter(u => u.animationState !== 'exiting'));
      }, ANIMATION_DURATION_EXIT);

      const restoredUnits = prevState.placedUnits.map((u, index) => ({
        ...u,
        animationState: 'entering' as const,
        animationStart: now + index * 30
      }));

      setTimeout(() => {
        setPlacedUnits(current =>
          current.map(u =>
            u.animationState === 'entering'
              ? { ...u, animationState: 'idle' as const }
              : u
          )
        );
      }, ANIMATION_DURATION_ENTER + restoredUnits.length * 30);

      return [...exitingUnits, ...restoredUnits];
    });
  }, [history]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener