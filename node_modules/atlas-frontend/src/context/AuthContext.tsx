import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

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

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
<<<<<<< HEAD
  permissions?: string[]; // oder Set<string>, je nach Backend-Antwort
=======
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
}

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
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      if (!isValidTokenFormat(token)) {
        console.error('Ungültiges Token-Format gefunden, Token wird entfernt');
        localStorage.removeItem('token');
        return;
      }
      console.log('Gültiges Token gefunden, validiere mit Backend...');
      validateToken(token);
    } else {
      console.log('Kein Token gefunden, Benutzer ist nicht authentifiziert');
    }
  }, []);

  const validateToken = async (token: string) => {
    setIsLoading(true);
    try {
      console.log('Validiere Token mit Backend...');
      const response = await axios.get<ValidateResponse>(`${API_BASE_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
<<<<<<< HEAD
=======

>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
      console.log('Token erfolgreich validiert, setze Benutzer:', response.data.user);
      setUser(response.data.user);
    } catch (err) {
      console.error('Token-Validierung fehlgeschlagen:', err);
      logout();
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setError(null);
      console.log('Versuche Login mit:', username);

      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        email: username,
        password
      });

      const { token, user } = response.data;

      if (!isValidTokenFormat(token)) {
        console.error('Ungültiges Token vom Server erhalten', token);
        setError('Ungültiges Token vom Server erhalten');
        throw new Error('Ungültiges Token vom Server erhalten');
      }

      console.log('Login erfolgreich, Token erhalten:', token.substring(0, 10) + '...');
      localStorage.setItem('token', token);
      setUser(user);
    } catch (err) {
      console.error('Login fehlgeschlagen:', err);
      setError('Anmeldung fehlgeschlagen');
<<<<<<< HEAD
    } finally {
      setIsLoading(false);
=======
      throw err;
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
    }
  };

  const logout = () => {
    console.log('Benutzer wird abgemeldet...');
    localStorage.removeItem('token');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
<<<<<<< HEAD
    error,
    isLoading,
=======
    error
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
