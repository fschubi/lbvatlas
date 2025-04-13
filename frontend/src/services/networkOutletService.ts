import { settingsApi } from '../utils/api';
import { NetworkOutlet } from '../types/settings';

/**
 * Service für die Verwaltung von Netzwerkdosen
 */
const networkOutletService = {
  /**
   * Alle Netzwerkdosen abrufen, optional mit Filtern
   */
  getAllNetworkOutlets: async (): Promise<NetworkOutlet[]> => {
    try {
      const response = await settingsApi.getAllNetworkOutlets();
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen aller Netzwerkdosen:', error);
      throw error;
    }
  },

  /**
   * Eine Netzwerkdose anhand ihrer ID abrufen
   */
  getNetworkOutletById: async (id: number): Promise<NetworkOutlet> => {
    try {
      const response = await settingsApi.getNetworkOutletById(id);
      // Stelle sicher, dass die Antwort die richtige Struktur hat
      const data = response.data as Partial<NetworkOutlet>;

      // Ergänze fehlende Eigenschaften, falls notwendig
      if (!data.outletNumber) {
        console.warn(`NetworkOutlet mit ID ${id} hat keine outletNumber`);
        data.outletNumber = '';
      }

      return data as NetworkOutlet;
    } catch (error) {
      console.error(`Fehler beim Abrufen der Netzwerkdose mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eine neue Netzwerkdose erstellen
   */
  createNetworkOutlet: async (outletData: Partial<NetworkOutlet>): Promise<NetworkOutlet> => {
    try {
      // Stelle sicher, dass outletNumber vorhanden ist
      if (!outletData.outletNumber) {
        throw new Error('Dosennummer (outletNumber) ist ein Pflichtfeld');
      }

      const response = await settingsApi.createNetworkOutlet(outletData);

      // Ergänze fehlende Eigenschaften, falls notwendig
      const data = response.data as Partial<NetworkOutlet>;
      if (!data.outletNumber) {
        data.outletNumber = outletData.outletNumber;
      }

      return data as NetworkOutlet;
    } catch (error) {
      console.error('Fehler beim Erstellen einer Netzwerkdose:', error);
      throw error;
    }
  },

  /**
   * Eine bestehende Netzwerkdose aktualisieren
   */
  updateNetworkOutlet: async (id: number, outletData: Partial<NetworkOutlet>): Promise<NetworkOutlet> => {
    try {
      // Stelle sicher, dass outletNumber vorhanden ist
      if (!outletData.outletNumber) {
        throw new Error('Dosennummer (outletNumber) ist ein Pflichtfeld');
      }

      const response = await settingsApi.updateNetworkOutlet(id, outletData);

      // Ergänze fehlende Eigenschaften, falls notwendig
      const data = response.data as Partial<NetworkOutlet>;
      if (!data.outletNumber) {
        data.outletNumber = outletData.outletNumber;
      }

      return data as NetworkOutlet;
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Netzwerkdose mit ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eine Netzwerkdose löschen
   */
  deleteNetworkOutlet: async (id: number): Promise<{ message: string }> => {
    try {
      const response = await settingsApi.deleteNetworkOutlet(id);
      return response;
    } catch (error) {
      console.error(`Fehler beim Löschen der Netzwerkdose mit ID ${id}:`, error);
      throw error;
    }
  }
};

export default networkOutletService;
