import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, User, AppSettings, GroupTemplate, EanCode, CompanyData, CompanyBackupData } from './types';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import ProductForm from './components/ProductForm';
import {
  CogIcon, UsersIcon, TrashIcon, PlusIcon, BarcodeIcon, FileDownIcon,
  UploadCloudIcon, EditIcon, SaveIcon, EyeIcon, EyeOffIcon, Share2Icon,
  HardDriveIcon, FolderOpenIcon, LogOutIcon, LogInIcon
} from './components/icons';
import { findOrCreateFile, readDriveFile, writeDriveFile, DRIVE_SCOPES } from './drive';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '991854551046-ov5ivlgg2dfjr1a57evmbcc9ja6vu1cm.apps.googleusercontent.com';

const DEFAULT_DATA: CompanyData = {
  products: [],
  users: [{ username: 'admin', role: 'admin', password: 'admin123' }],
  groups: ['Mutfak Robotları', 'Pişirme Grubu', 'İçecek Hazırlama'],
  brands: ['Goldmaster', 'Arzum', 'Fakir'],
  settings: { groupTemplates: [], eanCodes: [], productCreationNotes: '' },
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type View = 'DETAIL' | 'EDIT' | 'NEW' | 'ADMIN' | 'REPORT';

interface DriveSession {
  accessToken: string;
  googleEmail: string;
  googleName: string;
  googlePicture: string;
}

// ─── REPORT SCREEN ────────────────────────────────────────────────────────────
const ReportScreen: React.FC<{
  products: Product[]; groupTemplates: GroupTemplate[];
  onBack: () => void; onSelectProduct: (id: string) => void;
}> = ({ products, groupTemplates, onBack, onSelectProduct }) => {
  const reportData = useMemo(() => {
    const fieldLabels: Record<string, string> = {
      mainImageUrl: 'Ana Ürün Görseli', instagramImageUrl: 'Instagram Görseli',
      boxImageUrl: 'Kutu Görseli', ceCertificateUrls: 'CE Belgesi',
    };
    const always = Object.keys(fieldLabels);
    return products.map(p => {
      const tmpl = groupTemplates.find(t => t.groupName === p.group);
      const required = [...always, ...(tmpl?.requiredFeatures || [])];
      let filled = 0; const missing: string[] = [];
      required.forEach(f => {
        let ok = false;
        if (always.includes(f)) { const v = p[f as keyof Product]; ok = !!v && (typeof v === 'string' ? v.length > 0 : (v as any[]).length > 0); }
        else { const feat = p.features.find(x => x.text.startsWith(f + ':')); ok = !!(feat && feat.text.replace(f + ':', '').trim()); }
        if (ok) filled++; else missing.push(fieldLabels[f] || f);
      });
      const pct = required.length > 0 ? Math.round(filled / required.length * 100) : 100;
      return { ...p, completeness: pct, missingFeatures: missing, total: required.length, filled };
    }).sort((a, b) => a.completeness - b.completeness);
  }, [products, groupTemplates]);

  return (
    <div className="p-8 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Ürün Doluluk Raporu</h2>
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">Geri Dön</button>
      </div>
      <div className="space-y-4">
        {reportData.map(d => (
          <div key={d.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <div>
                <button onClick={() => onSelectProduct(d.id)} className="text-lg font-semibold text-blue-600 hover:underline">{d.name}</button>
                <p className="text-sm text-gray-500">{d.ean}</p>
              </div>
              <span className="text-sm font-medium text-gray-600">{d.group}</span>
            </div>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Doluluk ({d.filled}/{d.total})</span>
                <span className={`text-sm font-bold ${d.completeness < 100 ? 'text-gray-800' : 'text-green-700'}`}>{d.completeness}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${d.completeness < 50 ? 'bg-red-500' : d.completeness < 100 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${d.completeness}%` }} />
              </div>
            </div>
            {d.missingFeatures.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm font-semibold text-red-700">Eksik Alanlar:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-1 grid grid-cols-2 md:grid-cols-3 gap-x-4">
                  {d.missingFeatures.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const AdminPanel: React.FC<{
  companyData: CompanyData;
  onUpdate: (upd: (d: CompanyData) => CompanyData) => void;
  onBack: () => void;
}> = ({ companyData, onUpdate, onBack }) => {
  const [tab, setTab] = useState<'users' | 'groups' | 'brands' | 'eans' | 'backup'>('users');
  const [newUsername, setNewUsername] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [editGroup, setEditGroup] = useState<{ old: string; val: string } | null>(null);
  const [editBrand, setEditBrand] = useState<{ old: string; val: string } | null>(null);
  const [eanInput, setEanInput] = useState('');
  const [err, setErr] = useState('');

  const products = companyData.products || [];
  const users = companyData.users || [];
  const groups = companyData.groups || [];
  const brands = companyData.brands || [];
  const eanCodes = companyData.settings?.eanCodes || [];

  const handleBackup = () => {
    const json = JSON.stringify({ backupDate: new Date().toISOString(), version: '2.0-drive', data: companyData }, null, 2);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `yedek_${Date.now()}.json`; a.click();
  };

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'users', label: 'Kullanıcılar' }, { key: 'groups', label: 'Gruplar' },
    { key: 'brands', label: 'Markalar' }, { key: 'eans', label: 'EAN Yönetimi' },
    { key: 'backup', label: 'Yedekleme' },
  ];

  return (
    <div className="p-8 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Admin Paneli</h2>
        <button onClick={onBack} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">Geri Dön</button>
      </div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`py-3 px-1 border-b-2 font-medium text-sm ${tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
          ))}
        </nav>
      </div>

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Yeni kullanıcı adı" className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <button onClick={() => {
              if (!newUsername.trim()) return;
              if (users.find(u => u.username === newUsername.trim())) { setErr('Bu kullanıcı zaten var.'); return; }
              onUpdate(d => ({ ...d, users: [...d.users, { username: newUsername.trim(), role: 'dealer', password: newUsername.trim() }] }));
              alert(`'${newUsername}' eklendi. Varsayılan şifre: kullanıcı adı`);
              setNewUsername(''); setErr('');
            }} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Ekle</button>
          </div>
          {err && <p className="text-red-500 text-sm">{err}</p>}
          <ul className="space-y-2">
            {users.map(u => (
              <li key={u.username} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.username}</span>
                  {u.role === 'admin' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Admin</span>}
                </div>
                {u.role !== 'admin' && (
                  <button onClick={() => { if (confirm(`'${u.username}' silinsin mi?`)) onUpdate(d => ({ ...d, users: d.users.filter(x => x.username !== u.username) })); }} className="text-red-500 hover:text-red-700">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'groups' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="Yeni grup adı" className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <button onClick={() => {
              if (!newGroup.trim() || groups.includes(newGroup.trim())) return;
              onUpdate(d => ({ ...d, groups: [...d.groups, newGroup.trim()].sort((a,b)=>a.localeCompare(b)) }));
              setNewGroup('');
            }} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Ekle</button>
          </div>
          <ul className="space-y-2">
            {groups.map(g => (
              <li key={g} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                {editGroup?.old === g
                  ? <input value={editGroup.val} onChange={e => setEditGroup({ old: g, val: e.target.value })} onBlur={() => {
                    const nv = editGroup.val.trim();
                    if (nv && (nv === g || !groups.includes(nv))) {
                      onUpdate(d => ({ ...d, groups: d.groups.map(x => x===g?nv:x).sort((a,b)=>a.localeCompare(b)), products: d.products.map(p => p.group===g?{...p,group:nv}:p) }));
                    }
                    setEditGroup(null);
                  }} autoFocus className="border border-blue-300 rounded px-2 py-1 text-sm flex-grow mr-2" />
                  : <span className="font-medium text-sm">{g}</span>}
                <div className="flex gap-2">
                  <button onClick={() => setEditGroup({ old: g, val: g })}><EditIcon className="w-4 h-4 text-gray-500 hover:text-blue-600" /></button>
                  {!products.some(p => p.group === g) && <button onClick={() => { if (confirm(`'${g}' silinsin mi?`)) onUpdate(d => ({ ...d, groups: d.groups.filter(x=>x!==g) })); }}><TrashIcon className="w-4 h-4 text-gray-500 hover:text-red-600" /></button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'brands' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="Yeni marka adı" className="flex-grow border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <button onClick={() => {
              if (!newBrand.trim() || brands.includes(newBrand.trim())) return;
              onUpdate(d => ({ ...d, brands: [...(d.brands||[]), newBrand.trim()].sort((a,b)=>a.localeCompare(b)) }));
              setNewBrand('');
            }} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Ekle</button>
          </div>
          <ul className="space-y-2">
            {brands.map(b => (
              <li key={b} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border">
                {editBrand?.old === b
                  ? <input value={editBrand.val} onChange={e => setEditBrand({ old: b, val: e.target.value })} onBlur={() => {
                    const nv = editBrand.val.trim();
                    if (nv && (nv === b || !brands.includes(nv))) {
                      onUpdate(d => ({ ...d, brands: (d.brands||[]).map(x=>x===b?nv:x).sort((a,b)=>a.localeCompare(b)), products: d.products.map(p=>p.brand===b?{...p,brand:nv}:p) }));
                    }
                    setEditBrand(null);
                  }} autoFocus className="border border-blue-300 rounded px-2 py-1 text-sm flex-grow mr-2" />
                  : <span className="font-medium text-sm">{b}</span>}
                <div className="flex gap-2">
                  <button onClick={() => setEditBrand({ old: b, val: b })}><EditIcon className="w-4 h-4 text-gray-500 hover:text-blue-600" /></button>
                  {!products.some(p => p.brand === b) && <button onClick={() => { if (confirm(`'${b}' silinsin mi?`)) onUpdate(d => ({ ...d, brands: (d.brands||[]).filter(x=>x!==b) })); }}><TrashIcon className="w-4 h-4 text-gray-500 hover:text-red-600" /></button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'eans' && (
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-slate-50">
            <h3 className="font-semibold mb-2">EAN Kodu Ekle</h3>
            <p className="text-xs text-gray-500 mb-3">Her satıra bir 13 haneli EAN kodu girin.</p>
            <textarea value={eanInput} onChange={e => setEanInput(e.target.value)} rows={4} className="w-full border border-gray-300 rounded-md p-2 font-mono text-sm" placeholder="8690000000001&#10;8690000000002" />
            <button onClick={() => {
              const codes = [...new Set(eanInput.split('\n').map(c => c.trim()).filter(c => c && /^\d{13}$/.test(c)))];
              if (!codes.length) { alert('Geçerli EAN kodu bulunamadı.'); return; }
              const existing = new Set((companyData.settings.eanCodes||[]).map(e=>e.code));
              const toAdd = codes.filter(c => !existing.has(c));
              if (toAdd.length > 0) {
                onUpdate(d => ({ ...d, settings: { ...d.settings, eanCodes: [...(d.settings.eanCodes||[]), ...toAdd.map(code => { const p = d.products.find(x=>x.ean===code); return { code, used: !!p, productId: p?.id }; })] } }));
                alert(`${toAdd.length} EAN kodu eklendi.`);
              }
              setEanInput('');
            }} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Yükle</button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EAN</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eanCodes.length === 0
                  ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic">Henüz EAN kodu yok.</td></tr>
                  : eanCodes.map(e => (
                    <tr key={e.code} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{e.code}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${e.used ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{e.used ? 'Kullanımda' : 'Boşta'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.productId ? (products.find(p=>p.id===e.productId)?.name || e.productId) : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {!e.used && <button onClick={() => { if(confirm(`${e.code} silinsin mi?`)) onUpdate(d => ({ ...d, settings: { ...d.settings, eanCodes: (d.settings.eanCodes||[]).filter(x=>x.code!==e.code) } })); }} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4 inline" /></button>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-blue-50">
            <h3 className="font-bold text-blue-800 mb-2">Veri Yedekleme</h3>
            <p className="text-sm text-blue-600 mb-3">Tüm veriler JSON olarak bilgisayarınıza indirilir.</p>
            <button onClick={handleBackup} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">Yedeği İndir (.json)</button>
          </div>
          <div className="p-4 border rounded-lg bg-amber-50">
            <h3 className="font-bold text-amber-800 mb-2">Yedekten Geri Yükle</h3>
            <p className="text-xs text-amber-700 mb-3">⚠️ Mevcut tüm verilerin üzerine yazar.</p>
            <input type="file" accept=".json" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader(); r.onload = ev => {
                try {
                  const backup = JSON.parse(ev.target?.result as string);
                  const data: CompanyData = backup.data || backup;
                  if (!data.products) { alert('Geçersiz dosya.'); return; }
                  if (confirm('Geri yüklensin mi?')) onUpdate(() => data);
                } catch { alert('Geçersiz JSON.'); }
              }; r.readAsText(f);
            }} className="block w-full text-sm mb-2" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── STARTUP SCREEN ────────────────────────────────────────────────────────────
const StartupScreen: React.FC<{
  onGoogleSignIn: () => void;
  isLoading: boolean;
}> = ({ onGoogleSignIn, isLoading }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-2xl mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Pazarlama Portalı</h1>
          <p className="text-slate-400 text-lg">Ürün veritabanınızı yönetin</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <p className="text-slate-300 text-sm text-center mb-6">
            Her firma kendi Google Drive hesabındaki izole veritabanını kullanır.
          </p>
          <button
            onClick={onGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3.5 px-6 rounded-xl hover:bg-gray-50 transition-all shadow-lg active:scale-95 disabled:opacity-60"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google ile Giriş Yap
          </button>
          <p className="text-slate-400 text-xs text-center mt-4">
            Veriler Google Drive'ınızda saklanır · Ücretsiz
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── FIRM SELECT SCREEN ────────────────────────────────────────────────────────
const FirmSelectScreen: React.FC<{
  googleName: string;
  googlePicture: string;
  googleEmail: string;
  onSelect: (firmId: string, user: User) => void;
  onSignOut: () => void;
  accessToken: string;
}> = ({ googleName, googlePicture, googleEmail, onSelect, onSignOut, accessToken }) => {
  const [firmId, setFirmId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    const id = firmId.trim().toUpperCase();
    if (!id) { setError('Firma ID boş olamaz.'); return; }
    setLoading(true); setError('');
    try {
      const filename = `pazarlama_db_${id}.json`;
      const fileId = await findOrCreateFile(accessToken, filename);
      const raw = await readDriveFile(accessToken, fileId);

      // New firm — create with defaults
      if (!raw.users || raw.users.length === 0) {
        const initialData: CompanyData = { ...DEFAULT_DATA };
        await writeDriveFile(accessToken, fileId, initialData);
        onSelect(id, initialData.users[0]);
        return;
      }

      // Existing firm — check password
      const data = raw as CompanyData;
      const user = data.users.find(u => u.password === password || (u.role === 'admin' && !password && !u.password));
      if (!user) { setError('Şifre hatalı.'); setLoading(false); return; }
      onSelect(id, user);
    } catch (e: any) {
      setError('Hata: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={googlePicture} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/30" />
          <p className="text-white font-medium">{googleName}</p>
          <p className="text-slate-400 text-sm">{googleEmail}</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-bold text-xl mb-6 text-center">Firma Seç / Giriş Yap</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Firma ID</label>
              <input
                type="text"
                value={firmId}
                onChange={e => setFirmId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleEnter()}
                placeholder="Örn: LORENTZ"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg tracking-widest uppercase"
              />
              <p className="text-slate-400 text-xs mt-1.5">Her firma ID'si ayrı bir veritabanı oluşturur. Yeni bir ID girerseniz otomatik kurulum yapılır.</p>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Kullanıcı Şifresi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnter()}
                placeholder="Şifrenizi girin"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-slate-400 text-xs mt-1.5">Yeni firma için şifre gerekmez — admin olarak girersiniz.</p>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

            <button
              onClick={handleEnter}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 mt-2"
            >
              {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Yükleniyor...</span> : 'Devam Et →'}
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <button onClick={onSignOut} className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 mx-auto">
            <LogOutIcon className="w-4 h-4" />
            Farklı Google hesabıyla giriş yap
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [step, setStep] = useState<'startup' | 'firmselect' | 'app'>('startup');
  const [driveSession, setDriveSession] = useState<DriveSession | null>(null);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [gsiLoading, setGsiLoading] = useState(false);

  const [firmId, setFirmId] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('DETAIL');
  const [exportSelection, setExportSelection] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Load GSI script
  useEffect(() => {
    if (document.getElementById('gsi-script')) { setGsiLoaded(true); return; }
    const s = document.createElement('script');
    s.id = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => setGsiLoaded(true);
    document.head.appendChild(s);
  }, []);

  // Init token client after GSI loads
  useEffect(() => {
    if (!gsiLoaded) return;
    const check = setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        clearInterval(check);
        const tc = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: DRIVE_SCOPES + ' https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (resp: any) => {
            if (resp.error) { alert('Google girişi başarısız: ' + resp.error); setGsiLoading(false); return; }
            // Fetch user info
            const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: 'Bearer ' + resp.access_token }
            }).then(r => r.json());
            setDriveSession({ accessToken: resp.access_token, googleEmail: info.email, googleName: info.name, googlePicture: info.picture });
            setStep('firmselect');
            setGsiLoading(false);
          },
        });
        setTokenClient(tc);
      }
    }, 100);
  }, [gsiLoaded]);

  const handleGoogleSignIn = () => {
    if (!tokenClient) { alert('Google henüz yüklenmedi, bekleyin.'); return; }
    setGsiLoading(true);
    tokenClient.requestAccessToken({ prompt: 'consent' });
  };

  const handleFirmSelect = async (id: string, user: User) => {
    if (!driveSession) return;
    const filename = `pazarlama_db_${id}.json`;
    const fileId = await findOrCreateFile(driveSession.accessToken, filename);
    const raw = await readDriveFile(driveSession.accessToken, fileId);
    const data: CompanyData = (raw.users?.length > 0) ? raw as CompanyData : DEFAULT_DATA;
    setFirmId(id);
    setCurrentUser(user);
    setCompanyData(data);
    setDriveFileId(fileId);
    setStep('app');
  };

  const saveTimer = useRef<any>(null);

  const updateCompanyData = useCallback((updater: (d: CompanyData) => CompanyData) => {
    setCompanyData(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      // Debounced Drive save
      clearTimeout(saveTimer.current);
      setSyncStatus('saving');
      saveTimer.current = setTimeout(async () => {
        if (!driveSession || !driveFileId) return;
        try {
          await writeDriveFile(driveSession.accessToken, driveFileId, next);
          setSyncStatus('saved');
        } catch {
          setSyncStatus('error');
        }
      }, 1500);
      return next;
    });
  }, [driveSession, driveFileId]);

  const handleSaveProduct = useCallback(async (productData: Product) => {
    if (!companyData) return;
    updateCompanyData(data => {
      let d = { ...data };
      if (!productData.id) {
        const avail = (d.settings.eanCodes || []).find(e => !e.used);
        if (!avail) { alert('Boşta EAN kodu yok. Admin panelinden ekleyin.'); return data; }
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const saved = { ...productData, id: newId, ean: avail.code };
        setSelectedProductId(newId);
        setCurrentView('DETAIL');
        return {
          ...d,
          products: [...d.products, saved],
          settings: { ...d.settings, eanCodes: (d.settings.eanCodes||[]).map(e => e.code === avail.code ? { ...e, used: true, productId: newId } : e) }
        };
      } else {
        setSelectedProductId(productData.id);
        setCurrentView('DETAIL');
        return { ...d, products: d.products.map(p => p.id === productData.id ? productData : p) };
      }
    });
  }, [companyData, updateCompanyData]);

  const handleDeleteProduct = useCallback((productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    updateCompanyData(d => {
      const p = d.products.find(x => x.id === productId);
      const eans = p?.ean ? (d.settings.eanCodes||[]).map(e => e.code === p.ean ? { ...e, used: false, productId: undefined } : e) : d.settings.eanCodes;
      return { ...d, products: d.products.filter(x => x.id !== productId), settings: { ...d.settings, eanCodes: eans } };
    });
    if (selectedProductId === productId) setSelectedProductId(null);
  }, [updateCompanyData, selectedProductId]);

  const handleExportPdf = async () => {
    if (!exportSelection.length || !companyData) return;
    setIsExporting(true);
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const toExport = companyData.products.filter(p => exportSelection.includes(p.id));
    for (let i = 0; i < toExport.length; i++) {
      const p = toExport[i];
      const el = document.createElement('div');
      el.style.cssText = 'width:210mm;padding:15mm;box-sizing:border-box;font-family:Helvetica,sans-serif;color:#333;';
      el.innerHTML = `<h1 style="font-size:24px;font-weight:bold">${p.name}</h1><p style="color:#0056b3;font-size:14px">${p.group}</p><p style="font-size:12px;color:#666">EAN: ${p.ean}</p><hr style="margin:16px 0"/><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${p.mainImageUrl ? `<img src="${p.mainImageUrl}" style="width:100%;border-radius:8px"/>` : ''}<ul style="font-size:12px">${p.features.map(f=>`<li style="margin-bottom:6px"><b>${f.language}</b> ${f.text}</li>`).join('')}</ul></div>`;
      document.body.appendChild(el);
      const canvas = await html2canvas(el, { scale: 1.5 });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      document.body.removeChild(el);
    }
    pdf.save(`katalog_${new Date().toISOString().slice(0,10)}.pdf`);
    setIsExporting(false);
    setExportSelection([]);
  };

  const handleSignOut = () => {
    if ((window as any).google?.accounts?.oauth2 && driveSession) {
      (window as any).google.accounts.oauth2.revoke(driveSession.accessToken);
    }
    setDriveSession(null); setStep('startup'); setCompanyData(null);
    setCurrentUser(null); setFirmId(''); setDriveFileId(null);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  if (step === 'startup') return <StartupScreen onGoogleSignIn={handleGoogleSignIn} isLoading={gsiLoading} />;
  if (step === 'firmselect' && driveSession) return (
    <FirmSelectScreen
      googleName={driveSession.googleName}
      googlePicture={driveSession.googlePicture}
      googleEmail={driveSession.googleEmail}
      onSelect={handleFirmSelect}
      onSignOut={handleSignOut}
      accessToken={driveSession.accessToken}
    />
  );

  if (!companyData || !currentUser) return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isExporting) return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-50">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-xl font-semibold text-gray-700">PDF oluşturuluyor...</p>
    </div>
  );

  const selectedProduct = companyData.products.find(p => p.id === selectedProductId);
  const syncLabel = syncStatus === 'saving' ? '⏳ Kaydediliyor...' : syncStatus === 'saved' ? '✓ Drive\'a kaydedildi' : syncStatus === 'error' ? '⚠ Kayıt hatası' : '';

  return (
    <div className="h-screen w-screen flex bg-gray-100 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-slate-800 text-white px-4 py-2.5 flex justify-between items-center text-sm shadow-md z-10 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <span className="font-bold text-white">{firmId}</span>
          </div>
          <span className="text-slate-400 text-xs">|</span>
          {driveSession && (
            <div className="flex items-center gap-2">
              <img src={driveSession.googlePicture} className="w-5 h-5 rounded-full" alt="" />
              <span className="text-slate-300 text-xs">{driveSession.googleName}</span>
            </div>
          )}
          {syncLabel && <span className={`text-xs px-2 py-0.5 rounded ${syncStatus === 'saving' ? 'text-amber-300 bg-amber-900/30' : syncStatus === 'saved' ? 'text-green-300 bg-green-900/30' : 'text-red-300 bg-red-900/30'}`}>{syncLabel}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-300 text-xs">{currentUser.username} <span className="opacity-50">({currentUser.role})</span></span>
          <button onClick={() => { setStep('firmselect'); setCurrentView('DETAIL'); setSelectedProductId(null); }} className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors">
            <LogOutIcon className="w-4 h-4" /> Firma Değiştir
          </button>
          <button onClick={handleSignOut} className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors">
            <LogOutIcon className="w-4 h-4" /> Çıkış
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-grow overflow-hidden">
        <aside className="w-1/4 max-w-sm h-full flex-shrink-0">
          <ProductList
            products={companyData.products}
            selectedProductId={selectedProductId}
            onSelectProduct={id => { setSelectedProductId(id); setCurrentView('DETAIL'); }}
            onAddProduct={() => { setSelectedProductId(null); setCurrentView('NEW'); }}
            currentUser={currentUser}
            users={companyData.users}
            onSetCurrentUser={setCurrentUser}
            onGoToAdmin={() => setCurrentView('ADMIN')}
            onGoToReport={() => setCurrentView('REPORT')}
            exportSelection={exportSelection}
            onExportSelectionChange={(id, checked) => setExportSelection(prev => checked ? [...prev, id] : prev.filter(x => x !== id))}
            onExport={handleExportPdf}
          />
        </aside>

        <main className="flex-grow h-full overflow-y-auto p-6 bg-gray-50">
          {currentView === 'ADMIN' && (
            <AdminPanel
              companyData={companyData}
              onUpdate={updateCompanyData}
              onBack={() => setCurrentView('DETAIL')}
            />
          )}
          {currentView === 'REPORT' && (
            <ReportScreen
              products={companyData.products}
              groupTemplates={companyData.settings.groupTemplates || []}
              onBack={() => setCurrentView('DETAIL')}
              onSelectProduct={id => { setSelectedProductId(id); setCurrentView('DETAIL'); }}
            />
          )}
          {(currentView === 'DETAIL' || currentView === 'EDIT' || currentView === 'NEW') && (
            <>
              {currentView === 'DETAIL' && selectedProduct && (
                <ProductDetail
                  product={selectedProduct}
                  onEdit={() => setCurrentView('EDIT')}
                  onDelete={handleDeleteProduct}
                  onUpdate={p => updateCompanyData(d => ({ ...d, products: d.products.map(x => x.id === p.id ? p : x) }))}
                />
              )}
              {(currentView === 'EDIT' || currentView === 'NEW') && (
                <ProductForm
                  product={currentView === 'EDIT' ? selectedProduct : null}
                  onSave={handleSaveProduct}
                  onCancel={() => setCurrentView('DETAIL')}
                  onAddBrand={b => updateCompanyData(d => ({ ...d, brands: [...(d.brands||[]), b].sort((a,b)=>a.localeCompare(b)) }))}
                  groups={companyData.groups}
                  brands={companyData.brands || []}
                  groupTemplates={companyData.settings.groupTemplates}
                  productCreationNotes={companyData.settings.productCreationNotes}
                  allProducts={companyData.products}
                />
              )}
              {currentView === 'DETAIL' && !selectedProduct && (
                <div className="flex flex-col items-center justify-center h-full text-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-3xl font-bold text-gray-800">Ürün Pazarlama Portalı</h2>
                  <p className="mt-2 text-lg text-slate-500 font-semibold">{firmId}</p>
                  <p className="mt-4 text-gray-500">Bu firmada <strong>{companyData.products.length}</strong> ürün var.<br />Başlamak için soldan bir ürün seçin.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
