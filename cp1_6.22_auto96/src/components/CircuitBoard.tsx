import { useState, useRef, useCallback, useEffect } from 'react';
import { GateIcon } from './GateIcon';
import { useCircuitSimulation } from '../hooks/useCircuitSimulation';
import type { Gate, Switch, Light, Wire, GateType, Position } from '../types';

interface CircuitBoardProps {
  gates: Gate[];
  switches: Switch[];
  lights: Light[];
  wires: Wire[];
  onGatesChange: (gates: Gate[]) => void;
  onSwitchesChange: (switches: Switch[]) => void;
  onWiresChange: (wires: Wire[]) => void;
  selectedGateType: GateType | null;
  onGatePlaced: () => void;
  gridSize: { width: number; height: number };
  cellSize: number;
}

const GATE_WIDTH = 60;
const GATE_HEIGHT = 50;
const PORT_RADIUS = 6;
const SWITCH_SIZE = 30;
const LIGHT_SIZE = 30;

function snapToGrid(value: number, cellSize: number): number {
  return Math.round(value / cellSize) * cellSize;
}

function getGateInputPositions(gate: Gate): Position[] {
  const { x, y } = gate.position;
  const inputCount = gate.type === 'NOT' ? 1 : 2;
  const positions: Position[] = [];

  if (inputCount === 1) {
    positions.push({ x: x - GATE_WIDTH / 2, y });
  } else {
    positions.push({ x: x - GATE_WIDTH / 2, y: y - GATE_HEIGHT / 4 });
    positions.push({ x: x - GATE_WIDTH / 2, y: y + GATE_HEIGHT / 4 });
  }

  return positions;
}

function getGateOutputPosition(gate: Gate): Position {
  const { x, y } = gate.position;
  return { x: x + GATE_WIDTH / 2, y };
}

function getSwitchOutputPosition(sw: Switch): Position {
  const { x, y } = sw.position;
  return { x: x + SWITCH_SIZE / 2, y };
}

function getLightInputPosition(light: Light): Position {
  const { x, y } = light.position;
  return { x: x - LIGHT_SIZE / 2, y };
}

interface PortInfo {
  id: string;
  type: 'input' | 'output';
  position: Position;
}

function createPortId(category: string, parentId: string, type: 'input' | 'output', index = 0): string {
  if (type === 'output') {
    return `${category}_${parentId}_output`;
  }
  return `${category}_${parentId}_input_${index}`;
}

function getWirePath(from: Position, to: Position): string {
  const midX = (from.x + to.x) / 2;
  const radius = 4;

  if (Math.abs(from.y - to.y) < 0.1) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const yDir = from.y < to.y ? 1 : -1;
  const h1 = midX - from.x;
  const vDist = Math.abs(to.y - from.y);
  const h2 = to.x - midX;

  if (Math.abs(h1) < radius || Math.abs(h2) < radius || vDist < 2 * radius) {
    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }

  return `M ${from.x} ${from.y} 
          L ${midX - radius} ${from.y}
          Q ${midX} ${from.y} ${midX} ${from.y + radius * yDir}
          L ${midX} ${to.y - radius * yDir}
          Q ${midX} ${to.y} ${midX + radius} ${to.y}
          L ${to.x} ${to.y}`;
}

