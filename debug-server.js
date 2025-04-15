const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = 3700;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

console.log('Debug-Server gestartet - teste Route-Imports...');

// Funktion zum sicheren Import einer Route
function safeImportRoute(routePath, name) {
    try {
        const route = require(routePath);
        console.log(`✅ Erfolgreich importiert: ${name} (${routePath})`);
        return route;
    } catch (error) {
        console.error(`❌ FEHLER beim Import: ${name} (${routePath})`);
        console.error(`   Fehlerdetails: ${error.message}`);
        return null;
    }
}

// Teste alle Routen-Imports einzeln
const userRoutes = safeImportRoute('./backend/routes/users', 'userRoutes');
const authRoutes = safeImportRoute('./backend/routes/auth', 'authRoutes');
const deviceRoutes = safeImportRoute('./backend/routes/devices', 'deviceRoutes');
const locationRoutes = safeImportRoute('./backend/routes/locations', 'locationRoutes');
const passwordRoutes = safeImportRoute('./backend/routes/passwordRoutes', 'passwordRoutes');
const auditRoutes = safeImportRoute('./backend/routes/auditRoutes', 'auditRoutes');
const roleRoutes = safeImportRoute('./backend/routes/roles', 'roleRoutes');
const permissionRoutes = safeImportRoute('./backend/routes/permissions', 'permissionRoutes');
const ticketRoutes = safeImportRoute('./backend/routes/tickets', 'ticketRoutes');
const userGroupRoutes = safeImportRoute('./backend/routes/userGroupRoutes', 'userGroupRoutes');

// Registriere erfolgreiche Routen
console.log('\nRegistriere erfolgreiche Routen:');

if (userRoutes) app.use('/api/users', userRoutes);
if (authRoutes) app.use('/api/auth', authRoutes);
if (deviceRoutes) app.use('/api/devices', deviceRoutes);
if (locationRoutes) app.use('/api/locations', locationRoutes);
if (passwordRoutes) app.use('/api/passwords', passwordRoutes);
if (auditRoutes) app.use('/api/audits', auditRoutes);
if (roleRoutes) app.use('/api/roles', roleRoutes);
if (permissionRoutes) app.use('/api/permissions', permissionRoutes);
if (ticketRoutes) app.use('/api/tickets', ticketRoutes);
if (userGroupRoutes) app.use('/api/user-groups', userGroupRoutes);

// Test-Route
app.get('/test', (req, res) => {
    res.json({ message: 'Debug-Server läuft!' });
});

// Server starten
app.listen(PORT, () => {
    console.log(`\nDebug-Server läuft auf http://localhost:${PORT}`);
});
