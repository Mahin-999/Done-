
import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStudyTips = async (subject: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide 3 very sweet, encouraging and high-impact study tips for the BBA course "${subject}". 
      Focus on professional growth and academic excellence. 
      The tone should be supportive, professional yet warm. 
      Format as a clean markdown list.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "I couldn't generate tips at this moment. You're still going to do great!";
  } catch (error) {
    console.error("Error generating study tips:", error);
    return "The AI advisor is taking a quick break. Believe in yourself!";
  }
};

export const askStudyQuestion = async (query: string, imageBase64?: string): Promise<string> => {
  try {
    let contents;
    
    // Handle multimodal input if image is provided
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
      contents = { parts: [{ text: query }] };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: `You are the 'Academic Concierge', a warm, sophisticated, and brilliant mentor for Mithila Islam Ishana, a BBA Section 3B student. 
        Your tone is premium, encouraging, and deeply knowledgeable about business topics (Marketing, Finance, Management, BIS). 
        When she asks questions:
        1. Be concise but insightful.
        2. Use business terminology correctly but explain it simply if she's stuck.
        3. If she uploads a photo, analyze the business context or math problem immediately.
        4. Always end with a personalized, high-energy encouragement like 'Your potential is limitless, Ishana!' or 'Keep building your empire!'`,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "I'm having a little trouble, but you're smart enough to solve this! Try asking again.";
  } catch (error) {
    console.error("Error in study question:", error);
    return "The study assistant is resting. Don't worry, you're doing amazing!";
  }
};
