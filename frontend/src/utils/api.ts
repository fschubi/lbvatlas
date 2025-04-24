/**
 * API-Service für das ATLAS Asset Management System
 *
 * Dieser Service stellt Funktionen für den Zugriff auf die ATLAS-Backend-API bereit.
 * Alle API-Anfragen werden über diese zentrale Stelle verwaltet.
 */

import axios from 'axios';
import handleApiError from './errorHandler';
import { toCamelCase, toSnakeCase } from './caseConverter';
import { User, Role, UserGroup } from '../types/user';
import { Category, CategoryCreate, CategoryUpdate } from '../types/settings';
import { Supplier, SupplierCreate, SupplierUpdate } from '../types/settings';
import { Switch, SwitchCreate, SwitchUpdate } from '../types/network';
import { Location, LocationCreate, LocationUpdate } from '../types/settings';
import { Department, DepartmentCreate, DepartmentUpdate } from '../types/settings';
import { Manufacturer, ManufacturerCreate, ManufacturerUpdate } from '../types/settings';
import { Room, RoomCreate, RoomUpdate } from '../types/settings';
import { NetworkPort, NetworkPortCreate, NetworkPortUpdate } from '../types/network';
import { NetworkOutlet, NetworkOutletCreate, NetworkOutletUpdate } from '../types/settings';

// *** NEU: Generischer Typ für API-Antworten ***
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string; // Optional für Fehlermeldungen oder Bestätigungen
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Fügt Token zu jeder Anfrage hinzu
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (config.headers) {
      if (token) {
        // Füge den Authorization Header hinzu, wenn ein Token vorhanden ist
        config.headers.Authorization = `Bearer ${token}`;
        // DEBUG: Logge den gesetzten Header
        console.debug('[Request Interceptor] Token gefunden. Gesetzter Header:', config.headers.Authorization);
      } else {
        console.debug('[Request Interceptor] Kein Token gefunden für:', config.url);
        // Stelle sicher, dass der Header entfernt wird, wenn kein Token da ist
        delete config.headers.Authorization;
      }
    } else {
       console.warn('[Request Interceptor] config.headers ist nicht definiert für:', config.url);
    }
    // DEBUG: Logge das gesamte Header-Objekt vor dem Senden
    console.debug('[Request Interceptor] Headers vor dem Senden:', config.headers);
    return config;
  },
  (error) => {
    console.error('[Request Interceptor] Fehler:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor (bleibt bestehen, fängt 401/403 etc. ab)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Zugriff verweigert (Response Interceptor):', error.response.status, 'für', error.config?.url);
      // Hier könnte man bei 401 versuchen, den Token zu erneuern (Refresh Token Flow)
      // oder den Benutzer global ausloggen, wenn der Token ungültig ist.
    }
    return Promise.reject(error);
  }
);

// Generische API-Request-Funktion
const apiRequest = async <T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<ApiResponse<T>> => {
  try {
    const snakeCasedData = data ? toSnakeCase(data) : undefined;

    const config = {
      method,
      url: endpoint,
      data: snakeCasedData,
    };
    const response = await axiosInstance(config);

    const responseData = response.data;

    if (typeof responseData !== 'object' || responseData === null) {
      console.error(`[apiRequest] Unerwartete Antwortstruktur (kein Objekt) für ${method} ${endpoint}:`, responseData);
      throw new Error('Ungültige Server-Antwortstruktur.');
    }
    if (typeof responseData.success !== 'boolean') {
       console.warn(`[apiRequest] Fehlendes oder ungültiges 'success'-Feld für ${method} ${endpoint}:`, responseData);
    }

    const camelCasedData = responseData.data ? toCamelCase(responseData.data) : null;

    return {
      success: responseData.success === true,
      data: camelCasedData as T,
      message: responseData.message,
    };

  } catch (error: any) {
    console.error(`[apiRequest] Fehler bei ${method} ${endpoint}:`, error);
    const handledError = handleApiError(error as Error);
    return { success: false, message: handledError, data: null as T };
  }
};

