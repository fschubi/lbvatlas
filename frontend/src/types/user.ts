export interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  display_name?: string;
  email: string;
  role: string;
  department_id?: number | null;
  location_id?: number | null;
  room_id?: number | null;
  title?: string;
  phone?: string | null;
  address?: string;
  postal_code?: string;
  city?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
  active: boolean;
  can_receive_emails?: boolean;
  permissions?: string[];
  department?: { id: number; name: string };
  location?: { id: number; name: string };
  room?: { id: number; name: string };
  assigned_devices_count?: number;
}

export type Department = {
  id: number;
  name: string;
  description?: string;
  location_id?: number;
};

export type Location = {
  id: number;
  name: string;
  description?: string;
};

export type Room = {
  id: number;
  name: string;
  location_id: number;
  description?: string;
};

export interface UserFilters {
  name?: string;
  department?: string;
  location?: string;
  room?: string;
  role?: string;
  email?: string;
  search?: string;
  active?: boolean | string;
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
