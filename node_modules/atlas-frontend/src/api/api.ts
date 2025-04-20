/**
 * API-Service für das ATLAS Asset Management System
 *
 * Dieser Service stellt Funktionen für den Zugriff auf die ATLAS-Backend-API bereit.
 * Alle API-Anfragen werden über diese zentrale Stelle verwaltet.
 */

import axios from 'axios';
import handleApiError from '../utils/errorHandler'; // Default import korrigiert
import { toCamelCase, toSnakeCase } from '../utils/caseConverter';

// Importiere alle notwendigen Typen
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
        config.headers.Authorization = `Bearer ${token}`;
        // console.debug('[Request Interceptor] Token hinzugefügt für:', config.url);
      } else {
        // console.debug('[Request Interceptor] Kein Token gefunden für:', config.url);
      }
    }
    return config;
  },
  (error) => {
    console.error('[Request Interceptor] Fehler:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.error('Zugriff verweigert (Response Interceptor):', error.response.status, 'für', error.config?.url);
    }
    // Weiterleitung an den globalen Error Handler
    handleApiError(error as Error);
    return Promise.reject(error);
  }
);

// --- Generische API-Request-Funktion WIEDERHERGESTELLT ---
const apiRequest = async <T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> => {
  try {
    const snakeCasedData = data ? toSnakeCase(data) : undefined;
    // console.log(`[apiRequest] Sending ${method} to ${endpoint}. Body (snake_case):`, JSON.stringify(snakeCasedData));

    const config = {
      method,
      url: endpoint,
      data: snakeCasedData,
    };
    const response = await axiosInstance(config);
    const camelCasedData = toCamelCase(response.data);
    return camelCasedData as T;

  } catch (error) {
    // Fehler wird bereits im Response Interceptor behandelt und weitergeworfen
    // handleApiError(error as Error); // Doppelte Behandlung vermeiden
    throw error;
  }
};

// --- EXPORTS DER API-OBJEKTE (Wiederhergestellt) ---

export const authApi = {
  login: (credentials: any) => apiRequest<any>('/auth/login', 'POST', credentials),
  logout: () => apiRequest<any>('/auth/logout', 'POST'),
  checkAuth: () => apiRequest<User>('/auth/check'),
  getPermissions: () => apiRequest<any[]>('/auth/permissions'),
};

export const usersApi = {
  getAll: (): Promise<User[]> => apiRequest<User[]>('/users'),
  getById: (id: number): Promise<User> => apiRequest<User>(`/users/${id}`),
  create: (data: any): Promise<User> => apiRequest<User>('/users', 'POST', data),
  update: (id: number, data: any): Promise<User> => apiRequest<User>(`/users/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/users/${id}`, 'DELETE'),
};

export const roleApi = {
  getAll: (): Promise<Role[]> => apiRequest<Role[]>('/roles'),
  getById: (id: number): Promise<Role> => apiRequest<Role>(`/roles/${id}`),
  create: (data: any): Promise<Role> => apiRequest<Role>('/roles', 'POST', data),
  update: (id: number, data: any): Promise<Role> => apiRequest<Role>(`/roles/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/roles/${id}`, 'DELETE'),
  getPermissions: (id: number): Promise<any[]> => apiRequest<any[]>(`/roles/${id}/permissions`),
  updatePermissions: (id: number, permissionIds: number[]): Promise<void> => apiRequest<void>(`/roles/${id}/permissions`, 'PUT', { permissionIds }),
};

export const permissionApi = {
  getAll: (): Promise<any[]> => apiRequest<any[]>('/permissions'),
};

