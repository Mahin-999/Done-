
import { GoogleGenAI } from "@google/genai";

export const askStudyQuestion = async (query: string, imageBase64?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let contents: any;
    
    if (imageBase64) {
      const [mimeInfo, base64Data] = imageBase64.split(';base64,');
      const mimeType = mimeInfo.replace('data:', '');
      
      contents = {
        parts: [
          { text: query },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      };
    } else {
      contents = query;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: "You are a warm, supportive, and brilliant academic assistant for a BBA Section 3B student named Mithila (Ishana). Your tone is like a caring tutor and cheerleader. Help her with marketing, math, accounting, or computer apps. If she sends a photo, explain it clearly. Always end with a sweet word of encouragement like 'You've got this, Ishana!'",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "I'm having a little trouble, but you're smart enough to solve this! Try asking again.";
  } catch (error) {
    console.error("Error in study question:", error);
    return "The study assistant is resting. Don't worry, you're doing amazing!";
  }
};

export const getStudyTips = async (subject: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide 3 encouraging study tips for "${subject}".`,
    });
    return response.text || "Keep studying hard!";
  } catch (error) {
    return "You're doing great!";
  }
};
