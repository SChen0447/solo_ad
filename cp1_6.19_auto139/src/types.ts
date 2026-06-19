export type CardType = 'text' | 'image' | 'color';

export interface TextContent {
  title: string;
  body: string;
}

export interface ImageContent {
  url: string;
  caption: string;
}

export interface ColorContent {
  name: string;
  color: string;
}

export type CardContent = TextContent | ImageContent | ColorContent;

export interface Card {
  id: string;
  type: CardType;
  content: CardContent;
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
}

export interface Board {
  id: string;
  name: string;
  themeColor: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
}

export interface BoardsResponse {
  boards: Board[];
}

export interface BoardResponse {
  board: Board;
}

export interface CardResponse {
  card: Card;
}
