const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Konfiguration laden
dotenv.config();

// Express-App erstellen
const app = express();

// Basic Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Einfache Router mit einer Route definieren
const simpleRouter = express.Router();
simpleRouter.get('/', (req, res) => {
  res.json({ message: 'Simple router works!' });
});

// Router für die App registrieren
app.use('/api/simple', simpleRouter);

// Eine einfache Route direkt hier definieren
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    message: 'Vereinfachter Server läuft'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Ein Serverfehler ist aufgetreten',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server starten
const PORT = 3600;
app.listen(PORT, () => {
  console.log(`Vereinfachter Server gestartet auf Port ${PORT}`);
}).on('error', (err) => {
  console.error(`Konnte Server nicht starten: ${err.message}`);
});

module.exports = app;
