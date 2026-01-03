
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters } from "@google/genai";
import { AgentPersona, Message } from "../types";
import { SYSTEM_INSTRUCTIONS, MODELS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *sendMessageStream(
    persona: AgentPersona,
    history: Message[],
    useSearch: boolean = false
  ) {
    const modelName = useSearch ? MODELS.TEXT_PRO : MODELS.TEXT_FAST;
    
    const contents = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: msg.image 
        ? [{ text: msg.content }, { inlineData: { mimeType: 'image/jpeg', data: msg.image.split(',')[1] } }]
        : [{ text: msg.content }]
    }));

    const config: GenerateContentParameters = {
      model: modelName,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[persona],
        temperature: 0.7,
        tools: useSearch ? [{ googleSearch: {} }] : undefined
      }
    };

    const result = await this.ai.models.generateContentStream(config);
    
    for await (const chunk of result) {
      yield chunk;
    }
  }
}

export const geminiService = new GeminiService();