// --- EXPORTS DER API-OBJEKTE ---

export const authApi = {
  login: (credentials: any) => apiRequest<any>('/auth/login', 'POST', credentials),
  logout: () => apiRequest<any>('/auth/logout', 'POST'),
  checkAuth: () => apiRequest<User>('/auth/check'),
  getPermissions: () => apiRequest<any[]>('/auth/permissions'),
};

export const usersApi = {
  getAll: (): Promise<ApiResponse<User[]>> => apiRequest<User[]>('/users'),
  getById: (id: number): Promise<ApiResponse<User>> => apiRequest<User>(`/users/${id}`),
  create: (data: any): Promise<ApiResponse<User>> => apiRequest<User>('/users', 'POST', data),
  update: (id: number, data: any): Promise<ApiResponse<User>> => apiRequest<User>(`/users/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> => apiRequest<{ message?: string }>(`/users/${id}`, 'DELETE'),
  getUserDevices: (userId: number): Promise<ApiResponse<any[]>> => apiRequest<any[]>(`/users/${userId}/devices`),
  getUserLicenses: (userId: number): Promise<ApiResponse<any[]>> => apiRequest<any[]>(`/users/${userId}/licenses`),
  getUserAccessories: (userId: number): Promise<ApiResponse<any[]>> => apiRequest<any[]>(`/users/${userId}/accessories`),
};

export const roleApi = {
  getAll: (): Promise<ApiResponse<Role[]>> => apiRequest<Role[]>('/roles'),
  getById: (id: number): Promise<ApiResponse<Role>> => apiRequest<Role>(`/roles/${id}`),
  create: (data: any): Promise<ApiResponse<Role>> => apiRequest<Role>('/roles', 'POST', data),
  update: (id: number, data: any): Promise<ApiResponse<Role>> => apiRequest<Role>(`/roles/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> => apiRequest<{ message?: string }>(`/roles/${id}`, 'DELETE'),
  getPermissions: (id: number): Promise<ApiResponse<any[]>> => apiRequest<any[]>(`/roles/${id}/permissions`),
  updatePermissions: (id: number, permissionIds: number[]): Promise<ApiResponse<void>> => apiRequest<void>(`/roles/${id}/permissions`, 'PUT', { permissionIds }),
};

export const permissionApi = {
  getAll: (): Promise<ApiResponse<any[]>> => apiRequest<any[]>('/permissions'),
};

export const categoryApi = {
  getAll: (): Promise<ApiResponse<Category[]>> => apiRequest<Category[]>('/categories'),
  getById: (id: number): Promise<ApiResponse<Category>> => apiRequest<Category>(`/categories/${id}`),
  create: (data: CategoryCreate): Promise<ApiResponse<Category>> =>
    apiRequest<Category>('/categories', 'POST', data),
  update: (id: number, data: CategoryUpdate): Promise<ApiResponse<Category>> =>
    apiRequest<Category>(`/categories/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/categories/${id}`, 'DELETE'),
  checkCategoryNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const categoriesResponse = await categoryApi.getAll();
      const categoriesArray = categoriesResponse.data;
      if (categoriesResponse.success && Array.isArray(categoriesArray)) {
        return categoriesArray.some(
          (cat) =>
            cat.name.toLowerCase() === name.toLowerCase() && cat.id !== currentId
        );
      } else {
        console.error(`[checkCategoryNameExists] Prüfung fehlgeschlagen. Success: ${categoriesResponse.success}, IsArray: ${Array.isArray(categoriesArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('[checkCategoryNameExists] Fehler im try-Block:', error);
      return true;
    }
  },
};

export const supplierApi = {
  getAll: (): Promise<ApiResponse<Supplier[]>> => apiRequest<Supplier[]>('/suppliers'),
  getById: (id: number): Promise<ApiResponse<Supplier>> => apiRequest<Supplier>(`/suppliers/${id}`),
  create: (data: SupplierCreate): Promise<ApiResponse<Supplier>> =>
    apiRequest<Supplier>('/suppliers', 'POST', data),
  update: (id: number, data: SupplierUpdate): Promise<ApiResponse<Supplier>> =>
    apiRequest<Supplier>(`/suppliers/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/suppliers/${id}`, 'DELETE'),
  checkSupplierNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const suppliersResponse = await supplierApi.getAll();
      const suppliersArray = suppliersResponse.data;
      if (suppliersResponse.success && Array.isArray(suppliersArray)) {
        return suppliersArray.some(
          (sup) =>
            sup.name.toLowerCase() === name.toLowerCase() && sup.id !== currentId
        );
      } else {
         console.error(`[checkSupplierNameExists] Prüfung fehlgeschlagen. Success: ${suppliersResponse.success}, IsArray: ${Array.isArray(suppliersArray)}.`);
         return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung des Lieferantennamens:', error);
      return true;
    }
  },
};

export const locationApi = {
  getAll: (): Promise<ApiResponse<Location[]>> => apiRequest<Location[]>('/locations'),
  getById: (id: number): Promise<ApiResponse<Location>> => apiRequest<Location>(`/locations/${id}`),
  create: (data: LocationCreate): Promise<ApiResponse<Location>> =>
    apiRequest<Location>('/locations', 'POST', data),
  update: (id: number, data: LocationUpdate): Promise<ApiResponse<Location>> =>
    apiRequest<Location>(`/locations/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/locations/${id}`, 'DELETE'),
  checkLocationNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const locationsResponse = await locationApi.getAll();

      const locationsArray = locationsResponse.data;

      if (locationsResponse.success && Array.isArray(locationsArray)) {
        const found = locationsArray.some(
          (loc) =>
            loc && loc.name && loc.name.toLowerCase() === name.toLowerCase() && loc.id !== currentId
        );
        return found;
      } else {
        console.error(`[checkLocationNameExists] Prüfung fehlgeschlagen oder Datenstruktur ungültig. Success: ${locationsResponse.success}, IsArray: ${Array.isArray(locationsArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('[checkLocationNameExists] Fehler im try-Block:', error);
      return true;
    }
  },
};

export const departmentApi = {
  getAll: (): Promise<ApiResponse<Department[]>> => apiRequest<Department[]>('/departments'),
  getById: (id: number): Promise<ApiResponse<Department>> => apiRequest<Department>(`/departments/${id}`),
  create: (data: DepartmentCreate): Promise<ApiResponse<Department>> =>
    apiRequest<Department>('/departments', 'POST', data),
  update: (id: number, data: DepartmentUpdate): Promise<ApiResponse<Department>> =>
    apiRequest<Department>(`/departments/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/departments/${id}`, 'DELETE'),
  checkDepartmentNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const departmentsResponse = await departmentApi.getAll();
      const departmentsArray = departmentsResponse.data;
      if (departmentsResponse.success && Array.isArray(departmentsArray)) {
        return departmentsArray.some(
         (dep) =>
            dep.name.toLowerCase() === name.toLowerCase() && dep.id !== currentId
        );
       } else {
         console.error(`[checkDepartmentNameExists] Prüfung fehlgeschlagen. Success: ${departmentsResponse.success}, IsArray: ${Array.isArray(departmentsArray)}.`);
         return true;
       }
    } catch (error) {
      console.error('Fehler bei der Überprüfung des Abteilungsnamens:', error);
      return true;
    }
  },
};

export const manufacturerApi = {
  getAll: (): Promise<ApiResponse<Manufacturer[]>> => apiRequest<Manufacturer[]>('/manufacturers'),
  getById: (id: number): Promise<ApiResponse<Manufacturer>> => apiRequest<Manufacturer>(`/manufacturers/${id}`),
  create: (data: ManufacturerCreate): Promise<ApiResponse<Manufacturer>> =>
    apiRequest<Manufacturer>('/manufacturers', 'POST', data),
  update: (id: number, data: ManufacturerUpdate): Promise<ApiResponse<Manufacturer>> =>
    apiRequest<Manufacturer>(`/manufacturers/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/manufacturers/${id}`, 'DELETE'),
  checkManufacturerNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const manufacturersResponse = await manufacturerApi.getAll();
      const manufacturersArray = manufacturersResponse.data;
       if (manufacturersResponse.success && Array.isArray(manufacturersArray)) {
        return manufacturersArray.some(
          (man) =>
            man.name.toLowerCase() === name.toLowerCase() && man.id !== currentId
        );
      } else {
        console.error(`[checkManufacturerNameExists] Prüfung fehlgeschlagen. Success: ${manufacturersResponse.success}, IsArray: ${Array.isArray(manufacturersArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung des Herstellernamens:', error);
      return true;
    }
  },
};

export const roomApi = {
  getAll: (): Promise<ApiResponse<Room[]>> => apiRequest<Room[]>('/rooms'),
  getById: (id: number): Promise<ApiResponse<Room>> => apiRequest<Room>(`/rooms/${id}`),
  create: (data: RoomCreate): Promise<ApiResponse<Room>> =>
    apiRequest<Room>('/rooms', 'POST', data),
  update: (id: number, data: RoomUpdate): Promise<ApiResponse<Room>> =>
    apiRequest<Room>(`/rooms/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/rooms/${id}`, 'DELETE'),
  checkRoomNameExists: async (
    name: string,
    locationId?: number,
    currentId?: number
  ): Promise<boolean> => {
    if (locationId === undefined || locationId === null) {
        console.warn('[checkRoomNameExists] Keine locationId für die Prüfung angegeben.');
        return true;
    }

    try {
      const roomsResponse = await roomApi.getAll();
      const roomsArray = roomsResponse.data;
       if (roomsResponse.success && Array.isArray(roomsArray)) {
        return roomsArray.some(
          (room) =>
            room.locationId === locationId &&
            room.name.toLowerCase() === name.toLowerCase() &&
            room.id !== currentId
        );
      } else {
        console.error(`[checkRoomNameExists] Prüfung fehlgeschlagen. Success: ${roomsResponse.success}, IsArray: ${Array.isArray(roomsArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung des Raumnamens:', error);
      return true;
    }
  },
};

export const switchApi = {
  getAll: (): Promise<ApiResponse<Switch[]>> => apiRequest<Switch[]>('/switches'),
  getById: (id: number): Promise<ApiResponse<Switch>> => apiRequest<Switch>(`/switches/${id}`),
  create: (data: SwitchCreate): Promise<ApiResponse<Switch>> =>
    apiRequest<Switch>('/switches', 'POST', data),
  update: (id: number, data: SwitchUpdate): Promise<ApiResponse<Switch>> =>
    apiRequest<Switch>(`/switches/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/switches/${id}`, 'DELETE'),
  checkSwitchNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const switchesResponse = await switchApi.getAll();
      const switchesArray = switchesResponse.data;
       if (switchesResponse.success && Array.isArray(switchesArray)) {
        return switchesArray.some(
          (s) =>
            s.name.toLowerCase() === name.toLowerCase() && s.id !== currentId
        );
      } else {
        console.error(`[checkSwitchNameExists] Prüfung fehlgeschlagen. Success: ${switchesResponse.success}, IsArray: ${Array.isArray(switchesArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung des Switch-Namens:', error);
      return true;
    }
  },
};

export const networkOutletsApi = {
  getAll: (): Promise<ApiResponse<NetworkOutlet[]>> => apiRequest<NetworkOutlet[]>('/network-sockets'),
  getById: (id: number): Promise<ApiResponse<NetworkOutlet>> => apiRequest<NetworkOutlet>(`/network-sockets/${id}`),
  create: (data: NetworkOutletCreate): Promise<ApiResponse<NetworkOutlet>> =>
    apiRequest<NetworkOutlet>('/network-sockets', 'POST', data),
  update: (id: number, data: NetworkOutletUpdate): Promise<ApiResponse<NetworkOutlet>> =>
    apiRequest<NetworkOutlet>(`/network-sockets/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/network-sockets/${id}`, 'DELETE'),
  checkOutletNumberExists: async (
    outletNum: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const outletsResponse = await networkOutletsApi.getAll();
      const outletsArray = outletsResponse.data;
      if (outletsResponse.success && Array.isArray(outletsArray)) {
        return outletsArray.some(
          (outlet) =>
            outlet.outletNumber.toLowerCase() === outletNum.toLowerCase() && outlet.id !== currentId
        );
      } else {
        console.error(`[checkOutletNumberExists] Prüfung fehlgeschlagen. Success: ${outletsResponse.success}, IsArray: ${Array.isArray(outletsArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung der Dosennummer:', error);
      return true;
    }
  },
};

// --- NEU: Zusammengefasste und Platzhalter-API-Objekte für Kompatibilität ---

export const settingsApi = {
  getAllCategories: categoryApi.getAll,
  getCategoryById: categoryApi.getById,
  createCategory: categoryApi.create,
  updateCategory: categoryApi.update,
  deleteCategory: categoryApi.delete,
  checkCategoryNameExists: categoryApi.checkCategoryNameExists,
  getAllLocations: locationApi.getAll,
  getLocationById: locationApi.getById,
  createLocation: locationApi.create,
  updateLocation: locationApi.update,
  deleteLocation: locationApi.delete,
  checkLocationNameExists: locationApi.checkLocationNameExists,
  getAllRooms: roomApi.getAll,
  getRoomById: roomApi.getById,
  createRoom: roomApi.create,
  updateRoom: roomApi.update,
  deleteRoom: roomApi.delete,
  checkRoomNameExists: roomApi.checkRoomNameExists,
  getAllManufacturers: manufacturerApi.getAll,
  getManufacturerById: manufacturerApi.getById,
  createManufacturer: manufacturerApi.create,
  updateManufacturer: manufacturerApi.update,
  deleteManufacturer: manufacturerApi.delete,
  checkManufacturerNameExists: manufacturerApi.checkManufacturerNameExists,
  getAllSuppliers: supplierApi.getAll,
  getSupplierById: supplierApi.getById,
  createSupplier: supplierApi.create,
  updateSupplier: supplierApi.update,
  deleteSupplier: supplierApi.delete,
  checkSupplierNameExists: supplierApi.checkSupplierNameExists,
  getAllDepartments: departmentApi.getAll,
  getDepartmentById: departmentApi.getById,
  createDepartment: departmentApi.create,
  updateDepartment: departmentApi.update,
  deleteDepartment: departmentApi.delete,
  checkDepartmentNameExists: departmentApi.checkDepartmentNameExists,
  getAllSwitches: switchApi.getAll,
  getSwitchById: switchApi.getById,
  createSwitch: switchApi.create,
  updateSwitch: switchApi.update,
  deleteSwitch: switchApi.delete,
  checkSwitchNameExists: switchApi.checkSwitchNameExists,
  getAssetTagSettings: () => Promise.resolve({} as any),
  updateAssetTagSettings: (data: any) => Promise.resolve({} as any),
  getSystemSettings: () => Promise.resolve({} as any),
  updateSystemSettings: (data: any) => Promise.resolve({} as any),
  getLabelSettings: () => Promise.resolve({} as any),
  updateLabelSettings: (data: any) => Promise.resolve({} as any),
  getAllLabelTemplates: () => Promise.resolve([] as any[]),
  getAllNetworkOutlets: networkOutletsApi.getAll,
  getNetworkOutletById: networkOutletsApi.getById,
  createNetworkOutlet: networkOutletsApi.create,
  updateNetworkOutlet: networkOutletsApi.update,
  deleteNetworkOutlet: networkOutletsApi.delete,
  checkOutletNumberExists: networkOutletsApi.checkOutletNumberExists,
};

export const devicesApi = {
  getAll: () => Promise.resolve([] as any[]),
  getById: (id: number) => Promise.resolve({ id } as any),
  create: (data: any) => Promise.resolve({ ...data, id: Date.now() } as any),
  update: (id: number, data: any) => Promise.resolve({ ...data, id } as any),
  delete: (id: number) => Promise.resolve({ message: 'Deleted' }),
};

// --- NEU: Device Models API ---
export interface DeviceModel {
  id: number;
  name: string;
  description?: string;
  manufacturerId: number;
  categoryId: number;
  specifications?: string;
  cpu?: string;
  ram?: string;
  hdd?: string;
  warrantyMonths?: number;
  isActive: boolean;
  createdAt?: string; // Kommt vom Backend
  updatedAt?: string; // Kommt vom Backend
  manufacturerName?: string; // Vom JOIN im Backend
  categoryName?: string; // Vom JOIN im Backend
  deviceCount?: number; // Vom JOIN/Subquery im Backend
}

// Typ für das Erstellen (ID wird vom Backend generiert)
export type DeviceModelCreate = Omit<DeviceModel, 'id' | 'createdAt' | 'updatedAt' | 'manufacturerName' | 'categoryName' | 'deviceCount'>;
// Typ für das Update (alle Felder optional, außer ID wird über den Pfad übergeben)
export type DeviceModelUpdate = Partial<Omit<DeviceModel, 'id' | 'createdAt' | 'updatedAt' | 'manufacturerName' | 'categoryName' | 'deviceCount'>>;

export const deviceModelsApi = {
  getAll: (): Promise<ApiResponse<DeviceModel[]>> => apiRequest<DeviceModel[]>('/devicemodels'),
  getById: (id: number): Promise<ApiResponse<DeviceModel>> => apiRequest<DeviceModel>(`/devicemodels/${id}`),
  create: (data: DeviceModelCreate): Promise<ApiResponse<DeviceModel>> =>
    apiRequest<DeviceModel>('/devicemodels', 'POST', data),
  update: (id: number, data: DeviceModelUpdate): Promise<ApiResponse<DeviceModel>> =>
    apiRequest<DeviceModel>(`/devicemodels/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/devicemodels/${id}`, 'DELETE'),
  checkDeviceModelNameExists: async (
    name: string,
    manufacturerId: number, // Name muss nur pro Hersteller eindeutig sein
    currentId?: number
  ): Promise<boolean> => {
    if (!manufacturerId) {
        console.warn('[checkDeviceModelNameExists] Keine manufacturerId für die Prüfung angegeben.');
        return true; // oder false, je nach gewünschtem Verhalten?
    }
    try {
      const modelsResponse = await deviceModelsApi.getAll(); // Hole alle Modelle
      const modelsArray = modelsResponse.data;
      if (modelsResponse.success && Array.isArray(modelsArray)) {
        return modelsArray.some(
          (model) =>
            model.manufacturerId === manufacturerId && // Prüfe nur für den gleichen Hersteller
            model.name.toLowerCase() === name.toLowerCase() &&
            model.id !== currentId
        );
      } else {
        console.error(`[checkDeviceModelNameExists] Prüfung fehlgeschlagen. Success: ${modelsResponse.success}, IsArray: ${Array.isArray(modelsArray)}.`);
        return true; // Im Fehlerfall annehmen, dass es existiert, um Duplikate zu vermeiden
      }
    } catch (error) {
      console.error('[checkDeviceModelNameExists] Fehler im try-Block:', error);
      return true; // Im Fehlerfall annehmen, dass es existiert
    }
  },
};

export const accessoriesApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const certificatesApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const inventoryApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const licensesApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const networkPortsApi = {
  getAll: (): Promise<ApiResponse<NetworkPort[]>> => apiRequest<NetworkPort[]>('/network-ports'),
  getById: (id: number): Promise<ApiResponse<NetworkPort>> => apiRequest<NetworkPort>(`/network-ports/${id}`),
  create: (data: NetworkPortCreate): Promise<ApiResponse<NetworkPort>> =>
    apiRequest<NetworkPort>('/network-ports', 'POST', data),
  update: (id: number, data: NetworkPortUpdate): Promise<ApiResponse<NetworkPort>> =>
    apiRequest<NetworkPort>(`/network-ports/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/network-ports/${id}`, 'DELETE'),
  checkPortNumberExists: async (
    portNum: number,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const portsResponse = await networkPortsApi.getAll();
      const portsArray = portsResponse.data;
      if (portsResponse.success && Array.isArray(portsArray)) {
        return portsArray.some(
          (port) => port.portNumber === portNum && port.id !== currentId
        );
      } else {
        console.error(`[checkPortNumberExists] Prüfung fehlgeschlagen. Success: ${portsResponse.success}, IsArray: ${Array.isArray(portsArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung der Portnummer:', error);
      return true;
    }
  },
};

export const reportsApi = {
  getReport: (name: string, params: any) => Promise.resolve({} as any),
};

export const ticketsApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const todosApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const userGroupApi = {
  getAll: (): Promise<ApiResponse<UserGroup[]>> => apiRequest<UserGroup[]>('/user-groups'),
  getById: (id: number): Promise<ApiResponse<UserGroup>> => apiRequest<UserGroup>(`/user-groups/${id}`),
  create: (data: { name: string; description?: string }): Promise<ApiResponse<UserGroup>> =>
    apiRequest<UserGroup>('/user-groups', 'POST', data),
  update: (id: number, data: { name?: string; description?: string }): Promise<ApiResponse<UserGroup>> =>
    apiRequest<UserGroup>(`/user-groups/${id}`, 'PUT', data),
  delete: (id: number): Promise<ApiResponse<{ message?: string }>> =>
    apiRequest<{ message?: string }>(`/user-groups/${id}`, 'DELETE'),
  getUsersInGroup: (groupId: number): Promise<ApiResponse<User[]>> =>
    apiRequest<User[]>(`/user-groups/${groupId}/members`),
  addUserToGroup: (groupId: number, userId: string): Promise<ApiResponse<void>> => {
    // DEBUG: Logge die Daten, die gesendet werden
    console.log('[DEBUG addUserToGroup] Sending data:', { groupId, userId, payload: { userId } });
    return apiRequest<void>(`/user-groups/${groupId}/members`, 'POST', { userId });
  },
  removeUserFromGroup: (groupId: number, userId: string): Promise<ApiResponse<void>> =>
    apiRequest<void>(`/user-groups/${groupId}/members/${userId}`, 'DELETE'),
  checkGroupNameExists: async (
    name: string,
    currentId?: number
  ): Promise<boolean> => {
    try {
      const groupsResponse = await userGroupApi.getAll();
      const groupsArray = groupsResponse.data;
      if (groupsResponse.success && Array.isArray(groupsArray)) {
        return groupsArray.some(
          (group) =>
            group.name.toLowerCase() === name.toLowerCase() && group.id !== currentId
        );
      } else {
        console.error(`[checkGroupNameExists] Prüfung fehlgeschlagen. Success: ${groupsResponse.success}, IsArray: ${Array.isArray(groupsArray)}.`);
        return true;
      }
    } catch (error) {
      console.error('Fehler bei der Überprüfung des Gruppennamens:', error);
      return true;
    }
  },
};

const allApis = {
    authApi,
    usersApi,
    roleApi,
    permissionApi,
    settingsApi,
    devicesApi,
    deviceModelsApi,
    accessoriesApi,
    certificatesApi,
    inventoryApi,
    licensesApi,
    networkPortsApi,
    reportsApi,
    ticketsApi,
    todosApi,
    categoryApi,
    supplierApi,
    locationApi,
    departmentApi,
    manufacturerApi,
    roomApi,
    switchApi,
    networkOutletsApi,
    userGroupApi,
};

// Verify if axiosInstance and apiRequest need individual export
export { axiosInstance, apiRequest }; // Keep this if needed elsewhere

