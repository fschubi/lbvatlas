export interface Department {
  id: number;
  name: string;
  description: string;
  locationId?: number;
  active?: boolean;
  isActive?: boolean;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Manufacturer {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface ManufacturerCreate {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface ManufacturerUpdate {
  name?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive?: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  description: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  contractNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierCreate {
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
}

export interface SupplierUpdate {
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
}

export interface Room {
  id: number;
  name: string;
  description?: string | null;
  locationId: number;
  locationName?: string | null;
  building?: string | null;
  floor?: string | null;
  roomNumber?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Location {
  id: number;
  name: string;
  description: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface DeviceModel {
  id: number;
  name: string;
  description?: string;
  manufacturerId?: number;
  categoryId?: number;
  specifications?: string;
  cpu?: string;
  ram?: string;
  hdd?: string;
  warrantyMonths?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  manufacturer_id?: number;
  category_id?: number;
  warranty_months?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  manufacturer_name?: string;
  category_name?: string;
  device_count?: string | number;
  active?: boolean;
}

export interface DeviceModelCreate {
  name: string;
  description?: string;
  manufacturer_id?: number;
  manufacturerId?: number;
  category_id?: number;
  categoryId?: number;
  specifications?: string;
  cpu?: string;
  ram?: string;
  hdd?: string;
  warrantyMonths?: number;
  isActive?: boolean;
}

export interface DeviceModelUpdate {
  name?: string;
  description?: string;
  manufacturer_id?: number;
  manufacturerId?: number;
  category_id?: number;
  categoryId?: number;
  specifications?: string;
  cpu?: string;
  ram?: string;
  hdd?: string;
  warrantyMonths?: number;
  isActive?: boolean;
}

export interface Switch {
  id: number;
  name: string;
  description: string;
  model: string;
  manufacturer_id?: number;
  manufacturerId?: number;
  location_id?: number;
  locationId?: number;
  room_id?: number;
  roomId?: number;
  cabinet_id?: number;
  cabinetId?: number;
  rack_position?: string;
  rackPosition?: string;
  port_count?: number;
  portCount?: number;
  manufacturer_name?: string;
  location_name?: string;
  room_name?: string;
  notes?: string;
  is_active?: boolean;
  isActive: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface NetworkOutlet {
  id: number;
  outletNumber: string;
  locationId: number | null;
  locationName?: string;
  roomId: number | null;
  roomName?: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NetworkOutletCreate {
  outletNumber: string;
  locationId: number | null;
  roomId: number | null;
  description: string | null;
  isActive?: boolean;
}

export interface NetworkOutletUpdate {
  outletNumber?: string;
  locationId?: number | null;
  roomId?: number | null;
  description?: string | null;
  isActive?: boolean;
}

export interface NetworkPort {
  id: number;
  portNumber: number;
  switchId?: number;
  description?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkPortCreate {
  portNumber: number;
  switchId?: number | null;
  description?: string | null;
  isActive?: boolean;
}

export interface NetworkPortUpdate {
  portNumber?: number;
  switchId?: number | null;
  description?: string | null;
  isActive?: boolean;
}

export interface DepartmentCreate {
  name: string;
  description?: string;
  locationId?: number;
  isActive?: boolean;
}

export interface DepartmentUpdate {
  name?: string;
  description?: string;
  locationId?: number;
  isActive?: boolean;
}

export interface AssetTagSettings {
  id: number;
  prefix: string;
  currentNumber: number;
  digitCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTagSettingsUpdate {
  prefix?: string;
  digitCount?: number;
  isActive?: boolean;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  parentId?: number;
  isActive?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  description?: string;
  parentId?: number;
  isActive?: boolean;
}

export interface LocationCreate {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  isActive?: boolean;
}

export interface LocationUpdate {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  isActive?: boolean;
}

export interface RoomCreate {
  name: string;
  description?: string;
  locationId: number;
  building?: string;
  floor?: string;
  roomNumber?: string;
  active?: boolean;
}

export interface RoomUpdate {
  name?: string;
  description?: string;
  locationId?: number;
  building?: string;
  floor?: string;
  roomNumber?: string;
  active?: boolean;
}
