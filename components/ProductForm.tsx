
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import { Product, ProductFeature, GroupTemplate } from '../types';
import { getSEOModelName } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import { PlusIcon, SaveIcon, TrashIcon, WandSparklesIcon, FileTextIcon, HelpCircleIcon, UploadCloudIcon } from './icons';

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
  onAddBrand?: (brand: string) => void;
  groups: string[];
  brands: string[];
  groupTemplates?: GroupTemplate[];
  productCreationNotes?: string;
  allProducts: Product[];
}

const nameGeneratorData: { [key: string]: { code: string; subgroups: { [key: string]: string } } } = {
  'İçecek Hazırlama': {
    code: '1',
    subgroups: {
      'Filtre Kahve Makinası': '11', 'TKM': '12', 'Espresso Makinası': '13', 'Smoothie Blender': '14', 'Çay Makinası': '15'
    }
  },
  'Yemek Hazırlama': {
    code: '2',
    subgroups: {
      'Hamur Makinası': '21', 'Blender': '22', 'Rondo': '23', 'Chopper': '24', 'Kıyma Makinası': '25', 'Vakum Makinası': '26'
    }
  },
  'Pişirme Grubu': {
    code: '3',
    subgroups: {
      'Pizza Fırını': '31', 'Pizza Tavası': '32', 'İndiksiyon Ocak': '33', 'Tost Makinası': '34', 'Waffle Makinası': '35'
    }
  },
  'Zemin Temizlik': {
    code: '4',
    subgroups: {
      'Dik Süpürge': '41', 'Buharlı Temizlik': '42', 'Spot Cleaner': '43', 'Halı Yıkama Makinası': '44'
    }
  },
  'Kişisel Bakım': {
    code: '5',
    subgroups: { 'Erkek Bakım': '51', 'Kadın Bakım': '52' }
  },
  'Ev Yaşam': {
    code: '6',
    subgroups: { 'Hava Nemlendirici': '61', 'Ütü': '62' }
  },
  'Mobil Aksesuar': {
    code: '7',
    subgroups: { 'TWS': '71', 'Şarj': '72' }
  }
};


