
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Product, AIRecommendation, ProductFeature } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIRecommendations = async (product: Product): Promise<AIRecommendation | null> => {
  if (!process.env.API_KEY) {
    // Simulate a delay and return mock data if API key is not present
    console.log("Simulating AI response due to missing API key.");
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      similar: ["Benzer Ürün A (Mock)", "Benzer Ürün B (Mock)"],
      complementary: ["Tamamlayıcı Ürün C (Mock)", "Tamamlayıcı Ürün D (Mock)"],
    };
  }
  
  const productFeatures = product.features.map(f => `- ${f.language}: ${f.text}`).join('\n');

  const prompt = `
    You are a marketing expert for small home appliances.
    Based on the following product, suggest similar and complementary products.
    
    Product Name: ${product.name}
    Product EAN: ${product.ean}
    Features:
    ${productFeatures}

    Provide your answer ONLY in JSON format, with no additional text or markdown.
    The JSON object should have two keys: "similar" and "complementary", both containing an array of product name strings.
    Example format: {"similar": ["Product A", "Product B"], "complementary": ["Accessory X", "Accessory Y"]}
    The response should be in Turkish.
  `;

  try {
    // Fix: Using 'gemini-3-flash-preview' for basic text tasks per guidelines
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            similar: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of similar product names.',
            },
            complementary: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of complementary product names.',
            },
          },
          required: ['similar', 'complementary'],
        },
      },
    });

    const jsonStr = response.text.trim();
    const parsedData = JSON.parse(jsonStr) as AIRecommendation;
    return parsedData;

  } catch (error) {
    console.error("Error fetching AI recommendations:", error);
    throw new Error("Yapay zeka önerileri alınırken bir hata oluştu.");
  }
};

export const getSEOModelName = async (group: string, features: ProductFeature[], currentName: string): Promise<string> => {
    if (!process.env.API_KEY) {
        console.log("Simulating SEO name generation due to missing API key.");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `${currentName} Plus+ (Mock AI)`;
    }

    const featuresText = features.map(f => `- ${f.text}`).join('\n');

    const prompt = `
        You are an expert product naming and marketing specialist for small home appliances in the Turkish market.
        Based on the following product information, generate a single, catchy, marketable, and SEO-friendly product name.
        
        Product Group: ${group}
        Current/Technical Name: ${currentName}
        Features:
        ${featuresText}

        The name should be in Turkish. It should be appealing to consumers.
        Do not explain your choice. Just provide the name.
        Do not return the current name. Provide a new, creative one.
        Example outputs: "Mutfak Şefi Pro", "Sessiz Güç Blender", "Hızlı Kahve Uzmanı".

        Provide your answer as a single line of text.
    `;

    try {
        // Fix: Using 'gemini-3-flash-preview' for basic text tasks per guidelines
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                temperature: 0.8,
            },
        });

        const text = response.text.trim().replace(/"/g, ''); // Clean up quotes
        return text;
    } catch (error) {
        console.error("Error fetching SEO model name:", error);
        throw new Error("Yapay zekadan isim önerisi alınırken bir hata oluştu.");
    }
};
