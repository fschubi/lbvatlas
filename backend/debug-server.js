const express = require('express');
const dotenv = require('dotenv');
const logger = console; // Vereinfachtes Logging

// Konfiguration laden
dotenv.config();

// Express-App erstellen
const app = express();

// Basic Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Systematisch Routen importieren und registrieren
try {
  logger.log("Importiere authRoutes...");
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  logger.log("✅ authRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von authRoutes: ${error.message}`);
}

try {
  logger.log("Importiere userRoutes...");
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  logger.log("✅ userRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von userRoutes: ${error.message}`);
}

try {
  logger.log("Importiere deviceRoutes...");
  const deviceRoutes = require('./routes/devices');
  app.use('/api/devices', deviceRoutes);
  logger.log("✅ deviceRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von deviceRoutes: ${error.message}`);
}

try {
  logger.log("Importiere licenseRoutes...");
  const licenseRoutes = require('./routes/licenses');
  app.use('/api/licenses', licenseRoutes);
  logger.log("✅ licenseRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von licenseRoutes: ${error.message}`);
}

try {
  logger.log("Importiere certificateRoutes...");
  const certificateRoutes = require('./routes/certificates');
  app.use('/api/certificates', certificateRoutes);
  logger.log("✅ certificateRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von certificateRoutes: ${error.message}`);
}

try {
  logger.log("Importiere accessoryRoutes...");
  const accessoryRoutes = require('./routes/accessories');
  app.use('/api/accessories', accessoryRoutes);
  logger.log("✅ accessoryRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von accessoryRoutes: ${error.message}`);
}

try {
  logger.log("Importiere ticketRoutes...");
  const ticketRoutes = require('./routes/tickets');
  app.use('/api/tickets', ticketRoutes);
  logger.log("✅ ticketRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von ticketRoutes: ${error.message}`);
}

try {
  logger.log("Importiere reportRoutes...");
  const reportRoutes = require('./routes/reports');
  app.use('/api/reports', reportRoutes);
  logger.log("✅ reportRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von reportRoutes: ${error.message}`);
}

try {
  logger.log("Importiere settingsRoutes...");
  const settingsRoutes = require('./routes/settings');
  app.use('/api/settings', settingsRoutes);
  logger.log("✅ settingsRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von settingsRoutes: ${error.message}`);
}

try {
  logger.log("Importiere simpleGroupRoutes...");
  const simpleGroupRoutes = require('./routes/simpleUserGroupRoutes');
  app.use('/api/user-groups', simpleGroupRoutes);
  logger.log("✅ simpleGroupRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von simpleGroupRoutes: ${error.message}`);
}

try {
  logger.log("Importiere userProfileRoutes...");
  const userProfileRoutes = require('./routes/userProfiles');
  app.use('/api/profiles', userProfileRoutes);
  logger.log("✅ userProfileRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von userProfileRoutes: ${error.message}`);
}

try {
  logger.log("Importiere roleRoutes...");
  const roleRoutes = require('./routes/roles');
  app.use('/api/roles', roleRoutes);
  logger.log("✅ roleRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von roleRoutes: ${error.message}`);
}

try {
  logger.log("Importiere permissionRoutes...");
  const permissionRoutes = require('./routes/permissions');
  app.use('/api/permissions', permissionRoutes);
  logger.log("✅ permissionRoutes erfolgreich importiert und registriert");
} catch (error) {
  logger.error(`❌ Fehler beim Importieren von permissionRoutes: ${error.message}`);
}

// Eine einfache Status-Route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Debug-Server läuft'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    message: 'Ein Serverfehler ist aufgetreten',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server starten
const PORT = 3700;
app.listen(PORT, () => {
  logger.log(`Debug-Server gestartet auf Port ${PORT}`);
}).on('error', (err) => {
  logger.error(`Konnte Server nicht starten: ${err.message}`);
});

module.exports = app;
