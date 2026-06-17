export interface ColorInfo {
  hex: string;
  percentage: number;
  locked: boolean;
}

export interface ExtractResponse {
  colors: { hex: string; percentage: number }[];
}
