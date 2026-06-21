export interface ProjectData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  projectUrl: string;
  previewImageUrl: string;
}

export interface Artwork {
  id: string;
  mesh: THREE.Group;
  data: ProjectData;
  isHovered: boolean;
  baseScale: number;
  baseRotation: THREE.Euler;
  basePosition: THREE.Vector3;
}
