
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = string; // e.g., 'a1', 'h8'

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
}

export interface GameState {
  fen: string;
  turn: Color;
  history: string[];
  isGameOver: boolean;
  result: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
