export interface Card {
    id: string;
    title: string;
    tags: string[];
    note: string;
    categoryId: string;
    createdAt: number;
}
export interface Category {
    id: string;
    name: string;
    cardIds: string[];
}
export interface User {
    id: string;
    nickname: string;
    joinedAt: number;
}
export interface Room {
    id: string;
    categories: Map<string, Category>;
    cards: Map<string, Card>;
    users: Map<string, User>;
    logs: LogEntry[];
}
export interface LogEntry {
    id: string;
    userId: string;
    nickname: string;
    action: string;
    timestamp: number;
}
export declare function createRoom(): string;
export declare function joinRoom(roomId: string, userId: string, nickname: string): Room | null;
export declare function leaveRoom(roomId: string, userId: string): boolean;
export declare function getRoom(roomId: string): Room | null;
export declare function addCategory(roomId: string, name: string): Category | null;
export declare function removeCategory(roomId: string, categoryId: string): boolean;
export declare function addCard(roomId: string, categoryId: string, userId: string): Card | null;
export declare function updateCard(roomId: string, cardId: string, updates: Partial<Pick<Card, 'title' | 'tags' | 'note'>>, userId: string): Card | null;
export declare function moveCard(roomId: string, cardId: string, targetCategoryId: string, targetIndex: number, userId: string): Card | null;
export declare function deleteCard(roomId: string, cardId: string, userId: string): boolean;
export declare function getRoomState(roomId: string): {
    id: string;
    categories: {
        id: string;
        name: string;
        cardIds: string[];
    }[];
    cards: Card[];
    users: User[];
    logs: LogEntry[];
} | null;
