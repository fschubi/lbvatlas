/**
 * Hauptanwendungsdatei für das ATLAS-Backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const dotenv = require('dotenv');
const path = require('path');

// Lade Umgebungsvariablen
dotenv.config();

// Importiere Routen
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const locationRoutes = require('./routes/locations');
const passwordRoutes = require('./routes/passwordRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Erstelle Express-App
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Client-Informationen für Audit-Logs setzen
app.use((req, res, next) => {
  try {
    // Speichere Client-IP und User-Agent für Audit-Logs
    app.locals.current_ip = req.ip || req.connection.remoteAddress;
    app.locals.current_user_agent = req.headers['user-agent'] || 'Unbekannt';

    // Falls der Benutzer authentifiziert ist, speichere Benutzer-ID und Benutzername
    if (req.user) {
      app.locals.current_user_id = req.user.id;
      app.locals.current_username = req.user.username;
    }

    next();
  } catch (error) {
    next();
  }
});

// Routen-Registration
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/audit', auditRoutes);

// Statische Dateien (für Produktion)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Fehler:', err);
  res.status(500).json({
    success: false,
    message: 'Serverfehler',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Starte Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server läuft auf Port ${PORT}`);
});

module.exports = app;
