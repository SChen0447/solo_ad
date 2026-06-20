import { useEffect, useRef, useCallback, useState } from 'react';
import Scene3D from '@/components/Scene3D';
import ControlPanel from '@/components/ControlPanel';
import { usePlantStore } from '@/store/useStore';
import { PlantGrowth, STAGE_LABELS } from '@/utils/plantGrowth';
import type { SpeciesData, MorphParams } from '@/utils/plantGrowth';
import axios from 'axios';
import './App.css';

const DEFAULT_SPECIES: SpeciesData[] = [
  {
    id: 'sunflower', name: '向日葵',
    stages: [
      { name: 'seed', minDuration: 5, maxDuration: 8, stemHeight: 0, leafCount: 0, budSize: 0, fruitSize: 0 },
      { name: 'sprout', minDuration: 8, maxDuration: 12, stemHeight: 8, leafCount: 2, budSize: 0, fruitSize: 0 },
      { name: 'seedling', minDuration: 10, maxDuration: 15, stemHeight: 30, leafCount: 4, budSize: 0, fruitSize: 0 },
      { name: 'mature', minDuration: 12, maxDuration: 18, stemHeight: 80, leafCount: 8, budSize: 2, fruitSize: 0 },
      { name: 'flowering', minDuration: 15, maxDuration: 20, stemHeight: 120, leafCount: 10, budSize: 8, fruitSize: 0 },
      { name: 'fruiting', minDuration: 10, maxDuration: 15, stemHeight: 150, leafCount: 12, budSize: 12, fruitSize: 5 },
    ],
    colors: { stem: '#228B22', stemMature: '#3B7A2E', leaf: '#228B22', leafMature: '#FFD700', flower: '#FFD700', flowerCenter: '#8B4513', fruit: '#8B4513' },
    morphology: { maxStemHeight: 150, stemRadius: 0.8, petalCount: 18, flowerRadius: 8, leafWidth: 3, leafLength: 5, spineLength: 0, vineCurve: 0 },
  },
  {
    id: 'cactus', name: '仙人掌',
    stages: [
      { name: 'seed', minDuration: 5, maxDuration: 10, stemHeight: 0, leafCount: 0, budSize: 0, fruitSize: 0 },
      { name: 'sprout', minDuration: 8, maxDuration: 12, stemHeight: 3, leafCount: 0, budSize: 0, fruitSize: 0 },
      { name: 'seedling', minDuration: 10, maxDuration: 15, stemHeight: 10, leafCount: 0, budSize: 0, fruitSize: 0 },
      { name: 'mature', minDuration: 12, maxDuration: 18, stemHeight: 30, leafCount: 0, budSize: 0, fruitSize: 0 },
      { name: 'flowering', minDuration: 15, maxDuration: 20, stemHeight: 50, leafCount: 0, budSize: 4, fruitSize: 0 },
      { name: 'fruiting', minDuration: 10, maxDuration: 15, stemHeight: 60, leafCount: 0, budSize: 5, fruitSize: 3 },
    ],
    colors: { stem: '#2E8B57', stemMature: '#1B6B3A', leaf: '#2E8B57', leafMature: '#2E8B57', flower: '#FF69B4', flowerCenter: '#FFD700', fruit: '#FF6347' },
    morphology: { maxStemHeight: 60, stemRadius: 3, petalCount: 8, flowerRadius: 4, leafWidth: 0, leafLength: 0, spineLength: 1.2, vineCurve: 0 },
  },
  {
    id: 'vine', name: '藤蔓',
    stages: [
      { name: 'seed', minDuration: 5, maxDuration: 8, stemHeight: 0, leafCount: 0, budSize: 0, fruitSize: 0 },
      { name: 'sprout', minDuration: 6, maxDuration: 10, stemHeight: 5, leafCount: 1, budSize: 0, fruitSize: 0 },
      { name: 'seedling', minDuration: 8, maxDuration: 12, stemHeight: 20, leafCount: 3, budSize: 0, fruitSize: 0 },
      { name: 'mature', minDuration: 10, maxDuration: 16, stemHeight: 60, leafCount: 6, budSize: 0, fruitSize: 0 },
      { name: 'flowering', minDuration: 12, maxDuration: 18, stemHeight: 120, leafCount: 10, budSize: 2, fruitSize: 0 },
      { name: 'fruiting', minDuration: 10, maxDuration: 15, stemHeight: 200, leafCount: 14, budSize: 3, fruitSize: 3 },
    ],
    colors: { stem: '#32CD32', stemMature: '#8B4513', leaf: '#32CD32', leafMature: '#8B4513', flower: '#9370DB', flowerCenter: '#4B0082', fruit: '#9B2335' },
    morphology: { maxStemHeight: 200, stemRadius: 0.4, petalCount: 5, flowerRadius: 2, leafWidth: 2.5, leafLength: 4, spineLength: 0, vineCurve: 0.6 },
  },
];

