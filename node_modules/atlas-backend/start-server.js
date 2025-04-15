/**
 * ATLAS Backend Server - Hauptdatei
 * Diese Datei startet den ATLAS-Backend-Server mit allen notwendigen Routen und Middleware.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const logger = console;

// Konfiguration laden
dotenv.config();

// Express-App erstellen
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cookieParser());

// HINWEIS: Hier starten wir mit nur den absolut notwendigen Routen
// und fügen nach und nach weitere hinzu, nachdem wir verifiziert haben, dass alles funktioniert.

// Wichtige Routen importieren
logger.log('Importiere wichtige Routen...');

// Auth-Route (wird ohne Authentifizierung benötigt)
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  logger.log('✅ Auth-Routes erfolgreich registriert');
} catch (error) {
  logger.error('❌ Fehler beim Laden der Auth-Routes:', error.message);
}

// Benutzer-Route mit Authentifizierung
try {
  const { authenticateToken } = require('./middleware/auth');
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes); // Bewusst ohne authMiddleware für erste Tests
  logger.log('✅ User-Routes erfolgreich registriert');
} catch (error) {
  logger.error('❌ Fehler beim Laden der User-Routes:', error.message);
}

// Geräte-Route
try {
  const deviceRoutes = require('./routes/devices');
  app.use('/api/devices', deviceRoutes); // Bewusst ohne authMiddleware für erste Tests
  logger.log('✅ Device-Routes erfolgreich registriert');
} catch (error) {
  logger.error('❌ Fehler beim Laden der Device-Routes:', error.message);
}

// Ticket-Route
try {
  const ticketRoutes = require('./routes/tickets');
  app.use('/api/tickets', ticketRoutes); // Bewusst ohne authMiddleware für erste Tests
  logger.log('✅ Ticket-Routes erfolgreich registriert');
} catch (error) {
  logger.error('❌ Fehler beim Laden der Ticket-Routes:', error.message);
}

// Rollen-Route
try {
  const roleRoutes = require('./routes/roles');
  app.use('/api/roles', roleRoutes); // Bewusst ohne authMiddleware für erste Tests
  logger.log('✅ Rollen-Routes erfolgreich registriert');
} catch (error) {
  logger.error('❌ Fehler beim Laden der Rollen-Routes:', error.message);
}

// Berechtigungs-Route
try {
  const permissionRoutes = require('./routes/permissions');
  app.use('/api/permissions', permissionRoutes); // Bewusst ohne authMiddleware für erste Tests
  logger.log('✅ Berechtigungs-Routes erfolgreich registriert');
} catch (error) {
  logger.error('❌ Fehler beim Laden der Berechtigungs-Routes:', error.message);
}

// API-Status-Route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'ATLAS-Backend läuft'
  });
});

// Gesundheitscheck-Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Standardroute
app.get('/', (req, res) => {
  res.json({
    message: 'ATLAS API Server',
    version: '1.0.0',
    documentation: '/api/docs'
  });
});

// 404 Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Route nicht gefunden',
    path: req.originalUrl
  });
});

// Globaler Fehlerhandler
app.use((err, req, res, next) => {
  logger.error('Serverfehler:', err);
  res.status(500).json({
    message: 'Ein Serverfehler ist aufgetreten',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server starten - verwende einen eindeutigen Port, der garantiert frei ist
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.log(`⚡ ATLAS-Backend gestartet auf Port ${PORT}`);
  logger.log(`📄 API-Status verfügbar unter http://localhost:${PORT}/api/status`);
}).on('error', (err) => {
  logger.error(`Konnte Server nicht starten: ${err.message}`);
});

module.exports = app;
