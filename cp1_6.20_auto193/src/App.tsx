import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  SpeciesSummary,
  SpeciesDetail,
  LSystemParams,
  Season,
  TreeMeshData,
} from "./types";
import { fetchAllSpecies, fetchSpeciesDetail } from "./modules/treeDataManager";
import { generateTreeMesh, getSeasonBgColor } from "./modules/treeGrowthEngine";
import SceneCanvas from "./components/SceneCanvas";
import SpeciesSelector from "./components/SpeciesSelector";
import ParameterPanel from "./components/ParameterPanel";
import GrowthTimeline from "./components/GrowthTimeline";
import SeasonSelector from "./components/SeasonSelector";

const DEFAULT_PARAMS: LSystemParams = {
  branchAngle: 30,
  branchDepth: 3,
  branchLengthScale: 1.0,
};

const EMPTY_MESH: TreeMeshData = {
  branches: [],
  leaves: [],
  trunkHeight: 0.5,
  crownWidth: 0.3,
};

const FALLBACK_SPECIES: SpeciesSummary[] = [
  { id: "ginkgo", name: "银杏", nameEn: "Ginkgo", thumbnail: "ginkgo", description: "银杏科银杏属" },
  { id: "oak", name: "橡树", nameEn: "Oak", thumbnail: "oak", description: "壳斗科栎属" },
  { id: "pine", name: "松树", nameEn: "Pine", thumbnail: "pine", description: "松科松属" },
  { id: "maple", name: "枫树", nameEn: "Maple", thumbnail: "maple", description: "槭树科槭属" },
];

const FALLBACK_DETAILS: Record<string, SpeciesDetail> = {
  ginkgo: {
    id: "ginkgo",
    name: "银杏",
    nameEn: "Ginkgo",
    thumbnail: "ginkgo",
    description: "银杏科银杏属，落叶大乔木，扇形叶片，秋叶金黄",
    lsystem: { axiom: "F", rules: [{ symbol: "F", replacement: "FF+[+F-F-F]-[-F+F+F]" }], angle: 25.7, iterations: 4 },
    branches: [
      { angle: 25, length: 1.0, depth: 1 },
      { angle: 35, length: 0.8, depth: 2 },
      { angle: 20, length: 0.6, depth: 3 },
      { angle: 45, length: 0.4, depth: 4 },
    ],
    leaves: { color: "#A8D5A2", shape: "fan", size: 0.3, density: 0.8 },
    growthRate: { maxHeight: 10, maxCrownWidth: 8, yearsToMature: 30 },
    seasonColors: { spring: "#A8D5A2", summer: "#4CAF50", autumn: "#FFD700", winter: "#9E9E9E" },
  },
  oak: {
    id: "oak",
    name: "橡树",
    nameEn: "Oak",
    thumbnail: "oak",
    description: "壳斗科栎属，落叶乔木，宽大树冠，坚硬木材",
    lsystem: { axiom: "F", rules: [{ symbol: "F", replacement: "F[+F]F[-F][F]" }], angle: 20, iterations: 5 },
    branches: [
      { angle: 30, length: 1.2, depth: 1 },
      { angle: 40, length: 0.9, depth: 2 },
      { angle: 35, length: 0.7, depth: 3 },
      { angle: 25, length: 0.5, depth: 4 },
      { angle: 50, length: 0.3, depth: 5 },
    ],
    leaves: { color: "#4CAF50", shape: "lobed", size: 0.25, density: 0.9 },
    growthRate: { maxHeight: 12, maxCrownWidth: 10, yearsToMature: 40 },
    seasonColors: { spring: "#7CB342", summer: "#33691E", autumn: "#FF6F00", winter: "#795548" },
  },
  pine: {
    id: "pine",
    name: "松树",
    nameEn: "Pine",
    thumbnail: "pine",
    description: "松科松属，常绿乔木，针状叶，塔形树冠",
    lsystem: { axiom: "F", rules: [{ symbol: "F", replacement: "FF-[-F+F+F]+[+F-F-F]" }], angle: 22.5, iterations: 4 },
    branches: [
      { angle: 20, length: 1.1, depth: 1 },
      { angle: 15, length: 0.85, depth: 2 },
      { angle: 25, length: 0.65, depth: 3 },
      { angle: 10, length: 0.5, depth: 4 },
    ],
    leaves: { color: "#2E7D32", shape: "needle", size: 0.2, density: 1.0 },
    growthRate: { maxHeight: 15, maxCrownWidth: 6, yearsToMature: 50 },
    seasonColors: { spring: "#66BB6A", summer: "#2E7D32", autumn: "#558B2F", winter: "#33691E" },
  },
  maple: {
    id: "maple",
    name: "枫树",
    nameEn: "Maple",
    thumbnail: "maple",
    description: "槭树科槭属，落叶乔木，掌状裂叶，秋叶红艳",
    lsystem: { axiom: "F", rules: [{ symbol: "F", replacement: "F[+F]F[-F]F" }], angle: 25.7, iterations: 4 },
    branches: [
      { angle: 35, length: 0.9, depth: 1 },
      { angle: 45, length: 0.75, depth: 2 },
      { angle: 30, length: 0.55, depth: 3 },
      { angle: 40, length: 0.35, depth: 4 },
    ],
    leaves: { color: "#66BB6A", shape: "palmate", size: 0.28, density: 0.85 },
    growthRate: { maxHeight: 9, maxCrownWidth: 7, yearsToMature: 25 },
    seasonColors: { spring: "#81C784", summer: "#388E3C", autumn: "#FF3D00", winter: "#9E9E9E" },
  },
};

