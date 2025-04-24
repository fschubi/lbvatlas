export interface User {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  role: string;
  active: boolean;
  first_name?: string;
  last_name?: string;
  department?: string;
  department_id?: number;
  location_id?: number;
  room_id?: number;
  last_login: string;
  created_at: string;
  updated_at: string;
  phone?: string;
  login_allowed: boolean;
  email_notifications_enabled: boolean;
  location?: string;
  room?: string;
  email_verified: boolean;
  password_expires_at?: string | null;
  password_changed_at?: string | null;
  failed_login_attempts: number;
  account_locked_until?: string | null;
  password?: string;
}

export interface UserProfile extends User {
  profile_picture?: string;
  position?: string;
  bio?: string;
  two_factor_enabled: boolean;
}

export interface UserPreferences {
  id: number;
  user_id: number;
  theme: 'light' | 'dark';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  dashboard_layout: any; // JSON-Struktur für das Dashboard-Layout
}

export interface UserGroup {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
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
