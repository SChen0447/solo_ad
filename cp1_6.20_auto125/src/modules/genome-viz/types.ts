export interface Position {
  x: number;
  y: number;
  z: number;
}

export type GeneCategory = 'transcription_factor' | 'structural_protein' | 'non_coding_rna';

export interface Gene {
  id: string;
  name: string;
  category: GeneCategory;
  position: Position;
  skeleton_index?: number;
  description: string;
  diseases: string[];
  chromosome_band?: string;
  expression_level?: string;
  conservation_score?: number;
}

export interface ChromosomeStructure {
  skeleton_points: Position[];
  genes: Gene[];
}

export const GENE_CATEGORY_COLORS: Record<GeneCategory, string> = {
  transcription_factor: '#ff6b6b',
  structural_protein: '#4ecdc4',
  non_coding_rna: '#ffe66d',
};

export const GENE_CATEGORY_LABELS: Record<GeneCategory, string> = {
  transcription_factor: '转录因子',
  structural_protein: '结构蛋白',
  non_coding_rna: '非编码RNA',
};