const DEFAULT_MORPH: MorphParams = {
  stemHeight: 0.01,
  stemRadius: 0.01,
  leafCount: 0,
  leafScale: 0,
  budSize: 0,
  fruitSize: 0,
  stemColor: '#228B22',
  leafColor: '#228B22',
  flowerColor: '#FFD700',
  fruitColor: '#8B4513',
  swayAngle: 0,
  leafPhase: [],
};

export default function App() {
  const {
    species, speciesList, currentStage, overallProgress,
    environment, setSpecies, setSpeciesList, setGrowthState
  } = usePlantStore();

  const growthRef = useRef<PlantGrowth | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [morphParams, setMorphParams] = useState<MorphParams>(DEFAULT_MORPH);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get<SpeciesData[]>('/api/species');
        if (res.data && res.data.length > 0) {
          setSpeciesList(res.data);
          if (!species) setSpecies(res.data[0]);
          return;
        }
      } catch {
        // fallback to default
      }
      setSpeciesList(DEFAULT_SPECIES);
      if (!species) setSpecies(DEFAULT_SPECIES[0]);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!species) return;
    const pg = new PlantGrowth(species);
    growthRef.current = pg;
    pg.on('stageChange', (state: unknown) => {
      const s = state as { currentStage: string; stageIndex: number; stageProgress: number; overallProgress: number; isComplete: boolean };
      setGrowthState({
        currentStage: s.currentStage as 'seed' | 'sprout' | 'seedling' | 'mature' | 'flowering' | 'fruiting',
        stageIndex: s.stageIndex,
        stageProgress: s.stageProgress,
        overallProgress: s.overallProgress,
        isComplete: s.isComplete,
      });
    });
    pg.on('growthComplete', (state: unknown) => {
      const s = state as { currentStage: string; stageIndex: number; stageProgress: number; overallProgress: number; isComplete: boolean };
      setGrowthState({
        currentStage: s.currentStage as 'seed' | 'sprout' | 'seedling' | 'mature' | 'flowering' | 'fruiting',
        stageIndex: s.stageIndex,
        stageProgress: s.stageProgress,
        overallProgress: s.overallProgress,
        isComplete: s.isComplete,
      });
    });
    setGrowthState({
      currentStage: 'seed',
      stageIndex: 0,
      stageProgress: 0,
      overallProgress: 0,
      isComplete: false,
    });
  }, [species]);

  useEffect(() => {
    let animId: number;
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      if (growthRef.current) {
        growthRef.current.update(delta, environment);
        const mp = growthRef.current.getMorphParams(environment);
        setMorphParams(mp);

        const state = growthRef.current.getState();
        setGrowthState({
          currentStage: state.currentStage,
          stageIndex: state.stageIndex,
          stageProgress: state.stageProgress,
          overallProgress: state.overallProgress,
          isComplete: state.isComplete,
        });
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [environment]);

  const containerStyle: React.CSSProperties = isMobile
    ? { display: 'flex', flexDirection: 'column', height: '100vh', background: '#121212' }
    : { display: 'flex', height: '100vh', background: '#121212' };

  const sceneStyle: React.CSSProperties = isMobile
    ? { width: '100%', height: '60vh' }
    : { width: '70%', height: '100%' };

  const panelStyle: React.CSSProperties = isMobile
    ? { width: '100%', flex: 1, overflowY: 'auto' }
    : { width: '30%', height: '100%', overflowY: 'auto' };

  return (
    <div style={containerStyle}>
      <div style={sceneStyle}>
        <Scene3D
          morphParams={morphParams}
          environment={environment}
          speciesId={species?.id || 'sunflower'}
        />
      </div>
      <div style={panelStyle}>
        <ControlPanel
          speciesList={speciesList}
          currentStage={currentStage}
          overallProgress={overallProgress}
        />
      </div>
    </div>
  );
}