const App: React.FC = () => {
  const [speciesList, setSpeciesList] = useState<SpeciesSummary[]>(FALLBACK_SPECIES);
  const [selectedId, setSelectedId] = useState<string>("ginkgo");
  const [speciesDetail, setSpeciesDetail] = useState<SpeciesDetail | null>(null);
  const [prevSpeciesDetail, setPrevSpeciesDetail] = useState<SpeciesDetail | null>(null);
  const [growthStep, setGrowthStep] = useState<number>(0);
  const [params, setParams] = useState<LSystemParams>(DEFAULT_PARAMS);
  const [season, setSeason] = useState<Season>("spring");
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [transitioning, setTransitioning] = useState<boolean>(false);

  const prevSpeciesIdRef = useRef<string>("ginkgo");

  useEffect(() => {
    fetchAllSpecies()
      .then(setSpeciesList)
      .catch(() => setSpeciesList(FALLBACK_SPECIES));
  }, []);

  useEffect(() => {
    const detail = FALLBACK_DETAILS[selectedId] || null;
    fetchSpeciesDetail(selectedId)
      .then((d) => setSpeciesDetail(d))
      .catch(() => {
        if (detail) setSpeciesDetail(detail);
      });
  }, [selectedId]);

  const handleSpeciesSelect = useCallback(
    (id: string) => {
      if (id === selectedId) return;
      setTransitioning(true);
      setPrevSpeciesDetail(speciesDetail);
      prevSpeciesIdRef.current = selectedId;
      setSelectedId(id);
      setGrowthStep(0);
      setTimeout(() => {
        setTransitioning(false);
      }, 3000);
    },
    [selectedId, speciesDetail]
  );

  const handleParamsChange = useCallback((newParams: LSystemParams) => {
    setParams(newParams);
  }, []);

  const handleCompareToggle = useCallback(() => {
    setCompareMode((prev) => !prev);
  }, []);

  const treeMesh = useMemo(() => {
    if (!speciesDetail) return EMPTY_MESH;
    return generateTreeMesh(speciesDetail, growthStep, params, season);
  }, [speciesDetail, growthStep, params, season]);

  const compareTreeMesh = useMemo(() => {
    if (!prevSpeciesDetail) return EMPTY_MESH;
    return generateTreeMesh(prevSpeciesDetail, growthStep, params, season);
  }, [prevSpeciesDetail, growthStep, params, season]);

  const seasonColor = useMemo(() => {
    if (!speciesDetail) return "#A8D5A2";
    return speciesDetail.seasonColors[season];
  }, [speciesDetail, season]);

  const compareSeasonColor = useMemo(() => {
    if (!prevSpeciesDetail) return "#A8D5A2";
    return prevSpeciesDetail.seasonColors[season];
  }, [prevSpeciesDetail, season]);

  const bgColor = useMemo(() => getSeasonBgColor(season), [season]);
  const compareBgColor = bgColor;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)",
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <SpeciesSelector
        species={speciesList}
        selectedId={selectedId}
        onSelect={handleSpeciesSelect}
      />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            marginLeft: 5,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <AnimatePresence>
            {transitioning && (
              <motion.div
                key="transition"
                initial={{ opacity: 0, scale: 1.05, filter: "grayscale(100%)" }}
                animate={{ opacity: 1, scale: 1, filter: "grayscale(0%)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.5 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(26,26,46,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                <span style={{ color: "#4ECDC4", fontSize: 18 }}>
                  正在加载树种...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <SceneCanvas
            treeMesh={treeMesh}
            growthStep={growthStep}
            season={season}
            seasonColor={seasonColor}
            bgColor={bgColor}
            compareMode={compareMode}
            compareTreeMesh={compareTreeMesh}
            compareSeason={season}
            compareSeasonColor={compareSeasonColor}
            compareBgColor={compareBgColor}
          />
        </div>

        <ParameterPanel
          params={params}
          onParamsChange={handleParamsChange}
          compareMode={compareMode}
          onCompareToggle={handleCompareToggle}
        />
      </div>

      <div>
        <SeasonSelector current={season} onChange={setSeason} />
        <GrowthTimeline value={growthStep} onChange={setGrowthStep} />
      </div>

      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: #E0E0E0;
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #4ECDC4;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #4ECDC4;
          cursor: pointer;
          border: none;
        }
        .species-selector::-webkit-scrollbar {
          height: 4px;
        }
        .species-selector::-webkit-scrollbar-track {
          background: #1A1A2E;
        }
        .species-selector::-webkit-scrollbar-thumb {
          background: #4ECDC4;
          border-radius: 2px;
        }
        @media (max-width: 800px) {
          .species-selector {
            flex-wrap: wrap !important;
            height: auto !important;
            padding: 8px !important;
          }
          .species-selector > div {
            width: 90px !important;
            height: 120px !important;
            border-radius: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
