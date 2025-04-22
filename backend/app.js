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
const locationRoutes = require('./routes/locationRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const auditRoutes = require('./routes/auditRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const licenseRoutes = require('./routes/licenses');
const certificateRoutes = require('./routes/certificates');
const accessoryRoutes = require('./routes/accessories');
const inventoryRoutes = require('./routes/inventory');
const todoRoutes = require('./routes/todos');
const ticketRoutes = require('./routes/tickets');
const reportRoutes = require('./routes/reports');
const documentRoutes = require('./routes/documents');
const userGroupRoutes = require('./routes/userGroupRoutes');
const toolsRoutes = require('./routes/tools');
const userProfileRoutes = require('./routes/userProfiles');
const supplierRoutes = require('./routes/supplierRoutes');
const switchRoutes = require('./routes/switchRoutes');
const networkSocketRoutes = require('./routes/networkSocketRoutes');
const networkPortRoutes = require('./routes/networkPortRoutes');
const deviceModelRoutes = require('./routes/deviceModelRoutes');
const systemSettingsRoutes = require('./routes/systemSettingsRoutes');
const assetTagSettingsRoutes = require('./routes/assetTagSettingsRoutes');
const labelSettingsRoutes = require('./routes/labelSettingsRoutes');
const roomRoutes = require('./routes/roomRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const manufacturerRoutes = require('./routes/manufacturerRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const labelTemplateRoutes = require('./routes/labelTemplateRoutes');
const networkOutletRoutes = require('./routes/networkOutletRoutes');

// Erstelle Express-App
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
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
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/accessories', accessoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/userGroupRoutes', userGroupRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/userProfiles', userProfileRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/switches', switchRoutes);
app.use('/api/network-sockets', networkSocketRoutes);
app.use('/api/network-ports', networkPortRoutes);
app.use('/api/devicemodels', deviceModelRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/asset-tag-settings', assetTagSettingsRoutes);
app.use('/api/labels', labelSettingsRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/label-templates', labelTemplateRoutes);
app.use('/api/network-outlets', networkOutletRoutes);

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

module.exports = app;
