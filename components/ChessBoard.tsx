
import React, { useState, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Square } from '../types';

interface ChessBoardProps {
  onMove: (move: { from: string, to: string, promotion?: string }) => void;
  fen: string;
  isGameOver: boolean;
}

const PIECE_IMAGES: Record<string, string> = {
  wP: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  wN: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wB: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wR: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wQ: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wK: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  bP: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
  bN: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bB: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  bR: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bQ: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  bK: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
};

const ChessBoard: React.FC<ChessBoardProps> = ({ onMove, fen, isGameOver }) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
  
  const game = new Chess(fen);

  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (isGameOver) {
      e.preventDefault();
      return;
    }

    const piece = game.get(square as any);
    if (!piece || piece.color !== game.turn()) {
      e.preventDefault();
      return;
    }

    setDraggedSquare(square);
    const moves = game.moves({ square: square as any, verbose: true });
    setValidMoves(moves.map(m => m.to));
    
    // Set a drag image offset or data
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, square: Square) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    const sourceSquare = e.dataTransfer.getData('text/plain') as Square;
    
    if (validMoves.includes(targetSquare)) {
      onMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    }
    
    setDraggedSquare(null);
    setValidMoves([]);
  };

  const handleDragEnd = () => {
    setDraggedSquare(null);
    setValidMoves([]);
  };

  const handleSquareClick = (square: Square) => {
    if (isGameOver) return;

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    const piece = game.get(square as any);
    
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as any, verbose: true });
      setValidMoves(moves.map(m => m.to));
    } 
    else if (selectedSquare && validMoves.includes(square)) {
      onMove({ from: selectedSquare, to: square, promotion: 'q' });
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const renderBoard = () => {
    const board = [];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (const row of rows) {
      for (const col of cols) {
        const square = `${col}${row}` as Square;
        const piece = game.get(square as any);
        const isDark = (cols.indexOf(col) + rows.indexOf(row)) % 2 === 1;
        const isSelected = selectedSquare === square;
        const isDragged = draggedSquare === square;
        const isHint = validMoves.includes(square);

        board.push(
          <div
            key={square}
            onClick={() => handleSquareClick(square)}
            onDragOver={(e) => handleDragOver(e, square)}
            onDrop={(e) => handleDrop(e, square)}
            className={`relative flex items-center justify-center w-full aspect-square ${
              isDark ? 'square-dark' : 'square-light'
            } ${isSelected || isDragged ? 'square-selected' : ''} cursor-pointer transition-colors duration-200`}
          >
            {piece && (
              <img
                src={PIECE_IMAGES[`${piece.color}${piece.type.toUpperCase()}`]}
                alt={`${piece.color}${piece.type}`}
                draggable={!isGameOver && piece.color === game.turn()}
                onDragStart={(e) => handleDragStart(e, square)}
                onDragEnd={handleDragEnd}
                className={`w-5/6 h-5/6 piece z-10 select-none ${isDragged ? 'opacity-40 scale-110' : 'opacity-100'}`}
              />
            )}
            {isHint && (
              <div className="absolute z-20 pointer-events-none flex items-center justify-center inset-0">
                 <div className={`rounded-full ${piece ? 'w-full h-full border-4 border-black/10' : 'w-3 h-3 bg-black/10'}`} />
              </div>
            )}
            {/* Coordinates */}
            {col === 'a' && (
              <span className={`absolute top-0.5 left-0.5 text-[8px] md:text-[10px] font-bold pointer-events-none ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                {row}
              </span>
            )}
            {row === '1' && (
              <span className={`absolute bottom-0.5 right-0.5 text-[8px] md:text-[10px] font-bold pointer-events-none ${isDark ? 'text-[#f0d9b5]' : 'text-[#b58863]'}`}>
                {col}
              </span>
            )}
          </div>
        );
      }
    }
    return board;
  };

  return (
    <div className="grid grid-cols-8 w-full max-w-[560px] border-4 border-zinc-800 shadow-2xl rounded-sm overflow-hidden chess-board">
      {renderBoard()}
    </div>
  );
};

export default ChessBoard;
