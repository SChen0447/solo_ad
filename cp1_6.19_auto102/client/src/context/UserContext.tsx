import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  created_at: string;
}

interface UserContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem('token', tokenStr);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...userData };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  return (
    <UserContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
