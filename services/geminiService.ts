
import { GoogleGenAI } from "@google/genai";

const getMimeType = (base64: string) => {
  const match = base64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  return match ? match[1] : 'image/png';
};

/**
 * [MASTER SYNTHESIS ENGINE V12]
 * 의상 스타일(텍스트/이미지) 가중치 대폭 강화
 */
export const generateWeddingPhoto = async (
  brideBase64s: string[],
  groomBase64s: string[],
  scene: string,
  pose: string,
  filter: string,
  lighting: number,
  isHighQuality: boolean = true,
  sceneRefBase64?: string | null,
  poseRefBase64?: string | null,
  outfitDesc?: string,
  brideOutfitRefBase64?: string | null,
  groomOutfitRefBase64?: string | null,
  referenceResultBase64?: string | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-image-preview';

  const lightingDesc = lighting < 30 ? "soft ambient lighting" : lighting < 70 ? "professional studio lighting" : "dramatic high-contrast lighting";

  const parts: any[] = [];
  
  // 1. IDENTITY REFERENCES
  brideBase64s.forEach(img => parts.push({ inlineData: { data: img.split(',')[1], mimeType: getMimeType(img) } }));
  groomBase64s.forEach(img => parts.push({ inlineData: { data: img.split(',')[1], mimeType: getMimeType(img) } }));
  
  // 2. STYLE REFERENCES
  if (sceneRefBase64) parts.push({ inlineData: { data: sceneRefBase64.split(',')[1], mimeType: getMimeType(sceneRefBase64) } });
  if (poseRefBase64) parts.push({ inlineData: { data: poseRefBase64.split(',')[1], mimeType: getMimeType(poseRefBase64) } });
  if (brideOutfitRefBase64) parts.push({ inlineData: { data: brideOutfitRefBase64.split(',')[1], mimeType: getMimeType(brideOutfitRefBase64) } });
  if (groomOutfitRefBase64) parts.push({ inlineData: { data: groomOutfitRefBase64.split(',')[1], mimeType: getMimeType(groomOutfitRefBase64) } });

  if (referenceResultBase64) {
    parts.push({ inlineData: { data: referenceResultBase64.split(',')[1], mimeType: getMimeType(referenceResultBase64) } });
  }

  const prompt = `[PRO STUDIO DIRECTOR: HIGH FIDELITY MODE]
CORE MANDATE: Generate a masterpiece wedding photo with absolute consistency.

1. FACES (IDENTITIES): REPLICATE the exact facial features of the bride and groom from the provided face references.
2. OUTFIT (CLOTHING STYLE): 
   - PRIMARY INSTRUCTION: ${outfitDesc || "Standard elegant wedding attire"}
   - IF reference clothing images are provided, REPLICATE them exactly.
   - DO NOT use default clothing. Use the specified style.
3. ENVIRONMENT (SCENE): ${scene}. Maintain the atmosphere and lighting.
4. ACTION (POSE): ${pose}.
5. PHOTOGRAPHY STYLE: ${filter}, ${lightingDesc}.

CRITICAL: 100% face identity match is required. The clothing must perfectly match the chosen "OUTFIT STYLE" description. 2K resolution, photorealistic cinematic quality.`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: parts },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
        imageSize: "2K"
      }
    }
  });

  let imageUrl = '';
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!imageUrl) throw new Error("이미지 생성 엔진 오류");
  return imageUrl;
};

export const suggestWeddingPose = async (scene: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Suggest a single romantic wedding pose in "${scene}". English prompt only.`,
  });
  return response.text?.trim() || "standing side by side";
};

export const suggestWeddingRetouch = async (imagePrompt: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Suggest 4 concise professional photo editing commands in Korean for a wedding photo.`,
  });
  return response.text?.split('\n').filter(s => s.trim().length > 0).slice(0, 4) || ["밝기 보정", "피부톤 정리", "선명도 향상", "분위기 개선"];
};

export const editWeddingPhoto = async (sourceBase64: string, instruction: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { data: sourceBase64.split(',')[1], mimeType: getMimeType(sourceBase64) } },
        { text: `Edit this photo strictly based on: "${instruction}". Keep identities and clothing 100% same.` }
      ]
    }
  });

  let imageUrl = '';
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }
  return imageUrl;
};
