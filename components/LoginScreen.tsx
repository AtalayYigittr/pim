import React, { useState } from 'react';
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, HelpCircleIcon, BarcodeIcon } from './icons';
import { User } from '../types';

interface LoginCredentials {
  companyId: string;
  username: string;
  password?: string;
}

interface LoginScreenProps {
  onLogin: (credentials: Required<LoginCredentials>) => Promise<boolean>;
  onFindUser: (credentials: Omit<LoginCredentials, 'password'>) => Promise<User | null>;
  onResetPassword: (credentials: Required<LoginCredentials>) => Promise<void>;
}

type View = 'LOGIN' | 'FORGOT_CREDENTIALS' | 'FORGOT_ANSWER' | 'FORGOT_RESET';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onFindUser, onResetPassword }) => {
  const [view, setView] = useState<View>('LOGIN');
  
  const [companyId, setCompanyId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password state
  const [forgotUser, setForgotUser] = useState<User | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const clearForm = () => {
    // Keep companyId and username for convenience if they were just used
    setPassword('');
    setError('');
    setSuccessMessage('');
    setForgotUser(null);
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedCompanyId = companyId.trim();
    const trimmedUsername = username.trim();
    if (trimmedCompanyId && trimmedUsername && password) {
      const success = await onLogin({ companyId: trimmedCompanyId, username: trimmedUsername, password });
      if (!success) {
        setError('Geçersiz Firma ID, kullanıcı adı veya şifre.');
      }
    }
  };
  
  const handleForgotCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = await onFindUser({ companyId, username });
    if (user) {
        if (!user.securityQuestion) {
            setError('Bu hesap için güvenlik sorusu ayarlanmamış. Lütfen yönetici ile iletişime geçin.');
            return;
        }
        setForgotUser(user);
        setView('FORGOT_ANSWER');
    } else {
        setError('Kullanıcı bulunamadı.');
    }
  };

  const handleForgotAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (forgotUser && securityAnswer.toLowerCase() === forgotUser.securityAnswer?.toLowerCase()) {
        setView('FORGOT_RESET');
    } else {
        setError('Güvenlik yanıtı yanlış.');
    }
  };
  
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!newPassword || newPassword.length < 4) {
          setError('Şifre en az 4 karakter olmalıdır.');
          return;
      }
      if (newPassword !== confirmPassword) {
          setError('Şifreler eşleşmiyor.');
          return;
      }
      if(forgotUser) {
          await onResetPassword({ companyId, username: forgotUser.username, password: newPassword });
          setSuccessMessage('Şifreniz başarıyla güncellendi! Şimdi giriş yapabilirsiniz.');
          clearForm();
          setView('LOGIN');
      }
  };

  const renderLogin = () => (
    <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
        <div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <BarcodeIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input id="companyId" name="companyId" type="text" required
                  className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Firma ID'si" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
            </div>
            <p className="mt-2 text-xs text-gray-500 px-1">
                Şirket veritabanınızın benzersiz tanımlayıcısı. Bilmiyorsanız yöneticinize başvurun.
            </p>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input id="username" name="username" type="text" required
              className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Kullanıcı Adı" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
         <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <LockIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} required
              className="w-full pl-10 pr-10 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
            </button>
        </div>
        <div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105">
              Giriş Yap
            </button>
        </div>
        <div className="text-center">
            <button type="button" onClick={() => { clearForm(); setView('FORGOT_CREDENTIALS'); }} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                Şifrenizi mi unuttunuz?
            </button>
        </div>
    </form>
  );
  
  const renderForgotCredentials = () => (
    <form className="mt-8 space-y-6" onSubmit={handleForgotCredentialsSubmit}>
        <div>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><BarcodeIcon className="w-5 h-5 text-gray-400" /></div>
                <input id="companyId-forgot" name="companyId" type="text" required placeholder="Firma ID'nizi Girin" value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
            </div>
            <p className="mt-2 text-xs text-gray-500 px-1">
                Şirket veritabanınızın benzersiz tanımlayıcısı. Bilmiyorsanız yöneticinize başvurun.
            </p>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><UserIcon className="w-5 h-5 text-gray-400" /></div>
            <input id="username-forgot" name="username" type="text" required placeholder="Kullanıcı Adınızı Girin" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
        </div>
        <div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Devam</button>
        </div>
         <div className="text-center">
            <button type="button" onClick={() => { clearForm(); setView('LOGIN'); }} className="text-sm font-medium text-blue-600 hover:text-blue-500">Giriş'e dön</button>
        </div>
    </form>
  );
  
  const renderForgotAnswer = () => (
    <form className="mt-8 space-y-6" onSubmit={handleForgotAnswerSubmit}>
        <div className="p-4 bg-gray-100 rounded-md text-center">
            <p className="text-sm text-gray-600">Güvenlik Sorusu:</p>
            <p className="font-semibold text-gray-800">{forgotUser?.securityQuestion}</p>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><HelpCircleIcon className="w-5 h-5 text-gray-400" /></div>
            <input id="security-answer" name="securityAnswer" type="text" required placeholder="Cevabınız" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
        </div>
        <div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Onayla</button>
        </div>
        <div className="text-center">
            <button type="button" onClick={() => { clearForm(); setView('LOGIN'); }} className="text-sm font-medium text-blue-600 hover:text-blue-500">İptal</button>
        </div>
    </form>
  );

  const renderResetPassword = () => (
    <form className="mt-8 space-y-6" onSubmit={handleResetPasswordSubmit}>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><LockIcon className="w-5 h-5 text-gray-400" /></div>
            <input id="new-password" name="newPassword" type="password" required placeholder="Yeni Şifre" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
        </div>
         <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><LockIcon className="w-5 h-5 text-gray-400" /></div>
            <input id="confirm-password" name="confirmPassword" type="password" required placeholder="Yeni Şifreyi Onayla" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
        </div>
        <div>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Şifreyi Sıfırla</button>
        </div>
    </form>
  );
  
  const titles = {
      LOGIN: {title: 'Ürün Portalı', subtitle: 'Hesabınızla giriş yapın'},
      FORGOT_CREDENTIALS: {title: 'Şifre Sıfırlama', subtitle: 'Hesabınızı doğrulamak için bilgilerinizi girin'},
      FORGOT_ANSWER: {title: 'Şifre Sıfırlama', subtitle: 'Lütfen güvenlik sorunuzu yanıtlayın'},
      FORGOT_RESET: {title: 'Şifre Sıfırlama', subtitle: 'Lütfen yeni şifrenizi belirleyin'},
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">{titles[view].title}</h1>
          <p className="mt-2 text-gray-600">{titles[view].subtitle}</p>
        </div>
        
        {error && <p className="text-sm text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
        {successMessage && <p className="text-sm text-center text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>}
        
        {view === 'LOGIN' && renderLogin()}
        {view === 'FORGOT_CREDENTIALS' && renderForgotCredentials()}
        {view === 'FORGOT_ANSWER' && renderForgotAnswer()}
        {view === 'FORGOT_RESET' && renderResetPassword()}
      </div>
    </div>
  );
};

export default LoginScreen;