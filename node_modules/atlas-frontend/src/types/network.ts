export interface NetworkPort {
  id: number;
  portNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkPortCreate {
  portNumber: number;
}

export interface NetworkPortUpdate {
  portNumber?: number;
}

export interface Switch {
  id: number;
  name: string;
  description?: string | null;
  manufacturerId: number;
  model?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  locationId: number;
  roomId?: number | null;
  cabinetLabel?: string | null;
  rackPosition?: number | null;
  portCount: number;
  isActive: boolean;
  managementUrl?: string | null;
  notes?: string | null;
  uplinkPort?: string | null;
  createdAt: string;
  updatedAt: string;
  manufacturerName?: string;
  locationName?: string;
  roomName?: string;
}

export interface SwitchCreate {
  name: string;
  description?: string | null;
  manufacturerId: number;
  model?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  locationId: number;
  roomId?: number | null;
  cabinetLabel?: string | null;
  rackPosition?: number | null;
  portCount: number;
  isActive: boolean;
  managementUrl?: string | null;
  notes?: string | null;
  uplinkPort?: string | null;
}

// Alle Felder außer der ID sind optional, aber mindestens eines muss zum Update vorhanden sein
export type SwitchUpdate = Partial<Omit<SwitchCreate, never>> & { id?: never }; // Erzwingt, dass mindestens ein Feld gesetzt wird, ID ist nicht erlaubt
