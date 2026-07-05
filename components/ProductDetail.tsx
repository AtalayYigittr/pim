
import React, { useState } from 'react';
import { Product, AIRecommendation } from '../types';
import { EditIcon, TrashIcon, FileTextIcon, EyeIcon, FileDownIcon } from './icons';
import ImageUploader from './ImageUploader';
import GeminiRecommendations from './GeminiRecommendations';
import BoxMockup3D from './BoxMockup3D';

interface ProductDetailProps {
  product: Product;
  onEdit: (product?: Product) => void;
  onDelete: (productId: string) => void;
  onUpdate: (product: Product) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onEdit, onDelete, onUpdate }) => {
  const [showMockup, setShowMockup] = useState(false);
    
  const handleSaveRecommendations = (recommendations: AIRecommendation) => {
    const updatedProduct = { ...product, aiRecommendations: recommendations };
    onUpdate(updatedProduct);
  }

  const handleDownloadAllCertificates = () => {
    if (!product.ceCertificateUrls || product.ceCertificateUrls.length === 0) return;

    product.ceCertificateUrls.forEach((url, index) => {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      
      // Try to determine extension from base64 mime type
      let ext = 'pdf';
      if (url.startsWith('data:image/')) {
        const mime = url.split(';')[0].split(':')[1];
        ext = mime.split('/')[1];
      }
      
      link.download = `CE_Belgesi_${product.name}_${index + 1}.${ext}`;
      document.body.appendChild(link);
      
      // Use a timeout to avoid browser blocking multiple downloads at once
      setTimeout(() => {
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-bold text-gray-800">{product.name}</h2>
            {product.brand && <span className="text-sm font-bold text-slate-500 border border-slate-300 px-2 py-0.5 rounded uppercase">{product.brand}</span>}
          </div>
          <p className="mt-2 text-sm text-blue-800 bg-blue-100 px-3 py-1 rounded-full inline-block font-semibold">{product.group}</p>
          <div className="mt-3 flex items-center gap-4 text-md text-gray-500">
            <span>EAN: {product.ean}</span>
            {product.cost !== undefined && product.cost !== null && (
                <>
                    <span className="text-gray-300">|</span>
                    <span className="font-semibold">Maliyet: <span className="text-gray-800">${product.cost.toFixed(2)}</span></span>
                </>
            )}
           </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(product)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition" title="Düzenle">
            <EditIcon className="w-5 h-5" />
          </button>
          <button onClick={() => onDelete(product.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full transition" title="Sil">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {product.description && (
        <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200 text-left">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Ürün içeriği ve açıklaması</h3>
          <div 
            className="text-gray-700 text-sm leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <ImageUploader label="Ana Ürün Görseli" imageUrl={product.mainImageUrl} onImageChange={()=>{}} isEditing={false} />
        <ImageUploader label="Instagram Görseli" imageUrl={product.instagramImageUrl} onImageChange={()=>{}} isEditing={false}/>
        <div className="relative group">
            <ImageUploader label="Kutu Görseli" imageUrl={product.boxImageUrl || ''} onImageChange={()=>{}} isEditing={false}/>
            {product.boxImageUrl && (
                <button 
                  onClick={() => setShowMockup(true)}
                  className="absolute bottom-10 right-2 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all text-xs font-bold"
                >
                    <EyeIcon className="w-4 h-4" />
                    3D Mockup
                </button>
            )}
        </div>
      </div>
      
       <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold text-gray-800">CE Belgeleri</h3>
            {product.ceCertificateUrls && product.ceCertificateUrls.length > 1 && (
                <button 
                    onClick={handleDownloadAllCertificates}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-md active:scale-95"
                >
                    <FileDownIcon className="w-4 h-4" />
                    TÜM BELGELERİ İNDİR ({product.ceCertificateUrls.length})
                </button>
            )}
        </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {product.ceCertificateUrls && product.ceCertificateUrls.length > 0 ? (
                 product.ceCertificateUrls.map((url, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                         <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-blue-600 hover:underline font-medium text-left">
                            <FileTextIcon className="w-6 h-6 flex-shrink-0 text-slate-400"/>
                            <div className="overflow-hidden">
                                <span className="block truncate">CE Belgesi #{index + 1}</span>
                                <span className="text-[10px] text-gray-400">PDF / Görsel</span>
                            </div>
                         </a>
                    </div>
                 ))
            ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 col-span-full">
                    <p className="text-gray-500 italic text-center">CE Belgesi yüklenmemiş.</p>
                </div>
            )}
         </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 text-left">Ürün Özellikleri</h3>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <ul className="space-y-3">
            {product.features.map(feature => (
              <li key={feature.id} className="flex items-center text-gray-700 text-left">
                <span className="font-bold text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-1 mr-3">{feature.language}</span>
                {feature.text}
              </li>
            ))}
            {product.features.length === 0 && <p className="text-gray-500 text-center">Bu ürün için özellik girilmemiş.</p>}
          </ul>
        </div>
      </div>
      
      <GeminiRecommendations product={product} onSaveRecommendations={handleSaveRecommendations} />

      {showMockup && product.boxImageUrl && (
          <BoxMockup3D imageUrl={product.boxImageUrl} onClose={() => setShowMockup(false)} />
      )}
    </div>
  );
};

export default ProductDetail;
