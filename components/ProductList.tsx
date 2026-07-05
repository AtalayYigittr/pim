import React from 'react';
import { Product, User } from '../types';
import { PlusIcon, CogIcon, FileDownIcon, UsersIcon, BarChartIcon } from './icons';

interface ProductListProps {
  products: Product[];
  selectedProductId: string | null;
  onSelectProduct: (id: string) => void;
  onAddProduct: () => void;
  currentUser: User;
  users: User[];
  onSetCurrentUser: (user: User) => void;
  onGoToAdmin: () => void;
  onGoToReport: () => void;
  exportSelection: string[];
  onExportSelectionChange: (id: string, checked: boolean) => void;
  onExport: () => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  currentUser,
  users,
  onSetCurrentUser,
  onGoToAdmin,
  onGoToReport,
  exportSelection,
  onExportSelectionChange,
  onExport,
}) => {

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUser = users.find(u => u.username === e.target.value);
    if (selectedUser) {
      onSetCurrentUser(selectedUser);
    }
  };

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Ürünler</h2>
        <div className="mt-4">
            <label htmlFor="user-switcher" className="block text-sm font-medium text-gray-700 mb-1">Aktif Kullanıcı</label>
            <div className="relative">
                 <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <UsersIcon className="w-5 h-5 text-gray-400" />
                </div>
                <select
                    id="user-switcher"
                    value={currentUser.username}
                    onChange={handleUserChange}
                    className="w-full pl-10 pr-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none"
                    aria-label="Kullanıcı değiştir"
                >
                    {users.map(user => (
                        <option key={user.username} value={user.username}>
                            {user.username} ({user.role})
                        </option>
                    ))}
                </select>
            </div>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        <ul className="p-2 space-y-1">
          {products.map(product => (
            <li
              key={product.id}
              className={`flex items-center gap-2 p-1 rounded-lg transition-colors ${
                selectedProductId === product.id ? 'bg-blue-100' : ''
              }`}
            >
              <input
                type="checkbox"
                aria-label={`Select ${product.name} for export`}
                className="ml-2 flex-shrink-0 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                checked={exportSelection.includes(product.id)}
                onChange={(e) => onExportSelectionChange(product.id, e.target.checked)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => onSelectProduct(product.id)}
                className={`w-full text-left p-2 rounded-md flex items-center gap-4 transition-colors ${
                  selectedProductId === product.id
                    ? 'text-blue-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <img src={product.mainImageUrl || 'https://picsum.photos/seed/placeholder/40/40'} alt={product.name} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
                <div className="flex-grow overflow-hidden">
                    <p className="truncate text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 truncate">{product.ean}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-gray-200 space-y-2">
        {currentUser.role === 'admin' && (
           <div className="grid grid-cols-2 gap-2">
            <button
                onClick={onGoToAdmin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                >
                <CogIcon className="w-5 h-5" />
                Admin
            </button>
             <button
                onClick={onGoToReport}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                <BarChartIcon className="w-5 h-5" />
                Rapor
            </button>
           </div>
        )}
         <button
          onClick={onExport}
          disabled={exportSelection.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <FileDownIcon className="w-5 h-5" />
          Seçilenleri İndir ({exportSelection.length})
        </button>
        <button
          onClick={onAddProduct}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-5 h-5" />
          Yeni Ürün Ekle
        </button>
      </div>
    </div>
  );
};

export default ProductList;