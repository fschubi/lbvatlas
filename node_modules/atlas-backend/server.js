const dotenv = require('dotenv');
const logger = require('./utils/logger');
const path = require('path');
const http = require('http'); // Importiere http für den Server

// Importiere die konfigurierte Express App
const app = require('./app');

// Konfiguration laden (wird auch in app.js geladen, aber sicher ist sicher)
dotenv.config();

// --- Entferne redundante Middleware und Routen-Imports/Registrierungen ---
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// ... (alle anderen Middleware/Routen-Requires hier entfernt)
// const { authMiddleware } = require('./middleware/auth');

// const app = express(); // App wird jetzt aus app.js importiert

// Middleware (alles nach app.js verschoben)
// app.use(helmet());
// app.use(cors(...));
// app.use(express.json());
// ... (alle app.use für Middleware hier entfernt)

// Routen zuweisen (alles nach app.js verschoben)
// app.use('/api/auth', authRoutes);
// app.use('/api/users', authMiddleware, userRoutes);
// ... (alle app.use für Routen hier entfernt)

// Statische Dateien (werden jetzt in app.js behandelt, außer ggf. Uploads?)
// const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadDir)) { ... }
// app.use('/uploads', express.static(uploadDir)); // Lass diesen Teil erstmal hier, falls er spezifisch für server.js sein soll

// // Standardroute (nach app.js verschoben)
// app.get('/', ...);

// // API-Dokumentation (nach app.js verschoben)
// app.get('/api/docs', ...);

// // API-Status (nach app.js verschoben)
// app.get('/api/status', ...);

// // Gesundheitscheck-Route (nach app.js verschoben)
// app.get('/health', ...);

// // API-Dokumentationsroute (nach app.js verschoben)
// app.get('/api', ...);

// // 404 Not Found Handler (nach app.js verschoben)
// app.use((req, res, next) => { ... });

// // API-Routen Catch-all (nach app.js verschoben)
// app.use('/api/*', ...);

// // Frontend Catch-all (nach app.js verschoben)
// app.get('*', ...);

// // Globaler Fehlerhandler (nach app.js verschoben)
// app.use((err, req, res, next) => { ... });

// --- Server starten ---
const PORT = process.env.PORT || 3500; // Verwende den gleichen Port wie vorher

// Erstelle HTTP-Server mit der importierten App
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`ATLAS-Server gestartet auf Port ${PORT} im ${process.env.NODE_ENV || 'development'}-Modus`);
  // Der Link zur API-Doku kann bleiben, auch wenn die Route in app.js definiert ist
  logger.info(`API-Dokumentation verfügbar unter http://localhost:${PORT}/api`);
}).on('error', (err) => {
  logger.error(`Konnte Server nicht starten: ${err.message}`);
});

// --- Prozess-Handler (können hier bleiben) ---
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unbehandelte Promise-Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Unbehandelte Exception', error);
  // Im Produktionsmodus könnte man hier überlegen, neu zu starten,
  // aber für die Entwicklung ist ein Exit besser, um den Fehler zu sehen.
  process.exit(1);
});

const shutdown = (signal) => {
  logger.info(`${signal}-Signal empfangen, Server wird beendet`);
  server.close(() => {
    logger.info('Server beendet');
    // Hier könnte man noch DB-Verbindungen schließen etc.
    process.exit(0);
  });
  // Erzwinge Beenden nach Timeout
  setTimeout(() => {
     logger.warn('Server konnte nicht ordnungsgemäß beendet werden, erzwinge Beendigung.');
     process.exit(1);
  }, 10000); // 10 Sekunden Timeout
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Entferne module.exports = app;
