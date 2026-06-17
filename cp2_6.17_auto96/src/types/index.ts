export interface Stage {
  id: string;
  code: string;
  name: string;
  description: string;
  startTime: string;
  votingEnabled: boolean;
  average: number;
  count: number;
  max: number;
}

export interface Comment {
  id: string;
  stageId: string;
  stageName: string;
  nickname: string;
  avatar: string;
  seatNumber: string;
  content: string;
  rating: number;
  createdAt: number;
}
