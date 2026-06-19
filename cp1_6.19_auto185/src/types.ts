export type CardType = 'text' | 'image' | 'link';

export interface TextCardData {
  content: string;
}

export interface ImageCardData {
  url: string;
  name?: string;
}

export interface LinkCardData {
  url: string;
  title: string;
  favicon?: string;
}

export type CardData = TextCardData | ImageCardData | LinkCardData;

export interface Card {
  id: string;
  type: CardType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: CardData;
  createdAt: number;
  updatedAt: number;
}

export interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
  createdAt: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EditorState {
  visible: boolean;
  x: number;
  y: number;
  cardType: CardType;
  editingCardId?: string;
  textContent: string;
  imageUrl: string;
  linkUrl: string;
  linkTitle: string;
  linkFavicon: string;
  isLoading: boolean;
  uploading: boolean;
}

export interface BoardState {
  offsetX: number;
  offsetY: number;
  scale: number;
  isPanning: boolean;
  selectedCardId: string | null;
  selectedConnectionId: string | null;
  draggingCardId: string | null;
  resizingCardId: string | null;
  connecting: {
    active: boolean;
    fromCardId: string | null;
    startPoint: Point | null;
    currentPoint: Point | null;
  };
}
