export type Lane = 0 | 1 | 2; // 0=left, 1=center, 2=right
export type PlayerState = "running" | "jumping" | "sliding" | "dead";
export type GamePhase = "idle" | "playing" | "dead";

export interface GameScore {
  fid: number;
  username: string;
  score: number;
  timestamp: Date;
}

export interface LeaderboardEntry {
  fid: number;
  username: string;
  score: number;
  rank: number;
}

export interface FarcasterContext {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface GameConfig {
  width: number;
  height: number;
  initialSpeed: number;
  speedIncrement: number;
  lanePositions: number[];
}
