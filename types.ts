
export interface ProductFeature {
  id: string;
  language: string;
  text: string;
}

export interface AIRecommendation {
  similar: string[];
  complementary: string[];
}

export interface Product {
  id: string;
  name: string;
  group: string;
  ean: string;
  mainImageUrl: string;
  instagramImageUrl: string;
  boxImageUrl?: string;
  ceCertificateUrls: string[]; // Changed from ceCertificateUrl to array
  brand?: string;
  description?: string;
  features: ProductFeature[];
  aiRecommendations?: AIRecommendation;
  cost?: number;
}

export interface User {
  username: string;
  role: 'admin' | 'dealer';
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  uid?: string;
}

export interface GroupTemplate {
  groupName: string;
  requiredFeatures: string[];
}

export interface EanCode {
  code: string;
  used: boolean;
  productId?: string;
}

export interface AppSettings {
    groupTemplates?: GroupTemplate[];
    eanCodes?: EanCode[];
    productCreationNotes?: string;
}

export interface CompanyData {
  products: Product[];
  users: User[];
  groups: string[];
  brands: string[];
  settings: AppSettings;
}

export interface CompanyBackupData {
    backupDate: string;
    version: string;
    companyId: string;
    data: CompanyData;
}
