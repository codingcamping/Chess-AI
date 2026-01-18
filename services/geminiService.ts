
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiChessService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  async getBestMove(fen: string, elo: number): Promise<string | null> {
    const eloContext = this.getEloDescription(elo);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Current Chess Position (FEN): ${fen}. 
        You are playing as a player with ${elo} Elo (${eloContext}).
        Your task: Return the best legal move for the current side. 
        If your Elo is low (<800), you might make simple mistakes or ignore hanging pieces. 
        If your Elo is high (>2500), you must find the most precise grandmaster move.
        IMPORTANT: Only return the move in Standard Algebraic Notation (SAN), e.g., "e4", "Nf3", "O-O", "Bxf7+". Do not include any other text.`,
        config: {
          thinkingConfig: { thinkingBudget: elo > 2000 ? 1000 : 0 },
        }
      });

      const moveStr = response.text?.trim().replace(/\./g, '');
      return moveStr || null;
    } catch (error) {
      console.error("Gemini Move Error:", error);
      return null;
    }
  }

  async getMoveAnalysis(fen: string, history: string[], elo: number): Promise<string> {
    const eloContext = this.getEloDescription(elo);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this chess position (FEN: ${fen}). Skill level: Elo ${elo} (${eloContext}). 
        Recent move history: ${history.slice(-5).join(', ')}. 
        Provide a brief strategic insight (max 2 sentences) fitting this Elo.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || "Analysis unavailable.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "Failed to get AI analysis.";
    }
  }

  async getChatResponse(message: string, fen: string, elo: number): Promise<string> {
    const eloContext = this.getEloDescription(elo);
    
    // Check for "bad language" / curses
    const profaneWords = ['fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cunt', 'idiot', 'stupid', 'bastard'];
    const hasCurse = profaneWords.some(word => message.toLowerCase().includes(word));

    try {
      const systemPrompt = hasCurse 
        ? `The user just cursed or was rude. You are a savage, badass chess grandmaster with ${elo} Elo. 
           Roast them for their low-level behavior and their chess skills. Be witty, cold, and absolutely savage. 
           Keep it under 3 sentences. No filters, just pure high-IQ arrogance.`
        : `You are a chess coach representing a player with an Elo of ${elo} (${eloContext}). 
           Current FEN: ${fen}. User asks: "${message}". 
           Answer concisely at a depth matching ${elo} Elo.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          thinkingConfig: { thinkingBudget: hasCurse ? 1000 : 500 }
        }
      });
      return response.text || "I'm not sure about that.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "Even the API is embarrassed by that request.";
    }
  }

  private getEloDescription(elo: number): string {
    if (elo < 800) return "Beginner - prone to blunders";
    if (elo < 1200) return "Casual Player";
    if (elo < 1600) return "Club Player";
    if (elo < 2000) return "Expert";
    if (elo < 2500) return "Master";
    if (elo < 3500) return "Grandmaster";
    return "Super-Engine / Chess God";
  }
}
