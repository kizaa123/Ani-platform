/**
 * AI Service Layer — architecture-ready stubs for future integration.
 * Each service is isolated so vector DB, LLM, or ML models can be plugged in later.
 */

export interface MatchCandidate {
  farmerId: string;
  score: number;
  reason: string;
}

export class MatchingService {
  /** Future: embeddings + vector DB (Pinecone, pgvector) */
  async findMatches(_buyerId: string, _commodityId?: number): Promise<MatchCandidate[]> {
    return [];
  }
}

export class AssistantService {
  /** Future: LLM agricultural assistant chatbot */
  async ask(_userId: string, _question: string): Promise<{ answer: string }> {
    return { answer: 'AI assistant coming soon. Configure OPENAI_API_KEY to enable.' };
  }
}

export class DiseaseDetectionService {
  /** Future: crop disease image classification */
  async analyzeImage(_imageUrl: string): Promise<{ disease: string | null; confidence: number }> {
    return { disease: null, confidence: 0 };
  }
}

export class PricePredictionService {
  /** Future: commodity price forecasting */
  async predict(_commodityId: number, _region: string): Promise<{ predictedPrice: number; trend: string }> {
    return { predictedPrice: 0, trend: 'stable' };
  }
}

export const matchingService = new MatchingService();
export const assistantService = new AssistantService();
export const diseaseDetectionService = new DiseaseDetectionService();
export const pricePredictionService = new PricePredictionService();
