import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { neonDb } from '../services/neonDb';
import type { DeliveryAddressFields } from '../types';
import { readStoredJson, readStoredArray, writeStoredJson, removeStorage, isStoredUser } from '../utils/browserStorage';
import { canAccessSection as hasSection, permittedSections } from '../../lib/access.js';

export interface UserAddress extends DeliveryAddressFields {
  id: string;
  title: string; // 'المنزل', 'العمل', etc.
  governorate: string;
  city: string;
  details: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: 'customer' | 'admin';
  admin_permissions?: string[];
  provider: 'google' | 'email';
  email_verified?: boolean;
  addresses: UserAddress[];
  created_at: string;
  bio?: string;
}

export function isAccountAdmin(u?: Partial<User> | null): boolean {
  if (!u) return false;
  if (u.role === 'admin') return true;
  return false;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canAccessAdmin: boolean;
  canAccessSection: (section: string) => boolean;
  adminSections: string[];
  sessionReady: boolean;
  refreshAccess: () => Promise<boolean>;
  isAccessRefreshing: boolean;
  accessRefreshError: string;
  isAuthModalOpen: boolean;
  authMessage: string;
  openAuthModal: (msg?: string, redirectAfterLogin?: string) => void;
  closeAuthModal: () => void;
  loginWithGoogle: (data: { credential: string }) => Promise<void>;
  loginWithEmail: (email: string, pass: string, totpCode?: string) => Promise<boolean>;
  pendingSecondFactor: boolean;
  completeSecondFactor: (code: string) => Promise<void>;
  sendOtp: (email: string, name?: string) => Promise<{ success: boolean; delivered?: boolean; message?: string; isSimulatedNotice?: boolean; simulatedCode?: string; otpCode?: string; resendNotice?: string; error?: string }>;
  verifyOtpAndRegister: (data: { email: string; code: string; name: string; phone: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (name: string, email: string, pass: string, phone: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  addAddress: (address: Omit<UserAddress, 'id'>) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  redirectAfterLogin: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingSecondFactor,setPendingSecondFactor]=useState(false);
  const acceptSignIn=(res:any)=>{
    if(res.requiresTotp){setUser(null);setPendingSecondFactor(true);return false}
    if(!res.success||!res.user)throw new Error(res.error||'تعذر تسجيل الدخول.');
    activeUserId.current=res.user.id;setSessionReady(true);setUser(res.user);setPendingSecondFactor(false);closeAuthModal();return true;
  };
  const completeSecondFactor=async(code:string)=>{const res=await neonDb.verifyTotpLogin('',code);acceptSignIn(res)};
  const [user, setUser] = useState<User | null>(() => {
    const saved = readStoredJson<User | null>('joe_store_user', null, isStoredUser);
    // A browser cache is a display hint, never proof of administrative access.
    return saved ? { ...saved, role: 'customer', admin_permissions: [] } : null;
  });
  const [sessionReady, setSessionReady] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);
  const [isAccessRefreshing, setIsAccessRefreshing] = useState(false);
  const [accessRefreshError, setAccessRefreshError] = useState('');
  const activeUserId = useRef(user?.id);
  activeUserId.current = user?.id;
  const accessRequest = useRef<{ userId: string; promise: Promise<boolean> } | null>(null);

  // Cached account data can predate an administrator's promotion or demotion.
  // Read the current role by stable account ID and merge only that field.
  const refreshAccess = useCallback((): Promise<boolean> => {
    const userId = activeUserId.current;
    if (!userId) return Promise.resolve(false);
    if (accessRequest.current?.userId === userId) return accessRequest.current.promise;
    setIsAccessRefreshing(true);
    setAccessRefreshError('');
    const request = neonDb.getUserAccess(userId).then(result => {
      if (activeUserId.current !== userId) return false;
      if (!result.success) {
        setUser(previous => previous?.id === userId ? { ...previous, role: 'customer', admin_permissions: [] } : previous);
        setAccessRefreshError(result.error || 'تعذر تحديث صلاحيات الحساب. أعد المحاولة.');
        return false;
      }
      if (!result.exists) {
        setUser(previous => previous?.id === userId ? { ...previous, role: 'customer', admin_permissions: [] } : previous);
        setAccessRefreshError('سجّل الدخول مرة أخرى لتوثيق الجلسة وتحديث صلاحيات حسابك.');
        return false;
      }
      const role = result.role === 'admin' ? 'admin' : 'customer';
      setUser(previous => previous?.id === userId ? { ...previous, role, admin_permissions: result.admin_permissions || [] } : previous);
      return true;
    }).catch(() => {
      setUser(previous => previous?.id === userId ? { ...previous, role: 'customer', admin_permissions: [] } : previous);
      if (activeUserId.current === userId) setAccessRefreshError('تعذر تحديث صلاحيات الحساب. تأكد من الاتصال وأعد المحاولة.');
      return false;
    }).finally(() => {
      if (activeUserId.current === userId) setIsAccessRefreshing(false);
      if (accessRequest.current?.promise === request) accessRequest.current = null;
    });
    accessRequest.current = { userId, promise: request };
    return request;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const idAtStart = activeUserId.current;
    neonDb.getSession().then(result => {
      if (!cancelled && activeUserId.current === idAtStart) {
        setUser(result.user || null);
      }
    }).catch(() => { if (!cancelled) setAccessRefreshError('تعذر توثيق الجلسة. سجّل الدخول وأعد المحاولة.'); })
      .finally(() => { if (!cancelled) setSessionReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') {
      setIsAccessRefreshing(false);
      setAccessRefreshError('');
      return;
    }
    const refresh = () => { void refreshAccess(); };
    const onVisible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(onVisible, 60_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [user?.id, refreshAccess]);

  useEffect(() => {
    if (user) {
      writeStoredJson('joe_store_user', user);
    } else {
      removeStorage('joe_store_user');
    }
  }, [user]);

  const openAuthModal = (msg?: string, redirectTab?: string) => {
    setAuthMessage(msg || '');
    if (redirectTab) setRedirectAfterLogin(redirectTab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthMessage('');
  };

  // Compute strict Admin status
  const isAdmin = isAccountAdmin(user);
  const adminSections = permittedSections(user);
  const canAccessAdmin = adminSections.length > 0;
  const canAccessSection = (section: string) => hasSection(user, section);

  // A Google login only succeeds after the server accepts the signed credential.
  const loginWithGoogle = async (data: { credential: string }) => {
    if (!data?.credential) throw new Error('لم تكتمل موافقة Google. أعيدي المحاولة.');
    const res = await neonDb.persistGoogleUser(data);
    if(res.requiresTotp){acceptSignIn(res);return}
    if (!res.success || !res.user) {
      throw new Error(res.error || 'تعذّر تسجيل الدخول بحساب Google.');
    }
    activeUserId.current = res.user.id; setSessionReady(true);
    setUser({ ...res.user, role: res.user.role || 'customer' });
    closeAuthModal();
  };

  // Passwords are checked on the server; browser records never authenticate a user.
  const loginWithEmail = async (email: string, pass: string, totpCode?: string): Promise<boolean> => {
    const result = await neonDb.authenticateUser(email.trim().toLowerCase(), pass);
    if(result.requiresTotp){acceptSignIn(result);return false}
    if (!result.success || !result.user) throw new Error(result.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    activeUserId.current = result.user.id; setUser(result.user); setSessionReady(true); closeAuthModal(); return true;
  };

  // 3. Send 6-Digit OTP Email via Resend
  const sendOtp = async (email: string, name?: string) => {
    return await neonDb.sendVerificationOtp(email, name);
  };

  // 4. Verify 6-Digit OTP and Activate User in Neon DB
  const verifyOtpAndRegister = async (data: { email: string; code: string; name: string; phone: string; password?: string }) => {
    try {
      const res = await neonDb.verifyOtpAndCreateUser(data);
      if(res.requiresTotp){acceptSignIn(res);return {success:true}}
      if (res.success && res.user) {
        const registeredUser: User = {
          ...res.user,
          role: isAccountAdmin(res.user) ? 'admin' : (res.user.role || 'customer')
        };
        activeUserId.current = registeredUser.id; setSessionReady(true); setUser(registeredUser);
        closeAuthModal();
        return { success: true };
      }
      return { success: false, error: res.error || 'كود التأكيد غير صحيح.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'تعذر التحقق من الكود.' };
    }
  };

  const registerWithEmail = async (_name: string, _email: string, _pass: string, _phone: string): Promise<boolean> => {
    throw new Error('إنشاء الحساب يتطلب تأكيد البريد بالكود أولًا.');
  };

  const logout = () => {
    setPendingSecondFactor(false);
    activeUserId.current = undefined;
    setUser(null);
    void neonDb.logoutSession().catch(() => {});
  };

  // Profile Update (Name, Phone, Avatar, Addresses, Bio)
  const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'غير مسجل دخول' };
    try {
      const updatedUser: User = { ...user, ...data };
      if (isAccountAdmin(updatedUser)) {
        updatedUser.role = 'admin';
      }
      // Sync to Neon DB
        const saved = await neonDb.updateUserProfile(user.id, {
        name: data.name,
        phone: data.phone,
        email: data.email,
        avatar: data.avatar,
        addresses: data.addresses || updatedUser.addresses
      });
        if (!saved.success) return { success: false, error: saved.error || 'تعذّر حفظ البيانات.' };
        const persistedUser = saved.user ? { ...updatedUser, ...saved.user } : updatedUser;
        setUser(persistedUser);
        writeStoredJson('joe_store_user', persistedUser);
      return { success: true };
    } catch (err: any) {
      console.error('updateProfile error:', err);
      return { success: false, error: err.message || 'حدث خطأ أثناء حفظ البيانات.' };
    }
  };

  // Change Password
  const changePassword = async (oldPass: string, newPass: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'غير مسجل دخول' };
    try {
      const res = await neonDb.changePassword(user.id, oldPass, newPass);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تحديث كلمة المرور.' };
    }
  };

  const updateEmail = async (_newEmail: string): Promise<{ success: boolean; error?: string }> => ({ success: false, error: 'تغيير البريد يتطلب تسجيل دخول موثق بالبريد الجديد. تواصل مع الإدارة لنقل بيانات حسابك.' });

  // Delete Account
  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'غير مسجل دخول' };
    try {
      await neonDb.deleteUser(user.id);
      removeStorage('joe_store_user');
      setUser(null);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل حذف الحساب.' };
    }
  };

  const addAddress = async (addr: Omit<UserAddress, 'id'>) => {
    if (!user) return { success: false, error: 'تسجيل الدخول مطلوب لحفظ العنوان.' };
    const newAddress: UserAddress = {
      ...addr,
      id: `addr-${Date.now()}`
    };
    const updated = [...user.addresses, newAddress];
    return await updateProfile({ addresses: updated });
  };

  const deleteAddress = async (id: string) => {
    if (!user) return { success: false, error: 'تسجيل الدخول مطلوب.' };
    const updated = user.addresses.filter(a => a.id !== id);
    return await updateProfile({ addresses: updated });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        pendingSecondFactor,
        completeSecondFactor,
        isAuthenticated: !!user,
        isAdmin,
        canAccessAdmin,
        canAccessSection,
        adminSections,
        sessionReady,
        refreshAccess,
        isAccessRefreshing,
        accessRefreshError,
        isAuthModalOpen,
        authMessage,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
        loginWithEmail,
        sendOtp,
        verifyOtpAndRegister,
        registerWithEmail,
        logout,
        updateProfile,
        changePassword,
        updateEmail,
        deleteAccount,
        addAddress,
        deleteAddress,
        redirectAfterLogin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
