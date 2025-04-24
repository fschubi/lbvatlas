/**
 * Lizenztyp für die ATLAS-Anwendung
 */
export interface License {
  id: number;
  name: string;
  type: string;
  key_code: string;
  status: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  purchase_date?: string;
  vendor?: string;
  note?: string;
  seats_total?: number;
  seats_used?: number;
  cost?: number;
  currency?: string;
  renewal_reminder?: boolean;
  renewal_date?: string;
  department_id?: number;
  department_name?: string;
  assigned_to_user_id?: number;
  assigned_to_user_name?: string;
  assigned_to_device_id?: number;
  assigned_to_device_name?: string;
}
