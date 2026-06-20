export interface PlantBasic {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  genus: string;
  thumbnail: string;
}

export interface PlantDetail extends PlantBasic {
  features_text: string;
  distribution: string[];
  habitat: {
    light: number;
    water: number;
    temperature: number;
  };
  image_urls: string[];
}

export interface MatchResult {
  id: number;
  scientific_name: string;
  common_name: string;
  family: string;
  genus: string;
  thumbnail: string;
  similarity: number;
}

export type PlantListItem = PlantBasic;
