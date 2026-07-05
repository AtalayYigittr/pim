
import React, { useRef, useState, useCallback } from 'react';
import { UploadCloudIcon, FileTextIcon, TrashIcon } from './icons';

interface ImageUploaderProps {
  label: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
  isEditing: boolean;
  accept?: string;
  heightClassName?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ label, imageUrl, onImageChange, isEditing, accept, heightClassName = 'h-64' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.onerror = () => {
        console.error("Dosya okunurken bir hata oluştu.");
        alert("Dosya okunurken bir hata oluştu.");
      };
      reader.readAsDataURL(file);
    }
  }, [onImageChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
    if(e.target) e.target.value = '';
  }, [handleFileSelect]);
  
  const handleContainerClick = useCallback(() => {
      if(isEditing && !imageUrl) {
          fileInputRef.current?.click();
      }
  }, [isEditing, imageUrl]);

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      if(isEditing) {
        setIsDragging(isEntering);
      }
  }, [isEditing]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if(isEditing) {
        const file = e.dataTransfer.files?.[0] || null;
        handleFileSelect(file);
    }
  }, [isEditing, handleFileSelect, handleDragEvents]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bu görseli silmek istediğinizden emin misiniz?')) {
      onImageChange('');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
        accept={accept || "image/png, image/jpeg, image/gif, image/webp"}
        disabled={!isEditing}
        aria-label={`Upload ${label}`}
      />
      <div
        onClick={handleContainerClick}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDrop={handleDrop}
        role="button"
        aria-label={isEditing ? `Upload or drag and drop an image for ${label}` : label}
        tabIndex={isEditing ? 0 : -1}
        onKeyDown={(e) => e.key === 'Enter' && handleContainerClick()}
        className={`mt-1 flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md bg-gray-50 relative transition-all duration-200 ease-in-out ${heightClassName}
        ${isEditing && !imageUrl ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' : ''}
        ${isDragging ? 'border-blue-500 bg-blue-50 scale-105 shadow-inner' : 'border-gray-300'}
        ${isEditing && !isDragging && !imageUrl ? 'hover:border-blue-400 hover:bg-gray-100' : ''}
        `}
      >
        {imageUrl ? (
          <>
            {imageUrl.startsWith('data:image/') ? (
               <img src={imageUrl} alt={label} className="h-full w-full object-contain rounded-md" />
            ) : (
                <div className="text-center text-gray-600">
                    <FileTextIcon className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2 text-sm font-semibold">Dosya Yüklendi</p>
                    <p className="text-xs text-gray-500">Görüntülemek için tıklayın</p>
                </div>
            )}
            
            {isEditing && (
              <button 
                onClick={handleDelete}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors z-20"
                title="Görseli Sil"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}

             {isEditing && !imageUrl.startsWith('data:application/pdf') && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 flex items-center justify-center transition-all duration-300 rounded-md group"
                >
                     <div className="text-center text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
                        <UploadCloudIcon className="mx-auto h-10 w-10 mb-2"/>
                        <p className="font-bold">Görseli Değiştir</p>
                    </div>
                </div>
            )}
          </>
        ) : (
          <div className="space-y-1 text-center pointer-events-none">
             <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/>
            <p className="text-sm text-gray-600">
                {isEditing ? <span className="font-semibold text-blue-600">Yüklemek için tıkla</span> : 'Dosya yok'}
            </p>
             {isEditing && <p className="text-xs text-gray-500">veya sürükleyip bırak</p>}
             {isEditing && <p className="text-xs text-gray-500 mt-2">{accept ? accept.split(',').map(s => s.split('/')[1]?.toUpperCase() || s).join(', ') : 'PNG, JPG, vb.'}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
