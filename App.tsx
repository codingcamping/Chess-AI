
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './components/ChessBoard';
import { GeminiChessService } from './services/geminiService';
import { ChatMessage } from './types';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("Make a move to see AI analysis.");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isAiPlaying, setIsAiPlaying] = useState(false);
  const [elo, setElo] = useState<number>(1500);
  
  const aiService = useRef(new GeminiChessService());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const makeAiMove = useCallback(async (currentGame: Chess) => {
    if (currentGame.isGameOver()) return;
    
    setIsAiPlaying(true);
    const moveSan = await aiService.current.getBestMove(currentGame.fen(), elo);
    
    if (moveSan) {
      try {
        const gameCopy = new Chess(currentGame.fen());
        const move = gameCopy.move(moveSan);
        if (move) {
          setGame(gameCopy);
          setHistory(prev => [...prev, move.san]);
          
          // Also get analysis for the new position
          const analysis = await aiService.current.getMoveAnalysis(gameCopy.fen(), [...history, move.san], elo);
          setAiAnalysis(analysis);
        } else {
          console.warn("AI suggested illegal move, retrying internal logic...");
          // Fallback: make random legal move if AI fails to give legal SAN
          const moves = currentGame.moves();
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          const fallbackCopy = new Chess(currentGame.fen());
          fallbackCopy.move(randomMove);
          setGame(fallbackCopy);
          setHistory(prev => [...prev, randomMove]);
        }
      } catch (e) {
        console.error("AI Move error", e);
      }
    }
    setIsAiPlaying(false);
  }, [elo, history]);

  const onMove = useCallback(async ({ from, to, promotion }: { from: string, to: string, promotion?: string }) => {
    if (isAiPlaying) return;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({ from, to, promotion: promotion || 'q' });

      if (move) {
        setGame(gameCopy);
        setHistory(prev => [...prev, move.san]);
        
        // Analyze position
        setIsAiThinking(true);
        const analysis = await aiService.current.getMoveAnalysis(gameCopy.fen(), [...history, move.san], elo);
        setAiAnalysis(analysis);
        setIsAiThinking(false);

        // Check game over
        if (gameCopy.isGameOver()) {
          const result = gameCopy.isCheckmate() ? `Checkmate! ${gameCopy.turn() === 'w' ? 'Black' : 'White'} wins.` : "Draw!";
          setChatMessages(prev => [...prev, { role: 'assistant', content: `Game Over. ${result}` }]);
        } else {
          // Trigger AI Move
          setTimeout(() => makeAiMove(gameCopy), 500);
        }
      }
    } catch (e) {
      console.error("Invalid move attempted", e);
    }
  }, [game, history, elo, isAiPlaying, makeAiMove]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    
    setIsAiThinking(true);
    const aiResponse = await aiService.current.getChatResponse(userMsg, game.fen(), elo);
    setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    setIsAiThinking(false);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setHistory([]);
    setAiAnalysis("New game started. You are White.");
    setChatMessages([]);
  };

  const getEloLabel = (e: number) => {
    if (e < 1000) return "Novice";
    if (e < 1500) return "Intermediate";
    if (e < 2000) return "Expert";
    if (e < 2500) return "Master";
    if (e < 3000) return "Grandmaster";
    return "Legend";
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-zinc-900 p-4 md:p-8 gap-8">
      {/* Left Column: Board and Controls */}
      <div className="flex-1 flex flex-col items-center">
        <header className="w-full max-w-[560px] flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <i className="fas fa-chess-knight text-amber-500"></i>
              Grandmaster AI
            </h1>
            <p className="text-zinc-400 text-sm">Challenge the {elo} Elo AI Engine</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={resetGame}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-md transition-all border border-zinc-700"
            >
              New Game
            </button>
          </div>
        </header>

        {/* Elo Slider Section */}
        <div className="w-full max-w-[560px] mb-6 bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg relative overflow-hidden">
          {isAiPlaying && (
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px] flex items-center justify-center z-20">
               <div className="flex items-center gap-2 text-amber-500 font-bold animate-pulse">
                 <i className="fas fa-robot"></i>
                 <span>AI IS THINKING...</span>
               </div>
            </div>
          )}
          <div className="flex justify-between items-center mb-3">
            <span className="text-zinc-400 text-sm font-medium">Opponent Strength</span>
            <span className="text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full text-sm">
              {elo} Elo — {getEloLabel(elo)}
            </span>
          </div>
          <input 
            type="range" 
            min="100" 
            max="4000" 
            step="50"
            disabled={isAiPlaying}
            value={elo}
            onChange={(e) => setElo(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
          />
          <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-mono">
            <span>100</span>
            <span>1000</span>
            <span>2000</span>
            <span>3000</span>
            <span>4000</span>
          </div>
        </div>

        <div className="relative group">
           <ChessBoard 
            fen={game.fen()} 
            onMove={onMove} 
            isGameOver={game.isGameOver() || isAiPlaying} 
          />
          {isAiPlaying && (
            <div className="absolute inset-0 bg-black/5 pointer-events-none rounded-sm border-2 border-amber-500/20"></div>
          )}
        </div>

        <div className="w-full max-w-[560px] mt-6 grid grid-cols-2 gap-4">
           <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-amber-500/20">
               Live Analysis
             </div>
             <div className="flex items-center gap-2 mb-2 text-amber-500 font-semibold">
               <i className="fas fa-brain"></i>
               <span>AI Insights</span>
             </div>
             <p className="text-zinc-300 text-sm leading-relaxed italic">
               "{aiAnalysis}"
             </p>
           </div>
           <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 shadow-lg">
             <div className="flex items-center gap-2 mb-2 text-blue-400 font-semibold">
               <i className="fas fa-history"></i>
               <span>Match Stats</span>
             </div>
             <div className="space-y-1 text-xs text-zinc-400">
               <div className="flex justify-between"><span>Moves:</span> <span className="text-zinc-100">{history.length}</span></div>
               <div className="flex justify-between"><span>Turn:</span> <span className="text-zinc-100 uppercase">{game.turn() === 'w' ? 'White (You)' : 'Black (AI)'}</span></div>
               <div className="flex justify-between"><span>Status:</span> <span className="text-zinc-100">{game.inCheck() ? 'CHECK' : 'Stable'}</span></div>
             </div>
           </div>
        </div>
      </div>

      {/* Right Column: Chat and History */}
      <div className="w-full lg:w-[400px] flex flex-col h-[600px] lg:h-auto bg-zinc-800 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-700 bg-zinc-800/50 backdrop-blur-md flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2 text-zinc-100">
            <i className="fas fa-comments text-amber-500"></i>
            Coach Chat
          </h2>
          {(isAiThinking || isAiPlaying) && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-600">
          {chatMessages.length === 0 && (
            <div className="text-center mt-10">
              <i className="fas fa-chess-pawn text-4xl text-zinc-600 mb-4"></i>
              <p className="text-zinc-500 text-sm px-8 italic">Ask your {elo} Elo coach about the board!</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === 'user' 
                ? 'bg-amber-600 text-white rounded-tr-none' 
                : 'bg-zinc-700 text-zinc-100 rounded-tl-none border border-zinc-600'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* History Preview */}
        {history.length > 0 && (
          <div className="p-3 bg-zinc-900/50 border-t border-zinc-700">
             <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Move History</p>
             <div className="flex flex-wrap gap-2">
               {history.slice(-8).map((h, i) => (
                 <span key={i} className="px-2 py-0.5 bg-zinc-700 rounded text-[10px] font-mono text-zinc-300">
                   {h}
                 </span>
               ))}
               {history.length > 8 && <span className="text-[10px] text-zinc-600">...</span>}
             </div>
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-zinc-900 border-t border-zinc-700 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask your coach..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-white"
          />
          <button 
            type="submit"
            disabled={isAiThinking || isAiPlaying}
            className="p-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-900 rounded-lg transition-colors"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
