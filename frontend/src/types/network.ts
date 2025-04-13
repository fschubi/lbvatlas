export interface NetworkPort {
  id: number;
  port_number: number;
  created_at: string;
  updated_at: string;
}

export interface NetworkPortCreate {
  port_number: number;
}

export interface NetworkPortUpdate {
  port_number?: number;
}