const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel, onAddBrand, groups, brands, groupTemplates = [], productCreationNotes, allProducts }) => {
  const [formData, setFormData] = useState<Product>(
    product || {
      id: '',
      name: '',
      group: '',
      brand: '',
      description: '',
      ean: '',
      mainImageUrl: '',
      instagramImageUrl: '',
      boxImageUrl: '',
      ceCertificateUrls: [],
      features: [],
    }
  );
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [selectedSubgroup, setSelectedSubgroup] = useState('');
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showDiecutHelp, setShowDiecutHelp] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
          ...product,
          ceCertificateUrls: product.ceCertificateUrls || []
      });
    }
  }, [product]);


  useEffect(() => {
    if (formData.group) {
      const template = groupTemplates.find(t => t.groupName === formData.group);
      if (template && template.requiredFeatures.length > 0) {
        const newFeatures = [...formData.features];
        template.requiredFeatures.forEach(reqFeatureName => {
          const featureExists = formData.features.some(f => f.text.startsWith(`${reqFeatureName}:`));
          if (!featureExists) {
            newFeatures.push({
              id: `${Date.now().toString()}-${reqFeatureName}`,
              language: 'TR',
              text: `${reqFeatureName}: `
            });
          }
        });
        setFormData(prev => ({ ...prev, features: newFeatures }));
      }
    }
  }, [formData.group, groupTemplates]);

  const groupOptions = useMemo(() => {
    const allGroups = new Set(groups);
    if (formData.group && !allGroups.has(formData.group)) {
      allGroups.add(formData.group);
    }
    return Array.from(allGroups).sort((a: string, b: string) => a.localeCompare(b));
  }, [groups, formData.group]);

  const { requiredFeatures, otherFeatures } = useMemo(() => {
    const template = groupTemplates.find(t => t.groupName === formData.group);
    const reqFeatureNames = template ? template.requiredFeatures : [];

    const requiredF = formData.features.filter(f => reqFeatureNames.some(rf => f.text.startsWith(`${rf}:`)));
    const otherF = formData.features.filter(f => !reqFeatureNames.some(rf => f.text.startsWith(`${rf}:`)));

    return { requiredFeatures: requiredF, otherFeatures: otherF };
  }, [formData.features, formData.group, groupTemplates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setFormErrors(prev => ({ ...prev, name: undefined }));
    }
    if (name === 'group') {
        setSelectedSubgroup('');
    }
    if (name === 'cost') {
      setFormData(prev => ({ ...prev, cost: value === '' ? undefined : Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGenerateName = () => {
    if (!formData.group || !nameGeneratorData[formData.group] || !selectedSubgroup) {
        alert('Lütfen ana ürün grubunu ve ardından bir alt grup seçin.');
        return;
    }
    const groupData = nameGeneratorData[formData.group];
    const subgroupCode = groupData.subgroups[selectedSubgroup];
    const groupCode = groupData.code;
    const prefix = `SCN${groupCode}${subgroupCode}`;

    let maxNum = 0;
    allProducts.forEach(p => {
        if (p.name.startsWith(prefix)) {
            const numPart = parseInt(p.name.substring(prefix.length), 10);
            if (!isNaN(numPart) && numPart > maxNum) {
                maxNum = numPart;
            }
        }
    });

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    const newName = `${prefix}${nextNum}`;
    
    setFormData(prev => ({ ...prev, name: newName }));
    setFormErrors(prev => ({ ...prev, name: undefined }));
  };

  const handleGetSeoName = async () => {
    if (!formData.group) {
      alert("Lütfen önce bir grup seçin.");
      return;
    }
    setIsGeneratingName(true);
    setFormErrors(prev => ({ ...prev, name: undefined }));
    try {
      const newName = await getSEOModelName(formData.group, formData.features, formData.name);
      setFormData(prev => ({ ...prev, name: newName }));
    } catch (e: any) {
      alert(e.message || "İsim önerisi alınamadı.");
    } finally {
      setIsGeneratingName(false);
    }
  };

  const handleFeatureChange = (featureId: string, value: string) => {
    const newFeatures = formData.features.map(f => f.id === featureId ? { ...f, text: value } : f);
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, { id: Date.now().toString(), language: 'TR', text: '' }],
    }));
  };

  const removeFeature = (id: string) => {
    const newFeatures = formData.features.filter(f => f.id !== id);
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const handleImageChange = (field: 'mainImageUrl' | 'instagramImageUrl' | 'boxImageUrl', url: string) => {
    setFormData(prev => ({ ...prev, [field]: url }));
  };

  const handleAddCE = (url: string) => {
    if (!url) return;
    setFormData(prev => ({ 
      ...prev, 
      ceCertificateUrls: [...(prev.ceCertificateUrls || []), url] 
    }));
  };

  const handleBatchCeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBatchLoading(true);
    // Explicitly type file as File to satisfy TypeScript that it is a Blob (File extends Blob)
    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        // file is a File which extends Blob
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises)
      .then(urls => {
        setFormData(prev => ({
          ...prev,
          ceCertificateUrls: [...(prev.ceCertificateUrls || []), ...urls]
        }));
      })
      .catch(err => {
        console.error("Toplu yükleme hatası:", err);
        alert("Bazı dosyalar yüklenirken hata oluştu.");
      })
      .finally(() => {
        setIsBatchLoading(false);
        if (batchFileInputRef.current) batchFileInputRef.current.value = '';
      });
  };

  const handleRemoveCE = (index: number) => {
    if (window.confirm('Bu CE belgesini silmek istediğinizden emin misiniz?')) {
      setFormData(prev => ({
        ...prev,
        ceCertificateUrls: (prev.ceCertificateUrls || []).filter((_, i) => i !== index)
      }));
    }
  };

  const handleAddBrand = () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;
    if (brands.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
      alert('Bu marka zaten mevcut.');
      return;
    }
    // We need to update the brands list in the parent state
    if (onAddBrand) {
      onAddBrand(trimmed);
    }
    setFormData(prev => ({ ...prev, brand: trimmed }));
    setIsAddingBrand(false);
    setNewBrandName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentErrors: { [key: string]: string } = {};

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      currentErrors['name'] = 'Ürün Adı zorunludur.';
    } else if (allProducts.some(p => p.name.toLowerCase() === trimmedName.toLowerCase() && p.id !== formData.id)) {
      currentErrors['name'] = 'Bu model adı zaten kullanılıyor.';
    }

    const template = groupTemplates.find(t => t.groupName === formData.group);
    if (template) {
      template.requiredFeatures.forEach(reqFeatureName => {
        const feature = formData.features.find(f => f.text.startsWith(`${reqFeatureName}:`));
        if (!feature || feature.text.replace(`${reqFeatureName}:`, '').trim().length === 0) {
          currentErrors[reqFeatureName] = `${reqFeatureName} alanı zorunludur.`;
        }
      });
    }

    if (Object.keys(currentErrors).length > 0) {
      setFormErrors(currentErrors);
      const firstError = Object.values(currentErrors)[0];
      alert(`Lütfen formu kontrol edin: ${firstError}`);
      return;
    }

    setFormErrors({});
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           Oturum Aktif
        </div>
      </div>

      {!product && productCreationNotes && (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400" role="alert">
          <h3 className="text-md font-semibold text-blue-800">Admin Notu: Yeni Ürün Oluşturma</h3>
          <p className="mt-1 text-sm text-blue-700 whitespace-pre-wrap">{productCreationNotes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Ürün Adı / Model Kodu</label>
          <div className="relative mt-1 flex rounded-md shadow-sm">
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={`flex-grow block w-full border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500 z-10 ${formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`} />
            <button type="button" onClick={handleGetSeoName} disabled={isGeneratingName} title="Yapay Zekadan İsim Önerisi Al" className="relative -ml-px inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200 transition-all">
                <WandSparklesIcon className={`h-5 w-5 ${isGeneratingName ? 'text-blue-500 animate-pulse' : 'text-purple-600'}`} />
            </button>
          </div>
          {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
        </div>
        <div>
          <label htmlFor="group" className="block text-sm font-medium text-gray-700">Ana Ürün Grubu</label>
          <select name="group" id="group" value={formData.group} onChange={handleChange} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="" disabled>Bir grup seçin...</option>
            {groupOptions.map(grp => (
              <option key={grp} value={grp}>{grp}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Marka</label>
          <div className="mt-1 flex gap-2">
            <select name="brand" id="brand" value={formData.brand || ''} onChange={handleChange} className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="">Marka seçin (Opsiyonel)</option>
              {brands.map(brnd => (
                <option key={brnd} value={brnd}>{brnd}</option>
              ))}
            </select>
            <button 
              type="button" 
              onClick={() => setIsAddingBrand(!isAddingBrand)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors border border-slate-300"
              title="Yeni Marka Ekle"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          {isAddingBrand && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input 
                type="text" 
                value={newBrandName} 
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Yeni marka adı..."
                className="flex-grow text-sm border-gray-300 rounded-md"
                autoFocus
              />
              <button 
                type="button" 
                onClick={handleAddBrand}
                className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700"
              >
                EKLE
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Ürün içeriği ve açıklaması (Zengin Metin)</label>
        <div className="bg-white rounded-md">
          <ReactQuill 
            theme="snow" 
            value={formData.description || ''} 
            onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
            className="h-64 mb-12"
            placeholder="Ürün hakkında detaylı açıklama giriniz..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ImageUploader label="Ana Ürün Görseli" imageUrl={formData.mainImageUrl} onImageChange={(url) => handleImageChange('mainImageUrl', url)} isEditing={true} />
        <ImageUploader label="Instagram Görseli" imageUrl={formData.instagramImageUrl} onImageChange={(url) => handleImageChange('instagramImageUrl', url)} isEditing={true} />
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-700">Kutu Diecut (Açınım)</label>
                <button 
                  type="button"
                  onClick={() => setShowDiecutHelp(!showDiecutHelp)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                  title="Diecut Şablon Yardımı"
                >
                    <HelpCircleIcon className="w-4 h-4" />
                </button>
            </div>
            
            {showDiecutHelp && (
                <div className="p-3 bg-slate-800 text-white rounded-lg text-[10px] leading-tight mb-2 animate-in fade-in slide-in-from-top-2">
                    <p className="font-bold text-blue-400 mb-1">Doğru 3D Mockup için Şablon:</p>
                    <div className="grid grid-cols-4 grid-rows-3 gap-1 w-20 mx-auto my-2 border border-white/20 p-1">
                        <div className="bg-white/10"></div><div className="bg-blue-500">T</div><div className="bg-white/10"></div><div className="bg-white/10"></div>
                        <div className="bg-blue-500">L</div><div className="bg-blue-500">F</div><div className="bg-blue-500">R</div><div className="bg-blue-500">B</div>
                        <div className="bg-white/10"></div><div className="bg-blue-500">Bt</div><div className="bg-white/10"></div><div className="bg-white/10"></div>
                    </div>
                    <p>Görseliniz 4 sütun x 3 satır haç düzeninde olmalıdır.</p>
                </div>
            )}

            <ImageUploader 
              label="" 
              imageUrl={formData.boxImageUrl || ''} 
              onImageChange={(url) => handleImageChange('boxImageUrl', url)} 
              isEditing={true} 
            />
        </div>
      </div>

      <div className="p-6 border rounded-xl bg-slate-50 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileTextIcon className="w-5 h-5 text-blue-500" />
                CE Belgeleri Yönetimi
            </h3>
            <div className="flex gap-2 w-full sm:w-auto">
                <input 
                    type="file" 
                    multiple 
                    ref={batchFileInputRef} 
                    onChange={handleBatchCeUpload} 
                    className="hidden" 
                    accept="application/pdf,image/*"
                />
                <button 
                    type="button" 
                    onClick={() => batchFileInputRef.current?.click()}
                    disabled={isBatchLoading}
                    className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:bg-blue-300"
                >
                    {isBatchLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <UploadCloudIcon className="w-4 h-4" />}
                    TOPLU YÜKLE
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(formData.ceCertificateUrls || []).map((url, index) => (
                <div key={index} className="relative group p-4 bg-white border rounded-lg shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center text-blue-600 font-bold">
                        {index + 1}
                    </div>
                    <div className="overflow-hidden flex-grow text-left">
                        <p className="text-xs font-bold text-gray-700 truncate">CE Belgesi</p>
                        <p className="text-[10px] text-gray-400 truncate">Sertifika #{index + 1}</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => handleRemoveCE(index)} 
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <div className="flex flex-col gap-2">
                <ImageUploader 
                    label="Belge Yükle" 
                    imageUrl="" 
                    onImageChange={handleAddCE} 
                    isEditing={true} 
                    accept="application/pdf,image/*" 
                    heightClassName="h-24" 
                />
            </div>
        </div>
      </div>

      <div className="space-y-6">
        {requiredFeatures.length > 0 && (
          <div className="p-6 border border-indigo-100 rounded-xl bg-indigo-50/30">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <WandSparklesIcon className="w-5 h-5 text-indigo-500" />
                Zorunlu Ürün Özellikleri
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {requiredFeatures.map((feature) => {
                const featureName = feature.text.split(':')[0];
                const isError = !!formErrors[featureName];
                return (
                  <div key={feature.id} className="space-y-1">
                    <label className="text-xs font-bold text-indigo-700 ml-1 uppercase text-left block">{featureName}</label>
                    <div className={`relative flex items-center bg-white rounded-lg border transition-all ${isError ? 'border-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.1)]' : 'border-indigo-200 hover:border-indigo-400'}`}>
                      <input
                        type="text"
                        value={feature.text.substring(featureName.length + 1).trimStart()}
                        onChange={(e) => handleFeatureChange(feature.id, `${featureName}: ${e.target.value}`)}
                        className="w-full px-4 py-3 bg-transparent text-sm focus:outline-none"
                        placeholder={`${featureName} değerini giriniz...`}
                      />
                    </div>
                    {isError && <p className="text-red-600 text-[10px] font-medium ml-1 text-left">{formErrors[featureName]}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="p-6 border border-slate-200 rounded-xl bg-white">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Çoklu Dil ve Diğer Özellikler</h3>
                <button type="button" onClick={addFeature} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all">
                    <PlusIcon className="w-4 h-4" />
                    ÖZELLİK EKLE
                </button>
            </div>
            <div className="space-y-3">
            {otherFeatures.map((feature) => (
                <div key={feature.id} className="group flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-300 transition-all">
                <select
                    value={feature.language}
                    onChange={(e) => {
                    const newFeatures = formData.features.map(f => f.id === feature.id ? { ...f, language: e.target.value } : f);
                    setFormData(prev => ({ ...prev, features: newFeatures }));
                    }}
                    className="bg-white border-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option>TR</option>
                    <option>EN</option>
                    <option>DE</option>
                    <option>FR</option>
                </select>
                <input type="text" placeholder="Özellik açıklaması..." value={feature.text} onChange={(e) => handleFeatureChange(feature.id, e.target.value)} className="flex-grow bg-white border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="button" onClick={() => removeFeature(feature.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                    <TrashIcon className="w-5 h-5" />
                </button>
                </div>
            ))}
            {otherFeatures.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-sm text-slate-400 italic text-center">Henüz ekstra özellik eklenmedi.</p>
                </div>
            )}
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-8 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">İPTAL</button>
        <button type="submit" className="flex items-center gap-2 px-10 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          <SaveIcon className="w-5 h-5" />
          DEĞİŞİKLİKLERİ KAYDET
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
