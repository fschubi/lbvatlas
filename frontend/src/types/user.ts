export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department_id?: number;
  location_id?: number;
  room_id?: number;
  title?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
  permissions?: string[];
  departmentName?: string;
  locationName?: string;
  roomName?: string;
  assignedDevicesCount?: number;
}

export type Department = {
  id: number;
  name: string;
  description?: string;
  location_id?: number;
};

export interface UserFilters {
  name?: string;
  department?: string;
  role?: string;
  email?: string;
  search?: string;
}

export interface UserGroup {
  id: number;
  name: string;
  description: string;
  added_at?: string;
  added_by?: string;
  createdAt?: string;
  updatedAt?: string;
  userCount?: number;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
  permissions?: number[];
  userCount?: number;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  module: string;
  action: string;
  category?: string;
}
