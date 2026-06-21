export interface Template {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  bgGradient: [string, string];
  fontFamily: string;
  waveOpacity: number;
  textColor: string;
}

export interface WavePatternProps {
  data: number[];
  primary: string;
  secondary: string;
  width: number;
  height: number;
  gradientId: string;
  opacity?: number;
}

export interface CoverExporterProps {
  targetRef: React.RefObject<HTMLElement>;
  fileName?: string;
}

export interface InputValues {
  showName: string;
  episodeTitle: string;
  guestName: string;
}

export interface TemplateListProps {
  templates: Template[];
  selectedId: string;
  onSelect: (id: string) => void;
}