export function CircuitBoard({
  gates,
  switches,
  lights,
  wires,
  onGatesChange,
  onSwitchesChange,
  onWiresChange,
  selectedGateType,
  onGatePlaced,
  gridSize,
  cellSize,
}: CircuitBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingGate, setDraggingGate] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [selectedPort, setSelectedPort] = useState<PortInfo | null>(null);
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [isDrawingWire, setIsDrawingWire] = useState(false);

  const { lightStates, portSignals } = useCircuitSimulation(gates, switches, lights, wires);

  const getMousePosition = useCallback((e: React.MouseEvent | React.DragEvent): Position => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const gateType = e.dataTransfer.getData('gateType') as GateType;
      if (!gateType) return;

      const pos = getMousePosition(e);
      const newGate: Gate = {
        id: `gate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: gateType,
        position: {
          x: snapToGrid(pos.x, cellSize),
          y: snapToGrid(pos.y, cellSize),
        },
        isFixed: false,
      };

      onGatesChange([...gates, newGate]);
      onGatePlaced();
    },
    [gates, onGatesChange, onGatePlaced, cellSize, getMousePosition]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGateMouseDown = useCallback(
    (e: React.MouseEvent, gateId: string) => {
      e.stopPropagation();
      const gate = gates.find((g) => g.id === gateId);
      if (!gate || gate.isFixed) return;

      const pos = getMousePosition(e);
      setDraggingGate(gateId);
      setDragOffset({
        x: pos.x - gate.position.x,
        y: pos.y - gate.position.y,
      });
    },
    [gates, getMousePosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getMousePosition(e);
      setMousePos(pos);

      if (draggingGate) {
        const newGates = gates.map((gate) => {
          if (gate.id === draggingGate) {
            return {
              ...gate,
              position: {
                x: Math.max(GATE_WIDTH / 2, Math.min(gridSize.width - GATE_WIDTH / 2, snapToGrid(pos.x - dragOffset.x, cellSize))),
                y: Math.max(GATE_HEIGHT / 2, Math.min(gridSize.height - GATE_HEIGHT / 2, snapToGrid(pos.y - dragOffset.y, cellSize))),
              },
            };
          }
          return gate;
        });
        onGatesChange(newGates);
      }

      if (selectedPort && selectedPort.type === 'output') {
        setIsDrawingWire(true);
      }
    },
    [draggingGate, dragOffset, gates, onGatesChange, cellSize, gridSize, getMousePosition, selectedPort]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingGate(null);
  }, []);

  const handleSwitchClick = useCallback(
    (switchId: string) => {
      const newSwitches = switches.map((sw) => {
        if (sw.id === switchId) {
          return { ...sw, state: !sw.state };
        }
        return sw;
      });
      onSwitchesChange(newSwitches);
    },
    [switches, onSwitchesChange]
  );

  const handlePortClick = useCallback(
    (port: PortInfo) => {
      if (!selectedPort) {
        if (port.type === 'output') {
          setSelectedPort(port);
        }
        return;
      }

      if (selectedPort.type === 'output' && port.type === 'input') {
        const existingWire = wires.find((w) => w.toPort === port.id);
        if (existingWire) {
          onWiresChange(wires.filter((w) => w.id !== existingWire.id));
        }

        const newWire: Wire = {
          id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromPort: selectedPort.id,
          toPort: port.id,
        };
        onWiresChange([...wires, newWire]);
        setSelectedPort(null);
        setIsDrawingWire(false);
      } else if (selectedPort.type === 'input' && port.type === 'output') {
        const existingWire = wires.find((w) => w.toPort === selectedPort.id);
        if (existingWire) {
          onWiresChange(wires.filter((w) => w.id !== existingWire.id));
        }

        const newWire: Wire = {
          id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromPort: port.id,
          toPort: selectedPort.id,
        };
        onWiresChange([...wires, newWire]);
        setSelectedPort(null);
        setIsDrawingWire(false);
      } else {
        setSelectedPort(port);
      }
    },
    [selectedPort, wires, onWiresChange]
  );

  const handleBoardClick = useCallback(() => {
    setSelectedPort(null);
    setIsDrawingWire(false);
  }, []);

  const handleWireClick = useCallback(
    (e: React.MouseEvent, wireId: string) => {
      e.stopPropagation();
      onWiresChange(wires.filter((w) => w.id !== wireId));
    },
    [wires, onWiresChange]
  );

  const getPortPosition = useCallback(
    (portId: string): Position | null => {
      for (const sw of switches) {
        if (portId === `switch_${sw.id}_output`) {
          return getSwitchOutputPosition(sw);
        }
      }

      for (const light of lights) {
        if (portId === `light_${light.id}_input`) {
          return getLightInputPosition(light);
        }
      }

      for (const gate of gates) {
        if (portId === `gate_${gate.id}_output`) {
          return getGateOutputPosition(gate);
        }

        const inputPositions = getGateInputPositions(gate);
        for (let i = 0; i < inputPositions.length; i++) {
          if (portId === `gate_${gate.id}_input_${i}`) {
            return inputPositions[i];
          }
        }
      }

      return null;
    },
    [switches, lights, gates]
  );

  const allPorts: PortInfo[] = [];

  for (const sw of switches) {
    allPorts.push({
      id: createPortId('switch', sw.id, 'output'),
      type: 'output',
      position: getSwitchOutputPosition(sw),
    });
  }

  for (const light of lights) {
    allPorts.push({
      id: createPortId('light', light.id, 'input'),
      type: 'input',
      position: getLightInputPosition(light),
    });
  }

  for (const gate of gates) {
    const inputPositions = getGateInputPositions(gate);
    inputPositions.forEach((pos, i) => {
      allPorts.push({
        id: createPortId('gate', gate.id, 'input', i),
        type: 'input',
        position: pos,
      });
    });
    allPorts.push({
      id: createPortId('gate', gate.id, 'output'),
      type: 'output',
      position: getGateOutputPosition(gate),
    });
  }

  const gridLines = [];
  for (let x = 0; x <= gridSize.width; x += cellSize) {
    gridLines.push(
      <line key={`v-${x}`} x1={x} y1={0} x2={x} y2={gridSize.height} stroke="#2d3748" strokeWidth={1} />
    );
  }
  for (let y = 0; y <= gridSize.height; y += cellSize) {
    gridLines.push(
      <line key={`h-${y}`} x1={0} y1={y} x2={gridSize.width} y2={y} stroke="#2d3748" strokeWidth={1} />
    );
  }

  const lightStateMap = new Map(lightStates.map((l) => [l.id, l.state]));

  useEffect(() => {
    if (selectedGateType) {
      setSelectedPort(null);
      setIsDrawingWire(false);
    }
  }, [selectedGateType]);

  return (
    <div className="circuit-board-wrapper">
      <svg
        ref={svgRef}
        width={gridSize.width}
        height={gridSize.height}
        className="circuit-board"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBoardClick}
      >
        <defs>
          <radialGradient id="boardGradient" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#1a202c" />
          </radialGradient>
        </defs>

        <rect width={gridSize.width} height={gridSize.height} fill="url(#boardGradient)" />
        {gridLines}

        {wires.map((wire) => {
          const fromPos = getPortPosition(wire.fromPort);
          const toPos = getPortPosition(wire.toPort);
          if (!fromPos || !toPos) return null;

          const isActive = portSignals.get(wire.fromPort) || false;
          const wireColor = isActive ? '#38b2ac' : '#4a5568';

          return (
            <g key={wire.id}>
              <path
                d={getWirePath(fromPos, toPos)}
                fill="none"
                stroke={wireColor}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.3}
              />
              <path
                d={getWirePath(fromPos, toPos)}
                fill="none"
                stroke={wireColor}
                strokeWidth={2}
                strokeLinecap="round"
                className="wire-path"
                onClick={(e) => handleWireClick(e, wire.id)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}

        {isDrawingWire && selectedPort && (
          <path
            d={getWirePath(selectedPort.position, mousePos)}
            fill="none"
            stroke="#38b2ac"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="5,5"
            opacity={0.6}
          />
        )}

        {switches.map((sw) => (
          <g
            key={sw.id}
            className="switch"
            onClick={(e) => {
              e.stopPropagation();
              handleSwitchClick(sw.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={sw.position.x}
              cy={sw.position.y}
              r={SWITCH_SIZE / 2}
              fill={sw.state ? '#48bb78' : '#718096'}
              stroke={sw.state ? '#68d391' : '#a0aec0'}
              strokeWidth={2}
            />
            <text
              x={sw.position.x}
              y={sw.position.y + 4}
              textAnchor="middle"
              fill="#fff"
              fontSize="12"
              fontWeight="bold"
            >
              {sw.state ? '1' : '0'}
            </text>
          </g>
        ))}

        {lights.map((light) => {
          const isOn = lightStateMap.get(light.id) || false;
          return (
            <g key={light.id} className="light">
              {isOn && (
                <circle
                  cx={light.position.x}
                  cy={light.position.y}
                  r={LIGHT_SIZE + 10}
                  fill="#ecc94b"
                  opacity={0.3}
                  className="light-glow"
                />
              )}
              <circle
                cx={light.position.x}
                cy={light.position.y}
                r={LIGHT_SIZE / 2}
                fill={isOn ? '#ecc94b' : '#718096'}
                stroke={isOn ? '#faf089' : '#a0aec0'}
                strokeWidth={2}
                className={`light-bulb ${isOn ? 'on' : ''}`}
              />
              <circle
                cx={light.position.x}
                cy={light.position.y}
                r={LIGHT_SIZE / 4}
                fill={isOn ? '#fffbeb' : '#2d3748'}
                opacity={0.6}
              />
            </g>
          );
        })}

        {gates.map((gate) => (
          <g
            key={gate.id}
            className="gate"
            onMouseDown={(e) => handleGateMouseDown(e, gate.id)}
            style={{ cursor: gate.isFixed ? 'default' : 'grab' }}
          >
            <rect
              x={gate.position.x - GATE_WIDTH / 2}
              y={gate.position.y - GATE_HEIGHT / 2}
              width={GATE_WIDTH}
              height={GATE_HEIGHT}
              fill="#2d3748"
              stroke="#4a5568"
              strokeWidth={2}
              rx={6}
              ry={6}
            />
            <g transform={`translate(${gate.position.x - GATE_WIDTH / 2 + 8}, ${gate.position.y - 20})`}>
              <GateIcon type={gate.type} size={40} color="#f6e05e" />
            </g>
          </g>
        ))}

        {allPorts.map((port) => {
          const isSelected = selectedPort?.id === port.id;
          const isActive = portSignals.get(port.id) || false;
          return (
            <circle
              key={port.id}
              cx={port.position.x}
              cy={port.position.y}
              r={PORT_RADIUS}
              fill={isActive ? '#38b2ac' : '#4a5568'}
              stroke={isSelected ? '#f6e05e' : isActive ? '#81e6d9' : '#718096'}
              strokeWidth={isSelected ? 3 : 2}
              className="port"
              onClick={(e) => {
                e.stopPropagation();
                handlePortClick(port);
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </svg>

      <style>{`
        .circuit-board-wrapper {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .circuit-board {
          display: block;
        }

        .port:hover {
          filter: brightness(1.3);
        }

        .gate:active {
          cursor: grabbing;
        }

        .wire-path:hover {
          stroke-width: 3;
        }

        .light-glow {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .light-bulb.on {
          animation: flicker 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
