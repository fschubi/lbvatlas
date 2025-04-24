export interface User {
  id: string;
  username: string;
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
  first_name: string;
  last_name: string;
  email: string;
  role: string;
=======
  first_name: string;
  last_name: string;
  email: string;
  role: string;
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
  department_id?: string;
  title?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  created_at?: string;
  updated_at?: string;
  active?: boolean;
<<<<<<< HEAD
<<<<<<< HEAD
  permissions?: string[];
  departmentName?: string;
  locationName?: string;
  roomName?: string;
  assignedDevicesCount?: number;
=======
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
=======
  permissions?: Set<string>;
>>>>>>> parent of 077dfb62 (grund benutzer verwaltung steht)
<<<<<<< HEAD
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
=======
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
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
<<<<<<< HEAD
=======
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
>>>>>>> parent of 7b3be34f (benutzer verwaltung)
}

export interface Role {
  id: number;
  name: string;
<<<<<<< HEAD
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
=======
  label: string;
>>>>>>> parent of beb137d8 (rollen und gruppen Verwaltung live)
}
