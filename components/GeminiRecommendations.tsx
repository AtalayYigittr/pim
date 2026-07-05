
import React, { useState } from 'react';
import { Product, AIRecommendation } from '../types';
import { getAIRecommendations } from '../services/geminiService';
import { WandSparklesIcon } from './icons';

interface GeminiRecommendationsProps {
  product: Product;
  onSaveRecommendations: (recommendations: AIRecommendation) => void;
}

const GeminiRecommendations: React.FC<GeminiRecommendationsProps> = ({ product, onSaveRecommendations }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation | undefined>(product.aiRecommendations);

  const handleFetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAIRecommendations(product);
      if (result) {
        setRecommendations(result);
      }
    } catch (e: any) {
      setError(e.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = () => {
      if (recommendations) {
        onSaveRecommendations(recommendations);
      }
  }

  return (
    <div className="p-6 bg-slate-50 rounded-xl mt-6 border border-slate-200">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Yapay Zeka Ürün Önerileri</h3>
        <button
          onClick={handleFetchRecommendations}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <WandSparklesIcon className="w-4 h-4" />
          )}
          {recommendations ? 'Yeniden Oluştur' : 'Öneri Oluştur'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
      
      {isLoading && <p className="mt-4 text-sm text-slate-600 animate-pulse">Yapay zeka düşünürken lütfen bekleyin...</p>}

      {recommendations && !isLoading && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">Benzer Ürünler</h4>
            <ul className="space-y-2">
              {recommendations.similar.map((item, index) => (
                <li key={`sim-${index}`} className="text-sm bg-white p-3 rounded-md shadow-sm border border-slate-100">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-2">Tamamlayıcı Ürünler</h4>
            <ul className="space-y-2">
              {recommendations.complementary.map((item, index) => (
                <li key={`comp-${index}`} className="text-sm bg-white p-3 rounded-md shadow-sm border border-slate-100">{item}</li>
              ))}
            </ul>
          </div>
          {JSON.stringify(product.aiRecommendations) !== JSON.stringify(recommendations) && (
             <div className="md:col-span-2 flex justify-end">
                <button 
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Önerileri Kaydet
                </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeminiRecommendations;
