# ATLAS API - Standortverwaltung (Locations)

## Übersicht

Diese Dokumentation beschreibt die REST API-Endpunkte für die Verwaltung von Standorten im ATLAS-System. Die Standortverwaltung ist Teil der Einstellungen und dient als Basis für weitere Komponenten wie Abteilungen, Räume und Gerätestandorte.

## API-Endpunkte

### 1. Alle Standorte abrufen

Gibt eine Liste aller Standorte zurück.

**Endpunkt:** `GET /api/settings/locations`

**Erforderliche Berechtigungen:** Authentifizierter Benutzer

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Hauptsitz Berlin",
      "description": "Hauptniederlassung in Berlin Mitte",
      "address": "Beispielstraße 123",
      "city": "Berlin",
      "postalCode": "10115",
      "country": "Deutschland",
      "isActive": true,
      "createdAt": "2024-04-20T10:30:00.000Z",
      "updatedAt": "2024-04-20T10:30:00.000Z"
    },
    {
      "id": 2,
      "name": "Niederlassung München",
      "description": "Büro in München",
      "address": "Münchner Straße 45",
      "city": "München",
      "postalCode": "80331",
      "country": "Deutschland",
      "isActive": true,
      "createdAt": "2024-04-20T11:15:00.000Z",
      "updatedAt": "2024-04-20T11:15:00.000Z"
    }
  ]
}
```

**Fehlerantwort (500):**

```json
{
  "success": false,
  "message": "Fehler beim Abrufen der Standorte",
  "error": "Datenbankfehler: ..."
}
```

### 2. Standort nach ID abrufen

Gibt die Details eines spezifischen Standorts zurück.

**Endpunkt:** `GET /api/settings/locations/:id`

**Erforderliche Berechtigungen:** Authentifizierter Benutzer

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Hauptsitz Berlin",
    "description": "Hauptniederlassung in Berlin Mitte",
    "address": "Beispielstraße 123",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "Deutschland",
    "isActive": true,
    "createdAt": "2024-04-20T10:30:00.000Z",
    "updatedAt": "2024-04-20T10:30:00.000Z"
  }
}
```

**Fehlerantwort (404):**

```json
{
  "success": false,
  "message": "Standort nicht gefunden"
}
```

### 3. Neuen Standort erstellen

Erstellt einen neuen Standort.

**Endpunkt:** `POST /api/settings/locations`

**Erforderliche Berechtigungen:** Admin oder Manager

**Request:**

```json
{
  "name": "Standort Hamburg",
  "description": "Neue Niederlassung in Hamburg",
  "address": "Hamburger Straße 42",
  "city": "Hamburg",
  "postalCode": "20095",
  "country": "Deutschland",
  "isActive": true
}
```

**Erforderliche Felder:**
- `name`: String (max. 100 Zeichen)
- `city`: String

**Optionale Felder:**
- `description`: Text
- `address`: Text
- `postalCode`: String
- `country`: String (Standard: "Deutschland")
- `isActive`: Boolean (Standard: true)

**Erfolgsantwort (201):**

```json
{
  "success": true,
  "message": "Standort erfolgreich erstellt",
  "data": {
    "id": 3,
    "name": "Standort Hamburg",
    "description": "Neue Niederlassung in Hamburg",
    "address": "Hamburger Straße 42",
    "city": "Hamburg",
    "postalCode": "20095",
    "country": "Deutschland",
    "isActive": true,
    "createdAt": "2024-04-21T09:45:00.000Z",
    "updatedAt": "2024-04-21T09:45:00.000Z"
  }
}
```

**Fehlerantwort (400):**

```json
{
  "success": false,
  "message": "Ein Standort mit diesem Namen existiert bereits"
}
```

**Fehlerantwort (400) - Validierungsfehler:**

```json
{
  "errors": [
    {
      "msg": "Name ist erforderlich",
      "param": "name",
      "location": "body"
    },
    {
      "msg": "Stadt ist erforderlich",
      "param": "city",
      "location": "body"
    }
  ]
}
```

### 4. Standort aktualisieren

Aktualisiert die Daten eines bestehenden Standorts.

**Endpunkt:** `PUT /api/settings/locations/:id`

**Erforderliche Berechtigungen:** Admin oder Manager

**Request:**

```json
{
  "name": "Hauptsitz Berlin (aktualisiert)",
  "description": "Hauptniederlassung in Berlin-Mitte, renoviert 2024",
  "address": "Neue Beispielstraße 456",
  "isActive": true
}
```

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "message": "Standort erfolgreich aktualisiert",
  "data": {
    "id": 1,
    "name": "Hauptsitz Berlin (aktualisiert)",
    "description": "Hauptniederlassung in Berlin-Mitte, renoviert 2024",
    "address": "Neue Beispielstraße 456",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "Deutschland",
    "isActive": true,
    "createdAt": "2024-04-20T10:30:00.000Z",
    "updatedAt": "2024-04-21T14:25:00.000Z"
  }
}
```

**Fehlerantwort (404):**

```json
{
  "success": false,
  "message": "Standort nicht gefunden"
}
```

**Fehlerantwort (400):**

```json
{
  "success": false,
  "message": "Ein anderer Standort mit diesem Namen existiert bereits"
}
```

### 5. Standort löschen

Löscht einen Standort.

**Endpunkt:** `DELETE /api/settings/locations/:id`

**Erforderliche Berechtigungen:** Admin

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "message": "Standort erfolgreich gelöscht",
  "data": {
    "id": 3,
    "name": "Standort Hamburg",
    "description": "Neue Niederlassung in Hamburg",
    "address": "Hamburger Straße 42",
    "city": "Hamburg",
    "postalCode": "20095",
    "country": "Deutschland",
    "isActive": true,
    "createdAt": "2024-04-21T09:45:00.000Z",
    "updatedAt": "2024-04-21T09:45:00.000Z"
  }
}
```

**Fehlerantwort (404):**

```json
{
  "success": false,
  "message": "Standort nicht gefunden"
}
```

**Fehlerantwort (400):**

```json
{
  "success": false,
  "message": "Dieser Standort wird von Abteilungen/Räumen/Geräten verwendet und kann nicht gelöscht werden"
}
```

## Frontend-API-Integration

Im Frontend wird der Zugriff auf die API über den `settingsApi`-Service implementiert:

```typescript
// Beispiel für settingsApi.ts
import axios from 'axios';
import { Location } from '../types/settings';

const API_URL = process.env.REACT_APP_API_URL || '/api';

export const settingsApi = {
  // Standorte
  getAllLocations: async () => {
    const response = await axios.get(`${API_URL}/settings/locations`);
    return response.data;
  },

  getLocationById: async (id: number) => {
    const response = await axios.get(`${API_URL}/settings/locations/${id}`);
    return response.data;
  },

  createLocation: async (locationData: Partial<Location>) => {
    const response = await axios.post(`${API_URL}/settings/locations`, locationData);
    return response.data;
  },

  updateLocation: async (id: number, locationData: Partial<Location>) => {
    const response = await axios.put(`${API_URL}/settings/locations/${id}`, locationData);
    return response.data;
  },

  deleteLocation: async (id: number) => {
    const response = await axios.delete(`${API_URL}/settings/locations/${id}`);
    return response.data;
  }
};
```

## Datenmodell

Die `Location`-Schnittstelle im Frontend entspricht der Datenbankstruktur:

```typescript
export interface Location {
  id: number;
  name: string;
  description: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## SQL-Tabellendefinition

Die SQL-Definition der Standorttabelle:

```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Deutschland',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
