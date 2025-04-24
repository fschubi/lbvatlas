import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { User } from '../types/user';

// API-Basis-URL aus Umgebungsvariablen
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3500/api';

/**
 * Prüft, ob ein Token-String das erwartete Format hat
 */
const isValidTokenFormat = (token: string): boolean => {
  // Einfache Validierung: Token sollte nicht leer sein und ein JWT-ähnliches Format haben
  if (!token || token.trim() === '') return false;

  // JWT besteht aus drei Teilen, getrennt durch Punkte
  const parts = token.split('.');
  return parts.length === 3;
};

interface LoginResponse {
  token: string;
  user: User;
  message?: string;
}

interface ValidateResponse {
  user: User;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        username,
        password,
      });

      const { user: userData, token: authToken } = response.data;

      setUser(userData);
      setToken(authToken);

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', authToken);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  const getToken = useCallback(() => {
    return token;
  }, [token]);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