export const categoryApi = {
  getAll: (): Promise<Category[]> => apiRequest<{ data: Category[] }>('/categories').then(res => res.data || []),
  getById: (id: number): Promise<Category> => apiRequest<Category>(`/categories/${id}`),
  create: (data: CategoryCreate): Promise<Category> => apiRequest<Category>('/categories', 'POST', data),
  update: (id: number, data: CategoryUpdate): Promise<Category> => apiRequest<Category>(`/categories/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/categories/${id}`, 'DELETE'),
  checkCategoryNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let categories: Category[] | undefined;
    try {
      const response = await apiRequest<{ data: Category[] }>('/categories');
      categories = response?.data;
      if (!Array.isArray(categories)) {
        console.error('[DEBUG] checkCategoryNameExists: categories ist KEIN Array! Typ:', typeof categories, 'Wert:', categories);
        return true;
      }
      console.log('[DEBUG] checkCategoryNameExists: categories IST ein Array, prüfe .some(). Inhalt:', categories);
      return categories.some(cat => cat.name.toLowerCase() === name.toLowerCase() && cat.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkCategoryNameExists catch-Block:', error);
      console.warn('[DEBUG] checkCategoryNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const supplierApi = {
  getAll: (): Promise<Supplier[]> => apiRequest<{ data: Supplier[] }>('/suppliers').then(res => res.data || []),
  getById: (id: number): Promise<Supplier> => apiRequest<Supplier>(`/suppliers/${id}`),
  create: (data: SupplierCreate): Promise<Supplier> => apiRequest<Supplier>('/suppliers', 'POST', data),
  update: (id: number, data: SupplierUpdate): Promise<Supplier> => apiRequest<Supplier>(`/suppliers/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/suppliers/${id}`, 'DELETE'),
  checkSupplierNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let suppliers: Supplier[] | undefined;
    try {
      const response = await apiRequest<{ data: Supplier[] }>('/suppliers');
      suppliers = response?.data;
      if (!Array.isArray(suppliers)) {
        console.error('[DEBUG] checkSupplierNameExists: suppliers ist KEIN Array! Typ:', typeof suppliers, 'Wert:', suppliers);
        return true;
      }
      console.log('[DEBUG] checkSupplierNameExists: suppliers IST ein Array, prüfe .some(). Inhalt:', suppliers);
      return suppliers.some(sup => sup.name.toLowerCase() === name.toLowerCase() && sup.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkSupplierNameExists catch-Block:', error);
      console.warn('[DEBUG] checkSupplierNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const locationApi = {
  getAll: (): Promise<Location[]> => apiRequest<{ data: Location[] }>('/locations').then(res => res.data || []),
  getById: (id: number): Promise<Location> => apiRequest<Location>(`/locations/${id}`),
  create: (data: LocationCreate): Promise<Location> => apiRequest<Location>('/locations', 'POST', data),
  update: (id: number, data: LocationUpdate): Promise<Location> => apiRequest<Location>(`/locations/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/locations/${id}`, 'DELETE'),
  checkLocationNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let locations: Location[] | undefined;
    try {
      const response = await apiRequest<{ data: Location[] }>('/locations');
      locations = response?.data;

      if (!Array.isArray(locations)) {
        console.error('[DEBUG] checkLocationNameExists: locations ist KEIN Array! Typ:', typeof locations, 'Wert:', locations);
        return true; // Name blockieren, da Prüfung fehlschlug
      }

      // --- DEBUG LOGGING ---
      console.log('[DEBUG] checkLocationNameExists: locations IST ein Array, prüfe .some(). Inhalt:', locations);
      // --- ENDE DEBUG LOGGING ---

      return locations.some(
        (loc) => loc.name.toLowerCase() === name.toLowerCase() && loc.id !== currentId
      );
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkLocationNameExists catch-Block:', error);
      // --- TEMPORÄR ZUM DEBUGGEN ---
      // return true; // Normal: Im Zweifel blockieren
      console.warn('[DEBUG] checkLocationNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false; // Temporär: Erlauben, um zu sehen, ob catch der Grund für UI-Meldung ist
      // --- ENDE TEMPORÄR ---
    }
  },
};

export const departmentApi = {
  getAll: (): Promise<Department[]> => apiRequest<{ data: Department[] }>('/departments').then(res => res.data || []),
  getById: (id: number): Promise<Department> => apiRequest<Department>(`/departments/${id}`),
  create: (data: DepartmentCreate): Promise<Department> => apiRequest<Department>('/departments', 'POST', data),
  update: (id: number, data: DepartmentUpdate): Promise<Department> => apiRequest<Department>(`/departments/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/departments/${id}`, 'DELETE'),
  checkDepartmentNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let departments: Department[] | undefined;
    try {
      const response = await apiRequest<{ data: Department[] }>('/departments');
      departments = response?.data;
      if (!Array.isArray(departments)) {
        console.error('[DEBUG] checkDepartmentNameExists: departments ist KEIN Array! Typ:', typeof departments, 'Wert:', departments);
        return true;
      }
      console.log('[DEBUG] checkDepartmentNameExists: departments IST ein Array, prüfe .some(). Inhalt:', departments);
      return departments.some(dep => dep.name.toLowerCase() === name.toLowerCase() && dep.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkDepartmentNameExists catch-Block:', error);
      console.warn('[DEBUG] checkDepartmentNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const manufacturerApi = {
  getAll: (): Promise<Manufacturer[]> => apiRequest<{ data: Manufacturer[] }>('/manufacturers').then(res => res.data || []),
  getById: (id: number): Promise<Manufacturer> => apiRequest<Manufacturer>(`/manufacturers/${id}`),
  create: (data: ManufacturerCreate): Promise<Manufacturer> => apiRequest<Manufacturer>('/manufacturers', 'POST', data),
  update: (id: number, data: ManufacturerUpdate): Promise<Manufacturer> => apiRequest<Manufacturer>(`/manufacturers/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/manufacturers/${id}`, 'DELETE'),
  checkManufacturerNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let manufacturers: Manufacturer[] | undefined;
    try {
      const response = await apiRequest<{ data: Manufacturer[] }>('/manufacturers');
      manufacturers = response?.data;
      if (!Array.isArray(manufacturers)) {
        console.error('[DEBUG] checkManufacturerNameExists: manufacturers ist KEIN Array! Typ:', typeof manufacturers, 'Wert:', manufacturers);
        return true;
      }
      console.log('[DEBUG] checkManufacturerNameExists: manufacturers IST ein Array, prüfe .some(). Inhalt:', manufacturers);
      return manufacturers.some(man => man.name.toLowerCase() === name.toLowerCase() && man.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkManufacturerNameExists catch-Block:', error);
      console.warn('[DEBUG] checkManufacturerNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const roomApi = {
  getAll: (): Promise<Room[]> => apiRequest<{ data: Room[] }>('/rooms').then(res => res.data || []),
  getById: (id: number): Promise<Room> => apiRequest<Room>(`/rooms/${id}`),
  create: (data: RoomCreate): Promise<Room> => apiRequest<Room>('/rooms', 'POST', data),
  update: (id: number, data: RoomUpdate): Promise<Room> => apiRequest<Room>(`/rooms/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/rooms/${id}`, 'DELETE'),
  checkRoomNameExists: async (name: string, locationId: number, currentId?: number): Promise<boolean> => {
    let allRooms: Room[] | undefined;
    try {
      const response = await apiRequest<{ data: Room[] }>('/rooms');
      allRooms = response?.data;
      if (!Array.isArray(allRooms)) {
        console.error('[DEBUG] checkRoomNameExists: allRooms ist KEIN Array! Typ:', typeof allRooms, 'Wert:', allRooms);
        return true;
      }
      console.log('[DEBUG] checkRoomNameExists: allRooms IST ein Array, filtere und prüfe .some(). Inhalt:', allRooms);
      const roomsInLocation = allRooms.filter(room => room.locationId === locationId);
      return roomsInLocation.some(room => room.name.toLowerCase() === name.toLowerCase() && room.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkRoomNameExists catch-Block:', error);
      console.warn('[DEBUG] checkRoomNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const switchApi = {
  getAll: (): Promise<Switch[]> => apiRequest<{ data: Switch[] }>('/switches').then(res => res.data || []),
  getById: (id: number): Promise<Switch> => apiRequest<Switch>(`/switches/${id}`),
  create: (data: SwitchCreate): Promise<Switch> => apiRequest<Switch>('/switches', 'POST', data),
  update: (id: number, data: SwitchUpdate): Promise<Switch> => apiRequest<Switch>(`/switches/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/switches/${id}`, 'DELETE'),
  checkSwitchNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let switches: Switch[] | undefined;
    try {
      const response = await apiRequest<{ data: Switch[] }>('/switches');
      switches = response?.data;
      if (!Array.isArray(switches)) {
        console.error('[DEBUG] checkSwitchNameExists: switches ist KEIN Array! Typ:', typeof switches, 'Wert:', switches);
        return true;
      }
      console.log('[DEBUG] checkSwitchNameExists: switches IST ein Array, prüfe .some(). Inhalt:', switches);
      return switches.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkSwitchNameExists catch-Block:', error);
      console.warn('[DEBUG] checkSwitchNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const networkOutletsApi = {
  getAll: (): Promise<NetworkOutlet[]> => apiRequest<{ data: NetworkOutlet[] }>('/network-outlets').then(res => res.data || []),
  getById: (id: number): Promise<NetworkOutlet> => apiRequest<NetworkOutlet>(`/network-outlets/${id}`),
  create: (data: NetworkOutletCreate): Promise<NetworkOutlet> => apiRequest<NetworkOutlet>('/network-outlets', 'POST', data),
  update: (id: number, data: NetworkOutletUpdate): Promise<NetworkOutlet> => apiRequest<NetworkOutlet>(`/network-outlets/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/network-outlets/${id}`, 'DELETE'),
  checkOutletNumberExists: async (outletNum: string, currentId?: number): Promise<boolean> => {
    let outlets: NetworkOutlet[] | undefined;
    try {
      const response = await apiRequest<{ data: NetworkOutlet[] }>('/network-outlets');
      outlets = response?.data;
      if (!Array.isArray(outlets)) {
        console.error('[DEBUG] checkOutletNumberExists: outlets ist KEIN Array! Typ:', typeof outlets, 'Wert:', outlets);
        return true;
      }
      console.log('[DEBUG] checkOutletNumberExists: outlets IST ein Array, prüfe .some(). Inhalt:', outlets);
      return outlets.some(outlet => outlet.outletNumber.toLowerCase() === outletNum.toLowerCase() && outlet.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkOutletNumberExists catch-Block:', error);
      console.warn('[DEBUG] checkOutletNumberExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const networkPortsApi = {
  getAll: (): Promise<NetworkPort[]> => apiRequest<{ data: NetworkPort[] }>('/network-ports').then(res => res.data || []),
  getById: (id: number): Promise<NetworkPort> => apiRequest<NetworkPort>(`/network-ports/${id}`),
  create: (data: NetworkPortCreate): Promise<NetworkPort> => apiRequest<NetworkPort>('/network-ports', 'POST', data),
  update: (id: number, data: NetworkPortUpdate): Promise<NetworkPort> => apiRequest<NetworkPort>(`/network-ports/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/network-ports/${id}`, 'DELETE'),
  checkPortNumberExists: async (portNum: number, currentId?: number): Promise<boolean> => {
    let ports: NetworkPort[] | undefined;
    try {
      const response = await apiRequest<{ data: NetworkPort[] }>('/network-ports');
      ports = response?.data;
      if (!Array.isArray(ports)) {
        console.error('[DEBUG] checkPortNumberExists: ports ist KEIN Array! Typ:', typeof ports, 'Wert:', ports);
        return true;
      }
      console.log('[DEBUG] checkPortNumberExists: ports IST ein Array, prüfe .some(). Inhalt:', ports);
      return ports.some(port => port.portNumber === portNum && port.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkPortNumberExists catch-Block:', error);
      console.warn('[DEBUG] checkPortNumberExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

export const userGroupApi = {
  getAll: (): Promise<UserGroup[]> => apiRequest<{ data: UserGroup[] }>('/user-groups').then(res => res.data || []),
  getById: (id: number): Promise<UserGroup> => apiRequest<UserGroup>(`/user-groups/${id}`),
  create: (data: { name: string; description?: string }): Promise<UserGroup> => apiRequest<UserGroup>('/user-groups', 'POST', data),
  update: (id: number, data: { name?: string; description?: string }): Promise<UserGroup> => apiRequest<UserGroup>(`/user-groups/${id}`, 'PUT', data),
  delete: (id: number): Promise<{ message?: string }> => apiRequest<{ message?: string }>(`/user-groups/${id}`, 'DELETE'),
  getUsersInGroup: (groupId: number): Promise<User[]> => apiRequest<User[]>(`/user-groups/${groupId}/members`),
  addUserToGroup: (groupId: number, userId: string): Promise<void> => apiRequest<void>(`/user-groups/${groupId}/members`, 'POST', { userId }),
  removeUserFromGroup: (groupId: number, userId: string): Promise<void> => apiRequest<void>(`/user-groups/${groupId}/members/${userId}`, 'DELETE'),
  checkGroupNameExists: async (name: string, currentId?: number): Promise<boolean> => {
    let groups: UserGroup[] | undefined;
    try {
      const response = await apiRequest<{ data: UserGroup[] }>('/user-groups');
      groups = response?.data;
      if (!Array.isArray(groups)) {
        console.error('[DEBUG] checkGroupNameExists: groups ist KEIN Array! Typ:', typeof groups, 'Wert:', groups);
        return true;
      }
      console.log('[DEBUG] checkGroupNameExists: groups IST ein Array, prüfe .some(). Inhalt:', groups);
      return groups.some(group => group.name.toLowerCase() === name.toLowerCase() && group.id !== currentId);
    } catch (error) {
      console.error('[DEBUG] FEHLER in checkGroupNameExists catch-Block:', error);
      console.warn('[DEBUG] checkGroupNameExists: Fehler aufgetreten, gebe TEMPORÄR false zurück!');
      return false;
    }
  },
};

// --- Zusammengefasste und Platzhalter-API-Objekte (Wiederhergestellt & Ergänzt) ---

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

  getAllNetworkOutlets: networkOutletsApi.getAll,
  getNetworkOutletById: networkOutletsApi.getById,
  createNetworkOutlet: networkOutletsApi.create,
  updateNetworkOutlet: networkOutletsApi.update,
  deleteNetworkOutlet: networkOutletsApi.delete,
  checkOutletNumberExists: networkOutletsApi.checkOutletNumberExists,

  // Placeholder für fehlende Settings-API-Punkte
  getAssetTagSettings: () => Promise.resolve({} as any),
  updateAssetTagSettings: (data: any) => Promise.resolve({} as any),
  getSystemSettings: () => Promise.resolve({} as any),
  updateSystemSettings: (data: any) => Promise.resolve({} as any),
  getLabelSettings: () => Promise.resolve({} as any),
  updateLabelSettings: (data: any) => Promise.resolve({} as any),
  getAllLabelTemplates: () => Promise.resolve([] as any[]),
};

// --- Platzhalter für andere API-Bereiche (Wiederhergestellt) ---

export const devicesApi = {
  getAll: () => Promise.resolve([] as any[]),
  getById: (id: number) => Promise.resolve({ id } as any),
  create: (data: any) => Promise.resolve({ ...data, id: Date.now() } as any),
  update: (id: number, data: any) => Promise.resolve({ ...data, id } as any),
  delete: (id: number) => Promise.resolve({ message: 'Deleted' }),
};

export const deviceModelsApi = {
  getAll: () => Promise.resolve([] as any[]),
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

export const reportsApi = {
  getReport: (name: string, params: any) => Promise.resolve({} as any),
};

export const ticketsApi = {
  getAll: () => Promise.resolve([] as any[]),
};

export const todosApi = {
  getAll: () => Promise.resolve([] as any[]),
};

// --- Default Export aller APIs (Wiederhergestellt & Ergänzt) ---

const allApis = {
    authApi,
    usersApi,
    roleApi,
    permissionApi,
    settingsApi, // Der umfassende Settings-Export
    // Individuelle Exporte bleiben für spezifische Nutzung erhalten
    categoryApi,
    supplierApi,
    locationApi,
    departmentApi,
    manufacturerApi,
    roomApi,
    switchApi,
    networkOutletsApi,
    networkPortsApi,
    userGroupApi,
    // Platzhalter-APIs
    devicesApi,
    deviceModelsApi,
    accessoriesApi,
    certificatesApi,
    inventoryApi,
    licensesApi,
    reportsApi,
    ticketsApi,
    todosApi,
};

export default allApis;

// --- Benannte Exporte (Wiederhergestellt) ---
export { axiosInstance, apiRequest };
