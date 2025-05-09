import axios from 'axios';

// API-Basis-URL - Verwende import.meta.env statt process.env für Vite
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Erstelle eine Axios-Instanz (Authentifizierung wird von den Interceptoren übernommen)
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * API für Übergabeprotokolle
 */
export const handoverApi = {
  // Alle Übergabeprotokolle abrufen
  async getAllHandoverProtocols(): Promise<any> {
    try {
      return await axiosInstance.get('/handover');
    } catch (error) {
      console.error('Error in getAllHandoverProtocols:', error);
      throw error;
    }
  },

  // Ein spezifisches Übergabeprotokoll anhand der ID abrufen
  async getHandoverProtocolById(id: string): Promise<any> {
    try {
      const response = await axiosInstance.get(`/handover/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error in getHandoverProtocolById:', error);
      throw error;
    }
  },

  // Neues Übergabeprotokoll erstellen
  async createHandoverProtocol(protocolData: any): Promise<any> {
    try {
      return await axiosInstance.post('/handover', protocolData);
    } catch (error) {
      console.error('Error in createHandoverProtocol:', error);
      throw error;
    }
  },

  // Bestehendes Übergabeprotokoll aktualisieren
  async updateHandoverProtocol(id: string, protocolData: any): Promise<any> {
    try {
      return await axiosInstance.put(`/handover/${id}`, protocolData);
    } catch (error) {
      console.error('Error in updateHandoverProtocol:', error);
      throw error;
    }
  },

  // Unterschrift zu einem Protokoll hinzufügen
  async addSignature(id: string, signatureData: string): Promise<any> {
    try {
      return await axiosInstance.post(`/handover/${id}/signature`, { signatureData });
    } catch (error) {
      console.error('Error in addSignature:', error);
      throw error;
    }
  },

  // PDF aus einem Protokoll erzeugen
  async generatePDF(id: string): Promise<any> {
    try {
      return await axiosInstance.get(`/handover/${id}/pdf`, {
        responseType: 'blob'
      });
    } catch (error) {
      console.error('Error in generatePDF:', error);
      throw error;
    }
  },

  // Protokoll löschen
  async deleteHandoverProtocol(id: string): Promise<any> {
    try {
      return await axiosInstance.delete(`/handover/${id}`);
    } catch (error) {
      console.error('Error in deleteHandoverProtocol:', error);
      throw error;
    }
  }
};
