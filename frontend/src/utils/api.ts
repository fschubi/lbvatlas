/**
 * API-Service für das ATLAS Asset Management System
 *
 * Dieser Service stellt Funktionen für den Zugriff auf die ATLAS-Backend-API bereit.
 * Alle API-Anfragen werden über diese zentrale Stelle verwaltet.
 */

import { Location } from '../types/settings';
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import {
  Device,
  DeviceCreate,
  DeviceUpdate,
  NetworkPort,
  NetworkPortCreate,
  NetworkPortUpdate
} from '../types';
import { ApiResponse } from '../types/api';
import { DeviceModel, DeviceModelCreate, DeviceModelUpdate } from '../types/settings';
import { Department, DepartmentCreate, DepartmentUpdate } from '../types/settings';
// Importiere handoverApi aus der separaten Datei
import { handoverApi } from './handoverApi';

interface License {
  id: string;
  name: string;
  // ... weitere Eigenschaften
}

interface InventorySession {
  id: string;
  name: string;
  description: string;
  location: string;
  status: string;
  startDate: string;
  endDate: string | null;
  progress: number;
  totalDevices: number;
  checkedDevices: number;
}

interface SessionDevice {
  id: string;
  name: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  lastSeen: string;
  location: string;
  checked: boolean;
}

// API-Basis-URL aus Umgebungsvariablen
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3500/api';

// Setze globale Axios-Defaults für Authorization
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Standard-Optionen für Fetch-Anfragen
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Cookies für Cross-Origin-Anfragen senden
  mode: 'cors' // Explizit CORS-Modus aktivieren
};

// Hilffunktion für das Hinzufügen des Auth-Tokens zu Anfragen
const withAuth = (options: RequestInit = {}): RequestInit => {
  const token = localStorage.getItem('token');

  if (!token) {
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
};

// Hilffunktion für API-Anfragen
async function apiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  data?: any,
  requiresAuth: boolean = true,
  retryOptions: {
    maxRetries?: number;
    retryDelay?: number;
    isRetryable?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    isRetryable = (error) => {
      // Standard-Logik für wiederholbare Fehler
      // Netzwerkfehler und 5xx Serverfehler werden wiederholt
      if (error instanceof TypeError && error.message.includes('network')) {
        return true;
      }
      if (error.status && error.status >= 500 && error.status < 600) {
        return true;
      }
      if (error.status === 429) { // Rate Limiting
        return true;
      }
      return false;
    }
  } = retryOptions;

  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    ...defaultOptions,
    method,
  };

  // Daten hinzufügen, wenn vorhanden
  if (data) {
    // Debug-Ausgabe der JSON-Daten, die gesendet werden
    console.log(`DEBUG apiRequest: Daten für ${endpoint} (${method}):`, data);
    options.body = JSON.stringify(data);
    console.log(`DEBUG apiRequest: Gesendetes JSON:`, options.body);
  }

  // Auth-Token hinzufügen, wenn erforderlich
  if (requiresAuth) {
    Object.assign(options, withAuth(options));
  }

  // Funktion für den API-Aufruf
  const executeRequest = async (attempt: number = 1): Promise<T> => {
    try {
      console.log(`API-Anfrage an: ${url} (Versuch ${attempt}/${maxRetries + 1})`, options);
      const response = await fetch(url, options);

      // HTTP-Fehler als Error werfen
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log(`DEBUG apiRequest: Fehler-Antwort:`, errorData);
        } catch (e) {
          errorData = { message: 'Keine Details verfügbar' };
        }

        // Spezialfall: Authentifizierungsfehler
        if (response.status === 401) {
          // Token ist abgelaufen oder ungültig
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
        }

        // Strukturiertes Fehlerobjekt erstellen
        const error: any = new Error(errorData.message || `HTTP-Fehler ${response.status}`);
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = errorData;
        error.code = errorData.code || `HTTP_${response.status}`;
        error.details = errorData.details || null;

        throw error;
      }

      // JSON-Antwort zurückgeben oder leeres Objekt, wenn keine Daten
      if (response.status !== 204) { // No Content
        const responseData = await response.json();
        console.log(`DEBUG apiRequest: Erfolgsantwort:`, responseData);
        return responseData;
      }

      return {} as T;
    } catch (error) {
      console.error(`API-Fehler (Versuch ${attempt}/${maxRetries + 1}):`, error);

      // Wiederholungsversuch, wenn der Fehler als wiederholbar eingestuft wird und Versuche übrig sind
      if (attempt <= maxRetries && isRetryable(error)) {
        console.info(`Wiederholungsversuch ${attempt}/${maxRetries} in ${retryDelay * Math.pow(2, attempt - 1)}ms...`);

        // Exponentielles Backoff für die Verzögerung zwischen Versuchen
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Rekursiver Aufruf für den nächsten Versuch
        return executeRequest(attempt + 1);
      }

      // Alle Wiederholungsversuche erschöpft oder Fehler nicht wiederholbar
      // Verbessertes Fehlerobjekt werfen
      const enhancedError: any = error instanceof Error ? error : new Error('Unbekannter API-Fehler');

      // Benutzerfreundliche Nachricht basierend auf Fehlercode
      if (error.code) {
        switch (error.code) {
          case 'HTTP_400':
            if (error.data && error.data.message) {
              // Bei 400-Fehler die ursprüngliche Fehlermeldung vom Backend beibehalten
              enhancedError.message = error.data.message;
            } else {
              enhancedError.message = 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.';
            }
            break;
          case 'HTTP_404':
            enhancedError.message = 'Die angeforderte Ressource wurde nicht gefunden.';
            break;
          case 'HTTP_429':
            enhancedError.message = 'Zu viele Anfragen. Bitte warten Sie einen Moment.';
            break;
          case 'HTTP_500':
          case 'HTTP_502':
          case 'HTTP_503':
          case 'HTTP_504':
            enhancedError.message = 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
            break;
        }
      }

      throw enhancedError;
    }
  };

  // Initiale Ausführung der Anfrage
  return executeRequest();
}

// Auth-Funktionen
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest<{ token: string; user: any }>('/users/login', 'POST', credentials, false),

  register: (userData: any) =>
    apiRequest<{ token: string; user: any }>('/users/register', 'POST', userData, false),

  logout: () =>
    apiRequest<{ message: string }>('/users/logout', 'POST'),

  getCurrentUser: () =>
    apiRequest<{ user: any }>('/users/profile', 'GET'),
};

