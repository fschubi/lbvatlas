import axios, { AxiosInstance } from 'axios';
import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export const useApi = () => {
  const { getToken } = useAuth();

  const api: AxiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request Interceptor für Token
    instance.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor für Fehlerbehandlung
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server antwortet mit Fehler
          switch (error.response.status) {
            case 401:
              // Nicht autorisiert - Token abgelaufen oder ungültig
              // Hier könnte man zum Login weiterleiten
              break;
            case 403:
              // Verboten - Keine Berechtigung
              break;
            case 404:
              // Nicht gefunden
              break;
            case 422:
              // Validierungsfehler
              break;
            case 500:
              // Serverfehler
              break;
          }
        } else if (error.request) {
          // Keine Antwort vom Server
          console.error('Keine Antwort vom Server:', error.request);
        } else {
          // Fehler beim Erstellen der Anfrage
          console.error('Fehler beim Erstellen der Anfrage:', error.message);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [getToken]);

  const get = useCallback(
    async (url: string, config = {}) => {
      return api.get(url, config);
    },
    [api]
  );

  const post = useCallback(
    async (url: string, data = {}, config = {}) => {
      return api.post(url, data, config);
    },
    [api]
  );

  const put = useCallback(
    async (url: string, data = {}, config = {}) => {
      return api.put(url, data, config);
    },
    [api]
  );

  const patch = useCallback(
    async (url: string, data = {}, config = {}) => {
      return api.patch(url, data, config);
    },
    [api]
  );

  const del = useCallback(
    async (url: string, config = {}) => {
      return api.delete(url, config);
    },
    [api]
  );

  return {
    get,
    post,
    put,
    patch,
    delete: del,
  };
};
