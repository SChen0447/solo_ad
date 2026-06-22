export interface ComponentVersion {
  version: string;
  jsx: string;
  defaultProps: Record<string, any>;
  createdAt: string;
}

export interface Component {
  id: string;
  name: string;
  description: string;
  tags: string[];
  thumbnail: string;
  likes: number;
  versions: ComponentVersion[];
  createdAt: string;
  updatedAt: string;
}
