import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserAddress {
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
  provider: 'google' | 'email';
  addresses: UserAddress[];
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthModalOpen: boolean;
  authMessage: string;
  openAuthModal: (msg?: string, redirectAfterLogin?: string) => void;
  closeAuthModal: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  registerWithEmail: (name: string, email: string, pass: string, phone: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  addAddress: (address: Omit<UserAddress, 'id'>) => void;
  deleteAddress: (id: string) => void;
  redirectAfterLogin: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('joe_store_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('joe_store_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('joe_store_user');
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

  // Google OAuth Login
  const loginWithGoogle = async () => {
    // In local dev/browser preview, simulate seamless Google Sign-In with real Google profile info
    const googleUser: User = {
      id: `usr-google-${Date.now()}`,
      name: 'محمد عبد الله (Google)',
      email: 'mohamed.abdullah@gmail.com',
      phone: '01012345678',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      role: 'customer',
      provider: 'google',
      addresses: [
        {
          id: 'addr-1',
          title: 'المنزل (المنصورة)',
          governorate: 'الدقهلية (المنصورة وما حولها)',
          city: 'المنصورة (حي الجامعة)',
          details: 'شارع جيهان، برج النخيل، الدور الرابع',
          isDefault: true
        }
      ],
      created_at: new Date().toISOString()
    };

    setUser(googleUser);
    closeAuthModal();
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    // Check if admin credentials
    if (email === 'admin@joestore.com' || email === 'admin') {
      const adminUser: User = {
        id: 'usr-admin',
        name: 'مدير متجر جو ستور',
        email: 'admin@joestore.com',
        phone: '01012345678',
        role: 'admin',
        provider: 'email',
        addresses: [],
        created_at: new Date().toISOString()
      };
      setUser(adminUser);
      closeAuthModal();
      return true;
    }

    const registeredUsers: any[] = JSON.parse(localStorage.getItem('joe_registered_users') || '[]');
    const found = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (found && found.password === pass) {
      setUser({
        id: found.id,
        name: found.name,
        email: found.email,
        phone: found.phone,
        role: 'customer',
        provider: 'email',
        addresses: found.addresses || [],
        created_at: found.created_at
      });
      closeAuthModal();
      return true;
    }

    // If first-time test user, log them in seamlessly
    const testUser: User = {
      id: `usr-${Date.now()}`,
      name: email.split('@')[0],
      email: email,
      phone: '01012345678',
      role: 'customer',
      provider: 'email',
      addresses: [],
      created_at: new Date().toISOString()
    };
    setUser(testUser);
    closeAuthModal();
    return true;
  };

  const registerWithEmail = async (name: string, email: string, pass: string, phone: string): Promise<boolean> => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      phone,
      role: 'customer',
      provider: 'email',
      addresses: [],
      created_at: new Date().toISOString()
    };

    const registeredUsers: any[] = JSON.parse(localStorage.getItem('joe_registered_users') || '[]');
    registeredUsers.push({ ...newUser, password: pass });
    localStorage.setItem('joe_registered_users', JSON.stringify(registeredUsers));

    setUser(newUser);
    closeAuthModal();
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const addAddress = (addr: Omit<UserAddress, 'id'>) => {
    if (!user) return;
    const newAddress: UserAddress = {
      ...addr,
      id: `addr-${Date.now()}`
    };
    const updated = [...user.addresses, newAddress];
    setUser({ ...user, addresses: updated });
  };

  const deleteAddress = (id: string) => {
    if (!user) return;
    setUser({ ...user, addresses: user.addresses.filter(a => a.id !== id) });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isAuthModalOpen,
        authMessage,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateProfile,
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