// Geräte-Funktionen
export const devicesApi = {
  getAllDevices: (params?: any) =>
    apiRequest<{ data: any[]; pagination?: any }>('/devices' + (params ? `?${new URLSearchParams(params)}` : '')),

  getDeviceById: (id: string | number) =>
    apiRequest<{ data: any }>(`/devices/${id}`),

  createDevice: (deviceData: any) =>
    apiRequest<{ message: string; data: any }>('/devices', 'POST', deviceData),

  updateDevice: (id: string | number, deviceData: any) =>
    apiRequest<{ message: string; data: any }>(`/devices/${id}`, 'PUT', deviceData),

  deleteDevice: (id: string | number) =>
    apiRequest<{ message: string }>(`/devices/${id}`, 'DELETE'),

  // Geräte in einer Inventursitzung
  getSessionDevices: (sessionId: string) =>
    apiRequest<{ data: SessionDevice[] }>(`/inventory/sessions/${sessionId}/devices`),

  addDeviceToSession: (sessionId: string, deviceId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/inventory/sessions/${sessionId}/devices`, 'POST', { deviceId }),

  removeDeviceFromSession: (sessionId: string, deviceId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/inventory/sessions/${sessionId}/devices/${deviceId}`, 'DELETE'),

  markDeviceAsChecked: (sessionId: string, deviceId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/inventory/sessions/${sessionId}/devices/${deviceId}/check`, 'PUT'),

  // Neue Funktion: Batch-Update für mehrere Geräte in einer Inventursitzung
  markDevicesBatchAsChecked: async (sessionId: string, deviceIds: string[]) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simuliere einige mögliche Fehler bei bestimmten Geräten
    const results = deviceIds.map(deviceId => {
      const success = Math.random() > 0.1; // 10% Fehlerrate simulieren
      return {
        deviceId,
        success,
        message: success ? undefined : 'Gerät konnte nicht aktualisiert werden'
      };
    });

    const allSuccessful = results.every(r => r.success);

    return {
      success: allSuccessful,
      message: allSuccessful
        ? `Alle ${deviceIds.length} Geräte wurden erfolgreich aktualisiert`
        : `${results.filter(r => r.success).length} von ${deviceIds.length} Geräten wurden aktualisiert`,
      results
    };
  },

  updateSessionProgress: async (sessionId: string) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simuliere unterschiedliche Fortschritte je nach Session
    let progress = 0;
    let checkedDevices = 0;
    let totalDevices = 0;

    if (sessionId === "inv-1") {
      // Abgeschlossene Sitzung
      progress = 100;
      totalDevices = 120;
      checkedDevices = 120;
    } else if (sessionId === "inv-2") {
      // Aktive Sitzung mit Fortschritt
      progress = 70; // Leichter Fortschritt im Vergleich zum ursprünglichen Wert (68%)
      totalDevices = 75;
      checkedDevices = Math.ceil(totalDevices * progress / 100);
    } else {
      // Andere Sitzungen mit geringem Fortschritt
      totalDevices = 45;
      // Zufälliger kleiner Fortschritt von max. 10%
      progress = Math.floor(Math.random() * 11);
      checkedDevices = Math.ceil(totalDevices * progress / 100);
    }

    return {
      progress,
      checkedDevices,
      totalDevices
    };
  },

  findMissingDevices: async (sessionId: string) => {
    // Simulierte Daten für das Frontend-Prototyping

    // Wenn Session 'inv-1', dann keine fehlenden Geräte, da abgeschlossen
    if (sessionId === "inv-1") {
      return [];
    }

    // Simuliere 3-5 fehlende Geräte für andere Sitzungen
    const deviceCount = Math.floor(Math.random() * 3) + 3; // 3-5 Geräte
    const deviceTypes = ["Laptop", "Monitor", "Server"];
    const locations = ["München 1.OG", "Berlin Hauptgebäude", "Hamburg Büro"];

    // Generiere die fehlenden Geräte
    const mockMissingDevices: SessionDevice[] = Array.from({ length: deviceCount }, (_, i) => {
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      return {
        id: `missing-${sessionId}-${i+1}`,
        name: `${deviceType} ${Math.floor(Math.random() * 900) + 100}`,
        serialNumber: `SN-${Math.floor(Math.random() * 90000) + 10000}`,
        inventoryNumber: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
        status: "In Betrieb",
        lastSeen: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: location,
        checked: false
      };
    });

    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 800));

    return mockMissingDevices;
  },
};

// Lizenzen-Funktionen
export const licensesApi = {
  getAllLicenses: (params?: any) =>
    apiRequest<{ data: any[]; pagination?: any }>('/licenses' + (params ? `?${new URLSearchParams(params)}` : '')),

  getLicenseById: (id: string | number) =>
    apiRequest<{ data: any }>(`/licenses/${id}`),

  createLicense: (licenseData: any) =>
    apiRequest<{ message: string; data: any }>('/licenses', 'POST', licenseData),

  updateLicense: (id: string | number, licenseData: any) =>
    apiRequest<{ message: string; data: any }>(`/licenses/${id}`, 'PUT', licenseData),

  deleteLicense: (id: string | number) =>
    apiRequest<{ message: string }>(`/licenses/${id}`, 'DELETE'),
};

// Zertifikate-Funktionen
export const certificatesApi = {
  getAllCertificates: (params?: any) =>
    apiRequest<{ data: any[]; pagination?: any }>('/certificates' + (params ? `?${new URLSearchParams(params)}` : '')),

  getCertificateById: (id: string | number) =>
    apiRequest<{ data: any }>(`/certificates/${id}`),

  createCertificate: (certificateData: any) =>
    apiRequest<{ message: string; data: any }>('/certificates', 'POST', certificateData),

  updateCertificate: (id: string | number, certificateData: any) =>
    apiRequest<{ message: string; data: any }>(`/certificates/${id}`, 'PUT', certificateData),

  deleteCertificate: (id: string | number) =>
    apiRequest<{ message: string }>(`/certificates/${id}`, 'DELETE'),
};

// Zubehör-Funktionen
export const accessoriesApi = {
  getAllAccessories: (params?: any) =>
    apiRequest<{ data: any[]; pagination?: any }>('/accessories' + (params ? `?${new URLSearchParams(params)}` : '')),

  getAccessoryById: (id: string | number) =>
    apiRequest<{ data: any }>(`/accessories/${id}`),

  createAccessory: (accessoryData: any) =>
    apiRequest<{ message: string; data: any }>('/accessories', 'POST', accessoryData),

  updateAccessory: (id: string | number, accessoryData: any) =>
    apiRequest<{ message: string; data: any }>(`/accessories/${id}`, 'PUT', accessoryData),

  deleteAccessory: (id: string | number) =>
    apiRequest<{ message: string }>(`/accessories/${id}`, 'DELETE'),
};

// Benutzer-Funktionen
export const usersApi = {
  getAllUsers: (params?: any) =>
    apiRequest<{ data: any[]; pagination?: any }>('/users' + (params ? `?${new URLSearchParams(params)}` : '')),

  getUserById: (id: string | number) =>
    apiRequest<{ data: any }>(`/users/${id}`),

  createUser: (userData: any) =>
    apiRequest<{ message: string; data: any }>('/users', 'POST', userData),

  updateUser: (id: string | number, userData: any) =>
    apiRequest<{ message: string; data: any }>(`/users/${id}`, 'PUT', userData),

  deleteUser: (id: string | number) =>
    apiRequest<{ message: string }>(`/users/${id}`, 'DELETE'),
};

// Todos-Funktionen
export const todosApi = {
  getAllTodos: async (params?: any) => {
    // Mock-Daten für Todos zurückgeben
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockTodos = [
      {
        id: '1',
        title: 'Laptop für neuen Mitarbeiter vorbereiten',
        description: 'Windows 11 installieren, Office einrichten, VPN konfigurieren',
        status: 'Offen',
        priority: 2, // Mittel
        createdAt: '2023-12-01T08:30:00Z',
        dueDate: '2023-12-05T17:00:00Z',
        assignedTo: 'Max Mustermann',
        createdBy: 'Admin',
        category: 'Gerät'
      },
      {
        id: '2',
        title: 'Software-Lizenzen erneuern',
        description: 'Adobe Creative Cloud Lizenzen müssen für die Design-Abteilung erneuert werden',
        status: 'In Bearbeitung',
        priority: 3, // Hoch
        createdAt: '2023-12-03T09:15:00Z',
        dueDate: '2023-12-15T17:00:00Z',
        assignedTo: 'Lisa Müller',
        createdBy: 'Thomas Schmidt',
        category: 'Software'
      },
      {
        id: '3',
        title: 'Server-Backup überprüfen',
        description: 'Routineüberprüfung der Backup-Systeme und Wiederherstellungstests',
        status: 'Erledigt',
        priority: 3, // Hoch
        createdAt: '2023-11-25T14:00:00Z',
        dueDate: '2023-11-30T17:00:00Z',
        assignedTo: 'Thomas Schmidt',
        createdBy: 'Admin',
        category: 'Infrastruktur'
      },
      {
        id: '4',
        title: 'Druckerpatrone wechseln',
        description: 'Im Drucker HP LaserJet im Empfangsbereich muss die schwarze Patrone gewechselt werden',
        status: 'Offen',
        priority: 1, // Niedrig
        createdAt: '2023-12-04T10:45:00Z',
        dueDate: '2023-12-06T17:00:00Z',
        assignedTo: 'Lisa Müller',
        createdBy: 'Max Mustermann',
        category: 'Gerät'
      },
      {
        id: '5',
        title: 'Netzwerkprobleme im 2. OG untersuchen',
        description: 'Mehrere Mitarbeiter berichten von langsamen Verbindungen im 2. Stock',
        status: 'In Bearbeitung',
        priority: 2, // Mittel
        createdAt: '2023-12-02T13:20:00Z',
        dueDate: '2023-12-04T17:00:00Z',
        assignedTo: 'Thomas Schmidt',
        createdBy: 'Admin',
        category: 'Netzwerk'
      }
    ];

    return {
      data: mockTodos,
      pagination: {
        total: mockTodos.length,
        page: 1,
        limit: 10,
        pages: 1
      }
    };
  },

  getTodoById: (id: string | number) =>
    apiRequest<{ data: any }>(`/todos/${id}`),

  createTodo: (todoData: any) =>
    apiRequest<{ message: string; data: any }>('/todos', 'POST', todoData),

  updateTodo: (id: string | number, todoData: any) =>
    apiRequest<{ message: string; data: any }>(`/todos/${id}`, 'PUT', todoData),

  deleteTodo: (id: string | number) =>
    apiRequest<{ message: string }>(`/todos/${id}`, 'DELETE'),

  completeTodo: (id: string | number) =>
    apiRequest<{ message: string; data: any }>(`/todos/${id}/complete`, 'PATCH'),
};

// Inventar-Funktionen
export const inventoryApi = {
  getAllInventoryEntries: (params?: any) =>
    apiRequest<{ data: any[]; pagination?: any }>('/inventory' + (params ? `?${new URLSearchParams(params)}` : '')),

  getInventoryEntryById: (id: string | number) =>
    apiRequest<{ data: any }>(`/inventory/${id}`),

  createInventoryEntry: (entryData: any) =>
    apiRequest<{ message: string; data: any }>('/inventory', 'POST', entryData),

  updateInventoryEntry: (id: string | number, entryData: any) =>
    apiRequest<{ message: string; data: any }>(`/inventory/${id}`, 'PUT', entryData),

  deleteInventoryEntry: (id: string | number) =>
    apiRequest<{ message: string }>(`/inventory/${id}`, 'DELETE'),

  // Inventar-Sessions
  getAllInventorySessions: async (params?: any) => {
    // Simulierte Daten für das Frontend-Prototyping
    const mockSessions = [
      {
        id: "inv-1",
        title: "Jahresinventur 2025",
        startDate: "2025-01-15",
        endDate: "2025-01-20",
        location: "München",
        status: "Abgeschlossen",
        progress: 100,
        responsibleUser: "Max Mustermann",
        devicesTotal: 120,
        devicesChecked: 120,
        notes: "Alle Geräte wurden gefunden und überprüft."
      },
      {
        id: "inv-2",
        title: "Quartalscheck Q1",
        startDate: "2025-03-01",
        endDate: null,
        location: "Berlin",
        status: "Aktiv",
        progress: 68,
        responsibleUser: "Lisa Müller",
        devicesTotal: 75,
        devicesChecked: 51,
        notes: "Noch Geräte im 2. Stock ausstehend."
      },
      {
        id: "inv-3",
        title: "IT-Umzug Vorbereitung",
        startDate: "2025-04-15",
        endDate: null,
        location: "Hamburg",
        status: "Geplant",
        progress: 0,
        responsibleUser: "Thomas Schmidt",
        devicesTotal: 45,
        devicesChecked: 0,
        notes: "Vor Umzug alle Geräte erfassen."
      }
    ];

    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 500));

    return { data: mockSessions };
  },

  getInventorySession: async (sessionId: string) => {
    // Simulierte Daten für das Frontend-Prototyping
    const mockSession = {
      id: sessionId,
      name: sessionId === "inv-1" ? "Jahresinventur 2025" :
            sessionId === "inv-2" ? "Quartalscheck Q1" : "IT-Umzug Vorbereitung",
      description: "Routine-Überprüfung aller registrierten Geräte im System",
      location: sessionId === "inv-1" ? "München" :
               sessionId === "inv-2" ? "Berlin" : "Hamburg",
      status: sessionId === "inv-1" ? "Abgeschlossen" :
              sessionId === "inv-2" ? "Aktiv" : "Geplant",
      startDate: sessionId === "inv-1" ? "2025-01-15" :
                sessionId === "inv-2" ? "2025-03-01" : "2025-04-15",
      endDate: sessionId === "inv-1" ? "2025-01-20" : null,
      progress: sessionId === "inv-1" ? 100 :
               sessionId === "inv-2" ? 68 : 0,
      totalDevices: sessionId === "inv-1" ? 120 :
                   sessionId === "inv-2" ? 75 : 45,
      checkedDevices: sessionId === "inv-1" ? 120 :
                     sessionId === "inv-2" ? 51 : 0
    };

    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 300));

    return mockSession;
  },

  // Gerätestatus in Inventursitzung ändern
  checkDevice: async (sessionId: string, deviceId: string, scanData?: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      success: true,
      message: `Gerät ${deviceId} erfolgreich als überprüft markiert in Sitzung ${sessionId}`,
      data: {
        sessionId,
        deviceId,
        checkedAt: new Date().toISOString(),
        scanInfo: scanData || {}
      }
    };
  },

  createInventorySession: async (sessionData: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 800));

    // Neuer Inventar-ID generieren
    const newId = `inv-${Date.now()}`;

    return {
      success: true,
      message: "Inventursitzung erfolgreich erstellt",
      data: {
        id: newId,
        ...sessionData,
        progress: 0,
        devicesChecked: 0,
        createdAt: new Date().toISOString()
      }
    };
  },

  updateInventorySession: async (sessionId: string, sessionData: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      success: true,
      message: "Inventursitzung erfolgreich aktualisiert",
      data: {
        id: sessionId,
        ...sessionData,
        updatedAt: new Date().toISOString()
      }
    };
  },

  deleteInventorySession: async (sessionId: string) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      message: "Inventursitzung erfolgreich gelöscht"
    };
  },

  completeInventorySession: async (sessionId: string) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      message: "Inventursitzung erfolgreich abgeschlossen",
      data: {
        id: sessionId,
        status: "Abgeschlossen",
        endDate: new Date().toISOString().split('T')[0],
        progress: 100,
        updatedAt: new Date().toISOString()
      }
    };
  },

  forceCompleteInventorySession: async (sessionId: string) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: "Inventursitzung erzwungen abgeschlossen, trotz fehlender Geräte",
      data: {
        id: sessionId,
        status: "Abgeschlossen (erzwungen)",
        endDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      }
    };
  }
};

// Ticket-Funktionen
export const ticketsApi = {
  getAllTickets: async (params?: any) => {
    // Mock-Daten für Tickets zurückgeben
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 300));

    const mockTickets = [
      {
        id: '1',
        title: 'Server reagiert nicht',
        description: 'Der Hauptserver im Serverraum antwortet nicht mehr auf Anfragen.',
        category: 'Hardware',
        priority: 3, // Hoch
        status: 'Offen',
        device: 'SRV001',
        createdBy: 'Max Mustermann',
        assignedTo: 'Thomas Schmidt',
        createdAt: '2023-11-25T14:00:00Z',
        updatedAt: '2023-11-25T14:00:00Z'
      },
      {
        id: '2',
        title: 'Benutzer kann sich nicht anmelden',
        description: 'Ein Benutzer in der Buchhaltung kann sich nicht am System anmelden, trotz korrektem Passwort.',
        category: 'Zugriffsrechte',
        priority: 2, // Mittel
        status: 'In Bearbeitung',
        device: '',
        createdBy: 'Lisa Müller',
        assignedTo: 'Max Mustermann',
        createdAt: '2023-11-28T09:15:00Z',
        updatedAt: '2023-11-28T10:30:00Z'
      },
      {
        id: '3',
        title: 'Neue Software benötigt',
        description: 'Für die Marketingabteilung wird Adobe Creative Cloud auf 3 Workstations benötigt.',
        category: 'Software',
        priority: 1, // Niedrig
        status: 'Warten auf Antwort',
        device: '',
        createdBy: 'Thomas Schmidt',
        assignedTo: 'Lisa Müller',
        createdAt: '2023-11-30T11:45:00Z',
        updatedAt: '2023-11-30T13:20:00Z'
      },
      {
        id: '4',
        title: 'Netzwerkdrucker funktioniert nicht',
        description: 'Der Netzwerkdrucker im 2. OG druckt keine Dokumente mehr aus.',
        category: 'Hardware',
        priority: 2, // Mittel
        status: 'Gelöst',
        device: 'PRN002',
        createdBy: 'Max Mustermann',
        assignedTo: 'Thomas Schmidt',
        createdAt: '2023-12-01T08:30:00Z',
        updatedAt: '2023-12-01T10:45:00Z'
      },
      {
        id: '5',
        title: 'VPN-Verbindung instabil',
        description: 'Mehrere Mitarbeiter berichten von Problemen mit der VPN-Verbindung im Homeoffice.',
        category: 'Netzwerk',
        priority: 3, // Hoch
        status: 'In Bearbeitung',
        device: '',
        createdBy: 'Lisa Müller',
        assignedTo: 'Max Mustermann',
        createdAt: '2023-12-02T13:20:00Z',
        updatedAt: '2023-12-02T14:30:00Z'
      }
    ];

    return {
      data: mockTickets,
      pagination: {
        total: mockTickets.length,
        page: 1,
        limit: 10,
        pages: 1
      }
    };
  },

  getTicketById: (id: string | number) =>
    apiRequest<{ data: any }>(`/tickets/${id}`),

  createTicket: (ticketData: any) =>
    apiRequest<{ message: string; data: any }>('/tickets', 'POST', ticketData),

  updateTicket: (id: string | number, ticketData: any) =>
    apiRequest<{ message: string; data: any }>(`/tickets/${id}`, 'PUT', ticketData),

  deleteTicket: (id: string | number) =>
    apiRequest<{ message: string }>(`/tickets/${id}`, 'DELETE'),

  // Ticket-Kommentare
  addTicketComment: (ticketId: string | number, commentData: any) =>
    apiRequest<{ message: string; data: any }>(`/tickets/${ticketId}/comments`, 'POST', commentData),

  deleteTicketComment: (commentId: string | number) =>
    apiRequest<{ message: string }>(`/tickets/comments/${commentId}`, 'DELETE'),

  // Ticket-Status ändern
  updateTicketStatus: (id: string | number, status: string) =>
    apiRequest<{ message: string; data: any }>(`/tickets/${id}/status`, 'PATCH', { status }),

  // Ticket-Zuweisung
  assignTicket: (id: string | number, userId?: string | number) =>
    apiRequest<{ message: string; data: any }>(`/tickets/${id}/assign`, 'PATCH', { user_id: userId }),
};

// Report-Funktionen
export const reportsApi = {
  getAllReports: () =>
    apiRequest<{ data: any[] }>('/reports'),

  generateInventoryReport: (params?: any) =>
    apiRequest<{ message: string; data: any }>('/reports/inventory' + (params ? `?${new URLSearchParams(params)}` : '')),

  generateLicenseReport: (params?: any) =>
    apiRequest<{ message: string; data: any }>('/reports/licenses' + (params ? `?${new URLSearchParams(params)}` : '')),

  generateCertificateReport: (params?: any) =>
    apiRequest<{ message: string; data: any }>('/reports/certificates' + (params ? `?${new URLSearchParams(params)}` : '')),

  generateTicketReport: (params?: any) =>
    apiRequest<{ message: string; data: any }>('/reports/tickets' + (params ? `?${new URLSearchParams(params)}` : '')),

  // Neue Funktionen für Reports-Komponente
  getDashboardData: async () => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock-Daten für das Dashboard
    const deviceStats = {
      total: 234,
      byStatus: [
        { name: 'In Betrieb', count: 175, percentage: 74.8, color: '#4caf50' },
        { name: 'Lagernd', count: 32, percentage: 13.7, color: '#2196f3' },
        { name: 'Defekt', count: 18, percentage: 7.7, color: '#f44336' },
        { name: 'In Reparatur', count: 9, percentage: 3.8, color: '#ff9800' }
      ],
      byCategory: [
        { name: 'Laptop', count: 95, percentage: 40.6, color: '#3f51b5' },
        { name: 'Desktop', count: 45, percentage: 19.2, color: '#9c27b0' },
        { name: 'Monitor', count: 52, percentage: 22.2, color: '#009688' },
        { name: 'Drucker', count: 22, percentage: 9.4, color: '#607d8b' },
        { name: 'Sonstiges', count: 20, percentage: 8.6, color: '#795548' }
      ],
      byLocation: [
        { name: 'München', count: 120, percentage: 51.3, color: '#e91e63' },
        { name: 'Berlin', count: 75, percentage: 32.1, color: '#673ab7' },
        { name: 'Hamburg', count: 39, percentage: 16.6, color: '#ff5722' }
      ]
    };

    const licenseStats = {
      total: 156,
      byStatus: [
        { name: 'Aktiv', count: 126, percentage: 80.8, color: '#4caf50' },
        { name: 'Abgelaufen', count: 18, percentage: 11.5, color: '#f44336' },
        { name: 'Bald ablaufend', count: 12, percentage: 7.7, color: '#ff9800' }
      ],
      byType: [
        { name: 'Office 365', count: 85, percentage: 54.5, color: '#2196f3' },
        { name: 'Adobe CC', count: 28, percentage: 17.9, color: '#9c27b0' },
        { name: 'Windows', count: 25, percentage: 16.0, color: '#00bcd4' },
        { name: 'Antivirus', count: 18, percentage: 11.6, color: '#8bc34a' }
      ]
    };

    const ticketStats = {
      total: 42,
      byStatus: [
        { name: 'Offen', count: 15, percentage: 35.7, color: '#f44336' },
        { name: 'In Bearbeitung', count: 18, percentage: 42.9, color: '#ff9800' },
        { name: 'Gelöst', count: 9, percentage: 21.4, color: '#4caf50' }
      ],
      byCategory: [
        { name: 'Hardware', count: 17, percentage: 40.5, color: '#3f51b5' },
        { name: 'Software', count: 13, percentage: 31.0, color: '#9c27b0' },
        { name: 'Netzwerk', count: 8, percentage: 19.0, color: '#00bcd4' },
        { name: 'Zugriffsrechte', count: 4, percentage: 9.5, color: '#ffc107' }
      ],
      byPriority: [
        { name: 'Hoch', count: 8, percentage: 19.0, color: '#f44336' },
        { name: 'Mittel', count: 22, percentage: 52.4, color: '#ff9800' },
        { name: 'Niedrig', count: 12, percentage: 28.6, color: '#4caf50' }
      ]
    };

    const monthlyTickets = [
      { month: 'Jan', count: 24 },
      { month: 'Feb', count: 19 },
      { month: 'Mär', count: 27 },
      { month: 'Apr', count: 23 },
      { month: 'Mai', count: 18 },
      { month: 'Jun', count: 16 },
      { month: 'Jul', count: 15 },
      { month: 'Aug', count: 12 },
      { month: 'Sep', count: 19 },
      { month: 'Okt', count: 26 },
      { month: 'Nov', count: 28 },
      { month: 'Dez', count: 20 }
    ];

    return {
      data: {
        deviceStats,
        licenseStats,
        ticketStats,
        monthlyTickets
      }
    };
  },

  getDeviceReport: async (params?: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 400));

    // Filtere Geräte je nach Zeitraum
    let deviceStats;

    if (params?.timeRange === 'week') {
      deviceStats = {
        total: 52,
        byStatus: [
          { name: 'In Betrieb', count: 38, percentage: 73.1, color: '#4caf50' },
          { name: 'Lagernd', count: 8, percentage: 15.4, color: '#2196f3' },
          { name: 'Defekt', count: 4, percentage: 7.7, color: '#f44336' },
          { name: 'In Reparatur', count: 2, percentage: 3.8, color: '#ff9800' }
        ],
        byCategory: [
          { name: 'Laptop', count: 22, percentage: 42.3, color: '#3f51b5' },
          { name: 'Desktop', count: 12, percentage: 23.1, color: '#9c27b0' },
          { name: 'Monitor', count: 10, percentage: 19.2, color: '#009688' },
          { name: 'Drucker', count: 5, percentage: 9.6, color: '#607d8b' },
          { name: 'Sonstiges', count: 3, percentage: 5.8, color: '#795548' }
        ],
        byLocation: [
          { name: 'München', count: 28, percentage: 53.8, color: '#e91e63' },
          { name: 'Berlin', count: 15, percentage: 28.9, color: '#673ab7' },
          { name: 'Hamburg', count: 9, percentage: 17.3, color: '#ff5722' }
        ]
      };
    } else if (params?.timeRange === 'year') {
      deviceStats = {
        total: 450,
        byStatus: [
          { name: 'In Betrieb', count: 328, percentage: 72.9, color: '#4caf50' },
          { name: 'Lagernd', count: 65, percentage: 14.4, color: '#2196f3' },
          { name: 'Defekt', count: 38, percentage: 8.4, color: '#f44336' },
          { name: 'In Reparatur', count: 19, percentage: 4.3, color: '#ff9800' }
        ],
        byCategory: [
          { name: 'Laptop', count: 185, percentage: 41.1, color: '#3f51b5' },
          { name: 'Desktop', count: 88, percentage: 19.6, color: '#9c27b0' },
          { name: 'Monitor', count: 102, percentage: 22.7, color: '#009688' },
          { name: 'Drucker', count: 40, percentage: 8.9, color: '#607d8b' },
          { name: 'Sonstiges', count: 35, percentage: 7.7, color: '#795548' }
        ],
        byLocation: [
          { name: 'München', count: 238, percentage: 52.9, color: '#e91e63' },
          { name: 'Berlin', count: 132, percentage: 29.3, color: '#673ab7' },
          { name: 'Hamburg', count: 80, percentage: 17.8, color: '#ff5722' }
        ],
        byDepartment: [
          { name: 'IT-Abteilung', count: 68, percentage: 29.1, color: '#00bcd4' },
          { name: 'Buchhaltung', count: 45, percentage: 19.2, color: '#cddc39' },
          { name: 'Marketing', count: 36, percentage: 15.4, color: '#ff9800' },
          { name: 'Personalabteilung', count: 28, percentage: 12.0, color: '#9c27b0' },
          { name: 'Vertrieb', count: 42, percentage: 17.9, color: '#8bc34a' },
          { name: 'Geschäftsleitung', count: 15, percentage: 6.4, color: '#f44336' }
        ]
      };
    } else {
      // Monatsdaten (Standard)
      deviceStats = {
        total: 234,
        byStatus: [
          { name: 'In Betrieb', count: 175, percentage: 74.8, color: '#4caf50' },
          { name: 'Lagernd', count: 32, percentage: 13.7, color: '#2196f3' },
          { name: 'Defekt', count: 18, percentage: 7.7, color: '#f44336' },
          { name: 'In Reparatur', count: 9, percentage: 3.8, color: '#ff9800' }
        ],
        byCategory: [
          { name: 'Laptop', count: 95, percentage: 40.6, color: '#3f51b5' },
          { name: 'Desktop', count: 45, percentage: 19.2, color: '#9c27b0' },
          { name: 'Monitor', count: 52, percentage: 22.2, color: '#009688' },
          { name: 'Drucker', count: 22, percentage: 9.4, color: '#607d8b' },
          { name: 'Sonstiges', count: 20, percentage: 8.6, color: '#795548' }
        ],
        byLocation: [
          { name: 'München', count: 120, percentage: 51.3, color: '#e91e63' },
          { name: 'Berlin', count: 75, percentage: 32.1, color: '#673ab7' },
          { name: 'Hamburg', count: 39, percentage: 16.6, color: '#ff5722' }
        ],
        byDepartment: [
          { name: 'IT-Abteilung', count: 68, percentage: 29.1, color: '#00bcd4' },
          { name: 'Buchhaltung', count: 45, percentage: 19.2, color: '#cddc39' },
          { name: 'Marketing', count: 36, percentage: 15.4, color: '#ff9800' },
          { name: 'Personalabteilung', count: 28, percentage: 12.0, color: '#9c27b0' },
          { name: 'Vertrieb', count: 42, percentage: 17.9, color: '#8bc34a' },
          { name: 'Geschäftsleitung', count: 15, percentage: 6.4, color: '#f44336' }
        ]
      };
    }

    return {
      data: [deviceStats]
    };
  },

  getLicenseReport: async (params?: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 400));

    // Standard-Lizenzstats zurückgeben, unabhängig vom Zeitraum (vereinfacht)
    const licenseStats = {
      total: 156,
      byStatus: [
        { name: 'Aktiv', count: 126, percentage: 80.8, color: '#4caf50' },
        { name: 'Abgelaufen', count: 18, percentage: 11.5, color: '#f44336' },
        { name: 'Bald ablaufend', count: 12, percentage: 7.7, color: '#ff9800' }
      ],
      byType: [
        { name: 'Office 365', count: 85, percentage: 54.5, color: '#2196f3' },
        { name: 'Adobe CC', count: 28, percentage: 17.9, color: '#9c27b0' },
        { name: 'Windows', count: 25, percentage: 16.0, color: '#00bcd4' },
        { name: 'Antivirus', count: 18, percentage: 11.6, color: '#8bc34a' }
      ]
    };

    return {
      data: [licenseStats]
    };
  },

  // Neue Funktion: Gerätedaten für einen bestimmten Standort abrufen
  getDevicesByLocation: async (locationId: string) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock-Standortnamen basierend auf ID
    let locationName = "Unbekannt";
    switch (locationId) {
      case "loc-1": locationName = "München Zentrale"; break;
      case "loc-2": locationName = "Berlin Büro"; break;
      case "loc-3": locationName = "Hamburg Niederlassung"; break;
      case "loc-4": locationName = "Frankfurt Office"; break;
      default: locationName = `Standort ${locationId}`;
    }

    // Je nach Standort-ID unterschiedliche Daten zurückgeben
    const totalDevices = locationId === "loc-1" ? 182 :
                        locationId === "loc-2" ? 94 :
                        locationId === "loc-3" ? 63 :
                        locationId === "loc-4" ? 41 :
                        Math.floor(Math.random() * 100) + 50;

    return {
      data: {
        location: locationName,
        locationId: locationId,
        totalDevices: totalDevices,
        devicesByCategory: [
          { name: "PC", count: Math.floor(totalDevices * 0.4), percentage: 40, color: "#1976d2" },
          { name: "Laptop", count: Math.floor(totalDevices * 0.3), percentage: 30, color: "#00bcd4" },
          { name: "Monitor", count: Math.floor(totalDevices * 0.15), percentage: 15, color: "#4caf50" },
          { name: "Drucker", count: Math.floor(totalDevices * 0.08), percentage: 8, color: "#ff9800" },
          { name: "Server", count: Math.floor(totalDevices * 0.05), percentage: 5, color: "#f44336" },
          { name: "Sonstige", count: totalDevices - Math.floor(totalDevices * 0.98), percentage: 2, color: "#9c27b0" }
        ]
      }
    };
  },

  // Neue Funktion: Gerätedaten für eine bestimmte Abteilung abrufen
  getDevicesByDepartment: async (departmentId: string) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock-Abteilungsnamen basierend auf ID
    let departmentName = "Unbekannt";
    switch (departmentId) {
      case "dep-1": departmentName = "IT-Abteilung"; break;
      case "dep-2": departmentName = "Finanzen"; break;
      case "dep-3": departmentName = "Marketing"; break;
      case "dep-4": departmentName = "Vertrieb"; break;
      case "dep-5": departmentName = "Personal"; break;
      default: departmentName = `Abteilung ${departmentId}`;
    }

    // Je nach Abteilungs-ID unterschiedliche Daten zurückgeben
    const totalDevices = departmentId === "dep-1" ? 127 :
                        departmentId === "dep-2" ? 68 :
                        departmentId === "dep-3" ? 42 :
                        departmentId === "dep-4" ? 89 :
                        departmentId === "dep-5" ? 33 :
                        Math.floor(Math.random() * 70) + 30;

    return {
      data: {
        department: departmentName,
        departmentId: departmentId,
        totalDevices: totalDevices,
        devicesByCategory: [
          { name: "PC", count: Math.floor(totalDevices * 0.35), percentage: 35, color: "#1976d2" },
          { name: "Laptop", count: Math.floor(totalDevices * 0.45), percentage: 45, color: "#00bcd4" },
          { name: "Monitor", count: Math.floor(totalDevices * 0.12), percentage: 12, color: "#4caf50" },
          { name: "Drucker", count: Math.floor(totalDevices * 0.05), percentage: 5, color: "#ff9800" },
          { name: "Sonstige", count: Math.floor(totalDevices * 0.03), percentage: 3, color: "#9c27b0" }
        ],
        deviceStatus: [
          { name: "In Betrieb", count: Math.floor(totalDevices * 0.85), percentage: 85, color: "#4caf50" },
          { name: "Lagernd", count: Math.floor(totalDevices * 0.10), percentage: 10, color: "#ff9800" },
          { name: "Defekt", count: Math.floor(totalDevices * 0.03), percentage: 3, color: "#f44336" },
          { name: "In Reparatur", count: Math.floor(totalDevices * 0.02), percentage: 2, color: "#9c27b0" }
        ]
      }
    };
  },

  // Neue Funktion: Liste aller Standorte und Abteilungen abrufen
  getLocationsAndDepartments: async () => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      data: {
        locations: [
          { id: "loc-1", name: "München Zentrale", count: 182 },
          { id: "loc-2", name: "Berlin Büro", count: 94 },
          { id: "loc-3", name: "Hamburg Niederlassung", count: 63 },
          { id: "loc-4", name: "Frankfurt Office", count: 41 }
        ],
        departments: [
          { id: "dep-1", name: "IT-Abteilung", count: 127 },
          { id: "dep-2", name: "Finanzen", count: 68 },
          { id: "dep-3", name: "Marketing", count: 42 },
          { id: "dep-4", name: "Vertrieb", count: 89 },
          { id: "dep-5", name: "Personal", count: 33 }
        ]
      }
    };
  },
};

// Einstellungs-Funktionen
export const settingsApi = {
  // Kategorien
  getAllCategories: async () => {
    try {
      const result = await apiRequest<{ data: any }>('/settings/categories');

      // Konvertiere die snake_case zu camelCase für Frontend-Kompatibilität
      if (result?.data) {
        const categories = result.data.map((category: {
          id: number;
          name: string;
          description?: string;
          type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: category.id,
          name: category.name,
          description: category.description || '',
          type: category.type || 'device',
          isActive: category.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: category.created_at,
          updatedAt: category.updated_at
        }));

        // Sortiere Kategorien nach Name
        categories.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        return { data: categories };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Kategorien:', error);
      throw error;
    }
  },

  getCategoryById: async (id: string | number) => {
    try {
      const result = await apiRequest<{ data: any }>(`/settings/categories/${id}`, 'GET', undefined, false);

      if (result?.data) {
        // Konvertiere die Feldnamen für Frontend-Kompatibilität
        const category = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          type: result.data.type || 'device',
          isActive: result.data.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        };
        return { data: category };
      }

      return result;
    } catch (error) {
      console.error(`Fehler beim Abrufen der Kategorie mit ID ${id}:`, error);
      throw error;
    }
  },

  createCategory: async (categoryData: any) => {
    try {
      const result = await apiRequest<{ data: any }>(`/settings/categories`, 'POST', categoryData, false);
      return result;
    } catch (error) {
      console.error('Fehler beim Erstellen der Kategorie:', error);
      throw error;
    }
  },

  updateCategory: async (id: string | number, categoryData: any) => {
    try {
      const result = await apiRequest<{ data: any }>(`/settings/categories/${id}`, 'PUT', categoryData, false);
      return result;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Kategorie mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteCategory: async (id: string | number) => {
    try {
      const result = await apiRequest<{ data: any }>(`/settings/categories/${id}`, 'DELETE', undefined, false);
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen der Kategorie mit ID ${id}:`, error);
      throw error;
    }
  },

  // Standorte (Locations)
  getAllLocations: async () => {
    try {
      const result = await apiRequest<any>('/settings/locations');

      // Konvertiere Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const locations = result.data.map((location: {
          id: number;
          name: string;
          description?: string;
          address?: string;
          city?: string;
          postal_code?: string;
          country?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: location.id,
          name: location.name,
          description: location.description || '',
          address: location.address || '',
          city: location.city || '',
          postalCode: location.postal_code || '',
          country: location.country || 'Deutschland',
          isActive: location.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: location.created_at,
          updatedAt: location.updated_at
        }));
        // Sortiere Standorte nach Name
        locations.sort((a: Location, b: Location) => a.name.localeCompare(b.name));
        return { data: locations };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Standorte:', error);
      throw error;
    }
  },

  checkLocationNameExists: async (name: string): Promise<boolean> => {
    try {
      // Überprüfen, ob ein Standort mit dem Namen bereits existiert
      const locations = await settingsApi.getAllLocations();
      return locations.data.some((location: { name: string }) =>
        location.name.toLowerCase() === name.toLowerCase()
      );
    } catch (error) {
      console.error('Fehler beim Überprüfen des Standortnamens:', error);
      // Im Fehlerfall geben wir false zurück, damit die Validierung fortgesetzt werden kann
      return false;
    }
  },

  getLocationById: async (id: number) => {
    try {
      const result = await apiRequest<any>(`/settings/locations/${id}`, 'GET');

      // Konvertiere Feldnamen für Frontend-Kompatibilität
      if (result) {
        const location = {
          id: result.id,
          name: result.name,
          description: result.description || '',
          address: result.address || '',
          city: result.city || '',
          postalCode: result.postal_code || '',
          country: result.country || 'Deutschland',
          isActive: result.is_active
        };
        return { data: location };
      }

      return { data: null };
    } catch (error) {
      console.error(`Fehler beim Laden des Standorts mit ID ${id}:`, error);
      throw error;
    }
  },

  createLocation: async (locationData: {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: locationData.name,
        description: locationData.description,
        address: locationData.address,
        city: locationData.city,
        postal_code: locationData.postalCode,
        country: locationData.country || 'Deutschland',
        is_active: locationData.isActive
      };

      const result = await apiRequest<any>('/settings/locations', 'POST', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result) {
        const newLocation = {
          id: result.id,
          name: result.name,
          description: result.description || '',
          address: result.address || '',
          city: result.city || '',
          postalCode: result.postal_code || '',
          country: result.country || 'Deutschland',
          isActive: result.is_active
        };
        return {
          message: result.message || 'Standort erfolgreich erstellt',
          data: newLocation
        };
      }

      return { message: 'Standort erstellt', data: null };
    } catch (error) {
      console.error('Fehler beim Erstellen des Standorts:', error);
      throw error;
    }
  },

  updateLocation: async (id: number, locationData: {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: locationData.name,
        description: locationData.description,
        address: locationData.address,
        city: locationData.city,
        postal_code: locationData.postalCode,
        country: locationData.country || 'Deutschland',
        is_active: locationData.isActive
      };

      const result = await apiRequest<any>(`/settings/locations/${id}`, 'PUT', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result) {
        const updatedLocation = {
          id: result.id,
          name: result.name,
          description: result.description || '',
          address: result.address || '',
          city: result.city || '',
          postalCode: result.postal_code || '',
          country: result.country || 'Deutschland',
          isActive: result.is_active
        };
        return {
          message: result.message || 'Standort erfolgreich aktualisiert',
          data: updatedLocation
        };
      }

      return { message: 'Standort aktualisiert', data: null };
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Standorts mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteLocation: async (id: number) => {
    try {
      const result = await apiRequest<any>(`/settings/locations/${id}`, 'DELETE');
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen des Standorts mit ID ${id}:`, error);
      throw error;
    }
  },

  // Lieferanten
  getAllSuppliers: async () => {
    try {
      const result = await apiRequest<any>('/settings/suppliers');

      // Konvertiere die snake_case zu camelCase für Frontend-Kompatibilität
      if (result?.data) {
        const suppliers = result.data.map((supplier: {
          id: number;
          name: string;
          description?: string;
          website?: string;
          address?: string;
          city?: string;
          postal_code?: string;
          contact_person?: string;
          contact_email?: string;
          contact_phone?: string;
          contract_number?: string;
          notes?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: supplier.id,
          name: supplier.name,
          description: supplier.description || '',
          website: supplier.website || '',
          address: supplier.address || '',
          city: supplier.city || '',
          postalCode: supplier.postal_code || '',
          contactPerson: supplier.contact_person || '',
          contactEmail: supplier.contact_email || '',
          contactPhone: supplier.contact_phone || '',
          contractNumber: supplier.contract_number || '',
          notes: supplier.notes || '',
          isActive: supplier.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: supplier.created_at,
          updatedAt: supplier.updated_at
        }));

        // Sortiere Lieferanten nach Name
        suppliers.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        return { data: suppliers };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Lieferanten:', error);
      throw error;
    }
  },

  getSupplierById: async (id: number) => {
    try {
      const result = await apiRequest<any>(`/settings/suppliers/${id}`, 'GET');

      // Konvertiere die Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const supplier = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          website: result.data.website || '',
          address: result.data.address || '',
          city: result.data.city || '',
          postalCode: result.data.postal_code || '',
          contactPerson: result.data.contact_person || '',
          contactEmail: result.data.contact_email || '',
          contactPhone: result.data.contact_phone || '',
          contractNumber: result.data.contract_number || '',
          notes: result.data.notes || '',
          isActive: result.data.is_active !== false
        };
        return { data: supplier };
      }

      return { data: null };
    } catch (error) {
      console.error(`Fehler beim Laden des Lieferanten mit ID ${id}:`, error);
      throw error;
    }
  },

  createSupplier: async (supplierData: {
    name: string;
    description?: string;
    website?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    contractNumber?: string;
    notes?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: supplierData.name,
        description: supplierData.description,
        website: supplierData.website,
        address: supplierData.address,
        city: supplierData.city,
        postal_code: supplierData.postalCode,
        contact_person: supplierData.contactPerson,
        contact_email: supplierData.contactEmail,
        contact_phone: supplierData.contactPhone,
        contract_number: supplierData.contractNumber,
        notes: supplierData.notes,
        is_active: supplierData.isActive
      };

      const result = await apiRequest<any>('/settings/suppliers', 'POST', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const newSupplier = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          website: result.data.website || '',
          address: result.data.address || '',
          city: result.data.city || '',
          postalCode: result.data.postal_code || '',
          contactPerson: result.data.contact_person || '',
          contactEmail: result.data.contact_email || '',
          contactPhone: result.data.contact_phone || '',
          contractNumber: result.data.contract_number || '',
          notes: result.data.notes || '',
          isActive: result.data.is_active !== false
        };
        return {
          message: result.message || 'Lieferant erfolgreich erstellt',
          data: newSupplier
        };
      }

      return { message: 'Lieferant erstellt', data: null };
    } catch (error) {
      console.error('Fehler beim Erstellen des Lieferanten:', error);
      throw error;
    }
  },

  updateSupplier: async (id: number, supplierData: {
    name?: string;
    description?: string;
    website?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
    contractNumber?: string;
    notes?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: supplierData.name,
        description: supplierData.description,
        website: supplierData.website,
        address: supplierData.address,
        city: supplierData.city,
        postal_code: supplierData.postalCode,
        contact_person: supplierData.contactPerson,
        contact_email: supplierData.contactEmail,
        contact_phone: supplierData.contactPhone,
        contract_number: supplierData.contractNumber,
        notes: supplierData.notes,
        is_active: supplierData.isActive
      };

      const result = await apiRequest<any>(`/settings/suppliers/${id}`, 'PUT', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const updatedSupplier = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          website: result.data.website || '',
          address: result.data.address || '',
          city: result.data.city || '',
          postalCode: result.data.postal_code || '',
          contactPerson: result.data.contact_person || '',
          contactEmail: result.data.contact_email || '',
          contactPhone: result.data.contact_phone || '',
          contractNumber: result.data.contract_number || '',
          notes: result.data.notes || '',
          isActive: result.data.is_active !== false
        };
        return {
          message: result.message || 'Lieferant erfolgreich aktualisiert',
          data: updatedSupplier
        };
      }

      return { message: 'Lieferant aktualisiert', data: null };
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Lieferanten mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteSupplier: async (id: number) => {
    try {
      const result = await apiRequest<any>(`/settings/suppliers/${id}`, 'DELETE');
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen des Lieferanten mit ID ${id}:`, error);
      throw error;
    }
  },

  // Hersteller (Manufacturers)
  getAllManufacturers: async () => {
    try {
      const result = await apiRequest<any>('/settings/manufacturers', 'GET', undefined, false);

      // Konvertiere die snake_case zu camelCase für Frontend-Kompatibilität
      if (result?.data) {
        const manufacturers = result.data.map((manufacturer: {
          id: number;
          name: string;
          description?: string;
          logo_url?: string;
          website?: string;
          contact_info?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: manufacturer.id,
          name: manufacturer.name,
          description: manufacturer.description || '',
          logoUrl: manufacturer.logo_url || '',
          website: manufacturer.website || '',
          contactInfo: manufacturer.contact_info || '',
          isActive: manufacturer.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: manufacturer.created_at,
          updatedAt: manufacturer.updated_at
        }));

        // Sortiere Hersteller nach Name
        manufacturers.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        return { data: manufacturers };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Hersteller:', error);
      throw error;
    }
  },

  getManufacturerById: async (id: string | number) => {
    try {
      const result = await apiRequest<{ data: any }>(`/settings/manufacturers/${id}`, 'GET', undefined, false);

      if (result?.data) {
        // Konvertiere die Feldnamen für Frontend-Kompatibilität
        const manufacturer = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          logoUrl: result.data.logo_url || '',
          website: result.data.website || '',
          contactInfo: result.data.contact_info || '',
          isActive: result.data.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        };
        return { data: manufacturer };
      }

      return result;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Herstellers mit ID ${id}:`, error);
      throw error;
    }
  },

  createManufacturer: async (manufacturerData: {
    name: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    contactInfo?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: manufacturerData.name,
        description: manufacturerData.description,
        logo_url: manufacturerData.logoUrl,
        website: manufacturerData.website,
        contact_info: manufacturerData.contactInfo,
        is_active: manufacturerData.isActive
      };

      const result = await apiRequest<{ data: any }>(`/settings/manufacturers`, 'POST', backendData, false);
      return result;
    } catch (error) {
      console.error('Fehler beim Erstellen des Herstellers:', error);
      throw error;
    }
  },

  updateManufacturer: async (id: string | number, manufacturerData: {
    name?: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    contactInfo?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: manufacturerData.name,
        description: manufacturerData.description,
        logo_url: manufacturerData.logoUrl,
        website: manufacturerData.website,
        contact_info: manufacturerData.contactInfo,
        is_active: manufacturerData.isActive
      };

      const result = await apiRequest<{ data: any }>(`/settings/manufacturers/${id}`, 'PUT', backendData, false);
      return result;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Herstellers mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteManufacturer: async (id: string | number) => {
    try {
      const result = await apiRequest<{ data: any }>(`/settings/manufacturers/${id}`, 'DELETE', undefined, false);
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen des Herstellers mit ID ${id}:`, error);
      throw error;
    }
  },

  // Switches (Netzwerk-Switches)
  getAllSwitches: async () => {
    try {
      const result = await apiRequest<any>('/settings/switches');

      // Konvertiere die snake_case zu camelCase für Frontend-Kompatibilität
      if (result?.data) {
        const switches = result.data.map((switchItem: {
          id: number;
          name: string;
          description?: string;
          model?: string;
          manufacturer_id?: number;
          manufacturer_name?: string;
          ip_address?: string;
          mac_address?: string;
          management_url?: string;
          location_id?: number;
          location_name?: string;
          room_id?: number;
          room_name?: string;
          cabinet_id?: number;
          rack_position?: string;
          port_count?: number;
          uplink_port?: string;
          notes?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: switchItem.id,
          name: switchItem.name,
          description: switchItem.description || '',
          model: switchItem.model || '',
          manufacturerId: switchItem.manufacturer_id,
          manufacturerName: switchItem.manufacturer_name || '',
          ipAddress: switchItem.ip_address || '',
          macAddress: switchItem.mac_address || '',
          managementUrl: switchItem.management_url || '',
          locationId: switchItem.location_id,
          locationName: switchItem.location_name || '',
          roomId: switchItem.room_id,
          roomName: switchItem.room_name || '',
          cabinetId: switchItem.cabinet_id,
          rackPosition: switchItem.rack_position || '',
          portCount: switchItem.port_count || 0,
          uplinkPort: switchItem.uplink_port || '',
          notes: switchItem.notes || '',
          isActive: switchItem.is_active !== false, // Falls null oder undefined, nehme true an
          createdAt: switchItem.created_at,
          updatedAt: switchItem.updated_at
        }));

        // Sortiere Switches nach Name
        switches.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
        return { data: switches };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Switches:', error);
      throw error;
    }
  },

  getSwitchById: async (id: number) => {
    try {
      const result = await apiRequest<any>(`/settings/switches/${id}`, 'GET');

      // Konvertiere die Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const switchItem = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          model: result.data.model || '',
          manufacturerId: result.data.manufacturer_id,
          manufacturerName: result.data.manufacturer_name || '',
          ipAddress: result.data.ip_address || '',
          macAddress: result.data.mac_address || '',
          managementUrl: result.data.management_url || '',
          locationId: result.data.location_id,
          locationName: result.data.location_name || '',
          roomId: result.data.room_id,
          roomName: result.data.room_name || '',
          cabinetId: result.data.cabinet_id,
          rackPosition: result.data.rack_position || '',
          portCount: result.data.port_count || 0,
          uplinkPort: result.data.uplink_port || '',
          notes: result.data.notes || '',
          isActive: result.data.is_active !== false
        };
        return { data: switchItem };
      }

      return { data: null };
    } catch (error) {
      console.error(`Fehler beim Laden des Switches mit ID ${id}:`, error);
      throw error;
    }
  },

  createSwitch: async (switchData: {
    name: string;
    description?: string;
    model?: string;
    manufacturerId?: number;
    ipAddress?: string;
    macAddress?: string;
    managementUrl?: string;
    locationId?: number;
    roomId?: number;
    cabinetId?: number;
    rackPosition?: string;
    portCount?: number;
    uplinkPort?: string;
    notes?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: switchData.name,
        description: switchData.description,
        model: switchData.model,
        manufacturer_id: switchData.manufacturerId,
        ip_address: switchData.ipAddress,
        mac_address: switchData.macAddress,
        management_url: switchData.managementUrl,
        location_id: switchData.locationId,
        room_id: switchData.roomId,
        cabinet_id: switchData.cabinetId,
        rack_position: switchData.rackPosition,
        port_count: switchData.portCount,
        uplink_port: switchData.uplinkPort,
        notes: switchData.notes,
        isActive: switchData.isActive
      };

      const result = await apiRequest<any>('/settings/switches', 'POST', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const newSwitch = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          model: result.data.model || '',
          manufacturerId: result.data.manufacturer_id,
          manufacturerName: result.data.manufacturer_name || '',
          ipAddress: result.data.ip_address || '',
          macAddress: result.data.mac_address || '',
          managementUrl: result.data.management_url || '',
          locationId: result.data.location_id,
          locationName: result.data.location_name || '',
          roomId: result.data.room_id,
          roomName: result.data.room_name || '',
          cabinetId: result.data.cabinet_id,
          rackPosition: result.data.rack_position || '',
          portCount: result.data.port_count || 0,
          uplinkPort: result.data.uplink_port || '',
          notes: result.data.notes || '',
          isActive: result.data.is_active !== false
        };
        return {
          message: result.message || 'Switch erfolgreich erstellt',
          data: newSwitch
        };
      }

      return { message: 'Switch erstellt', data: null };
    } catch (error) {
      console.error('Fehler beim Erstellen des Switches:', error);
      throw error;
    }
  },

  updateSwitch: async (id: number, switchData: {
    name?: string;
    description?: string;
    model?: string;
    manufacturerId?: number;
    ipAddress?: string;
    macAddress?: string;
    managementUrl?: string;
    locationId?: number;
    roomId?: number;
    cabinetId?: number;
    rackPosition?: string;
    portCount?: number;
    uplinkPort?: string;
    notes?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: switchData.name,
        description: switchData.description,
        model: switchData.model,
        manufacturer_id: switchData.manufacturerId,
        ip_address: switchData.ipAddress,
        mac_address: switchData.macAddress,
        management_url: switchData.managementUrl,
        location_id: switchData.locationId,
        room_id: switchData.roomId,
        cabinet_id: switchData.cabinetId,
        rack_position: switchData.rackPosition,
        port_count: switchData.portCount,
        uplink_port: switchData.uplinkPort,
        notes: switchData.notes,
        isActive: switchData.isActive
      };

      const result = await apiRequest<any>(`/settings/switches/${id}`, 'PUT', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const updatedSwitch = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          model: result.data.model || '',
          manufacturerId: result.data.manufacturer_id,
          manufacturerName: result.data.manufacturer_name || '',
          ipAddress: result.data.ip_address || '',
          macAddress: result.data.mac_address || '',
          managementUrl: result.data.management_url || '',
          locationId: result.data.location_id,
          locationName: result.data.location_name || '',
          roomId: result.data.room_id,
          roomName: result.data.room_name || '',
          cabinetId: result.data.cabinet_id,
          rackPosition: result.data.rack_position || '',
          portCount: result.data.port_count || 0,
          uplinkPort: result.data.uplink_port || '',
          notes: result.data.notes || '',
          isActive: result.data.is_active !== false
        };
        return {
          message: result.message || 'Switch erfolgreich aktualisiert',
          data: updatedSwitch
        };
      }

      return { message: 'Switch aktualisiert', data: null };
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Switches mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteSwitch: async (id: number) => {
    try {
      const result = await apiRequest<any>(`/settings/switches/${id}`, 'DELETE');
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen des Switches mit ID ${id}:`, error);
      throw error;
    }
  },

  // Netzwerkdosen
  getAllNetworkOutlets: async () => {
    try {
      const response = await apiRequest<{ data: any[] }>('/settings/network-sockets');

      // Prüfen ob die Antwort die erwartete Struktur hat
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Unerwartete API-Antwort beim Abrufen der Netzwerkdosen:', response);
        return { data: [] };
      }

      // Konvertiere snake_case zu camelCase für Frontend-Kompatibilität
      const formattedData = response.data.map(outlet => ({
        id: outlet.id,
        name: outlet.name,
        description: outlet.description || '',
        locationId: outlet.location_id,
        locationName: outlet.location_name || '',
        roomId: outlet.room_id,
        roomName: outlet.room_name || '',
        wallPosition: outlet.wall_position || '',
        positionDescription: outlet.position_description || '',
        outletNumber: outlet.outlet_number || '',
        socketType: outlet.socket_type || 'ethernet',
        notes: outlet.notes || '',
        isActive: outlet.is_active === undefined ? true : outlet.is_active,
        createdAt: outlet.created_at || new Date().toISOString(),
        updatedAt: outlet.updated_at || new Date().toISOString()
      }));

      return { data: formattedData };
    } catch (error) {
      console.error('Fehler beim Abrufen der Netzwerkdosen:', error);
      throw error;
    }
  },

  getNetworkOutletById: async (id: number) => {
    try {
      const response = await apiRequest<{ data: any }>(`/settings/network-sockets/${id}`);

      // Prüfen ob die Antwort die erwartete Struktur hat
      if (!response || !response.data) {
        console.error(`Unerwartete API-Antwort beim Abrufen der Netzwerkdose mit ID ${id}:`, response);
        throw new Error('Netzwerkdose konnte nicht gefunden werden');
      }

      // Konvertiere snake_case zu camelCase für Frontend-Kompatibilität
      const outlet = response.data;
      const formattedData = {
        id: outlet.id,
        name: outlet.name,
        description: outlet.description || '',
        locationId: outlet.location_id,
        locationName: outlet.location_name || '',
        roomId: outlet.room_id,
        roomName: outlet.room_name || '',
        wallPosition: outlet.wall_position || '',
        isActive: outlet.is_active === undefined ? true : outlet.is_active,
        createdAt: outlet.created_at || new Date().toISOString(),
        updatedAt: outlet.updated_at || new Date().toISOString()
      };

      return { data: formattedData };
    } catch (error) {
      console.error(`Fehler beim Abrufen der Netzwerkdose mit ID ${id}:`, error);
      throw error;
    }
  },

  createNetworkOutlet: async (outletData: any) => {
    try {
      // Debug: Eingabedaten anzeigen
      console.log('Input createNetworkOutlet:', outletData);

      // Validierung: outletNumber muss vorhanden sein
      if (!outletData.outletNumber) {
        throw new Error('Dosennummer ist ein Pflichtfeld');
      }

      // Erstelle ein sauberes Objekt mit nur den benötigten Feldern
      const cleanData = {
        outlet_number: outletData.outletNumber,
        description: outletData.description || '',
        location_id: outletData.locationId || null,
        room_id: outletData.roomId || null,
        is_active: outletData.isActive !== undefined ? outletData.isActive : true
      };

      // Debug-Ausgabe
      console.log('Bereinigte Daten für Backend:', cleanData);
      console.log('Tatsächlich gesendeter JSON-String:', JSON.stringify(cleanData));

      const response = await apiRequest<{ data: any, message: string }>('/settings/network-sockets', 'POST', cleanData);

      // Debug: Antwort vom Server
      console.log('Backend-Antwort:', response);

      // Fehlerprüfung
      if (!response || !response.data) {
        console.error('Unerwartete API-Antwort beim Erstellen der Netzwerkdose:', response);
        throw new Error('Netzwerkdose konnte nicht erstellt werden');
      }

      // Konvertiere zurück zu camelCase für Frontend
      const outlet = response.data;
      const formattedResponseData = {
        id: outlet.id,
        description: outlet.description || '',
        locationId: outlet.location_id,
        locationName: outlet.location_name || '',
        roomId: outlet.room_id,
        roomName: outlet.room_name || '',
        outletNumber: outlet.outlet_number || '',
        isActive: outlet.is_active === undefined ? true : outlet.is_active,
        createdAt: outlet.created_at || new Date().toISOString(),
        updatedAt: outlet.updated_at || new Date().toISOString()
      };

      return {
        message: response.message || 'Netzwerkdose erfolgreich erstellt',
        data: formattedResponseData
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Fehler beim Erstellen der Netzwerkdose:', error.message);
        throw error;
      }
      // Wenn es kein Error-Objekt ist, werfen wir einen neuen Error
      throw new Error('Ein unbekannter Fehler ist aufgetreten');
    }
  },

  updateNetworkOutlet: async (id: number, outletData: any) => {
    try {
      // Debug: Eingabedaten anzeigen
      console.log('Input updateNetworkOutlet:', outletData);

      // Stellen Sie sicher, dass outletNumber vorhanden ist und im richtigen Format
      if (!outletData.outletNumber && !outletData.socketNumber && !outletData.outlet_number) {
        throw new Error('Dosennummer ist ein Pflichtfeld');
      }

      // Erstelle ein sauberes Objekt mit nur den benötigten Feldern
      const cleanData = {
        outlet_number: outletData.outletNumber || outletData.socketNumber || outletData.outlet_number,
        description: outletData.description || '',
        location_id: outletData.locationId || null,
        room_id: outletData.roomId || null,
        is_active: outletData.isActive !== undefined ? outletData.isActive : true
      };

      // Debug: Die bereinigte Daten anzeigen, die an das Backend gesendet werden
      console.log('Bereinigte Daten für Backend:', cleanData);
      console.log('Tatsächlich gesendeter JSON-String:', JSON.stringify(cleanData));

      const response = await apiRequest<{ data: any, message: string }>(`/settings/network-sockets/${id}`, 'PUT', cleanData);

      // Debug: Antwort vom Server
      console.log('Backend-Antwort:', response);

      // Fehlerprüfung
      if (!response || !response.data) {
        console.error(`Unerwartete API-Antwort beim Aktualisieren der Netzwerkdose mit ID ${id}:`, response);
        throw new Error('Netzwerkdose konnte nicht aktualisiert werden');
      }

      // Konvertiere zurück zu camelCase für Frontend
      const outlet = response.data;
      const formattedResponseData = {
        id: outlet.id,
        description: outlet.description || '',
        locationId: outlet.location_id,
        locationName: outlet.location_name || '',
        roomId: outlet.room_id,
        roomName: outlet.room_name || '',
        outletNumber: outlet.outlet_number || '',
        isActive: outlet.is_active === undefined ? true : outlet.is_active,
        createdAt: outlet.created_at || new Date().toISOString(),
        updatedAt: outlet.updated_at || new Date().toISOString()
      };

      return {
        message: response.message || 'Netzwerkdose erfolgreich aktualisiert',
        data: formattedResponseData
      };
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Netzwerkdose mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteNetworkOutlet: async (id: number) => {
    try {
      const response = await apiRequest<{ message: string }>(`/settings/network-sockets/${id}`, 'DELETE');
      return {
        message: response.message || 'Netzwerkdose erfolgreich gelöscht'
      };
    } catch (error) {
      console.error(`Fehler beim Löschen der Netzwerkdose mit ID ${id}:`, error);
      throw error;
    }
  },

  // Ports
  getAllPorts: async () => {
    // Simulierte Daten für das Frontend-Prototyping
    const mockPorts = [
      {
        id: 1,
        name: "Port-01",
        description: "Port 1 am Core-Switch",
        switchId: 1,
        networkOutletId: 1,
        isActive: true
      },
      {
        id: 2,
        name: "Port-02",
        description: "Port 2 am Core-Switch",
        switchId: 1,
        networkOutletId: 2,
        isActive: true
      },
      {
        id: 3,
        name: "Port-01",
        description: "Port 1 am Edge-Switch",
        switchId: 2,
        networkOutletId: 3,
        isActive: true
      }
    ];

    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 400));

    return { data: mockPorts };
  },

  getPortById: async (id: number) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 200));

    const mockPort = {
      id: id,
      name: `Port-${id}`,
      description: `Beschreibung für Port ${id}`,
      switchId: id % 3 + 1,
      networkOutletId: id % 3 + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { data: mockPort };
  },

  createPort: async (portData: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 500));

    const newPort = {
      id: Math.floor(Math.random() * 1000) + 10,
      ...portData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      message: "Port erfolgreich erstellt",
      data: newPort
    };
  },

  updatePort: async (id: number, portData: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 400));

    const updatedPort = {
      id: id,
      ...portData,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      message: "Port erfolgreich aktualisiert",
      data: updatedPort
    };
  },

  deletePort: async (id: number) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      message: "Port erfolgreich gelöscht"
    };
  },

  // Gerätemodelle
  getAllDeviceModels: async () => {
    try {
      const response = await apiRequest<{ data: any[] }>('/settings/device-models');

      // Prüfen ob die Antwort die erwartete Struktur hat
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Unerwartete API-Antwort beim Abrufen der Gerätemodelle:', response);
        return { data: [] };
      }

      // Konvertiere snake_case zu camelCase für Frontend-Kompatibilität
      const formattedData = response.data.map(model => ({
        id: model.id,
        name: model.name,
        description: model.description || '',
        manufacturerId: model.manufacturer_id,
        manufacturerName: model.manufacturer_name || '',
        categoryId: model.category_id,
        categoryName: model.category_name || '',
        specifications: model.specifications || '',
        cpu: model.cpu || '',
        ram: model.ram || '',
        hdd: model.hdd || '',
        warrantyMonths: model.warranty_months || 0,
        deviceCount: model.device_count || 0,
        isActive: model.is_active === undefined ? true : model.is_active,
        createdAt: model.created_at || new Date().toISOString(),
        updatedAt: model.updated_at || new Date().toISOString()
      }));

      return { data: formattedData };
    } catch (error) {
      console.error('Fehler beim Abrufen der Gerätemodelle:', error);
      throw error;
    }
  },

  getDeviceModelById: async (id: number) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 200));

    const mockDeviceModel = {
      id: id,
      name: id === 1 ? "MacBook Pro 16\"" : id === 2 ? "Dell Latitude 7420" : "iPhone 14 Pro",
      description: `Beschreibung für Gerätemodell ${id}`,
      manufacturerId: id % 2 + 1,
      categoryId: id % 2 + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { data: mockDeviceModel };
  },

  createDeviceModel: async (modelData: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 500));

    const newModel = {
      id: Math.floor(Math.random() * 1000) + 10,
      ...modelData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      message: "Gerätemodell erfolgreich erstellt",
      data: newModel
    };
  },

  updateDeviceModel: async (id: number, modelData: any) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 400));

    const updatedModel = {
      id: id,
      ...modelData,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      message: "Gerätemodell erfolgreich aktualisiert",
      data: updatedModel
    };
  },

  deleteDeviceModel: async (id: number) => {
    // Verzögerung simulieren
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      message: "Gerätemodell erfolgreich gelöscht"
    };
  },

  // Abteilungen
  getAllDepartments: async () => {
    try {
      const result = await apiRequest<any>('/settings/departments');

      // Konvertiere Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const departments = result.data.map((department: {
          id: number;
          name: string;
          description?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: department.id,
          name: department.name,
          description: department.description || '',
          isActive: department.active !== false, // Falls null oder undefined, nehme true an
          active: department.active,
          createdAt: department.created_at,
          updatedAt: department.updated_at,
          created_at: department.created_at,
          updated_at: department.updated_at
        }));
        return { data: departments };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Abteilungen:', error);
      throw error;
    }
  },

  getDepartmentById: async (id: string | number) => {
    try {
      const result = await apiRequest<any>(`/settings/departments/${id}`, 'GET');

      // Konvertiere Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const department = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          isActive: result.data.active !== false,
          active: result.data.active,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
        return { data: department };
      }

      return { data: null };
    } catch (error) {
      console.error(`Fehler beim Laden der Abteilung mit ID ${id}:`, error);
      throw error;
    }
  },

  createDepartment: async (departmentData: {
    name: string;
    description?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: departmentData.name,
        description: departmentData.description,
        isActive: departmentData.isActive
      };

      const result = await apiRequest<any>('/settings/departments', 'POST', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const newDepartment = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          isActive: result.data.active !== false,
          active: result.data.active,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
        return {
          message: result.message || 'Abteilung erfolgreich erstellt',
          data: newDepartment
        };
      }

      return { message: 'Abteilung erstellt', data: null };
    } catch (error) {
      console.error('Fehler beim Erstellen der Abteilung:', error);
      throw error;
    }
  },

  updateDepartment: async (id: string | number, departmentData: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        name: departmentData.name,
        description: departmentData.description,
        isActive: departmentData.isActive
      };

      const result = await apiRequest<any>(`/settings/departments/${id}`, 'PUT', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const updatedDepartment = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description || '',
          isActive: result.data.active !== false,
          active: result.data.active,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
        return {
          message: result.message || 'Abteilung erfolgreich aktualisiert',
          data: updatedDepartment
        };
      }

      return { message: 'Abteilung aktualisiert', data: null };
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Abteilung mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteDepartment: async (id: string | number) => {
    try {
      const result = await apiRequest<any>(`/settings/departments/${id}`, 'DELETE');
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen der Abteilung mit ID ${id}:`, error);
      throw error;
    }
  },

  // Räume
  getAllRooms: async () => {
    try {
      const result = await apiRequest<{ success: boolean; data: any[] }>('/settings/rooms', 'GET');

      // Formatiere die Daten für das Frontend
      if (result && result.data) {
        const formattedRooms = result.data.map(room => ({
          id: room.id,
          name: room.name,
          description: room.description || '',
          location_id: room.location_id || null,
          locationId: room.location_id || null,
          building: room.building || '',
          location_name: room.location_name || room.building || '',
          locationName: room.location_name || room.building || '',
          active: room.active !== false, // Standardwert ist true, falls nicht gesetzt
          created_at: room.created_at,
          updated_at: room.updated_at,
          createdAt: room.created_at,
          updatedAt: room.updated_at
        }));

        return { success: true, data: formattedRooms };
      }

      return result;
    } catch (error) {
      console.error('Fehler beim Abrufen der Räume:', error);
      throw error;
    }
  },

  getRoomById: async (id: string | number) => {
    try {
      const result = await apiRequest<{ success: boolean; data: any }>(`/settings/rooms/${id}`, 'GET');

      // Formatiere die Daten für das Frontend
      if (result && result.data) {
        const room = result.data;
        const formattedRoom = {
          id: room.id,
          name: room.name,
          description: room.description || '',
          location_id: room.location_id || null,
          locationId: room.location_id || null,
          building: room.building || '',
          location_name: room.location_name || room.building || '',
          locationName: room.location_name || room.building || '',
          active: room.active !== false, // Standardwert ist true, falls nicht gesetzt
          created_at: room.created_at,
          updated_at: room.updated_at,
          createdAt: room.created_at,
          updatedAt: room.updated_at
        };

        return { success: true, data: formattedRoom };
      }

      return result;
    } catch (error) {
      console.error(`Fehler beim Abrufen des Raums mit ID ${id}:`, error);
      throw error;
    }
  },

  createRoom: async (roomData: {
    name: string;
    description?: string;
    location_id?: number;
    locationId?: number;
    building?: string;
    active?: boolean;
  }) => {
    try {
      // Normalisiere die Daten für die API
      const apiData = {
        name: roomData.name,
        description: roomData.description,
        location_id: roomData.locationId || roomData.location_id,
        building: roomData.building,
        active: roomData.active
      };

      const result = await apiRequest<{ success: boolean; data: any; message: string }>('/settings/rooms', 'POST', apiData);

      // Formatiere die Rückgabedaten für das Frontend
      if (result && result.data) {
        const room = result.data;
        const formattedRoom = {
          id: room.id,
          name: room.name,
          description: room.description || '',
          location_id: room.location_id || null,
          locationId: room.location_id || null,
          building: room.building || '',
          location_name: room.location_name || room.building || '',
          locationName: room.location_name || room.building || '',
          active: room.active !== false,
          created_at: room.created_at,
          updated_at: room.updated_at,
          createdAt: room.created_at,
          updatedAt: room.updated_at
        };

        return {
          success: true,
          data: formattedRoom,
          message: result.message || 'Raum erfolgreich erstellt'
        };
      }

      return result;
    } catch (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      throw error;
    }
  },

  updateRoom: async (id: string | number, roomData: {
    name?: string;
    description?: string;
    location_id?: number;
    locationId?: number;
    building?: string;
    active?: boolean;
  }) => {
    try {
      // Normalisiere die Daten für die API
      const apiData = {
        name: roomData.name,
        description: roomData.description,
        location_id: roomData.locationId || roomData.location_id,
        building: roomData.building,
        active: roomData.active
      };

      const result = await apiRequest<{ success: boolean; data: any; message: string }>(`/settings/rooms/${id}`, 'PUT', apiData);

      // Formatiere die Rückgabedaten für das Frontend
      if (result && result.data) {
        const room = result.data;
        const formattedRoom = {
          id: room.id,
          name: room.name,
          description: room.description || '',
          location_id: room.location_id || null,
          locationId: room.location_id || null,
          building: room.building || '',
          location_name: room.location_name || room.building || '',
          locationName: room.location_name || room.building || '',
          active: room.active !== false,
          created_at: room.created_at,
          updated_at: room.updated_at,
          createdAt: room.created_at,
          updatedAt: room.updated_at
        };

        return {
          success: true,
          data: formattedRoom,
          message: result.message || 'Raum erfolgreich aktualisiert'
        };
      }

      return result;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Raums mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteRoom: (id: string | number) =>
    apiRequest<{ message: string }>(`/settings/rooms/${id}`, 'DELETE'),

  // Systemeinstellungen
  getSystemSettings: () =>
    apiRequest<{ data: any }>('/settings/system'),

  updateSystemSettings: (settingsData: any) =>
    apiRequest<{ message: string; data: any }>('/settings/system', 'PUT', settingsData),

  // Network Ports
  getAllNetworkPorts: async () => {
    try {
      const result = await apiRequest<any>('/settings/network-ports');

      // Konvertiere Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const ports = result.data.map((port: {
          id: number;
          port_number: string;
          created_at?: string;
          updated_at?: string;
        }) => ({
          id: port.id,
          portNumber: port.port_number,
          port_number: port.port_number,
          createdAt: port.created_at,
          updatedAt: port.updated_at,
          created_at: port.created_at,
          updated_at: port.updated_at
        }));
        return { data: ports };
      }

      return { data: [] };
    } catch (error) {
      console.error('Fehler beim Laden der Netzwerk-Ports:', error);
      throw error;
    }
  },

  getNetworkPortById: async (id: string | number) => {
    try {
      const result = await apiRequest<any>(`/settings/network-ports/${id}`, 'GET');

      // Konvertiere Feldnamen für Frontend-Kompatibilität
      if (result?.data) {
        const port = {
          id: result.data.id,
          portNumber: result.data.port_number,
          port_number: result.data.port_number,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
        return { data: port };
      }

      return { data: null };
    } catch (error) {
      console.error(`Fehler beim Laden des Netzwerk-Ports mit ID ${id}:`, error);
      throw error;
    }
  },

  createNetworkPort: async (portData: {
    portNumber: string;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        port_number: portData.portNumber
      };

      const result = await apiRequest<any>('/settings/network-ports', 'POST', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const newPort = {
          id: result.data.id,
          portNumber: result.data.port_number,
          port_number: result.data.port_number,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
        return {
          message: result.message || 'Netzwerk-Port erfolgreich erstellt',
          data: newPort
        };
      }

      return { message: 'Netzwerk-Port erstellt', data: null };
    } catch (error) {
      console.error('Fehler beim Erstellen des Netzwerk-Ports:', error);
      throw error;
    }
  },

  updateNetworkPort: async (id: string | number, portData: {
    portNumber?: string;
  }) => {
    try {
      // Konvertiere camelCase zu snake_case für das Backend
      const backendData = {
        port_number: portData.portNumber
      };

      const result = await apiRequest<any>(`/settings/network-ports/${id}`, 'PUT', backendData);

      // Konvertiere das Ergebnis zurück für Frontend-Kompatibilität
      if (result?.data) {
        const updatedPort = {
          id: result.data.id,
          portNumber: result.data.port_number,
          port_number: result.data.port_number,
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at,
          created_at: result.data.created_at,
          updated_at: result.data.updated_at
        };
        return {
          message: result.message || 'Netzwerk-Port erfolgreich aktualisiert',
          data: updatedPort
        };
      }

      return { message: 'Netzwerk-Port aktualisiert', data: null };
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Netzwerk-Ports mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteNetworkPort: async (id: string | number) => {
    try {
      const result = await apiRequest<any>(`/settings/network-ports/${id}`, 'DELETE');
      return result;
    } catch (error) {
      console.error(`Fehler beim Löschen des Netzwerk-Ports mit ID ${id}:`, error);
      throw error;
    }
  },

  // Asset Tag Settings API
  getAssetTagSettings: async () => {
    const response = await fetch('/api/settings/asset-tags');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fehler beim Laden der Asset Tag-Einstellungen');
    }
    return response.json();
  },

  updateAssetTagSettings: async (id, data) => {
    const response = await fetch(`/api/settings/asset-tags/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fehler beim Aktualisieren der Asset Tag-Einstellungen');
    }
    return response.json();
  },

  createAssetTagSettings: async (data) => {
    const response = await fetch('/api/settings/asset-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fehler beim Erstellen der Asset Tag-Einstellungen');
    }
    return response.json();
  },

  getNextAssetTag: async () => {
    const response = await fetch('/api/settings/asset-tags/next');
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fehler beim Generieren des nächsten Asset Tags');
    }
    return response.json();
  },

  // Label-Einstellungen
  getLabelSettings: async () => {
    try {
      // Zuerst versuchen, die Einstellungen aus dem lokalen Speicher zu laden
      const savedSettings = localStorage.getItem('atlasLabelSettings');
      if (savedSettings) {
        return { data: JSON.parse(savedSettings) };
      }

      // Wenn keine lokalen Einstellungen vorhanden sind, dann vom Server laden
      const response = await fetch('/api/settings/label-settings');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Laden der Etiketten-Einstellungen');
      }
      const data = await response.json();

      // Speichere die Einstellungen lokal
      localStorage.setItem('atlasLabelSettings', JSON.stringify(data));

      return data;
    } catch (error) {
      console.error('Fehler beim Laden der Etiketten-Einstellungen:', error);
      throw error;
    }
  },

  saveLabelSettings: async (settings) => {
    try {
      // Speichere die Einstellungen lokal
      localStorage.setItem('atlasLabelSettings', JSON.stringify(settings));

      // Und wenn verfügbar, auch auf dem Server speichern
      try {
        const response = await fetch('/api/settings/label-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });

        if (!response.ok) {
          console.warn('Einstellungen konnten nur lokal gespeichert werden. Server-Speicherung fehlgeschlagen.');
        }
      } catch (serverError) {
        console.warn('Einstellungen konnten nur lokal gespeichert werden:', serverError);
      }

      return {
        success: true,
        message: 'Etiketten-Einstellungen gespeichert',
        data: settings
      };
    } catch (error) {
      console.error('Fehler beim Speichern der Etiketten-Einstellungen:', error);
      throw error;
    }
  },

  // Neue Label-Template-Funktionen
  getLabelTemplates: async () => {
    try {
      const response = await fetch('/api/settings/label-templates');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Laden der Etiketten-Vorlagen');
      }
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Laden der Etiketten-Vorlagen:', error);
      throw error;
    }
  },

  getLabelTemplateById: async (id) => {
    try {
      const response = await fetch(`/api/settings/label-templates/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Laden der Etiketten-Vorlage');
      }
      return await response.json();
    } catch (error) {
      console.error(`Fehler beim Laden der Etiketten-Vorlage mit ID ${id}:`, error);
      throw error;
    }
  },

  createLabelTemplate: async (templateData) => {
    try {
      const response = await fetch('/api/settings/label-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Erstellen der Etiketten-Vorlage');
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Erstellen der Etiketten-Vorlage:', error);
      throw error;
    }
  },

  updateLabelTemplate: async (id, templateData) => {
    try {
      const response = await fetch(`/api/settings/label-templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Aktualisieren der Etiketten-Vorlage');
      }

      return await response.json();
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Etiketten-Vorlage mit ID ${id}:`, error);
      throw error;
    }
  },

  deleteLabelTemplate: async (id) => {
    try {
      const response = await fetch(`/api/settings/label-templates/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Löschen der Etiketten-Vorlage');
      }

      return await response.json();
    } catch (error) {
      console.error(`Fehler beim Löschen der Etiketten-Vorlage mit ID ${id}:`, error);
      throw error;
    }
  },

  getLabelTemplateVersions: async (id) => {
    try {
      const response = await fetch(`/api/settings/label-templates/${id}/versions`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Laden der Versionsverlaufs');
      }

      return await response.json();
    } catch (error) {
      console.error(`Fehler beim Laden des Versionsverlaufs für Vorlage ${id}:`, error);
      throw error;
    }
  },

  revertToLabelTemplateVersion: async (templateId, versionId) => {
    try {
      const response = await fetch(`/api/settings/label-templates/${templateId}/revert/${versionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Zurückkehren zur Version');
      }

      return await response.json();
    } catch (error) {
      console.error(`Fehler beim Zurückkehren zur Version ${versionId} für Vorlage ${templateId}:`, error);
      throw error;
    }
  },

  importLabelTemplate: async (templateData) => {
    try {
      const response = await fetch('/api/settings/label-templates/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Importieren der Etiketten-Vorlage');
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Importieren der Etiketten-Vorlage:', error);
      throw error;
    }
  },

  exportLabelTemplate: async (id) => {
    try {
      // Hole die Vorlage vom Server
      const templateResponse = await fetch(`/api/settings/label-templates/${id}`);

      if (!templateResponse.ok) {
        const errorData = await templateResponse.json();
        throw new Error(errorData.message || 'Fehler beim Laden der Etiketten-Vorlage für Export');
      }

      const templateData = await templateResponse.json();

      // Bereite das Export-Format vor (entferne serverseitige Daten)
      const exportData = {
        name: templateData.data.name,
        description: templateData.data.description,
        settings: templateData.data.settings,
        exportedAt: new Date().toISOString(),
        version: templateData.data.version
      };

      // Erstelle und speichere die JSON-Datei
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `${templateData.data.name.replace(/\s+/g, '_')}_template.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      return { success: true, message: 'Etiketten-Vorlage erfolgreich exportiert' };
    } catch (error) {
      console.error(`Fehler beim Exportieren der Etiketten-Vorlage mit ID ${id}:`, error);
      throw error;
    }
  },

  migrateLabelSettings: async () => {
    try {
      const response = await fetch('/api/settings/label-settings/migrate', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler bei der Migration der Einstellungen');
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler bei der Migration der Einstellungen:', error);
      throw error;
    }
  }
};


// Konvertiere snake_case zu camelCase
export const toSnakeCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  return Object.keys(obj).reduce((acc: any, key: string) => {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    acc[snakeKey] = typeof obj[key] === 'object' ? toSnakeCase(obj[key]) : obj[key];
    return acc;
  }, {});
};

// Konvertiere camelCase zu snake_case
export const toCamelCase = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  return Object.keys(obj).reduce((acc: any, key: string) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = typeof obj[key] === 'object' ? toCamelCase(obj[key]) : obj[key];
    return acc;
  }, {});
};

// Manufacturers API
export const getAllManufacturers = async () => {
  try {
    const result = await apiRequest<any>('/settings/manufacturers');

    // Konvertiere die snake_case zu camelCase für Frontend-Kompatibilität
    if (result?.data) {
      const manufacturers = result.data.map((manufacturer: {
        id: number;
        name: string;
        description?: string;
        logo_url?: string;
        website?: string;
        contact_info?: string;
        is_active?: boolean;
        created_at?: string;
        updated_at?: string;
      }) => ({
        id: manufacturer.id,
        name: manufacturer.name,
        description: manufacturer.description || '',
        logoUrl: manufacturer.logo_url || '',
        website: manufacturer.website || '',
        contactInfo: manufacturer.contact_info || '',
        isActive: manufacturer.is_active !== false, // Falls null oder undefined, nehme true an
        createdAt: manufacturer.created_at,
        updatedAt: manufacturer.updated_at
      }));

      // Sortiere Hersteller nach Name
      manufacturers.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
      return { data: manufacturers };
    }

    return { data: [] };
  } catch (error) {
    console.error('Fehler beim Laden der Hersteller:', error);
    throw error;
  }
};

export const getManufacturerById = async (id: string | number) => {
  try {
    const result = await apiRequest<{ data: any }>(`/settings/manufacturers/${id}`);

    if (result?.data) {
      // Konvertiere die Feldnamen für Frontend-Kompatibilität
      const manufacturer = {
        id: result.data.id,
        name: result.data.name,
        description: result.data.description || '',
        logoUrl: result.data.logo_url || '',
        website: result.data.website || '',
        contactInfo: result.data.contact_info || '',
        isActive: result.data.is_active !== false, // Falls null oder undefined, nehme true an
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at
      };
      return { data: manufacturer };
    }

    return result;
  } catch (error) {
    console.error(`Fehler beim Abrufen des Herstellers mit ID ${id}:`, error);
    throw error;
  }
};

export const createManufacturer = async (manufacturerData: {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactInfo?: string;
  isActive?: boolean;
}) => {
  try {
    // Konvertiere camelCase zu snake_case für das Backend
    const backendData = {
      name: manufacturerData.name,
      description: manufacturerData.description,
      logo_url: manufacturerData.logoUrl,
      website: manufacturerData.website,
      contact_info: manufacturerData.contactInfo,
      is_active: manufacturerData.isActive
    };

    const result = await apiRequest<{ data: any }>(`/settings/manufacturers`, 'POST', backendData);
    return result;
  } catch (error) {
    console.error('Fehler beim Erstellen des Herstellers:', error);
    throw error;
  }
};

export const updateManufacturer = async (id: string | number, manufacturerData: {
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactInfo?: string;
  isActive?: boolean;
}) => {
  try {
    // Konvertiere camelCase zu snake_case für das Backend
    const backendData = {
      name: manufacturerData.name,
      description: manufacturerData.description,
      logo_url: manufacturerData.logoUrl,
      website: manufacturerData.website,
      contact_info: manufacturerData.contactInfo,
      is_active: manufacturerData.isActive
    };

    const result = await apiRequest<{ data: any }>(`/settings/manufacturers/${id}`, 'PUT', backendData);
    return result;
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Herstellers mit ID ${id}:`, error);
    throw error;
  }
};

export const deleteManufacturer = async (id: string | number) => {
  try {
    const result = await apiRequest<{ data: any }>(`/settings/manufacturers/${id}`, 'DELETE');
    return result;
  } catch (error) {
    console.error(`Fehler beim Löschen des Herstellers mit ID ${id}:`, error);
    throw error;
  }
};

// Exportiere alle API-Funktionen
export const api = {
  auth: authApi,
  devices: devicesApi,
  licenses: licensesApi,
  certificates: certificatesApi,
  accessories: accessoriesApi,
  users: usersApi,
  todos: todosApi,
  inventory: inventoryApi,
  tickets: ticketsApi,
  reports: reportsApi,
  settings: settingsApi,
  handover: handoverApi,
};

// Netzwerk-Ports API
export const networkPortsApi = {
  getAll: () => axios.get<ApiResponse<NetworkPort[]>>('/api/settings/network-ports'),
  getById: (id: number) => axios.get<ApiResponse<NetworkPort>>(`/api/settings/network-ports/${id}`),
  create: (data: NetworkPortCreate) => axios.post<ApiResponse<NetworkPort>>('/api/settings/network-ports', data),
  update: (id: number, data: NetworkPortUpdate) => axios.put<ApiResponse<NetworkPort>>(`/api/settings/network-ports/${id}`, data),
  delete: (id: number) => axios.delete<ApiResponse<void>>(`/api/settings/network-ports/${id}`)
};

// Verwende axiosInstance anstelle von api
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error type für besseres Error Handling
interface ApiError {
  message: string;
  status?: number;
}

const handleAxiosError = (error: unknown): never => {
  if (error instanceof Error) {
    const apiError: ApiError = {
      message: error.message,
      status: (error as any).response?.status
    };
    throw apiError;
  }
  throw new Error('Ein unbekannter Fehler ist aufgetreten');
};

export const deviceModelsApi = {
  getAll: async () => {
    try {
      const response = await axiosInstance.get('/settings/device-models');
      return response.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  getById: async (id: number) => {
    try {
      const response = await axiosInstance.get(`/settings/device-models/${id}`);
      return response.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  create: async (deviceModel: DeviceModelCreate) => {
    try {
      const response = await axiosInstance.post('/settings/device-models', deviceModel);
      return response.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  update: async (id: number, deviceModel: DeviceModelUpdate) => {
    try {
      const response = await axiosInstance.put(`/settings/device-models/${id}`, deviceModel);
      return response.data;
    } catch (error) {
      handleAxiosError(error);
    }
  },

  delete: async (id: number) => {
    try {
      await axiosInstance.delete(`/settings/device-models/${id}`);
    } catch (error) {
      handleAxiosError(error);
    }
  },

  getDeviceCounts: async () => {
    try {
      const response = await axiosInstance.get('/settings/device-models-count');
      return response.data;
    } catch (error) {
      handleAxiosError(error);
    }
  }
};

// Füge Default-Export hinzu für bestehende import-Anweisungen
export default api;

