export interface GeologyLayer {
  id: string;
  name: string;
  color: string;
  topDepth: number;
  bottomDepth: number;
  density: number;
  era: string;
}

export interface StrikePoint {
  x: number;
  z: number;
}

export interface GeologyFault {
  id: string;
  name: string;
  strikePoints: StrikePoint[];
  dip: number;
  slip: number;
  topDepth: number;
  bottomDepth: number;
}

export interface GeologyData {
  layers: GeologyLayer[];
  faults: GeologyFault[];
  totalDepth: number;
  groundSize: number;
}

export interface LayerSample {
  name: string;
  color: string;
  thickness: number;
}

export interface CrossSectionResult {
  samples: LayerSample[];
  depth: number;
}
