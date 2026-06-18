import { create } from 'zustand';
import type { SeismicState, WaveType, DisplayMode, ViewMode, Hypocenter } from './types';
import {
  generateReceivers,
  createInitialWavefronts,
  propagateWavefront,
  computeAllRayPaths,
  vectorLength,
  SCALE_FACTOR,
  EARTH_LAYERS,
} from './physics';

const initialStats = {
  simulationTime: 0,
  pWaveMaxDistance: 0,
  sWaveMaxDistance: 0,
  arrivedReceiversCount: 0,
  totalTime: 0,
  averagePSpeed: 0,
  averageSSpeed: 0,
  isRunning: false,
  isFinished: false,
};

export const useSeismicStore = create<SeismicState>((set, get) => ({
  hypocenter: {
    latitude: 35,
    longitude: 105,
    depth: 100,
  },
  displayMode: 'wavefront',
  viewMode: 'global',
  waveTypes: { P: true, S: true },
  isSimulating: false,
  stats: { ...initialStats },
  wavefronts: [],
  rays: [],
  receivers: generateReceivers(100),

  setHypocenter: (h: Partial<Hypocenter>) =>
    set((state) => ({
      hypocenter: { ...state.hypocenter, ...h },
    })),

  setDisplayMode: (mode: DisplayMode) => set({ displayMode: mode }),

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  toggleWaveType: (type: WaveType) =>
    set((state) => ({
      waveTypes: { ...state.waveTypes, [type]: !state.waveTypes[type] },
    })),

  startSimulation: () => {
    const { hypocenter, waveTypes, receivers } = get();
    const wavefronts = createInitialWavefronts(hypocenter, waveTypes);
    const rays = computeAllRayPaths(hypocenter, receivers, waveTypes);
    const resetReceivers = receivers.map((r) => ({
      ...r,
      pWaveArrived: false,
      sWaveArrived: false,
      flashTime: 0,
    }));
    set({
      isSimulating: true,
      wavefronts,
      rays,
      receivers: resetReceivers,
      stats: { ...initialStats, isRunning: true },
    });
  },

  stopSimulation: () =>
    set((state) => ({
      isSimulating: false,
      stats: { ...state.stats, isRunning: false },
    })),

  resetSimulation: () =>
    set({
      isSimulating: false,
      wavefronts: [],
      rays: [],
      receivers: generateReceivers(100),
      stats: { ...initialStats },
    }),

  updateSimulation: (deltaTime: number) => {
    const state = get();
    if (!state.isSimulating) return;

    const dt = deltaTime * 10;
    let newWavefronts = [...state.wavefronts];
    const allNewSecondary: typeof state.wavefronts = [];
    const newStats = { ...state.stats };
    newStats.simulationTime += dt;

    newWavefronts = newWavefronts
      .map((wf) => {
        const result = propagateWavefront(wf, dt);
        allNewSecondary.push(...result.newWavefronts);
        return result.wavefront;
      })
      .filter((wf) => wf.opacity > 0.01 && wf.radius < 150);

    newWavefronts.push(...allNewSecondary);

    let pMaxDist = 0;
    let sMaxDist = 0;
    for (const wf of newWavefronts) {
      const distKm = wf.radius / SCALE_FACTOR;
      if (wf.type === 'P' && !wf.isSecondary) pMaxDist = Math.max(pMaxDist, distKm);
      if (wf.type === 'S' && !wf.isSecondary) sMaxDist = Math.max(sMaxDist, distKm);
    }
    newStats.pWaveMaxDistance = Math.round(pMaxDist);
    newStats.sWaveMaxDistance = Math.round(sMaxDist);

    let arrivedCount = 0;
    const newReceivers = state.receivers.map((receiver) => {
      const updated = { ...receiver };
      const receiverPos = receiver.position;

      for (const wf of state.wavefronts) {
        const dist = vectorLength({
          x: receiverPos.x - wf.center.x,
          y: receiverPos.y - wf.center.y,
          z: receiverPos.z - wf.center.z,
        });

        if (!wf.isSecondary && dist <= wf.radius + 0.05) {
          if (wf.type === 'P' && !updated.pWaveArrived) {
            updated.pWaveArrived = true;
            updated.flashTime = newStats.simulationTime;
          }
          if (wf.type === 'S' && !updated.sWaveArrived) {
            updated.sWaveArrived = true;
            updated.flashTime = newStats.simulationTime;
          }
        }
      }

      if (updated.pWaveArrived || updated.sWaveArrived) {
        arrivedCount++;
      }
      return updated;
    });

    newStats.arrivedReceiversCount = arrivedCount;

    const maxTime = 200;
    if (newStats.simulationTime >= maxTime || arrivedCount >= state.receivers.length) {
      newStats.isRunning = false;
      newStats.isFinished = true;
      newStats.totalTime = newStats.simulationTime;

      let totalPSpeed = 0;
      let pCount = 0;
      let totalSSpeed = 0;
      let sCount = 0;
      for (const ray of state.rays) {
        if (ray.type === 'P' && ray.arrived) {
          totalPSpeed += ray.points.reduce((sum, p) => sum + p.waveSpeed, 0) / ray.points.length;
          pCount++;
        }
        if (ray.type === 'S' && ray.arrived) {
          totalSSpeed += ray.points.reduce((sum, p) => sum + p.waveSpeed, 0) / ray.points.length;
          sCount++;
        }
      }
      newStats.averagePSpeed = pCount > 0 ? Math.round((totalPSpeed / pCount) * 100) / 100 : 0;
      newStats.averageSSpeed = sCount > 0 ? Math.round((totalSSpeed / sCount) * 100) / 100 : 0;

      set({
        isSimulating: false,
        wavefronts: newWavefronts,
        receivers: newReceivers,
        stats: newStats,
      });
      return;
    }

    set({
      wavefronts: newWavefronts,
      receivers: newReceivers,
      stats: newStats,
    });
  },
}));
