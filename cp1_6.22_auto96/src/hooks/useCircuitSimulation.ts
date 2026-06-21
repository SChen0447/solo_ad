import { useMemo } from 'react';
import type { Gate, Switch, Light, Wire, GateType } from '../types';

function getGateInputCount(type: GateType): number {
  switch (type) {
    case 'AND':
    case 'OR':
      return 2;
    case 'NOT':
      return 1;
    default:
      return 0;
  }
}

function computeGateOutput(type: GateType, inputs: boolean[]): boolean {
  switch (type) {
    case 'AND':
      return inputs.length >= 2 && inputs[0] && inputs[1];
    case 'OR':
      return inputs.length >= 2 && (inputs[0] || inputs[1]);
    case 'NOT':
      return inputs.length >= 1 && !inputs[0];
    default:
      return false;
  }
}

interface SimulationResult {
  lightStates: { id: string; state: boolean }[];
  gateOutputs: Map<string, boolean>;
  portSignals: Map<string, boolean>;
}

export function useCircuitSimulation(
  gates: Gate[],
  switches: Switch[],
  lights: Light[],
  wires: Wire[]
): SimulationResult {
  return useMemo(() => {
    const portSignals = new Map<string, boolean>();
    const gateOutputs = new Map<string, boolean>();

    const wireMap = new Map<string, string>();
    for (const wire of wires) {
      wireMap.set(wire.toPort, wire.fromPort);
    }

    const gateMap = new Map<string, Gate>();
    for (const gate of gates) {
      gateMap.set(gate.id, gate);
    }

    const switchMap = new Map<string, Switch>();
    for (const sw of switches) {
      switchMap.set(sw.id, sw);
      portSignals.set(`switch_${sw.id}_output`, sw.state);
    }

    function getPortSignal(portId: string, visited: Set<string>): boolean {
      if (visited.has(portId)) {
        return false;
      }
      visited.add(portId);

      if (portSignals.has(portId)) {
        return portSignals.get(portId)!;
      }

      const sourcePort = wireMap.get(portId);
      if (!sourcePort) {
        portSignals.set(portId, false);
        return false;
      }

      if (sourcePort.startsWith('switch_')) {
        const swId = sourcePort.replace('switch_', '').replace('_output', '');
        const sw = switchMap.get(swId);
        const signal = sw?.state ?? false;
        portSignals.set(sourcePort, signal);
        portSignals.set(portId, signal);
        return signal;
      }

      if (sourcePort.startsWith('gate_') && sourcePort.endsWith('_output')) {
        const gateId = sourcePort.replace('gate_', '').replace('_output', '');
        const gate = gateMap.get(gateId);
        if (!gate) {
          portSignals.set(portId, false);
          return false;
        }

        if (gateOutputs.has(gateId)) {
          const output = gateOutputs.get(gateId)!;
          portSignals.set(portId, output);
          return output;
        }

        const inputCount = getGateInputCount(gate.type);
        const gateInputs: boolean[] = [];
        for (let i = 0; i < inputCount; i++) {
          const inputPortId = `gate_${gateId}_input_${i}`;
          gateInputs.push(getPortSignal(inputPortId, visited));
        }

        const output = computeGateOutput(gate.type, gateInputs);
        gateOutputs.set(gateId, output);
        portSignals.set(sourcePort, output);
        portSignals.set(portId, output);
        return output;
      }

      portSignals.set(portId, false);
      return false;
    }

    const lightStates = lights.map((light) => {
      const inputPortId = `light_${light.id}_input`;
      const visited = new Set<string>();
      const state = getPortSignal(inputPortId, visited);
      return { id: light.id, state };
    });

    return { lightStates, gateOutputs, portSignals };
  }, [gates, switches, lights, wires]);
}
