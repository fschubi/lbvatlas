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
  login_allowed?: boolean;
  email_notifications_enabled?: boolean;
  permissions?: Set<string>;
  departmentName?: string;
  locationName?: string;
  roomName?: string;
  assignedDevicesCount?: number;
  display_name?: string;
  department_name?: string | null;
  location_name?: string | null;
  room_name?: string | null;
  last_login?: string;
  assigned_devices_count?: number;
}

export type Department = {
  id: string;
  name: string;
  description?: string;
  location_id?: string;
};

export type UserRole = {
  id: string;
  name: string;
  description?: string;
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
  added_at: string;
  added_by: string;
  createdAt?: string;
  updatedAt?: string;
  userCount?: number;
}

export interface Role {
  id: number;
  name: string;
  label: string;
  description?: string;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissions?: Permission[];
  userCount?: number;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  module?: string;
  action?: string;
}

export interface UserUpdateData {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  department_id?: number | undefined;
  location_id?: number | undefined;
  room_id?: number | undefined;
  title?: string;
  phone?: string | undefined;
  address?: string;
  postal_code?: string;
  city?: string;
  active?: boolean;
  login_allowed?: boolean;
  email_notifications_enabled?: boolean;
  password?: string;
}
