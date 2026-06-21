export interface RoomData {
  id: string;
  name: string;
  polygon: [number, number][];
  area: number;
  adjacentRooms: string[];
  doorPosition: [number, number];
}

export interface RoomDataWithCenter extends RoomData {
  center: [number, number];
}
