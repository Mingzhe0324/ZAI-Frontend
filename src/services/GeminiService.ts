import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Message {
  role: "user" | "model";
  content: string;
  id: string;
  timestamp: number;
  image?: string; // base64 string
}

export const sendMessageStream = async (
  message: string,
  history: Message[],
  onChunk: (chunk: string) => void,
  image?: { data: string; mimeType: string }
) => {
  try {
    const chatHistory = history.map((msg) => {
      const parts: any[] = [{ text: msg.content }];
      if (msg.image) {
        // Extract base64 and mime type from data URL
        const [meta, data] = msg.image.split(",");
        const mimeType = meta.split(":")[1].split(";")[0];
        parts.push({
          inlineData: {
            data,
            mimeType,
          },
        });
      }
      return {
        role: msg.role,
        parts,
      };
    });

    const currentParts: any[] = [{ text: message }];
    if (image) {
      currentParts.push({
        inlineData: {
          data: image.data,
          mimeType: image.mimeType,
        },
      });
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: [...chatHistory, { role: "user", parts: currentParts }],
      config: {
        systemInstruction: "You are ILMU, a sophisticated and helpful AI companion. You are concise, intelligent, and have a calm, reassuring personality. You can see and analyze images provided by the user. You thrive on providing precise information while maintaining a warm and approachable tone. Your interface looks like a high-end scientific instrument, so your language should reflect a blend of clarity and elegance.",
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
      },
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
