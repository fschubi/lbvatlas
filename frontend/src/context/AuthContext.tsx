import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
// Importiere den globalen User-Typ
import { User } from '../types/user'; // Pfad ggf. anpassen

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
  // Verwende den importierten User-Typ und erwarte permissions
  user: User & { permissions?: string[] };
  message?: string;
}

interface ValidateResponse {
  // Verwende den importierten User-Typ und erwarte permissions
  user: User & { permissions?: string[] };
  message?: string;
}

interface AuthContextType {
  user: User | null; // Hier wird der globale User-Typ mit Set<string> verwendet
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Beim Start der App prüfen, ob ein Token existiert
    const token = localStorage.getItem('token');

    if (token) {
      // Prüfe, ob das Token das richtige Format hat
      if (!isValidTokenFormat(token)) {
        console.error('Ungültiges Token-Format gefunden, Token wird entfernt');
        localStorage.removeItem('token');
        setIsLoading(false);
        return;
      }

      console.log('Gültiges Token gefunden, validiere mit Backend...');
      // Token validieren und Benutzerinformationen abrufen
      validateToken(token);
    } else {
      console.log('Kein Token gefunden, Benutzer ist nicht authentifiziert');
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      console.log('Validiere Token mit Backend...');
      // Response erwartet jetzt user mit permissions Array
      const response = await axios.get<ValidateResponse>(`${API_BASE_URL}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userData = response.data.user;
      console.log('Token erfolgreich validiert, verarbeite Benutzer:', userData);

      // Erstelle das Set aus dem Array
      const permissionsSet = new Set(userData.permissions || []);

      // Setze den User-State mit dem Set
      setUser({ ...userData, permissions: permissionsSet });

    } catch (err) {
      // Token ungültig - ausloggen
      console.error('Token-Validierung fehlgeschlagen:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      setError(null);
      console.log('Versuche Login mit:', username);

      // Response erwartet jetzt user mit permissions Array
      const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        email: username,
        password
      });

      const { token, user: userData } = response.data;

      // Prüfe, ob das erhaltene Token gültig ist
      if (!isValidTokenFormat(token)) {
        console.error('Ungültiges Token vom Server erhalten', token);
        setError('Ungültiges Token vom Server erhalten');
        setIsLoading(false);
        throw new Error('Ungültiges Token vom Server erhalten');
      }

      console.log('Login erfolgreich, verarbeite Benutzer:', userData);
      localStorage.setItem('token', token);

      // Erstelle das Set aus dem Array
      const permissionsSet = new Set(userData.permissions || []);

      // Setze den User-State mit dem Set
      setUser({ ...userData, permissions: permissionsSet });

    } catch (err) {
      console.error('Login fehlgeschlagen:', err);
      setError('Anmeldung fehlgeschlagen');
      setIsLoading(false);
      throw err;
    }
  };

  const logout = () => {
    console.log('Benutzer wird abgemeldet...');
    localStorage.removeItem('token');
    setUser(null);
    setIsLoading(false);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    error,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
