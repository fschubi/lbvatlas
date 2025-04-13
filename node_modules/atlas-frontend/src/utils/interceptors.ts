/**
 * Axios Interceptors für die globale Konfiguration von HTTP-Anfragen
 */
import axios from 'axios';

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

/**
 * Konfiguriert Axios-Interceptoren für alle Anfragen
 */
export const setupAxiosInterceptors = () => {
  // Request-Interceptor: Fügt den Authorization-Header zu allen Anfragen hinzu
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');

      // Debug-Ausgabe
      console.log('Axios Request intercepted:', {
        url: config.url,
        method: config.method,
        hasToken: !!token
      });

      if (token) {
        // Validierung des Token-Formats
        if (!isValidTokenFormat(token)) {
          console.error('Ungültiges Token-Format:', token);
          // Token entfernen, wenn ungültig
          localStorage.removeItem('token');
          // Optional: zur Login-Seite umleiten
          // window.location.href = '/login';
        } else if (config.headers) {
          // Authorization-Header hinzufügen
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Token hinzugefügt:', `Bearer ${token.substring(0, 10)}...`);
        }
      } else {
        console.warn('Kein Token im localStorage gefunden');
      }

      return config;
    },
    (error) => {
      // Bei Fehlern in der Request-Konfiguration
      console.error('Axios Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response-Interceptor: Behandelt Antworten und Fehler global
  axios.interceptors.response.use(
    (response) => {
      // Debug-Ausgabe
      console.log('Axios Response:', {
        url: response.config.url,
        status: response.status,
        statusText: response.statusText
      });

      // Erfolgreiche Antwort durchlassen
      return response;
    },
    (error) => {
      // Debug-Ausgabe
      console.error('Axios Response Error:', {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });

      // Bei 401 Unauthorized-Fehlern (Token abgelaufen oder ungültig)
      if (error.response && error.response.status === 401) {
        console.log('401 Unauthorized - Token ungültig oder abgelaufen');

        // Token entfernen
        localStorage.removeItem('token');

        // Optional: Zur Login-Seite umleiten
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;
