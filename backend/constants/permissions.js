/**
 * Berechtigungskonstanten für das ATLAS-System
 */

const USERS_READ = 'users.read';
const USERS_CREATE = 'users.create';
const USERS_UPDATE = 'users.update';
const USERS_DELETE = 'users.delete';

// Lizenztypen
const LICENSE_TYPES_READ = 'license_types.read';     // Berechtigung zum Lesen von Lizenztypen
const LICENSE_TYPES_MANAGE = 'license_types.manage'; // Berechtigung zum Erstellen, Bearbeiten, Löschen von Lizenztypen

// Fügen Sie hier bei Bedarf weitere Berechtigungskonstanten hinzu
// Beispiel:
// const DEVICES_READ = 'devices.read';
// const DEVICES_CREATE = 'devices.create';

module.exports = {
  USERS_READ,
  USERS_CREATE,
  USERS_UPDATE,
  USERS_DELETE,
  LICENSE_TYPES_READ,
  LICENSE_TYPES_MANAGE,
  // Exportieren Sie hier weitere Konstanten
};
